import type { DrillingVisualState } from "./drillingMachine";

export interface TimelineSegment {
  state: DrillingVisualState;
  durationMs: number;
  progressStart: number;
  progressEnd: number;
  easing?: (progress: number) => number;
}

export interface TimelineSample {
  state: DrillingVisualState;
  progress: number;
  completed: boolean;
}

const lerp = (start: number, end: number, progress: number) => start + (end - start) * progress;

export function easeInOutSine(progress: number): number {
  return -(Math.cos(Math.PI * progress) - 1) / 2;
}

export function createDrillingTimeline(reducedMotion: boolean): TimelineSegment[] {
  const physicalJourney: TimelineSegment[] = [
    { state: "preparing", durationMs: 500, progressStart: 0, progressEnd: 0 },
    { state: "zooming_out", durationMs: 2_000, progressStart: 0, progressEnd: 0 },
    { state: "showing_route", durationMs: 2_000, progressStart: 0, progressEnd: 0 },
    {
      state: "descending",
      durationMs: 8_500,
      progressStart: 0,
      progressEnd: 0.5,
      easing: easeInOutSine,
    },
    { state: "crossing_center", durationMs: 1_250, progressStart: 0.5, progressEnd: 0.5 },
    {
      state: "ascending",
      durationMs: 8_500,
      progressStart: 0.5,
      progressEnd: 1,
      easing: easeInOutSine,
    },
    { state: "revealing_destination", durationMs: 3_000, progressStart: 1, progressEnd: 1 },
    { state: "completed", durationMs: 0, progressStart: 1, progressEnd: 1 },
  ];
  // Reduced motion removes camera/CSS transitions, never the physical journey itself.
  return reducedMotion ? physicalJourney.map((segment) => ({ ...segment })) : physicalJourney;
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
      const eased = segment.easing ? segment.easing(local) : local;
      return {
        state: segment.state,
        progress: lerp(segment.progressStart, segment.progressEnd, eased),
        completed: segment.state === "completed",
      };
    }
    cursor = end;
  }
  return { state: "completed", progress: 1, completed: true };
}
