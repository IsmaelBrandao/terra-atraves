import { useEffect, useState } from "react";

import { REOPEN_DISCOVERY_ID } from "../features/discovery/discoveryIds";
import { useCurrentDiscovery } from "../features/discovery/useCurrentDiscovery";
import { DrillingTelemetry } from "../features/drilling-animation/DrillingTelemetry";
import { useDrillingExperience } from "../features/drilling-animation/useDrillingExperience";
import { describeLocation, formatCoordinate } from "../features/location/formatLocation";
import { useCreateDrilling, useDrillingStatus, useReverseLocation } from "../hooks/useLocation";
import { useExplorationStore, type SelectedPoint } from "../store/exploration.store";
import { useUiStore } from "../store/ui.store";
import type { PanelMode } from "./usePanelMode";

function ExplorationHint() {
  return (
    <div className="explore-hint">
      <span className="explore-hint__pulse" aria-hidden="true" />
      <div>
        <h2 className="explore-hint__title">Selecione qualquer ponto da Terra</h2>
        <p className="explore-hint__text">Gire, aproxime e toque em um local para começar.</p>
      </div>
    </div>
  );
}

function SelectedLocation({ point }: { point: SelectedPoint }) {
  const resetExploration = useExplorationStore((state) => state.resetExploration);
  const reverse = useReverseLocation();
  const drilling = useCreateDrilling();
  const drillingStatus = useDrillingStatus();
  const experience = useDrillingExperience();
  const [digRequested, setDigRequested] = useState(false);

  const job = drillingStatus.data;
  const location = describeLocation(reverse.data);
  const hasError = drilling.isError || drillingStatus.isError || drillingStatus.isTimedOut || job?.status === "failed";
  const isWorking = !hasError && (drilling.isPending || (digRequested && !experience.canStart));
  const { canStart, start } = experience;

  const createJob = () => {
    drilling.reset();
    drilling.mutate({ ...point, originLabel: reverse.data?.display_name });
  };

  const dig = () => {
    if (canStart) {
      void start();
      return;
    }
    setDigRequested(true);
    if (!job || job.status === "failed" || drilling.isError) createJob();
    else if (drillingStatus.isTimedOut || drillingStatus.isError) drillingStatus.retry();
  };

  // One tap on CAVAR: the destination is calculated first and the journey begins as soon as it is ready.
  useEffect(() => {
    if (!digRequested || !canStart) return;
    setDigRequested(false);
    void start();
  }, [canStart, digRequested, start]);

  const clearSelection = () => {
    experience.cancel();
    drilling.reset();
    resetExploration();
  };

  return (
    <section className="location-card" aria-labelledby="selected-location-title">
      <div className="location-card__head">
        <div className="min-w-0">
          <p className="panel-kicker">
            <span className="origin-dot" aria-hidden="true" />
            Ponto selecionado
          </p>
          <h2 id="selected-location-title" className="location-card__title">
            {reverse.isPending ? "Localizando…" : location?.primary ?? "Coordenada marcada"}
          </h2>
          {location?.secondary && <p className="location-card__subtitle">{location.secondary}</p>}
        </div>
        <button type="button" className="icon-button" onClick={clearSelection} aria-label="Limpar seleção">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6 8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      </div>

      <dl className="location-card__coords">
        <div>
          <dt>Latitude</dt>
          <dd>{formatCoordinate(point.latitude, "lat")}</dd>
        </div>
        <div>
          <dt>Longitude</dt>
          <dd>{formatCoordinate(point.longitude, "lon")}</dd>
        </div>
      </dl>

      {reverse.isError && (
        <p className="inline-notice" role="status">
          <span>Endereço indisponível. As coordenadas continuam válidas.</span>
          <button type="button" onClick={() => void reverse.refetch()}>Tentar novamente</button>
        </p>
      )}

      {experience.phase === "cancelled" && !isWorking && (
        <p className="location-card__note" role="status">Perfuração cancelada. Você pode cavar de novo quando quiser.</p>
      )}

      <button type="button" className="dig-button" onClick={dig} disabled={isWorking} aria-busy={isWorking}>
        {isWorking ? (
          <>
            <span className="dig-button__spinner" aria-hidden="true" />
            Calculando a trajetória…
          </>
        ) : (
          "CAVAR"
        )}
      </button>
      {isWorking && job && (
        <span className="dig-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${Math.max(0.04, job.progress / 100)})` }} />
        </span>
      )}

      {hasError && (
        <p className="inline-notice inline-notice--error" role="alert">
          <span>
            {drillingStatus.isTimedOut
              ? "O cálculo está demorando mais que o esperado."
              : drilling.isError
                ? "O serviço não respondeu. Verifique a conexão e tente novamente."
                : "Não foi possível calcular o destino."}
          </span>
          <button type="button" onClick={dig}>Tentar novamente</button>
        </p>
      )}
    </section>
  );
}

function DrillingHud() {
  const experience = useDrillingExperience();
  const paused = experience.phase === "paused";
  return (
    <section className="drill-hud" aria-label="Perfuração em andamento">
      <DrillingTelemetry phase={experience.phase} />
      <div className="drill-hud__actions">
        {experience.phase !== "preparing" && (
          <button
            type="button"
            className="hud-button"
            onClick={paused ? experience.resume : experience.pause}
            aria-label={paused ? "Continuar experiência" : "Pausar experiência"}
          >
            {paused ? "Continuar" : "Pausar"}
          </button>
        )}
        <button type="button" className="hud-button" onClick={experience.cancel} aria-label="Cancelar experiência">
          Cancelar
        </button>
      </div>
      <p className="drill-hud__note">
        Crosta ampliada para fins didáticos · {experience.qualityLevel === "LOW_END" ? "qualidade adaptativa" : "qualidade normal"}
      </p>
    </section>
  );
}

function DiscoveryDock() {
  const discovery = useCurrentDiscovery();
  const openDiscovery = useUiStore((state) => state.openDiscovery);
  const resetExploration = useExplorationStore((state) => state.resetExploration);
  if (!discovery) return null;
  return (
    <section className="discovery-dock" aria-label="Descoberta atual">
      <span className="destination-dot" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="panel-kicker">Antípoda</p>
        <p className="discovery-dock__title">{discovery.title}</p>
      </div>
      <button type="button" id={REOPEN_DISCOVERY_ID} className="dock-button" onClick={openDiscovery}>
        Ver descoberta
      </button>
      <button type="button" className="icon-button" onClick={resetExploration} aria-label="Limpar descoberta">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6 8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
    </section>
  );
}

export function LocationPanel({ mode }: { mode: PanelMode }) {
  const point = useExplorationStore((state) => state.selectedPoint);
  if (mode === "explore" || !point) return <ExplorationHint />;
  if (mode === "drilling") return <DrillingHud />;
  if (mode === "discovery") return <DiscoveryDock />;
  return <SelectedLocation key={`${point.latitude},${point.longitude}`} point={point} />;
}
