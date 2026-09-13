import { describe, expect, it } from "vitest";

import { EARTH_RADIUS_KM } from "./drilling.constants";
import {
  depthAtProgress,
  frameAtProgress,
  layerAtDepth,
  telemetryAtProgress,
  visualProgressAtPhysicalProgress,
} from "./drillingMath";

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
    expect(telemetryAtProgress(0.5).direction).toBe("centro");
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

  it("derives physical and didactic data from the same progress at every boundary", () => {
    const boundaries = [
      { depthKm: 35, layer: "Manto", visualRadius: 0.94 },
      { depthKm: 2_890, layer: "Núcleo externo", visualRadius: 1 - (2_890 / EARTH_RADIUS_KM) },
      { depthKm: 5_150, layer: "Núcleo interno", visualRadius: 1 - (5_150 / EARTH_RADIUS_KM) },
    ] as const;

    boundaries.forEach(({ depthKm, layer, visualRadius }) => {
      const descendingProgress = depthKm / (EARTH_RADIUS_KM * 2);
      const descending = frameAtProgress(descendingProgress);
      const ascending = frameAtProgress(1 - descendingProgress);
      expect(descending.depthKm).toBeCloseTo(depthKm, 8);
      expect(descending.layer).toBe(layer);
      const visualX = -1.08 + 2.16 * descending.visualProgress;
      expect(Math.abs(visualX)).toBeCloseTo(visualRadius, 8);
      expect(ascending.depthKm).toBeCloseTo(depthKm, 8);
      expect(ascending.layer).toBe(layer);
      expect(ascending.visualProgress).toBeCloseTo(1 - descending.visualProgress, 8);
    });
  });

  it("places progress 0.5 at the exact physical and visual center", () => {
    expect(frameAtProgress(0.5)).toMatchObject({
      progress: 0.5,
      visualProgress: 0.5,
      depthKm: EARTH_RADIUS_KM,
      distanceRemainingKm: 0,
      direction: "centro",
      layer: "Núcleo interno",
    });
  });
});
