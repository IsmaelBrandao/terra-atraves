import { lazy, Suspense, useEffect } from "react";

import { BrandGlyph } from "./components/BrandMark";
import { LoadingScreen } from "./components/LoadingScreen";
import { LocationPanel } from "./components/LocationPanel";
import { usePanelMode } from "./components/usePanelMode";
import { loadDiscoveryModal } from "./features/discovery/loadDiscoveryModal";
import { clearSharedOriginFromAddressBar } from "./features/discovery/share/shareLink";
import { useCurrentDiscovery } from "./features/discovery/useCurrentDiscovery";
import { DrillingExperienceProvider } from "./features/drilling-animation/DrillingExperienceContext";
import { useDrillingExperience } from "./features/drilling-animation/useDrillingExperience";
import { GlobeMap } from "./map/GlobeMap";
import { parseSharedOrigin } from "./map/initialView";
import { useExplorationStore } from "./store/exploration.store";
import { useUiStore } from "./store/ui.store";

const DISCOVERY_REVEAL_DELAY_MS = 700;
const DiscoveryModal = lazy(() => loadDiscoveryModal().then((module) => ({ default: module.DiscoveryModal })));

/** Keeps `?lat=&lon=` only while it still describes the current selection. */
function useSharedOriginAddressSync() {
  const selectedPoint = useExplorationStore((state) => state.selectedPoint);
  useEffect(() => {
    const shared = parseSharedOrigin(window.location.search);
    const matches =
      shared !== null &&
      selectedPoint !== null &&
      Math.abs(shared.latitude - selectedPoint.latitude) < 1e-6 &&
      Math.abs(shared.longitude - selectedPoint.longitude) < 1e-6;
    if (!matches) clearSharedOriginFromAddressBar();
  }, [selectedPoint]);
}

function DiscoveryLayer() {
  const experience = useDrillingExperience();
  const discovery = useCurrentDiscovery();
  const open = useUiStore((state) => state.discoveryOpen);
  const openDiscovery = useUiStore((state) => state.openDiscovery);
  const closeDiscovery = useUiStore((state) => state.closeDiscovery);
  const resetExploration = useExplorationStore((state) => state.resetExploration);
  const hasDiscovery = discovery !== null;
  const { isActive, phase, reducedMotion } = experience;

  // Warm the modal chunk while the journey runs, so the reveal never waits for the network.
  useEffect(() => {
    if (isActive) void loadDiscoveryModal().catch(() => undefined);
  }, [isActive]);

  // The globe settles on the destination first; the modal follows a beat later.
  useEffect(() => {
    if (phase !== "completed" || !hasDiscovery) {
      closeDiscovery();
      return;
    }
    const timeoutId = window.setTimeout(openDiscovery, reducedMotion ? 120 : DISCOVERY_REVEAL_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [closeDiscovery, hasDiscovery, openDiscovery, phase, reducedMotion]);

  if (!discovery) return null;

  return (
    <Suspense fallback={null}>
      <DiscoveryModal
        open={open}
        discovery={discovery}
        onClose={closeDiscovery}
        onRepeat={() => {
          closeDiscovery();
          void experience.start();
        }}
        onChooseAnother={() => {
          closeDiscovery();
          resetExploration();
        }}
      />
    </Suspense>
  );
}

function Shell() {
  const mapStatus = useUiStore((state) => state.mapStatus);
  const discoveryOpen = useUiStore((state) => state.discoveryOpen);
  const mode = usePanelMode();
  const loading = mapStatus !== "ready" && mapStatus !== "failed";
  useSharedOriginAddressSync();

  return (
    <>
      <main
        className="app-shell"
        data-mode={mode}
        data-map-status={mapStatus}
        inert={loading || discoveryOpen}
        aria-busy={loading}
      >
        <div className="space-backdrop" aria-hidden="true" />
        <div className="absolute inset-0">
          <GlobeMap />
        </div>

        <header className="app-header">
          <a className="brand" href="/" aria-label="Terra Através — início">
            <BrandGlyph className="brand__glyph" />
            <span className="brand__name">Terra Através</span>
          </a>
          <h1 className="sr-only">Terra Através — explore o outro lado do planeta</h1>
        </header>

        <aside className="app-panel" data-mode={mode} aria-label="Exploração">
          <LocationPanel mode={mode} />
        </aside>
      </main>
      <DiscoveryLayer />
      <LoadingScreen status={mapStatus} />
    </>
  );
}

export function App() {
  return (
    <DrillingExperienceProvider>
      <Shell />
    </DrillingExperienceProvider>
  );
}
