import type { GeoPoint } from "../../../map/initialView";
import type { ImageSearchTerm } from "../discoveryContent";
import type { DiscoveryImage, DiscoveryImageProvider } from "./imageProvider";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface WikiPage {
  title: string;
  missing?: boolean;
  pageimage?: string;
  coordinates?: Array<{ lat: number; lon: number }>;
  pageprops?: { disambiguation?: string };
}

interface CommonsImageInfo {
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  descriptionurl?: string;
  mime?: string;
  extmetadata?: Record<string, { value?: string } | undefined>;
}

const WIKI_LANGUAGES = ["pt", "en"] as const;
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const THUMB_WIDTH = 1280;
const MAX_TERMS = 3;
/** Page images that illustrate a subject poorly: flags, seals, locator maps and diagrams. */
const UNSUITABLE_FILE =
  /(\.svg$|\.gif$|flag|bandeira|coat[_ ]of[_ ]arms|bras[aã]o|escudo|emblem|lambang|wappen|insignia|seal|selo|locator|localiza|mapa|[_ ]map[_. ]|logo)/i;
/** Portrait files crop badly in the landscape frame and are usually emblems or documents. */
const MAX_PORTRAIT_RATIO = 1.1;
const EARTH_RADIUS_KM = 6_371;

function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Extmetadata values contain HTML. Only text is ever kept — nothing is injected into the page. */
export function htmlToText(value: string | undefined): string | null {
  if (!value) return null;
  const text = typeof DOMParser === "undefined"
    ? value.replace(/<[^>]*>/g, " ")
    : new DOMParser().parseFromString(value, "text/html").body.textContent ?? "";
  const normalized = text.replace(/\s+/g, " ").trim();
  const assumed = /^No machine-readable author provided\.\s*(.+?)\s+assumed/i.exec(normalized);
  const result = assumed?.[1] ?? normalized;
  return result ? result.slice(0, 120) : null;
}

function apiUrl(base: string, params: Record<string, string>): string {
  const search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", origin: "*", ...params });
  return `${base}?${search.toString()}`;
}

async function getJson<T>(fetcher: FetchLike, url: string, signal?: AbortSignal): Promise<T | null> {
  const response = await fetcher(url, { signal, credentials: "omit" });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

function acceptsPage(page: WikiPage | undefined, term: ImageSearchTerm): page is WikiPage & { pageimage: string } {
  if (!page || page.missing || !page.pageimage || page.pageprops?.disambiguation !== undefined) return false;
  if (UNSUITABLE_FILE.test(page.pageimage)) return false;
  if (!term.near) return true;
  const coordinate = page.coordinates?.[0];
  if (!coordinate) return false;
  return distanceKm(term.near, { latitude: coordinate.lat, longitude: coordinate.lon }) <= term.maxDistanceKm;
}

/**
 * Wikimedia-backed provider using only official, CORS-enabled APIs:
 * 1. exact article lookup (pt, then en) with coordinates to reject homonyms;
 * 2. Commons `imageinfo` for a sized thumbnail plus author and license.
 * Images without a Commons record (and thus without attribution) are skipped.
 */
export function createWikimediaImageProvider(fetcher: FetchLike = (input, init) => fetch(input, init)): DiscoveryImageProvider {
  /** Portuguese first, English as a complement; both looked up in parallel to keep latency low. */
  async function findArticleImages(term: ImageSearchTerm, signal?: AbortSignal) {
    const pages = await Promise.all(
      WIKI_LANGUAGES.map((language) =>
        getJson<{ query?: { pages?: WikiPage[] } }>(
          fetcher,
          apiUrl(`https://${language}.wikipedia.org/w/api.php`, {
            titles: term.title,
            redirects: "1",
            prop: "pageimages|coordinates|pageprops",
            piprop: "name",
            pilicense: "free",
            ppprop: "disambiguation",
            colimit: "1",
          }),
          signal,
        )
          .then((data) => data?.query?.pages?.[0])
          .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === "AbortError") throw error;
            return undefined;
          }),
      ),
    );
    const seen = new Set<string>();
    return pages.flatMap((page) => {
      if (!acceptsPage(page, term) || seen.has(page.pageimage)) return [];
      seen.add(page.pageimage);
      return [{ file: page.pageimage, subject: page.title }];
    });
  }

  async function describeFile(file: string, subject: string, signal?: AbortSignal): Promise<DiscoveryImage | null> {
    const data = await getJson<{ query?: { pages?: Array<{ missing?: boolean; imageinfo?: CommonsImageInfo[] }> } }>(
      fetcher,
      apiUrl(COMMONS_API, {
        titles: `File:${file}`,
        prop: "imageinfo",
        iiprop: "url|extmetadata|mime",
        iiurlwidth: String(THUMB_WIDTH),
        iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
      }),
      signal,
    );
    const page = data?.query?.pages?.[0];
    const info = page?.imageinfo?.[0];
    if (!page || page.missing || !info?.thumburl || !info.descriptionurl) return null;
    if (info.mime && !/^image\/(jpeg|png|webp)$/.test(info.mime)) return null;
    const metadata = info.extmetadata ?? {};
    return {
      src: info.thumburl,
      width: info.thumbwidth ?? THUMB_WIDTH,
      height: info.thumbheight ?? Math.round(THUMB_WIDTH * 0.66),
      subject,
      author: htmlToText(metadata.Artist?.value),
      license: htmlToText(metadata.LicenseShortName?.value),
      licenseUrl: metadata.LicenseUrl?.value?.startsWith("https://") ? metadata.LicenseUrl.value : null,
      sourceName: "Wikimedia Commons",
      sourceUrl: info.descriptionurl,
    };
  }

  return {
    name: "wikimedia",
    async findImage(terms, signal) {
      for (const term of terms.slice(0, MAX_TERMS)) {
        for (const article of await findArticleImages(term, signal)) {
          const image = await describeFile(article.file, article.subject, signal);
          if (image && image.height <= image.width * MAX_PORTRAIT_RATIO) return image;
        }
      }
      return null;
    },
  };
}
