import type { Map as MapLibreMap } from "maplibre-gl";
import { createContext } from "react";

import type { DrillingVisualState } from "./drillingMachine";
import type { DrillingQualityLevel } from "./performance/qualityProfile";

export interface DrillingExperienceContextValue {
  phase: DrillingVisualState;
  canStart: boolean;
  isActive: boolean;
  qualityLevel: DrillingQualityLevel | null;
  reducedMotion: boolean;
  attachMap: (map: MapLibreMap | null) => void;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
}

export const DrillingExperienceContext = createContext<DrillingExperienceContextValue | null>(null);
