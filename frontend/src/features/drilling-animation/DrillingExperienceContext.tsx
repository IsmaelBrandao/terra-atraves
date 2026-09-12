import type { Map as MapLibreMap } from "maplibre-gl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useDrillingStatus } from "../../hooks/useLocation";
import { detectGlobePerformance } from "../../map/globe.performance";
import { useExplorationStore } from "../../store/exploration.store";
import {
  isDrillingSequenceActive,
  type DrillingVisualState,
} from "./drillingMachine";
import { createDrillingQualityProfile, type DrillingQualityLevel } from "./performance/qualityProfile";

interface ExperienceController {
  start: () => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  dispose: () => void;
}

interface DrillingExperienceContextValue {
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

const DrillingExperienceContext = createContext<DrillingExperienceContextValue | null>(null);

export function DrillingExperienceProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<DrillingVisualState>("idle");
  const [qualityLevel, setQualityLevel] = useState<DrillingQualityLevel | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const mapRef = useRef<MapLibreMap | null>(null);
  const controllerRef = useRef<ExperienceController | null>(null);
  const loadingRef = useRef(false);
  const point = useExplorationStore((state) => state.selectedPoint);
  const drillingId = useExplorationStore((state) => state.currentDrillingId);
  const drillingStatus = useDrillingStatus();

  const attachMap = useCallback((map: MapLibreMap | null) => {
    mapRef.current = map;
  }, []);

  const canStart =
    drillingStatus.data?.status === "completed" &&
    drillingStatus.data.antipode !== null &&
    point !== null;

  const start = useCallback(async () => {
    const map = mapRef.current;
    const antipode = drillingStatus.data?.antipode;
    if (!map || !point || !antipode || !canStart || loadingRef.current) return;
    loadingRef.current = true;
    controllerRef.current?.dispose();
    setPhase("preparing");

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const quality = createDrillingQualityProfile(detectGlobePerformance());
    setReducedMotion(prefersReduced);
    setQualityLevel(quality.level);
    const loadStartedAt = performance.now();
    try {
      const { DrillingExperience } = await import("./DrillingExperience");
      window.dispatchEvent(
        new CustomEvent("terra-atraves:three-loaded", {
          detail: { durationMs: performance.now() - loadStartedAt },
        }),
      );
      const experience = new DrillingExperience({
        map,
        origin: point,
        destination: antipode,
        quality,
        reducedMotion: prefersReduced,
        onStateChange: setPhase,
      });
      controllerRef.current = experience;
      experience.start();
    } catch (error) {
      console.error("Não foi possível iniciar a experiência visual", error);
      controllerRef.current?.dispose();
      controllerRef.current = null;
      setPhase("cancelled");
    } finally {
      loadingRef.current = false;
    }
  }, [canStart, drillingStatus.data?.antipode, point]);

  const pause = useCallback(() => controllerRef.current?.pause(), []);
  const resume = useCallback(() => controllerRef.current?.resume(), []);
  const cancel = useCallback(() => controllerRef.current?.cancel(), []);

  useEffect(() => {
    controllerRef.current?.dispose();
    controllerRef.current = null;
    setPhase("idle");
  }, [drillingId]);

  useEffect(
    () => () => {
      controllerRef.current?.dispose();
    },
    [],
  );

  const value = useMemo<DrillingExperienceContextValue>(
    () => ({
      phase,
      canStart,
      isActive: isDrillingSequenceActive(phase),
      qualityLevel,
      reducedMotion,
      attachMap,
      start,
      pause,
      resume,
      cancel,
    }),
    [attachMap, canStart, cancel, pause, phase, qualityLevel, reducedMotion, resume, start],
  );

  return (
    <DrillingExperienceContext.Provider value={value}>
      {children}
    </DrillingExperienceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDrillingExperience(): DrillingExperienceContextValue {
  const context = useContext(DrillingExperienceContext);
  if (!context) throw new Error("DrillingExperienceProvider não encontrado");
  return context;
}
