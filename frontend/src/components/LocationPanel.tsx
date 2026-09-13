import { DrillingTelemetry } from "../features/drilling-animation/DrillingTelemetry";
import type { DrillingVisualState } from "../features/drilling-animation/drillingMachine";
import { useDrillingExperience } from "../features/drilling-animation/useDrillingExperience";
import { useCreateDrilling, useDrillingStatus, useReverseLocation } from "../hooks/useLocation";
import { useExplorationStore } from "../store/exploration.store";

const STAGE_LABELS: Record<string, string> = {
  queued: "Aguardando processamento",
  calculating_antipode: "Calculando destino",
  classifying_destination: "Identificando terra ou oceano",
  resolving_region: "Identificando região",
  finding_nearest_land: "Buscando terra firme próxima",
  completed: "Destino calculado",
  failed: "Não foi possível concluir",
};

const VISUAL_STAGE_LABELS: Record<DrillingVisualState, string> = {
  idle: "Pronto para cavar",
  preparing: "Preparando a trajetória",
  zooming_out: "Visão planetária",
  showing_route: "Origem → centro → antípoda",
  entering_earth: "Entrando na Terra",
  crossing_crust: "CROSTA",
  crossing_mantle: "MANTO",
  crossing_outer_core: "NÚCLEO EXTERNO",
  crossing_inner_core: "NÚCLEO INTERNO",
  crossing_center: "CENTRO DA TERRA · ≈ 6.371 KM",
  ascending: "Subindo para o outro lado",
  exiting_earth: "Emergindo no destino",
  revealing_destination: "Revelando o antípoda",
  paused: "Experiência pausada",
  completed: "Chegada concluída",
  cancelled: "Experiência cancelada",
};

function formatDistance(distanceKm: number) {
  return distanceKm < 10
    ? `${distanceKm.toFixed(1).replace(".", ",")} km`
    : `${Math.round(distanceKm).toLocaleString("pt-BR")} km`;
}

function Coordinate({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2.5">
      <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-100/45">{label}</span>
      <span className="mt-1 block font-mono text-[13px] text-white">{value.toFixed(6)}°</span>
    </div>
  );
}

export function LocationPanel() {
  const point = useExplorationStore((state) => state.selectedPoint);
  const resetExploration = useExplorationStore((state) => state.resetExploration);
  const reverse = useReverseLocation();
  const drilling = useCreateDrilling();
  const drillingStatus = useDrillingStatus();
  const experience = useDrillingExperience();

  if (!point) {
    return (
      <div className="panel-card panel-card--intro">
        <div className="flex items-center gap-3">
          <span className="selection-symbol" aria-hidden="true">⌖</span>
          <div>
            <p className="eyebrow">Comece por aqui</p>
            <h1 className="mt-1 text-lg font-bold leading-tight text-white">Explore o planeta e selecione um ponto</h1>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-emerald-50/55">Arraste para girar, aproxime e toque no globo.</p>
      </div>
    );
  }

  const job = drillingStatus.data;
  const destination = job?.destination;
  const isBackendWorking = job?.status === "queued" || job?.status === "processing";
  const hasBackendError = drillingStatus.isError || job?.status === "failed" || drillingStatus.isTimedOut;
  const originName = reverse.data?.display_name.split(",")[0] ?? "Coordenada marcada";

  const createJob = () => {
    drilling.reset();
    drilling.mutate({ ...point, originLabel: reverse.data?.display_name });
  };

  const chooseAnotherLocation = () => {
    experience.cancel();
    drilling.reset();
    resetExploration();
  };

  return (
    <div className="panel-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Ponto selecionado</p>
          <h2 className="mt-1.5 truncate text-xl font-bold text-white">{reverse.isPending ? "Localizando…" : originName}</h2>
        </div>
        <span className="selected-indicator" aria-hidden="true" />
      </div>

      {experience.isActive ? (
        <p className="mt-2 font-mono text-[11px] text-emerald-50/50">{point.latitude.toFixed(6)}° · {point.longitude.toFixed(6)}°</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Coordinate label="Latitude" value={point.latitude} />
            <Coordinate label="Longitude" value={point.longitude} />
          </div>
          {reverse.isError && (
            <div className="status-message mt-3" role="status">
              <span>Endereço indisponível. As coordenadas continuam válidas.</span>
              <button onClick={() => void reverse.refetch()}>Tentar novamente</button>
            </div>
          )}
        </>
      )}

      {!job && (
        <>
          <button className="primary-action mt-4" disabled={drilling.isPending} onClick={createJob}>
            {drilling.isPending ? "Preparando…" : "Preparar perfuração"}
          </button>
          {drilling.isError && (
            <div className="error-message mt-3" role="alert">
              <span>O serviço não respondeu. Verifique a conexão e tente novamente.</span>
              <button onClick={createJob}>Tentar novamente</button>
            </div>
          )}
        </>
      )}

      {job && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between gap-4 text-xs" aria-live="polite">
            <span className="text-emerald-50/65">{STAGE_LABELS[job.stage] ?? job.stage.replaceAll("_", " ")}</span>
            <span className="font-mono text-emerald-100/50">{job.progress}%</span>
          </div>
          {isBackendWorking && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-amber-200 transition-[width] duration-500" style={{ width: `${job.progress}%` }} />
            </div>
          )}

          {hasBackendError && (
            <div className="error-message mt-3" role="alert">
              <span>{drillingStatus.isTimedOut ? "O cálculo está demorando mais que o esperado." : "Não foi possível consultar o resultado."}</span>
              <button onClick={job.status === "failed" ? createJob : drillingStatus.retry}>Tentar novamente</button>
            </div>
          )}

          {job.status === "completed" && experience.phase !== "completed" && (
            <div className="mt-4">
              {experience.isActive ? (
                <>
                  <p className="stage-label" aria-live="polite">{VISUAL_STAGE_LABELS[experience.phase]}</p>
                  {experience.phase === "crossing_center" && (
                    <p className="mt-1 text-center text-[11px] text-amber-100/65">aproximadamente 6.371 km abaixo da superfície</p>
                  )}
                  <DrillingTelemetry />
                  <div className="mt-3 flex gap-2">
                    {experience.phase !== "preparing" && (
                      <button
                        className="experience-secondary-button flex-1"
                        onClick={experience.phase === "paused" ? experience.resume : experience.pause}
                        aria-label={experience.phase === "paused" ? "Continuar experiência" : "Pausar experiência"}
                      >
                        {experience.phase === "paused" ? "Continuar" : "Pausar"}
                      </button>
                    )}
                    <button className="experience-secondary-button flex-1" onClick={experience.cancel} aria-label="Cancelar experiência">Cancelar</button>
                  </div>
                  <p className="mt-2 text-center text-[9px] text-emerald-100/35">
                    Crosta ampliada para fins didáticos · {experience.qualityLevel === "LOW_END" ? "qualidade adaptativa" : "qualidade normal"}
                  </p>
                </>
              ) : (
                <>
                  {experience.phase === "cancelled" && <p className="mb-3 text-center text-xs text-emerald-50/55">Visualização encerrada. O resultado foi preservado.</p>}
                  <button className="dig-button" onClick={() => void experience.start()} disabled={!experience.canStart}>CAVAR</button>
                  <p className="mt-2 text-center text-[10px] text-emerald-50/40">Uma viagem reta pelo centro da Terra</p>
                </>
              )}
            </div>
          )}

          {destination && experience.phase === "completed" && (
            <section className="result-reveal mt-4" aria-labelledby="destination-title">
              <p className="eyebrow">Destino</p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div>
                  <h3 id="destination-title" className="text-xl font-bold text-white">
                    {job.destination_label ?? destination.nearest_place?.name ?? (destination.type === "land" ? "Destino terrestre" : "Oceano")}
                  </h3>
                  <p className="mt-1 font-mono text-[11px] text-emerald-50/50">{job.antipode?.latitude.toFixed(4)}°, {job.antipode?.longitude.toFixed(4)}°</p>
                </div>
                <span className="destination-badge">{destination.type === "land" ? "Terra" : "Oceano"}</span>
              </div>

              <div className="result-details mt-4 space-y-2 text-xs text-emerald-50/65">
                {destination.country && <p><span>País</span><strong>{destination.country.name}</strong></p>}
                {destination.state && <p><span>Estado/região</span><strong>{destination.state.name}</strong></p>}
                {destination.nearest_place && <p><span>Localidade próxima</span><strong>{destination.nearest_place.name} · {formatDistance(destination.nearest_place.distance_km)}</strong></p>}
                {destination.nearest_land && (
                  <div className="mt-3 border-l-2 border-amber-200/50 pl-3">
                    <p className="font-bold text-white">Terra firme mais próxima</p>
                    <p className="mt-1">{destination.nearest_land.nearest_place?.name ?? destination.nearest_land.country?.name ?? "Não determinada"}</p>
                    <p className="mt-1 font-mono text-[11px]">{formatDistance(destination.nearest_land.distance_km)}</p>
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button className="experience-secondary-button" onClick={() => void experience.start()}>Repetir perfuração</button>
                <button className="experience-secondary-button" onClick={chooseAnotherLocation}>Escolher outro local</button>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
