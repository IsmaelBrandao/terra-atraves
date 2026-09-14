import type { DrillingResponse } from "../../api/client";
import { EARTH_RADIUS_KM } from "../drilling-animation/drilling.constants";
import type { GeoPoint } from "../../map/initialView";
import type { LocationDescription } from "../location/formatLocation";

export interface DiscoveryPlace {
  name: string;
  detail: string | null;
  coordinates: GeoPoint | null;
  distanceKm: number | null;
  distanceReference: "destino" | "costa" | null;
}

export interface DiscoveryOrigin {
  title: string;
  subtitle: string | null;
  coordinates: GeoPoint;
}

export interface ImageSearchTerm {
  title: string;
  /** Article coordinates must fall within this radius to be accepted. */
  near: GeoPoint | null;
  maxDistanceKm: number;
}

interface DiscoveryBase {
  title: string;
  antipode: GeoPoint;
  origin: DiscoveryOrigin;
  throughEarthKm: number;
  imageSearch: ImageSearchTerm[];
  imageContext: string;
}

export interface LandDiscovery extends DiscoveryBase {
  kind: "land";
  locale: string | null;
  country: string | null;
  state: string | null;
  nearestPlace: DiscoveryPlace | null;
}

export interface OceanDiscovery extends DiscoveryBase {
  kind: "ocean";
  nearestLand: DiscoveryPlace | null;
  nearestSettlement: DiscoveryPlace | null;
}

export type Discovery = LandDiscovery | OceanDiscovery;

const NEARBY_TITLE_KM = 30;
export const UNNAMED_LAND = "Pequena ilha ou costa";
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Straight-line (chord) distance through the planet between two surface points. */
export function chordDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const dLat = lat2 - lat1;
  const dLon = toRadians(to.longitude - from.longitude);
  const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const centralAngle = 2 * Math.asin(Math.min(1, Math.sqrt(haversine)));
  return 2 * EARTH_RADIUS_KM * Math.sin(centralAngle / 2);
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function joinParts(parts: Array<string | null>, separator = ", "): string | null {
  const unique = parts.filter((part, index): part is string => !!part && parts.indexOf(part) === index);
  return unique.length ? unique.join(separator) : null;
}

function addImageSearchTerm(terms: ImageSearchTerm[], term: ImageSearchTerm | null): void {
  if (!term) return;
  const normalized = term.title.toLocaleLowerCase("pt-BR");
  if (!terms.some((item) => item.title.toLocaleLowerCase("pt-BR") === normalized)) terms.push(term);
}

function buildOrigin(job: DrillingResponse, location: LocationDescription | null): DiscoveryOrigin {
  const rawLabelHead = clean(job.origin_label?.split(",")[0]);
  // Nominatim's placeholder for open water is not a place name.
  const labelHead = rawLabelHead === "Local não identificado" ? null : rawLabelHead;
  return {
    title: location?.primary ?? labelHead ?? "Ponto de origem",
    subtitle: location?.secondary ?? null,
    coordinates: job.origin,
  };
}

/**
 * Maps the API result into what the discovery modal shows. Every optional field is either
 * resolved into human text or omitted — the UI never needs to print `null`.
 */
export function buildDiscovery(job: DrillingResponse, originLocation: LocationDescription | null): Discovery | null {
  const destination = job.destination;
  const antipode = job.antipode;
  if (!destination || !antipode) return null;

  const base = {
    antipode,
    origin: buildOrigin(job, originLocation),
    throughEarthKm: chordDistanceKm(job.origin, antipode),
  };

  if (destination.type === "land") {
    const country = clean(destination.country?.name);
    const state = clean(destination.state?.name);
    const place = destination.nearest_place;
    const placeName = clean(place?.name);
    const closePlace = placeName && place && place.distance_km <= NEARBY_TITLE_KM ? placeName : null;
    const title = closePlace ?? state ?? country ?? clean(job.destination_label) ?? "Terra firme";
    const locale = joinParts([state, country].filter((part) => part !== title));

    const imageSearch: ImageSearchTerm[] = [];
    if (placeName && place) addImageSearchTerm(imageSearch, { title: placeName, near: place.coordinates, maxDistanceKm: 60 });
    if (state) addImageSearchTerm(imageSearch, { title: state, near: antipode, maxDistanceKm: 900 });
    if (country) addImageSearchTerm(imageSearch, { title: country, near: null, maxDistanceKm: Infinity });

    return {
      ...base,
      kind: "land",
      title,
      locale,
      country,
      state,
      nearestPlace:
        placeName && place
          ? {
              name: placeName,
              detail: clean(place.country),
              coordinates: place.coordinates,
              distanceKm: place.distance_km,
              distanceReference: "destino",
            }
          : null,
      imageSearch,
      imageContext: title,
    };
  }

  const land = destination.nearest_land;
  const landCountry = clean(land?.country?.name);
  const landPlace = land?.nearest_place ?? null;
  const landPlaceName = clean(landPlace?.name);
  const directPlace = destination.nearest_place;
  const directPlaceName = clean(directPlace?.name);

  const landPlaceCountry = clean(landPlace?.country);
  const oceanTitle = clean(job.destination_label) ?? "Oceano";
  // Without a country polygon the coast is usually a small island. The reference place can be
  // hundreds of km away, so it never becomes the name of the land itself.
  const nearestLand: DiscoveryPlace | null = land
    ? {
        name: landCountry ?? UNNAMED_LAND,
        detail: landPlaceName ? `Localidade de referência: ${joinParts([landPlaceName, landPlaceCountry])}` : null,
        coordinates: land.coordinates,
        distanceKm: land.distance_km,
        distanceReference: "destino",
      }
    : null;

  const nearestSettlement: DiscoveryPlace | null =
    directPlaceName && directPlace
      ? {
          name: directPlaceName,
          detail: clean(directPlace.country),
          coordinates: directPlace.coordinates,
          distanceKm: directPlace.distance_km,
          distanceReference: "destino",
        }
      : landPlaceName && landPlace
        ? {
            name: landPlaceName,
            detail: clean(landPlace.country),
            coordinates: landPlace.coordinates,
            distanceKm: landPlace.distance_km,
            distanceReference: "costa",
          }
        : null;

  const imageSearch: ImageSearchTerm[] = [];
  const settlementName = nearestSettlement?.name ?? null;
  if (settlementName && nearestSettlement?.coordinates) {
    addImageSearchTerm(imageSearch, { title: settlementName, near: nearestSettlement.coordinates, maxDistanceKm: 60 });
  }
  if (landPlaceName && landPlace && landPlaceName !== settlementName) {
    addImageSearchTerm(imageSearch, { title: landPlaceName, near: landPlace.coordinates, maxDistanceKm: 60 });
  }
  if (nearestLand?.name && nearestLand.name !== UNNAMED_LAND) {
    addImageSearchTerm(imageSearch, { title: nearestLand.name, near: null, maxDistanceKm: Infinity });
  }
  if (landCountry) addImageSearchTerm(imageSearch, { title: landCountry, near: null, maxDistanceKm: Infinity });
  if (landPlaceCountry) addImageSearchTerm(imageSearch, { title: landPlaceCountry, near: null, maxDistanceKm: Infinity });
  if (!/^(oceano|ocean|mar)$/i.test(oceanTitle)) {
    addImageSearchTerm(imageSearch, { title: oceanTitle, near: null, maxDistanceKm: Infinity });
  }

  return {
    ...base,
    kind: "ocean",
    title: oceanTitle,
    nearestLand,
    nearestSettlement,
    imageSearch,
    imageContext: settlementName ?? landCountry ?? "terra firme mais próxima",
  };
}
