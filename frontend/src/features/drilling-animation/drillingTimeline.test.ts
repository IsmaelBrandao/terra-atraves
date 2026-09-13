import { describe, expect, it } from "vitest";

import { createDrillingTimeline, sampleTimeline, timelineDuration } from "./drillingTimeline";

describe("drillingTimeline", () => {
  it("uses one eased progress for each half of the physical journey", () => {
    const timeline = createDrillingTimeline(false);
    expect(sampleTimeline(timeline, 4_500)).toMatchObject({ state: "descending", progress: 0 });
    expect(sampleTimeline(timeline, 8_750).state).toBe("descending");
    expect(sampleTimeline(timeline, 8_750).progress).toBeCloseTo(0.25, 12);
    expect(sampleTimeline(timeline, 13_000)).toMatchObject({ state: "crossing_center", progress: 0.5 });
    expect(sampleTimeline(timeline, 13_750)).toMatchObject({ state: "crossing_center", progress: 0.5 });
    expect(sampleTimeline(timeline, 18_500).state).toBe("ascending");
    expect(sampleTimeline(timeline, 18_500).progress).toBeCloseTo(0.75, 12);
    expect(sampleTimeline(timeline, 22_750)).toMatchObject({ state: "revealing_destination", progress: 1 });
  });

  it("holds the exact center and completes in the requested duration range", () => {
    const timeline = createDrillingTimeline(false);
    const center = timeline.find((segment) => segment.state === "crossing_center");
    expect(center).toMatchObject({ durationMs: 1_250, progressStart: 0.5, progressEnd: 0.5 });
    expect(timelineDuration(timeline)).toBe(25_750);
    expect(sampleTimeline(timeline, timelineDuration(timeline))).toEqual({
      state: "completed",
      progress: 1,
      completed: true,
    });
  });

  it("has no layer-specific timer segments", () => {
    const states = createDrillingTimeline(false).map((segment) => segment.state);
    expect(states).toEqual([
      "preparing",
      "zooming_out",
      "showing_route",
      "descending",
      "crossing_center",
      "ascending",
      "revealing_destination",
      "completed",
    ]);
  });

  it("does not skip the physical journey when reduced motion is active", () => {
    const regular = createDrillingTimeline(false);
    const reduced = createDrillingTimeline(true);
    expect(reduced).toEqual(regular);
    expect(timelineDuration(reduced)).toBe(25_750);
    expect(reduced.some((segment) => segment.state === "descending")).toBe(true);
    expect(reduced.some((segment) => segment.state === "ascending")).toBe(true);
  });
});
