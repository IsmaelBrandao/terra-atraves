import { describe, expect, it } from "vitest";

import { EARTH_RADIUS_KM } from "./drilling.constants";
import { depthAtProgress, layerAtDepth, telemetryAtProgress } from "./drillingMath";
import { visualProgressAtPhysicalProgress } from "./drillingTimeline";

describe("drillingMath", () => {
  it("derives depth from a straight diameter instead of random values", () => {
    expect(depthAtProgress(0)).toBe(0);
    expect(depthAtProgress(0.5)).toBe(EARTH_RADIUS_KM);
    expect(depthAtProgress(1)).toBe(0);
  });

  it("maps scientific depth boundaries to Earth layers", () => {
    expect(layerAtDepth(20)).toBe("Crosta");
    expect(layerAtDepth(35)).toBe("Manto");
    expect(layerAtDepth(1_000)).toBe("Manto");
    expect(layerAtDepth(2_890)).toBe("Núcleo externo");
    expect(layerAtDepth(4_000)).toBe("Núcleo externo");
    expect(layerAtDepth(5_150)).toBe("Núcleo interno");
    expect(layerAtDepth(6_000)).toBe("Núcleo interno");
  });

  it("changes remaining-distance target after the center", () => {
    expect(telemetryAtProgress(0.25).direction).toBe("descendo");
    expect(telemetryAtProgress(0.75).direction).toBe("subindo");
    expect(telemetryAtProgress(0.25).depthKm).toBe(telemetryAtProgress(0.75).depthKm);
  });

  it("maps physical boundaries onto the enlarged didactic layers", () => {
    const crust = 35 / (EARTH_RADIUS_KM * 2);
    const mantle = 2_890 / (EARTH_RADIUS_KM * 2);
    expect(visualProgressAtPhysicalProgress(0)).toBeCloseTo(0.037, 3);
    expect(visualProgressAtPhysicalProgress(crust)).toBeCloseTo(0.065, 3);
    expect(visualProgressAtPhysicalProgress(mantle)).toBeCloseTo(0.247, 3);
    expect(visualProgressAtPhysicalProgress(0.5)).toBe(0.5);
    expect(visualProgressAtPhysicalProgress(0.25)).toBeCloseTo(1 - visualProgressAtPhysicalProgress(0.75), 6);
  });
});
