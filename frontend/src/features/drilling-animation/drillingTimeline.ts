import {
  EARTH_LAYER_BOUNDARIES_KM,
  EARTH_RADIUS_KM,
  VISUAL_LAYER_RADII,
} from "./drilling.constants";
import type { DrillingVisualState } from "./drillingMachine";

export interface TimelineSegment {
  state: DrillingVisualState;
  durationMs: number;
  progressStart: number;
  progressEnd: number;
}

export interface TimelineSample {
  state: DrillingVisualState;
  progress: number;
  visualProgress: number;
  completed: boolean;
}

const progressForDepth = (depthKm: number) => depthKm / (EARTH_RADIUS_KM * 2);
const ROUTE_EXTENT = 1.08;
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

export function visualProgressAtPhysicalProgress(progress: number): number {
  const normalized = Math.min(1, Math.max(0, progress));
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

function visualProgressForState(
  state: DrillingVisualState,
  physicalProgress: number,
  segmentProgress: number,
): number {
  const surfaceStart = VISUAL_KNOTS[0]![1];
  const crustExitStart = VISUAL_KNOTS.at(-2)![1];
  if (state === "entering_earth") return lerp(0, surfaceStart, segmentProgress);
  if (state === "exiting_earth") return lerp(crustExitStart, 1, segmentProgress);
  if (["crossing_crust", "crossing_mantle", "crossing_outer_core", "crossing_inner_core", "crossing_center", "ascending"].includes(state)) {
    return visualProgressAtPhysicalProgress(physicalProgress);
  }
  if (state === "revealing_destination" || state === "completed") return 1;
  return 0;
}

export function createDrillingTimeline(reducedMotion: boolean): TimelineSegment[] {
  if (reducedMotion) {
    return [
      { state: "preparing", durationMs: 80, progressStart: 0, progressEnd: 0 },
      { state: "showing_route", durationMs: 220, progressStart: 0, progressEnd: 0 },
      { state: "revealing_destination", durationMs: 320, progressStart: 0, progressEnd: 1 },
      { state: "completed", durationMs: 0, progressStart: 1, progressEnd: 1 },
    ];
  }

  const crust = progressForDepth(EARTH_LAYER_BOUNDARIES_KM.crust);
  const mantle = progressForDepth(EARTH_LAYER_BOUNDARIES_KM.mantle);
  const outerCore = progressForDepth(EARTH_LAYER_BOUNDARIES_KM.outerCore);
  return [
    { state: "preparing", durationMs: 500, progressStart: 0, progressEnd: 0 },
    { state: "zooming_out", durationMs: 1_800, progressStart: 0, progressEnd: 0 },
    { state: "showing_route", durationMs: 1_200, progressStart: 0, progressEnd: 0 },
    { state: "entering_earth", durationMs: 700, progressStart: 0, progressEnd: 0 },
    { state: "crossing_crust", durationMs: 700, progressStart: 0, progressEnd: crust },
    { state: "crossing_mantle", durationMs: 2_800, progressStart: crust, progressEnd: mantle },
    { state: "crossing_outer_core", durationMs: 2_200, progressStart: mantle, progressEnd: outerCore },
    { state: "crossing_inner_core", durationMs: 1_500, progressStart: outerCore, progressEnd: 0.49 },
    { state: "crossing_center", durationMs: 1_400, progressStart: 0.49, progressEnd: 0.51 },
    { state: "ascending", durationMs: 3_500, progressStart: 0.51, progressEnd: 1 - crust },
    { state: "exiting_earth", durationMs: 900, progressStart: 1 - crust, progressEnd: 1 },
    { state: "revealing_destination", durationMs: 1_500, progressStart: 1, progressEnd: 1 },
    { state: "completed", durationMs: 0, progressStart: 1, progressEnd: 1 },
  ];
}

export function timelineDuration(timeline: TimelineSegment[]): number {
  return timeline.reduce((total, segment) => total + segment.durationMs, 0);
}

export function sampleTimeline(timeline: TimelineSegment[], elapsedMs: number): TimelineSample {
  const elapsed = Math.max(0, elapsedMs);
  let cursor = 0;
  for (const segment of timeline) {
    const end = cursor + segment.durationMs;
    if (segment.durationMs === 0 || elapsed < end) {
      const local = segment.durationMs === 0 ? 1 : (elapsed - cursor) / segment.durationMs;
      const progress = segment.progressStart + (segment.progressEnd - segment.progressStart) * local;
      return {
        state: segment.state,
        progress,
        visualProgress: visualProgressForState(segment.state, progress, local),
        completed: segment.state === "completed",
      };
    }
    cursor = end;
  }
  return { state: "completed", progress: 1, visualProgress: 1, completed: true };
}
