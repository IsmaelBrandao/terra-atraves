import { useCurrentDiscovery } from "../features/discovery/useCurrentDiscovery";
import { useDrillingExperience } from "../features/drilling-animation/useDrillingExperience";
import { useExplorationStore } from "../store/exploration.store";

export type PanelMode = "explore" | "selected" | "drilling" | "discovery";

/** Progressive disclosure: the panel only shows what the current step of the journey needs. */
export function usePanelMode(): PanelMode {
  const point = useExplorationStore((state) => state.selectedPoint);
  const experience = useDrillingExperience();
  const discovery = useCurrentDiscovery();
  if (!point) return "explore";
  if (experience.isActive) return "drilling";
  if (experience.phase === "completed" && discovery) return "discovery";
  return "selected";
}
