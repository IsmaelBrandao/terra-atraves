import { describe, expect, it } from "vitest";

import { EARTH_RADIUS_KM } from "./drilling.constants";
import { depthAtProgress, layerAtDepth, telemetryAtProgress } from "./drillingMath";

describe("drillingMath", () => {
  it("derives depth from a straight diameter instead of random values", () => {
    expect(depthAtProgress(0)).toBe(0);
    expect(depthAtProgress(0.5)).toBe(EARTH_RADIUS_KM);
    expect(depthAtProgress(1)).toBe(0);
  });

  it("maps scientific depth boundaries to Earth layers", () => {
    expect(layerAtDepth(20)).toBe("Crosta");
    expect(layerAtDepth(1_000)).toBe("Manto");
    expect(layerAtDepth(4_000)).toBe("Núcleo externo");
    expect(layerAtDepth(6_000)).toBe("Núcleo interno");
  });

  it("changes remaining-distance target after the center", () => {
    expect(telemetryAtProgress(0.25).direction).toBe("descendo");
    expect(telemetryAtProgress(0.75).direction).toBe("subindo");
    expect(telemetryAtProgress(0.25).depthKm).toBe(telemetryAtProgress(0.75).depthKm);
  });
});
