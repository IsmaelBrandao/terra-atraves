import type { GlobePerformanceProfile } from "../../../map/globe.performance";

export type DrillingQualityLevel = "NORMAL" | "LOW_END";

export interface DrillingQualityProfile {
  level: DrillingQualityLevel;
  sphereSegments: number;
  shellOpacity: number;
  decorativeGlow: boolean;
}
export function createDrillingQualityProfile(
  globeProfile: Pick<GlobePerformanceProfile, "isLowEnd">,
): DrillingQualityProfile {
  return globeProfile.isLowEnd
    ? {
        level: "LOW_END",
        sphereSegments: 20,
        shellOpacity: 0.11,
        decorativeGlow: false,
      }
    : {
        level: "NORMAL",
        sphereSegments: 40,
        shellOpacity: 0.18,
        decorativeGlow: true,
      };
}
