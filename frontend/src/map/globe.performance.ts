export interface GlobePerformanceProfile {
  isLowEnd: boolean;
  workerCount: number;
  pixelRatio: number;
}

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

let configured = false;

interface MapLibrePerformanceApi {
  setWorkerCount: (count: number) => void;
  prewarm: () => void;
}

export function detectGlobePerformance(
  navigatorLike: NavigatorWithMemory = navigator,
  devicePixelRatio = window.devicePixelRatio,
): GlobePerformanceProfile {
  const cores = navigatorLike.hardwareConcurrency || 4;
  const memory = navigatorLike.deviceMemory;
  const isLowEnd = cores <= 4 || (memory !== undefined && memory <= 4);
  return {
    isLowEnd,
    workerCount: isLowEnd ? 1 : Math.min(4, Math.max(2, Math.floor(cores / 2))),
    pixelRatio: Math.min(devicePixelRatio, isLowEnd ? 1 : 1.5),
  };
}

export function configureMapLibreWorkers(
  profile: GlobePerformanceProfile,
  maplibre: MapLibrePerformanceApi,
): void {
  if (configured) return;
  maplibre.setWorkerCount(profile.workerCount);
  maplibre.prewarm();
  configured = true;
}
