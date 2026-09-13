import { describe, expect, it, vi } from "vitest";

import { withImageCache } from "./imageProvider";
import { createWikimediaImageProvider, htmlToText } from "./wikimediaImageProvider";

const biak = { title: "Biak", near: { latitude: -1.18, longitude: 136.08 }, maxDistanceKm: 60 };

function json(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

const commonsBody = {
  query: {
    pages: [
      {
        imageinfo: [
          {
            thumburl: "https://upload.wikimedia.org/biak.jpg",
            thumbwidth: 1280,
            thumbheight: 853,
            descriptionurl: "https://commons.wikimedia.org/wiki/File:Biak.jpg",
            mime: "image/jpeg",
            extmetadata: {
              Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Nomad">Nomad</a>' },
              LicenseShortName: { value: "CC BY 2.5" },
              LicenseUrl: { value: "https://creativecommons.org/licenses/by/2.5" },
            },
          },
        ],
      },
    ],
  },
};

describe("createWikimediaImageProvider", () => {
  it("returns a sized image with author, license and source", async () => {
    const fetcher = vi.fn((url: string) => {
      if (url.startsWith("https://pt.wikipedia.org")) return json({ query: { pages: [{ title: "Biak", missing: true }] } });
      if (url.startsWith("https://en.wikipedia.org")) {
        return json({ query: { pages: [{ title: "Biak", pageimage: "Biak.jpg", coordinates: [{ lat: -1, lon: 136 }] }] } });
      }
      return json(commonsBody);
    });
    const image = await createWikimediaImageProvider(fetcher).findImage([biak]);
    expect(image).toEqual({
      src: "https://upload.wikimedia.org/biak.jpg",
      width: 1280,
      height: 853,
      subject: "Biak",
      author: "Nomad",
      license: "CC BY 2.5",
      licenseUrl: "https://creativecommons.org/licenses/by/2.5",
      sourceName: "Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Biak.jpg",
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.every(([url]) => url.includes("origin=*"))).toBe(true);
  });

  it("rejects homonyms far away, flags and maps, then tries the next term", async () => {
    const fetcher = vi.fn((url: string) => {
      const title = new URL(url).searchParams.get("titles");
      if (title === "Biak") return json({ query: { pages: [{ title: "Biak", pageimage: "Biak.jpg", coordinates: [{ lat: 40, lon: 10 }] }] } });
      if (title === "Indonésia") return json({ query: { pages: [{ title: "Indonésia", pageimage: "Flag_of_Indonesia.svg" }] } });
      return json({ query: { pages: [] } });
    });
    const image = await createWikimediaImageProvider(fetcher).findImage([
      biak,
      { title: "Indonésia", near: null, maxDistanceKm: Infinity },
    ]);
    expect(image).toBeNull();
    expect(fetcher.mock.calls.some(([url]) => url.includes("commons"))).toBe(false);
  });

  it("skips portrait emblems and falls back to the other language's photo", async () => {
    const fetcher = vi.fn((url: string) => {
      if (url.startsWith("https://pt.wikipedia.org")) {
        return json({ query: { pages: [{ title: "Jaiapura", pageimage: "Brasao_urbano.jpeg", coordinates: [{ lat: -1.2, lon: 136.1 }] }] } });
      }
      if (url.startsWith("https://en.wikipedia.org")) {
        return json({ query: { pages: [{ title: "Biak", pageimage: "Biak.jpg", coordinates: [{ lat: -1, lon: 136 }] }] } });
      }
      const portrait = url.includes("Brasao");
      const info = commonsBody.query.pages[0]!.imageinfo[0]!;
      return json({ query: { pages: [{ imageinfo: [{ ...info, thumbheight: portrait ? 1620 : 853 }] }] } });
    });
    const image = await createWikimediaImageProvider(fetcher).findImage([biak]);
    expect(image?.subject).toBe("Biak");
  });

  it("returns null when nothing is found", async () => {
    const fetcher = vi.fn(() => json({}, false));
    await expect(createWikimediaImageProvider(fetcher).findImage([biak])).resolves.toBeNull();
  });
});

describe("withImageCache", () => {
  it("never lets a provider error break the discovery and caches successes", async () => {
    const failing = { name: "x", findImage: vi.fn().mockRejectedValue(new TypeError("network")) };
    await expect(withImageCache(failing).findImage([biak])).resolves.toBeNull();

    const aborted = new AbortController();
    aborted.abort();
    const slow = { name: "z", findImage: vi.fn((_terms: unknown, signal?: AbortSignal) => (signal?.aborted ? Promise.reject(new DOMException("x", "AbortError")) : Promise.resolve(null))) };
    // A cancelled first caller (e.g. StrictMode remount) must not poison the shared request.
    await expect(withImageCache(slow).findImage([biak], aborted.signal)).resolves.toBeNull();
    expect(slow.findImage).toHaveBeenCalledWith([biak]);

    const findImage = vi.fn().mockResolvedValue(null);
    const cached = withImageCache({ name: "y", findImage });
    await cached.findImage([biak]);
    await cached.findImage([biak]);
    expect(findImage).toHaveBeenCalledTimes(1);
  });
});

describe("htmlToText", () => {
  it("strips markup and Commons boilerplate", () => {
    expect(htmlToText('No machine-readable author provided. <a href="#">Nomadtales</a> assumed (based on copyright claims).')).toBe("Nomadtales");
    expect(htmlToText('<span class="fn"><b>Ana</b>  <i>Silva</i></span>')).toBe("Ana Silva");
    expect(htmlToText(undefined)).toBeNull();
  });
});
