import { EARTH_LAYER_BOUNDARIES_KM, EARTH_RADIUS_KM } from "./drilling.constants";
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
  completed: boolean;
}

const progressForDepth = (depthKm: number) => depthKm / (EARTH_RADIUS_KM * 2);

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
    { state: "preparing", durationMs: 300, progressStart: 0, progressEnd: 0 },
    { state: "zooming_out", durationMs: 1_400, progressStart: 0, progressEnd: 0 },
    { state: "showing_route", durationMs: 800, progressStart: 0, progressEnd: 0 },
    { state: "entering_earth", durationMs: 350, progressStart: 0, progressEnd: 0 },
    { state: "crossing_crust", durationMs: 350, progressStart: 0, progressEnd: crust },
    { state: "crossing_mantle", durationMs: 1_800, progressStart: crust, progressEnd: mantle },
    { state: "crossing_outer_core", durationMs: 1_300, progressStart: mantle, progressEnd: outerCore },
    { state: "crossing_inner_core", durationMs: 800, progressStart: outerCore, progressEnd: 0.49 },
    { state: "crossing_center", durationMs: 600, progressStart: 0.49, progressEnd: 0.51 },
    { state: "ascending", durationMs: 2_500, progressStart: 0.51, progressEnd: 1 - crust },
    { state: "exiting_earth", durationMs: 500, progressStart: 1 - crust, progressEnd: 1 },
    { state: "revealing_destination", durationMs: 1_400, progressStart: 1, progressEnd: 1 },
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
      return {
        state: segment.state,
        progress: segment.progressStart + (segment.progressEnd - segment.progressStart) * local,
        completed: segment.state === "completed",
      };
    }
    cursor = end;
  }
  return { state: "completed", progress: 1, completed: true };
}
