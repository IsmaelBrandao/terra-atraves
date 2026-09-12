import { describe, expect, it } from "vitest";

import { createDrillingQualityProfile } from "./qualityProfile";

describe("createDrillingQualityProfile", () => {
  it("reduces geometry and decorative effects on low-end devices", () => {
    const low = createDrillingQualityProfile({ isLowEnd: true });
    const normal = createDrillingQualityProfile({ isLowEnd: false });
    expect(low.level).toBe("LOW_END");
    expect(low.sphereSegments).toBeLessThan(normal.sphereSegments);
    expect(low.decorativeGlow).toBe(false);
    expect(normal.level).toBe("NORMAL");
  });
});
