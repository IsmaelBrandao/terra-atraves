export type MapReadinessStatus = "initializing" | "loading-cartography" | "preparing" | "ready" | "failed";

export const MAP_READINESS_MESSAGES: Record<"initializing" | "loading-cartography" | "preparing", string> = {
  initializing: "Inicializando globo…",
  "loading-cartography": "Carregando cartografia…",
  preparing: "Preparando exploração…",
};

/** Minimum time the entry screen stays up, measured from navigation start, to avoid a flash. */
export const LOADING_MIN_VISIBLE_MS = 1_600;
/** Safety net: never keep the visitor behind the entry screen longer than this. */
export const LOADING_TIMEOUT_MS = 12_000;

type Listener = () => void;

export interface ReadinessMapLike {
  on: (type: "style.load" | "load" | "idle", listener: Listener) => unknown;
  off: (type: "style.load" | "load" | "idle", listener: Listener) => unknown;
}

export interface MapReadinessOptions {
  onStatus: (status: MapReadinessStatus, reason?: "idle" | "timeout") => void;
  minVisibleMs?: number;
  timeoutMs?: number;
  now?: () => number;
  setTimer?: (callback: () => void, delayMs: number) => number;
  clearTimer?: (id: number) => void;
}

/**
 * Follows real MapLibre lifecycle events:
 * `style.load` (cartography parsed) → `load` (first complete render, app layers added)
 * → first `idle` after load (globe projection applied and visible tiles settled).
 * Only then — and never before the minimum visible time — the map is reported as ready.
 */
export function trackMapReadiness(map: ReadinessMapLike, options: MapReadinessOptions): () => void {
  const now = options.now ?? (() => performance.now());
  const setTimer = options.setTimer ?? ((callback, delay) => window.setTimeout(callback, delay));
  const clearTimer = options.clearTimer ?? ((id) => window.clearTimeout(id));
  const minVisibleMs = options.minVisibleMs ?? LOADING_MIN_VISIBLE_MS;
  const timeoutMs = options.timeoutMs ?? LOADING_TIMEOUT_MS;

  let loaded = false;
  let settled = false;
  let revealTimer: number | null = null;
  let safetyTimer: number | null = null;

  const detach = () => {
    map.off("style.load", onStyleLoad);
    map.off("load", onLoad);
    map.off("idle", onIdle);
  };

  const reveal = (reason: "idle" | "timeout") => {
    if (settled) return;
    settled = true;
    detach();
    if (safetyTimer !== null) clearTimer(safetyTimer);
    const remaining = Math.max(0, minVisibleMs - now());
    if (remaining === 0) {
      options.onStatus("ready", reason);
      return;
    }
    revealTimer = setTimer(() => {
      revealTimer = null;
      options.onStatus("ready", reason);
    }, remaining);
  };

  function onStyleLoad() {
    if (!loaded && !settled) options.onStatus("loading-cartography");
  }

  function onLoad() {
    if (settled) return;
    loaded = true;
    options.onStatus("preparing");
  }

  function onIdle() {
    if (loaded) reveal("idle");
  }

  map.on("style.load", onStyleLoad);
  map.on("load", onLoad);
  map.on("idle", onIdle);
  options.onStatus("loading-cartography");
  safetyTimer = setTimer(() => reveal("timeout"), timeoutMs);

  return () => {
    detach();
    if (safetyTimer !== null) clearTimer(safetyTimer);
    if (revealTimer !== null) clearTimer(revealTimer);
    settled = true;
  };
}
