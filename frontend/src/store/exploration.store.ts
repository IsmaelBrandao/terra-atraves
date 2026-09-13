import { create } from "zustand";

export interface SelectedPoint {
  latitude: number;
  longitude: number;
}

interface ExplorationState {
  selectedPoint: SelectedPoint | null;
  currentDrillingId: string | null;
  panelOpen: boolean;
  selectPoint: (point: SelectedPoint) => void;
  resetExploration: () => void;
  setCurrentDrillingId: (id: string | null) => void;
  setPanelOpen: (open: boolean) => void;
}

export const useExplorationStore = create<ExplorationState>((set) => ({
  selectedPoint: null,
  currentDrillingId: null,
  panelOpen: true,
  selectPoint: (selectedPoint) =>
    set({ selectedPoint, currentDrillingId: null, panelOpen: true }),
  resetExploration: () =>
    set({ selectedPoint: null, currentDrillingId: null, panelOpen: true }),
  setCurrentDrillingId: (currentDrillingId) => set({ currentDrillingId }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
}));
