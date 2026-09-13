import type { FeatureCollection, Point } from "geojson";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { useDrillingExperience } from "../features/drilling-animation/useDrillingExperience";
import { useDrillingStatus } from "../hooks/useLocation";
import { useExplorationStore } from "../store/exploration.store";
import { configureMapLibreWorkers, detectGlobePerformance, getInitialGlobeZoom } from "./globe.performance";

const MARKER_SOURCE = "selected-location";
const MARKER_LAYER = "selected-location-dot";
const MARKER_HALO_LAYER = "selected-location-halo";
const ANTIPODE_SOURCE = "antipode-location";
const ANTIPODE_LAYER = "antipode-location-dot";
const EMPTY_POINT: FeatureCollection<Point> = {
  type: "FeatureCollection",
  features: [],
};

function pointFeature(longitude: number, latitude: number): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [longitude, latitude] },
      },
    ],
  };
}

export function GlobeMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const animationActiveRef = useRef(false);
  const antipodeDataRef = useRef<FeatureCollection<Point>>(EMPTY_POINT);
  const selectedPointDataRef = useRef<FeatureCollection<Point>>(EMPTY_POINT);
  const [renderError, setRenderError] = useState(false);
  const selectedPoint = useExplorationStore((state) => state.selectedPoint);
  const selectPoint = useExplorationStore((state) => state.selectPoint);
  const drillingStatus = useDrillingStatus();
  const experience = useDrillingExperience();
  const { attachMap, isActive } = experience;

  useEffect(() => {
    animationActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (typeof window.WebGL2RenderingContext === "undefined") {
      setRenderError(true);
      return;
    }

    const profile = detectGlobePerformance();
    configureMapLibreWorkers(profile, maplibregl);
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style:
          import.meta.env.VITE_MAP_STYLE_URL ??
          "https://tiles.openfreemap.org/styles/liberty",
        center: [-38.5267, -3.7319],
        zoom: getInitialGlobeZoom(window.innerWidth),
        maxZoom: 19,
        maxPitch: 60,
        pixelRatio: profile.pixelRatio,
        cancelPendingTileRequestsWhileZooming: true,
        canvasContextAttributes: {
          antialias: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
        },
      });
    } catch (error) {
      console.error("Não foi possível inicializar a visualização 3D", error);
      setRenderError(true);
      return;
    }
    mapRef.current = map;
    attachMap(map);
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    const onLoad = () => {
      map.setProjection({ type: "globe" });
      map.addSource(MARKER_SOURCE, { type: "geojson", data: selectedPointDataRef.current });
      map.addLayer({
        id: MARKER_HALO_LAYER,
        type: "circle",
        source: MARKER_SOURCE,
        paint: {
          "circle-radius": 17,
          "circle-color": "#f7c95c",
          "circle-opacity": 0.16,
          "circle-stroke-width": 0,
        },
      });
      map.addLayer({
        id: MARKER_LAYER,
        type: "circle",
        source: MARKER_SOURCE,
        paint: {
          "circle-radius": 9,
          "circle-color": "#f7c95c",
          "circle-stroke-color": "#071411",
          "circle-stroke-width": 3,
        },
      });
      map.addSource(ANTIPODE_SOURCE, {
        type: "geojson",
        data: antipodeDataRef.current,
      });
      map.addLayer({
        id: ANTIPODE_LAYER,
        type: "circle",
        source: ANTIPODE_SOURCE,
        paint: {
          "circle-radius": 8,
          "circle-color": "#67e8f9",
          "circle-stroke-color": "#071411",
          "circle-stroke-width": 3,
        },
      });
    };
    map.on("load", onLoad);

    const onClick = (event: MapMouseEvent) => {
      if (animationActiveRef.current) return;
      const longitude = Number(event.lngLat.lng.toFixed(6));
      const latitude = Number(event.lngLat.lat.toFixed(6));
      selectPoint({ longitude, latitude });
    };
    map.on("click", onClick);
    const canvas = map.getCanvas();
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setRenderError(true);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    return () => {
      map.off("load", onLoad);
      map.off("click", onClick);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      attachMap(null);
      map.remove();
      mapRef.current = null;
    };
  }, [attachMap, selectPoint]);

  useEffect(() => {
    selectedPointDataRef.current = selectedPoint
      ? pointFeature(selectedPoint.longitude, selectedPoint.latitude)
      : EMPTY_POINT;
    const source = mapRef.current?.getSource<GeoJSONSource>(MARKER_SOURCE);
    void source?.setData(selectedPointDataRef.current);
  }, [selectedPoint]);

  useEffect(() => {
    const antipode = drillingStatus.data?.antipode;
    antipodeDataRef.current = antipode
      ? pointFeature(antipode.longitude, antipode.latitude)
      : EMPTY_POINT;
    const source = mapRef.current?.getSource<GeoJSONSource>(ANTIPODE_SOURCE);
    void source?.setData(antipodeDataRef.current);
  }, [drillingStatus.data?.antipode]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" aria-label="Globo terrestre interativo" />
      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#071411] px-6 text-center" role="alert">
          <div className="max-w-md rounded-2xl border border-white/10 bg-[#0b1c18] p-6">
            <p className="eyebrow">Visualização indisponível</p>
            <h2 className="mt-3 text-xl font-bold text-white">Não foi possível abrir o globo 3D</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-50/60">
              Seu navegador ou dispositivo não conseguiu inicializar a visualização 3D. Verifique se a aceleração de hardware está ativa e recarregue a página.
            </p>
            <button className="experience-secondary-button mt-5" onClick={() => window.location.reload()}>
              Tentar novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
