import { EARTH_LAYER_BOUNDARIES_KM, EARTH_RADIUS_KM } from "./drilling.constants";

export type EarthLayer = "Crosta" | "Manto" | "Núcleo externo" | "Núcleo interno";

export interface DrillingTelemetry {
  progress: number;
  depthKm: number;
  distanceRemainingKm: number;
  direction: "descendo" | "subindo";
  layer: EarthLayer;
}
export function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}

export function depthAtProgress(progress: number): number {
  const normalized = clampProgress(progress);
  return 2 * EARTH_RADIUS_KM * Math.min(normalized, 1 - normalized);
}

export function layerAtDepth(depthKm: number): EarthLayer {
  const depth = Math.min(EARTH_RADIUS_KM, Math.max(0, depthKm));
  if (depth <= EARTH_LAYER_BOUNDARIES_KM.crust) return "Crosta";
  if (depth <= EARTH_LAYER_BOUNDARIES_KM.mantle) return "Manto";
  if (depth <= EARTH_LAYER_BOUNDARIES_KM.outerCore) return "Núcleo externo";
  return "Núcleo interno";
}

export function telemetryAtProgress(progress: number): DrillingTelemetry {
  const normalized = clampProgress(progress);
  const depthKm = depthAtProgress(normalized);
  const descending = normalized <= 0.5;
  return {
    progress: normalized,
    depthKm,
    distanceRemainingKm: descending ? EARTH_RADIUS_KM - depthKm : depthKm,
    direction: descending ? "descendo" : "subindo",
    layer: layerAtDepth(depthKm),
  };
}
