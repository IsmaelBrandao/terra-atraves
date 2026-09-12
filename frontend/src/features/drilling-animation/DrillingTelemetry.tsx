import { useEffect, useRef } from "react";

import { DRILLING_TELEMETRY_EVENT } from "./drilling.constants";
import type { DrillingTelemetry as Telemetry } from "./drillingMath";

const numberFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function DrillingTelemetry() {
  const depthRef = useRef<HTMLSpanElement>(null);
  const layerRef = useRef<HTMLSpanElement>(null);
  const remainingRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const update = (event: Event) => {
      const telemetry = (event as CustomEvent<Telemetry>).detail;
      if (depthRef.current) depthRef.current.textContent = `${numberFormatter.format(telemetry.depthKm)} km`;
      if (layerRef.current) layerRef.current.textContent = telemetry.layer;
      if (remainingRef.current) {
        const target = telemetry.direction === "descendo" ? "centro" : "destino";
        remainingRef.current.textContent = `${numberFormatter.format(telemetry.distanceRemainingKm)} km até o ${target}`;
      }
    };
    window.addEventListener(DRILLING_TELEMETRY_EVENT, update);
    return () => window.removeEventListener(DRILLING_TELEMETRY_EVENT, update);
  }, []);

  return (
    <div className="mt-4 grid grid-cols-2 gap-2" aria-label="Dados da trajetória">
      <div className="rounded-lg bg-black/20 p-3">
        <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-100/40">
          Profundidade
        </span>
        <span ref={depthRef} className="mt-1 block font-mono text-sm text-white">0 km</span>
      </div>
      <div className="rounded-lg bg-black/20 p-3">
        <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-100/40">
          Camada
        </span>
        <span ref={layerRef} className="mt-1 block text-sm font-semibold text-white">Crosta</span>
      </div>
      <p ref={remainingRef} className="col-span-2 text-center text-[11px] text-emerald-50/55">
        6.371 km até o centro
      </p>
    </div>
  );
}
