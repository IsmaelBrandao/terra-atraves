import { useEffect, useRef } from "react";

import { DRILLING_TELEMETRY_EVENT } from "./drilling.constants";
import type { DrillingTelemetry as Telemetry } from "./drillingMath";
import { telemetryAtProgress } from "./drillingMath";
import type { DrillingVisualState } from "./drillingMachine";

const numberFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const progressFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const STATIC_STAGE_LABELS: Partial<Record<DrillingVisualState, string>> = {
  preparing: "Preparando a trajetória",
  zooming_out: "Visão planetária",
  showing_route: "Origem → centro → antípoda",
  revealing_destination: "Revelando o antípoda",
};

function stageLabel(phase: DrillingVisualState, telemetry: Telemetry): string {
  if (phase === "crossing_center") return "CENTRO DA TERRA";
  if (phase === "descending") return telemetry.layer.toUpperCase();
  if (phase === "ascending") return `SUBINDO · ${telemetry.layer.toUpperCase()}`;
  if (phase === "paused" && telemetry.direction === "centro") return "CENTRO DA TERRA · PAUSADO";
  if (phase === "paused") return `PAUSADO · ${telemetry.layer.toUpperCase()}`;
  return STATIC_STAGE_LABELS[phase] ?? telemetry.layer.toUpperCase();
}

export function DrillingTelemetry({ phase }: { phase: DrillingVisualState }) {
  const stageRef = useRef<HTMLParagraphElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const depthRef = useRef<HTMLSpanElement>(null);
  const layerRef = useRef<HTMLSpanElement>(null);
  const remainingRef = useRef<HTMLParagraphElement>(null);
  const latestTelemetryRef = useRef<Telemetry>(telemetryAtProgress(0));

  useEffect(() => {
    const render = (telemetry: Telemetry) => {
      latestTelemetryRef.current = telemetry;
      if (stageRef.current) stageRef.current.textContent = stageLabel(phase, telemetry);
      if (progressRef.current) {
        progressRef.current.textContent = `${progressFormatter.format(telemetry.progress * 100)}%`;
      }
      if (depthRef.current) depthRef.current.textContent = `${numberFormatter.format(telemetry.depthKm)} km`;
      if (layerRef.current) layerRef.current.textContent = telemetry.layer;
      if (remainingRef.current) {
        if (telemetry.direction === "centro") {
          remainingRef.current.textContent = "0 km · centro da Terra";
        } else {
          const target = telemetry.direction === "descendo" ? "centro" : "destino";
          remainingRef.current.textContent = `${numberFormatter.format(telemetry.distanceRemainingKm)} km até o ${target}`;
        }
      }
    };
    render(latestTelemetryRef.current);
    const update = (event: Event) => render((event as CustomEvent<Telemetry>).detail);
    window.addEventListener(DRILLING_TELEMETRY_EVENT, update);
    return () => window.removeEventListener(DRILLING_TELEMETRY_EVENT, update);
  }, [phase]);

  return (
    <>
      <p ref={stageRef} className="stage-label" aria-live="polite">
        {stageLabel(phase, latestTelemetryRef.current)}
      </p>
      {phase === "crossing_center" && (
        <p className="mt-1 text-center font-mono text-[11px] text-amber-100/70">6.371 km</p>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Dados da trajetória">
        <div className="rounded-lg bg-black/20 p-2.5">
          <span className="block text-[8px] font-bold uppercase tracking-[0.13em] text-emerald-100/40">
            Progresso
          </span>
          <span ref={progressRef} data-testid="drilling-progress" className="mt-1 block font-mono text-xs text-white">0,0%</span>
        </div>
        <div className="rounded-lg bg-black/20 p-2.5">
          <span className="block text-[8px] font-bold uppercase tracking-[0.13em] text-emerald-100/40">
            Profundidade
          </span>
          <span ref={depthRef} data-testid="drilling-depth" className="mt-1 block font-mono text-xs text-white">0 km</span>
        </div>
        <div className="rounded-lg bg-black/20 p-2.5">
          <span className="block text-[8px] font-bold uppercase tracking-[0.13em] text-emerald-100/40">
            Camada
          </span>
          <span ref={layerRef} data-testid="drilling-layer" className="mt-1 block text-xs font-semibold leading-tight text-white">Crosta</span>
        </div>
        <p ref={remainingRef} className="col-span-3 text-center text-[11px] text-emerald-50/55">
          6.371 km até o centro
        </p>
      </div>
    </>
  );
}
