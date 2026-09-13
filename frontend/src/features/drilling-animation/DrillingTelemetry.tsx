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

/**
 * Minimal readout: layer, depth and the distance that matters now. Values are written straight
 * to the DOM from the throttled telemetry event — React only re-renders on phase changes.
 */
export function DrillingTelemetry({ phase }: { phase: DrillingVisualState }) {
  const stageRef = useRef<HTMLParagraphElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const progressBarRef = useRef<HTMLSpanElement>(null);
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
      if (progressBarRef.current) progressBarRef.current.style.transform = `scaleX(${telemetry.progress})`;
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
    <div className="telemetry" aria-label="Dados da trajetória">
      <p ref={stageRef} className="telemetry__stage" aria-live="polite">
        {stageLabel(phase, latestTelemetryRef.current)}
      </p>
      <p className="telemetry__depth">
        <span ref={depthRef} data-testid="drilling-depth">0 km</span>
        <span className="sr-only"> de profundidade</span>
      </p>
      <p ref={remainingRef} className="telemetry__remaining">
        6.371 km até o centro
      </p>
      <span className="telemetry__track" aria-hidden="true">
        <span ref={progressBarRef} className="telemetry__bar" />
      </span>
      <span className="sr-only">
        Progresso <span ref={progressRef} data-testid="drilling-progress">0,0%</span>, camada{" "}
        <span ref={layerRef} data-testid="drilling-layer">Crosta</span>
      </span>
    </div>
  );
}
