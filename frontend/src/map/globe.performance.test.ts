import { describe, expect, it } from "vitest";

import { detectGlobePerformance, getInitialGlobeZoom } from "./globe.performance";

function hardware(cores: number, memory?: number): Navigator & { deviceMemory?: number } {
  return { hardwareConcurrency: cores, deviceMemory: memory } as Navigator & {
    deviceMemory?: number;
  };
}

describe("detectGlobePerformance", () => {
  it("lets the earth dominate wide screens without overwhelming mobile", () => {
    expect(getInitialGlobeZoom(1920)).toBe(2.1);
    expect(getInitialGlobeZoom(1024)).toBe(1.7);
    expect(getInitialGlobeZoom(360)).toBe(1.35);
  });
  it("limits low-end devices to one worker and pixel ratio 1", () => {
    expect(detectGlobePerformance(hardware(4, 4), 2)).toEqual({
      isLowEnd: true,
      workerCount: 1,
      pixelRatio: 1,
    });
  });

  it("caps regular displays at pixel ratio 1.5", () => {
    expect(detectGlobePerformance(hardware(12, 16), 2)).toEqual({
      isLowEnd: false,
      workerCount: 4,
      pixelRatio: 1.5,
    });
  });
});
