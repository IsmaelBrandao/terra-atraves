import { describe, expect, it } from "vitest";

import {
  INITIAL_DRILLING_MACHINE,
  isDrillingSequenceActive,
  transitionDrillingMachine,
} from "./drillingMachine";

describe("drillingMachine", () => {
  it("advances through semantic states without independent flags", () => {
    const preparing = transitionDrillingMachine(INITIAL_DRILLING_MACHINE, {
      type: "ADVANCE",
      target: "preparing",
    });
    const center = transitionDrillingMachine(preparing, {
      type: "ADVANCE",
      target: "crossing_center",
    });
    expect(center.state).toBe("crossing_center");
    expect(isDrillingSequenceActive(center.state)).toBe(true);
  });

  it("pauses, resumes the previous phase and cancels", () => {
    const running = { state: "crossing_mantle", resumeState: null } as const;
    const paused = transitionDrillingMachine(running, { type: "PAUSE" });
    expect(paused).toEqual({ state: "paused", resumeState: "crossing_mantle" });
    expect(transitionDrillingMachine(paused, { type: "RESUME" }).state).toBe("crossing_mantle");
    expect(transitionDrillingMachine(paused, { type: "CANCEL" }).state).toBe("cancelled");
  });

  it("does not move backwards accidentally", () => {
    const current = { state: "ascending", resumeState: null } as const;
    expect(
      transitionDrillingMachine(current, { type: "ADVANCE", target: "crossing_crust" }),
    ).toBe(current);
  });
});
