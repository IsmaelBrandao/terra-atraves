export const EARTH_RADIUS_KM = 6_371;

export const EARTH_LAYER_BOUNDARIES_KM = {
  crust: 35,
  mantle: 2_890,
  outerCore: 5_150,
  innerCore: EARTH_RADIUS_KM,
} as const;

export const VISUAL_LAYER_RADII = {
  surface: 1,
  crustInner: 0.94,
  outerCore: (EARTH_RADIUS_KM - EARTH_LAYER_BOUNDARIES_KM.mantle) / EARTH_RADIUS_KM,
  innerCore: (EARTH_RADIUS_KM - EARTH_LAYER_BOUNDARIES_KM.outerCore) / EARTH_RADIUS_KM,
} as const;

export const DRILLING_TELEMETRY_EVENT = "terra-atraves:drilling-telemetry";
export const TELEMETRY_INTERVAL_MS = 125;
