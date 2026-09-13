import { formatCoordinatePair, formatKilometers } from "../../location/formatLocation";
import { UNNAMED_LAND, type Discovery } from "../discoveryContent";

export interface ShareCardContent {
  originTitle: string;
  originSubtitle: string;
  destinationTitle: string;
  destinationSubtitle: string;
  kindLabel: string;
  distanceLabel: string;
  footnote: string | null;
  siteLabel: string;
  filename: string;
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function buildShareCardContent(discovery: Discovery, siteUrl: string): ShareCardContent {
  const destinationSubtitle =
    discovery.kind === "land"
      ? discovery.locale ?? formatCoordinatePair(discovery.antipode)
      : formatCoordinatePair(discovery.antipode);

  const footnote =
    discovery.kind === "ocean" && discovery.nearestLand?.distanceKm != null
      ? discovery.nearestLand.name === UNNAMED_LAND
        ? `Terra firme mais próxima a ${formatKilometers(discovery.nearestLand.distanceKm)}`
        : `Terra firme mais próxima: ${discovery.nearestLand.name} · ${formatKilometers(discovery.nearestLand.distanceKm)}`
      : discovery.kind === "land" && discovery.nearestPlace && discovery.nearestPlace.name !== discovery.title
        ? `Perto de ${discovery.nearestPlace.name}`
        : null;

  let siteLabel = siteUrl;
  try {
    const url = new URL(siteUrl);
    siteLabel = `${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    // Keep the raw value.
  }

  return {
    originTitle: discovery.origin.title,
    originSubtitle: discovery.origin.subtitle ?? formatCoordinatePair(discovery.origin.coordinates),
    destinationTitle: discovery.title,
    destinationSubtitle,
    kindLabel: discovery.kind === "ocean" ? "Destino oceânico" : "Destino em terra firme",
    distanceLabel: `${formatKilometers(discovery.throughEarthKm)} através da Terra`,
    footnote,
    siteLabel,
    filename: `terra-atraves-${slug(discovery.origin.title) || "origem"}-${slug(discovery.title) || "antipoda"}.png`,
  };
}
