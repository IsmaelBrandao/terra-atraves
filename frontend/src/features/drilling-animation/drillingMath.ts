import {
  EARTH_LAYER_BOUNDARIES_KM,
  EARTH_RADIUS_KM,
  VISUAL_LAYER_RADII,
} from "./drilling.constants";

export type EarthLayer = "Crosta" | "Manto" | "Núcleo externo" | "Núcleo interno";

export interface DrillingTelemetry {
  progress: number;
  depthKm: number;
  distanceRemainingKm: number;
  direction: "descendo" | "centro" | "subindo";
  layer: EarthLayer;
}

export interface DrillingFrame extends DrillingTelemetry {
  visualProgress: number;
}

const ROUTE_EXTENT = 1.08;
const progressForDepth = (depthKm: number) => depthKm / (EARTH_RADIUS_KM * 2);
const routeProgressForX = (x: number) => (x + ROUTE_EXTENT) / (ROUTE_EXTENT * 2);
const VISUAL_KNOTS: Array<[number, number]> = [
  [0, routeProgressForX(-VISUAL_LAYER_RADII.surface)],
  [progressForDepth(EARTH_LAYER_BOUNDARIES_KM.crust), routeProgressForX(-VISUAL_LAYER_RADII.crustInner)],
  [progressForDepth(EARTH_LAYER_BOUNDARIES_KM.mantle), routeProgressForX(-VISUAL_LAYER_RADII.outerCore)],
  [progressForDepth(EARTH_LAYER_BOUNDARIES_KM.outerCore), routeProgressForX(-VISUAL_LAYER_RADII.innerCore)],
  [0.5, 0.5],
  [1 - progressForDepth(EARTH_LAYER_BOUNDARIES_KM.outerCore), routeProgressForX(VISUAL_LAYER_RADII.innerCore)],
  [1 - progressForDepth(EARTH_LAYER_BOUNDARIES_KM.mantle), routeProgressForX(VISUAL_LAYER_RADII.outerCore)],
  [1 - progressForDepth(EARTH_LAYER_BOUNDARIES_KM.crust), routeProgressForX(VISUAL_LAYER_RADII.crustInner)],
  [1, routeProgressForX(VISUAL_LAYER_RADII.surface)],
];

const lerp = (start: number, end: number, progress: number) => start + (end - start) * progress;

export function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}

export function depthAtProgress(progress: number): number {
  const normalized = clampProgress(progress);
  const signedDistance = EARTH_RADIUS_KM * (1 - 2 * normalized);
  return EARTH_RADIUS_KM - Math.abs(signedDistance);
}

export function layerAtDepth(depthKm: number): EarthLayer {
  const depth = Math.min(EARTH_RADIUS_KM, Math.max(0, depthKm));
  const boundaryToleranceKm = 1e-9;
  if (depth < EARTH_LAYER_BOUNDARIES_KM.crust - boundaryToleranceKm) return "Crosta";
  if (depth < EARTH_LAYER_BOUNDARIES_KM.mantle - boundaryToleranceKm) return "Manto";
  if (depth < EARTH_LAYER_BOUNDARIES_KM.outerCore - boundaryToleranceKm) return "Núcleo externo";
  return "Núcleo interno";
}

export function telemetryAtProgress(progress: number): DrillingTelemetry {
  const normalized = clampProgress(progress);
  const depthKm = depthAtProgress(normalized);
  const direction = normalized < 0.5 ? "descendo" : normalized > 0.5 ? "subindo" : "centro";
  return {
    progress: normalized,
    depthKm,
    distanceRemainingKm: direction === "descendo" ? EARTH_RADIUS_KM - depthKm : direction === "subindo" ? depthKm : 0,
    direction,
    layer: layerAtDepth(depthKm),
  };
}

export function visualProgressAtPhysicalProgress(progress: number): number {
  const normalized = clampProgress(progress);
  for (let index = 1; index < VISUAL_KNOTS.length; index += 1) {
    const [endPhysical, endVisual] = VISUAL_KNOTS[index]!;
    if (normalized <= endPhysical) {
      const [startPhysical, startVisual] = VISUAL_KNOTS[index - 1]!;
      const local = (normalized - startPhysical) / (endPhysical - startPhysical);
      return lerp(startVisual, endVisual, local);
    }
  }
  return VISUAL_KNOTS.at(-1)![1];
}

export function frameAtProgress(progress: number): DrillingFrame {
  const telemetry = telemetryAtProgress(progress);
  return {
    ...telemetry,
    visualProgress: visualProgressAtPhysicalProgress(telemetry.progress),
  };
}
