import type { FeatureCollection, Point } from "geojson";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { useDrillingExperience } from "../features/drilling-animation/useDrillingExperience";
import { useDrillingStatus } from "../hooks/useLocation";
import { useExplorationStore } from "../store/exploration.store";
import { useUiStore } from "../store/ui.store";
import { configureMapLibreWorkers, detectGlobePerformance } from "./globe.performance";
import { resolveInitialGlobeView } from "./initialView";
import { trackMapReadiness } from "./mapReadiness";

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
  const setMapStatus = useUiStore((state) => state.setMapStatus);
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
      setMapStatus("failed");
      return;
    }

    const profile = detectGlobePerformance();
    configureMapLibreWorkers(profile, maplibregl);
    const initialView = resolveInitialGlobeView(window.location.search, window.innerWidth, window.innerHeight);
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style:
          import.meta.env.VITE_MAP_STYLE_URL ??
          "https://tiles.openfreemap.org/styles/liberty",
        center: initialView.center,
        zoom: initialView.zoom,
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
      setMapStatus("failed");
      return;
    }
    mapRef.current = map;
    const stopReadinessTracking = trackMapReadiness(map, { onStatus: setMapStatus });
    attachMap(map);
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    const onLoad = () => {
      map.setProjection({ type: "globe" });
      // Thin atmosphere halo around the globe; fades out as the camera gets close to the ground.
      map.setSky({
        "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.32, 3, 0.26, 6, 0],
      });
      map.addSource(MARKER_SOURCE, { type: "geojson", data: selectedPointDataRef.current });
      map.addLayer({
        id: MARKER_HALO_LAYER,
        type: "circle",
        source: MARKER_SOURCE,
        paint: {
          "circle-radius": 17,
          "circle-color": "#f5c86a",
          "circle-opacity": 0.18,
          "circle-stroke-width": 0,
        },
      });
      map.addLayer({
        id: MARKER_LAYER,
        type: "circle",
        source: MARKER_SOURCE,
        paint: {
          "circle-radius": 9,
          "circle-color": "#f5c86a",
          "circle-stroke-color": "#02040a",
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
          "circle-color": "#7fe3f2",
          "circle-stroke-color": "#02040a",
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
    const container = containerRef.current;
    const onMoveEnd = () => {
      const center = map.getCenter();
      container.dataset.centerLng = center.lng.toFixed(4);
      container.dataset.centerLat = center.lat.toFixed(4);
      container.dataset.zoom = map.getZoom().toFixed(2);
    };
    onMoveEnd();
    map.on("moveend", onMoveEnd);
    const canvas = map.getCanvas();
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setRenderError(true);
      setMapStatus("failed");
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    return () => {
      stopReadinessTracking();
      map.off("load", onLoad);
      map.off("click", onClick);
      map.off("moveend", onMoveEnd);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      attachMap(null);
      map.remove();
      mapRef.current = null;
    };
  }, [attachMap, selectPoint, setMapStatus]);

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
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center" role="alert">
          <div className="max-w-md">
            <p className="panel-kicker justify-center">Visualização indisponível</p>
            <h2 className="mt-3 font-display text-3xl text-white">Não foi possível abrir o globo 3D</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300/70">
              Seu navegador ou dispositivo não conseguiu inicializar a visualização 3D. Verifique se a aceleração de hardware está ativa e recarregue a página.
            </p>
            <button type="button" className="dock-button mt-6" onClick={() => window.location.reload()}>
              Tentar novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
