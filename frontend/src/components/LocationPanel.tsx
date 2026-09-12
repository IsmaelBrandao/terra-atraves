import { useCreateDrilling, useDrillingStatus, useReverseLocation } from "../hooks/useLocation";
import { useExplorationStore } from "../store/exploration.store";

const STAGE_LABELS: Record<string, string> = {
  queued: "Na fila",
  calculating_antipode: "Calculando antípoda",
  antipode_calculated_geodata_pending: "Antípoda calculada",
  failed: "Falha no processamento",
};

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

      <p className="mt-2 min-h-10 text-xs leading-5 text-emerald-50/50">
        {reverse.isError
          ? "Não foi possível identificar o endereço agora. As coordenadas continuam válidas."
          : reverse.data?.display_name ?? "Consultando endereço…"}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Coordinate label="Latitude" value={point.latitude} />
        <Coordinate label="Longitude" value={point.longitude} />
      </div>

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
