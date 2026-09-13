export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface InitialGlobeView {
  center: [longitude: number, latitude: number];
  zoom: number;
  sharedOrigin: GeoPoint | null;
}

/** Geographic heart of Brazil, nudged north so South America reads as a whole on the globe. */
export const BRAZIL_VIEW_CENTER: [number, number] = [-54, -12];

// Empirical MapLibre globe calibration (radius of the rendered sphere at zoom 1.7). Tall, narrow
// viewports put the perspective camera closer to the globe, so the silhouette renders larger.
const REFERENCE_ZOOM = 1.7;
const REFERENCE_RADIUS_PX = 214;
const NARROW_REFERENCE_RADIUS_PX = 236;
const NARROW_VIEWPORT_PX = 640;
const MIN_ZOOM = 0.9;
const MAX_ZOOM = 2.6;

const COORDINATE_PATTERN = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * Keeps the whole planet in frame: the sphere takes ~70% of the viewport height on desktop
 * and ~80% of the width on narrow screens, so curvature and neighbouring continents stay visible.
 */
export function getInitialGlobeZoom(viewportWidth: number, viewportHeight: number): number {
  const diameter = Math.min(viewportHeight * 0.7, viewportWidth * 0.8);
  const referenceRadius = viewportWidth < NARROW_VIEWPORT_PX ? NARROW_REFERENCE_RADIUS_PX : REFERENCE_RADIUS_PX;
  const zoom = REFERENCE_ZOOM + Math.log2(diameter / 2 / referenceRadius);
  return Number(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)).toFixed(2));
}

function parseCoordinate(raw: string | null, limit: number): number | null {
  if (raw === null) return null;
  const value = raw.trim();
  if (!COORDINATE_PATTERN.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > limit) return null;
  return Number(parsed.toFixed(6));
}

/** Reads a shared origin from `?lat=&lon=`. Anything malformed or out of range is ignored. */
export function parseSharedOrigin(search: string): GeoPoint | null {
  const params = new URLSearchParams(search);
  const latitude = parseCoordinate(params.get("lat"), 90);
  const longitude = parseCoordinate(params.get("lon"), 180);
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
}

export function resolveInitialGlobeView(
  search: string,
  viewportWidth: number,
  viewportHeight: number,
): InitialGlobeView {
  const sharedOrigin = parseSharedOrigin(search);
  return {
    center: sharedOrigin ? [sharedOrigin.longitude, sharedOrigin.latitude] : BRAZIL_VIEW_CENTER,
    zoom: getInitialGlobeZoom(viewportWidth, viewportHeight),
    sharedOrigin,
  };
}
