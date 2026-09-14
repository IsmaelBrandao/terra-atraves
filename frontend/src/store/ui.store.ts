import { create } from "zustand";

import type { MapReadinessStatus } from "../map/mapReadiness";

interface UiState {
  mapStatus: MapReadinessStatus;
  discoveryOpen: boolean;
  setMapStatus: (status: MapReadinessStatus) => void;
  openDiscovery: () => void;
  closeDiscovery: () => void;
}

/** Discrete shell state only — camera and per-frame data never pass through React. */
export const useUiStore = create<UiState>((set) => ({
  mapStatus: "initializing",
  discoveryOpen: false,
  setMapStatus: (mapStatus) => set({ mapStatus }),
  openDiscovery: () => set({ discoveryOpen: true }),
  closeDiscovery: () => set({ discoveryOpen: false }),
}));
