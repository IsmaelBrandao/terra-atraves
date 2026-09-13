import type { ReverseGeocodingResponse } from "../../api/client";

export interface LocationDescription {
  primary: string;
  secondary: string | null;
}

const LOCALITY_KEYS = [
  "city",
  "town",
  "village",
  "municipality",
  "hamlet",
  "suburb",
  "county",
  "island",
  "archipelago",
] as const;

const REGION_KEYS = ["state", "region", "province", "state_district"] as const;
const UNIDENTIFIED = "Local não identificado";

const coordinateFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const integerFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

function firstValue(address: Record<string, string>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = address[key]?.trim();
    if (value) return value;
  }
  return null;
}

function uniqueParts(parts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  return parts.filter((part): part is string => {
    if (!part) return false;
    const key = part.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Turns a Nominatim-style address into a human title and a "state, country" line. */
export function describeLocation(data: ReverseGeocodingResponse | undefined): LocationDescription | null {
  if (!data) return null;
  const address = data.address ?? {};
  const locality = firstValue(address, LOCALITY_KEYS);
  const region = firstValue(address, REGION_KEYS);
  const country = address.country?.trim() || null;
  const displayHead = data.display_name?.split(",")[0]?.trim();
  const fallback = displayHead && displayHead !== UNIDENTIFIED ? displayHead : null;

  const primary = locality ?? region ?? fallback ?? country;
  if (!primary) return null;
  const secondary = uniqueParts([region, country]).filter((part) => part !== primary);
  return { primary, secondary: secondary.length ? secondary.join(", ") : null };
}

export function formatCoordinate(value: number, axis: "lat" | "lon"): string {
  const hemisphere = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "L" : "O";
  return `${coordinateFormatter.format(Math.abs(value))}° ${hemisphere}`;
}

export function formatCoordinatePair(point: { latitude: number; longitude: number }): string {
  return `${formatCoordinate(point.latitude, "lat")}, ${formatCoordinate(point.longitude, "lon")}`;
}

export function formatSignedCoordinate(value: number): string {
  return `${value.toFixed(4)}°`;
}

export function formatKilometers(distanceKm: number): string {
  if (distanceKm < 10) return `${distanceKm.toFixed(1).replace(".", ",")} km`;
  return `${integerFormatter.format(Math.round(distanceKm))} km`;
}
