import { DrillingTelemetry } from "../features/drilling-animation/DrillingTelemetry";
import type { DrillingVisualState } from "../features/drilling-animation/drillingMachine";
import { useDrillingExperience } from "../features/drilling-animation/useDrillingExperience";
import { useCreateDrilling, useDrillingStatus, useReverseLocation } from "../hooks/useLocation";
import { useExplorationStore } from "../store/exploration.store";

const STAGE_LABELS: Record<string, string> = {
  queued: "Na fila",
  calculating_antipode: "Calculando antípoda",
  classifying_destination: "Classificando destino",
  resolving_region: "Identificando região",
  finding_nearest_land: "Buscando terra firme",
  completed: "Análise concluída",
  failed: "Falha no processamento",
};

const VISUAL_STAGE_LABELS: Record<DrillingVisualState, string> = {
  idle: "Pronto para cavar",
  preparing: "Preparando a trajetória",
  zooming_out: "Visão planetária",
  showing_route: "Origem → centro → antípoda",
  entering_earth: "Entrando na Terra",
  crossing_crust: "Atravessando a crosta",
  crossing_mantle: "Atravessando o manto",
  crossing_outer_core: "Núcleo externo",
  crossing_inner_core: "Núcleo interno",
  crossing_center: "Centro da Terra · ≈ 6.371 km",
  ascending: "Subindo para o outro lado",
  exiting_earth: "Emergindo no destino",
  revealing_destination: "Revelando o antípoda",
  paused: "Experiência pausada",
  completed: "Chegada concluída",
  cancelled: "Experiência cancelada",
};

function formatDistance(distanceKm: number) {
  return distanceKm < 10
    ? `${distanceKm.toFixed(1)} km`
    : `${Math.round(distanceKm).toLocaleString("pt-BR")} km`;
}

function Coordinate({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5">
      <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100/45">
        {label}
      </span>
      <span className="mt-1 block font-mono text-sm text-white">{value.toFixed(6)}°</span>
    </div>
  );
}

export function LocationPanel() {
  const point = useExplorationStore((state) => state.selectedPoint);
  const reverse = useReverseLocation();
  const drilling = useCreateDrilling();
  const drillingStatus = useDrillingStatus();
  const experience = useDrillingExperience();

  if (!point) {
    return (
      <div className="panel-card">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-300/10 text-amber-200">
          <span className="text-xl">⌖</span>
        </div>
        <h2 className="mt-5 font-display text-2xl leading-tight text-white">Escolha seu ponto de partida</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-50/55">
          Gire o planeta, aproxime o mapa e clique em qualquer lugar para marcar coordenadas exatas.
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs text-emerald-100/45">
          <span className="h-px flex-1 bg-white/10" />
          clique no globo
          <span className="h-px flex-1 bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="panel-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Ponto selecionado</p>
          <h2 className="mt-2 font-display text-2xl text-white">
            {reverse.isPending ? "Localizando…" : reverse.data?.display_name.split(",")[0] ?? "Coordenada marcada"}
          </h2>
        </div>
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-amber-300 shadow-[0_0_18px_#fcd34d]" />
      </div>

      {experience.isActive ? (
        <p className="mt-2 font-mono text-[11px] text-emerald-50/50">
          {point.latitude.toFixed(6)}° · {point.longitude.toFixed(6)}°
        </p>
      ) : (
        <>
          <p className="mt-2 min-h-10 text-xs leading-5 text-emerald-50/50">
            {reverse.isError
              ? "Não foi possível identificar o endereço agora. As coordenadas continuam válidas."
              : reverse.data?.display_name ?? "Consultando endereço…"}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Coordinate label="Latitude" value={point.latitude} />
            <Coordinate label="Longitude" value={point.longitude} />
          </div>
        </>
      )}

      {drillingStatus.data ? (
        <div className="mt-5 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] p-3">
          <div className="flex justify-between text-xs text-emerald-100/70">
            <span>
              {STAGE_LABELS[drillingStatus.data.stage] ??
                drillingStatus.data.stage.replaceAll("_", " ")}
            </span>
            <span>{drillingStatus.data.progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/25">
            <div
              className="h-full rounded-full bg-emerald-300 transition-[width] duration-500"
              style={{ width: `${drillingStatus.data.progress}%` }}
            />
          </div>
          {drillingStatus.data.antipode && (
            <p className="mt-3 text-xs text-emerald-50/60">
              Antípoda: {drillingStatus.data.antipode.latitude.toFixed(4)}°, {" "}
              {drillingStatus.data.antipode.longitude.toFixed(4)}°
            </p>
          )}
          {drillingStatus.data.status === "completed" && experience.phase !== "completed" && (
            <div className="mt-4 border-t border-white/10 pt-4">
              {experience.isActive ? (
                <>
                  <p className="text-center text-xs font-bold text-white" aria-live="polite">
                    {VISUAL_STAGE_LABELS[experience.phase]}
                  </p>
                  <DrillingTelemetry />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {experience.phase === "paused" ? (
                      <button className="experience-secondary-button" onClick={experience.resume} aria-label="Continuar experiência">
                        Continuar
                      </button>
                    ) : (
                      <button className="experience-secondary-button" onClick={experience.pause} aria-label="Pausar experiência">
                        Pausar
                      </button>
                    )}
                    <button className="experience-secondary-button" onClick={experience.cancel} aria-label="Cancelar experiência">
                      Cancelar
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[9px] uppercase tracking-[0.12em] text-emerald-100/35">
                    {experience.qualityLevel === "LOW_END" ? "qualidade adaptativa" : "qualidade normal"}
                  </p>
                </>
              ) : (
                <>
                  {experience.phase === "cancelled" && (
                    <p className="mb-3 text-center text-xs text-emerald-50/55">
                      A visualização foi encerrada. O resultado permanece disponível.
                    </p>
                  )}
                  <button
                    className="dig-button"
                    onClick={() => void experience.start()}
                    disabled={!experience.canStart}
                    aria-label="Iniciar experiência de perfuração"
                  >
                    CAVAR
                  </button>
                </>
              )}
            </div>
          )}
          {drillingStatus.data.destination && experience.phase === "completed" && (
            <div className="mt-4 border-t border-white/10 pt-4 text-xs text-emerald-50/65">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="font-bold uppercase tracking-[0.14em] text-emerald-100/45">
                  Destino
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 font-bold text-white">
                  {drillingStatus.data.destination.type === "land" ? "Terra" : "Oceano"}
                </span>
              </div>
              {drillingStatus.data.destination.country && (
                <p>
                  <span className="text-emerald-100/40">País:</span>{" "}
                  {drillingStatus.data.destination.country.name}
                </p>
              )}
              {drillingStatus.data.destination.state && (
                <p className="mt-1">
                  <span className="text-emerald-100/40">Estado/região:</span>{" "}
                  {drillingStatus.data.destination.state.name}
                </p>
              )}
              {drillingStatus.data.destination.nearest_place && (
                <p className="mt-1">
                  <span className="text-emerald-100/40">Localidade mais próxima:</span>{" "}
                  {drillingStatus.data.destination.nearest_place.name} · {" "}
                  {formatDistance(drillingStatus.data.destination.nearest_place.distance_km)}
                </p>
              )}
              {drillingStatus.data.destination.nearest_land && (
                <div className="mt-3 rounded-lg bg-black/15 p-3">
                  <p className="font-bold text-white">Terra firme mais próxima</p>
                  <p className="mt-1 font-mono text-[11px]">
                    {drillingStatus.data.destination.nearest_land.coordinates.latitude.toFixed(4)}°, {" "}
                    {drillingStatus.data.destination.nearest_land.coordinates.longitude.toFixed(4)}°
                  </p>
                  <p className="mt-1">
                    Distância: {formatDistance(drillingStatus.data.destination.nearest_land.distance_km)}
                  </p>
                  {drillingStatus.data.destination.nearest_land.country && (
                    <p className="mt-1">
                      País: {drillingStatus.data.destination.nearest_land.country.name}
                    </p>
                  )}
                  {drillingStatus.data.destination.nearest_land.nearest_place && (
                    <p className="mt-1">
                      Localidade próxima: {drillingStatus.data.destination.nearest_land.nearest_place.name}
                    </p>
                  )}
                </div>
              )}
              <button
                className="experience-secondary-button mt-4 w-full"
                onClick={() => void experience.start()}
                aria-label="Repetir experiência de perfuração"
              >
                Repetir experiência
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          className="mt-5 w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-extrabold text-[#14201b] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={drilling.isPending}
          onClick={() =>
            drilling.mutate({
              ...point,
              originLabel: reverse.data?.display_name,
            })
          }
        >
          {drilling.isPending ? "Iniciando…" : "Calcular destino antípoda"}
        </button>
      )}
      {drilling.isError && (
        <p className="mt-3 text-xs text-red-300">Não foi possível iniciar o cálculo.</p>
      )}
    </div>
  );
}
