import { describe, expect, it } from "vitest";

import { createDrillingTimeline, sampleTimeline, timelineDuration } from "./drillingTimeline";

describe("drillingTimeline", () => {
  it("crosses the center halfway through the physical route", () => {
    const timeline = createDrillingTimeline(false);
    const center = timeline.find((segment) => segment.state === "crossing_center");
    expect(center?.progressStart).toBe(0.49);
    expect(center?.progressEnd).toBe(0.51);
    expect(sampleTimeline(timeline, timelineDuration(timeline))).toEqual({
      state: "completed",
      progress: 1,
      visualProgress: 1,
      completed: true,
    });
  });

  it("uses a short origin-route-destination sequence for reduced motion", () => {
    const timeline = createDrillingTimeline(true);
    expect(timeline.map((segment) => segment.state)).toEqual([
      "preparing",
      "showing_route",
      "revealing_destination",
      "completed",
    ]);
    expect(timelineDuration(timeline)).toBe(620);
  });

  it("keeps the complete sequence slow enough to read every layer", () => {
    const timeline = createDrillingTimeline(false);
    expect(timelineDuration(timeline)).toBe(18_700);
    expect(timeline.find((segment) => segment.state === "crossing_center")?.durationMs).toBe(1_400);
  });
});
