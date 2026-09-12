import type { FeatureCollection, Point } from "geojson";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { useDrillingStatus } from "../hooks/useLocation";
import { useExplorationStore } from "../store/exploration.store";
import { configureMapLibreWorkers, detectGlobePerformance } from "./globe.performance";

const MARKER_SOURCE = "selected-location";
const MARKER_LAYER = "selected-location-dot";
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
  const antipodeDataRef = useRef<FeatureCollection<Point>>(EMPTY_POINT);
  const selectPoint = useExplorationStore((state) => state.selectPoint);
  const drillingStatus = useDrillingStatus();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const profile = detectGlobePerformance();
    configureMapLibreWorkers(profile, maplibregl);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style:
        import.meta.env.VITE_MAP_STYLE_URL ??
        "https://tiles.openfreemap.org/styles/liberty",
      center: [-38.5267, -3.7319],
      zoom: 1.7,
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
    mapRef.current = map;
    let markerData = EMPTY_POINT;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    const onLoad = () => {
      map.setProjection({ type: "globe" });
      map.addSource(MARKER_SOURCE, { type: "geojson", data: markerData });
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
      const longitude = Number(event.lngLat.lng.toFixed(6));
      const latitude = Number(event.lngLat.lat.toFixed(6));
      markerData = pointFeature(longitude, latitude);
      const source = map.getSource<GeoJSONSource>(MARKER_SOURCE);
      void source?.setData(markerData);
      selectPoint({ longitude, latitude });
    };
    map.on("click", onClick);

    return () => {
      map.off("load", onLoad);
      map.off("click", onClick);
      map.remove();
      mapRef.current = null;
    };
  }, [selectPoint]);

  useEffect(() => {
    const antipode = drillingStatus.data?.antipode;
    antipodeDataRef.current = antipode
      ? pointFeature(antipode.longitude, antipode.latitude)
      : EMPTY_POINT;
    const source = mapRef.current?.getSource<GeoJSONSource>(ANTIPODE_SOURCE);
    void source?.setData(antipodeDataRef.current);
  }, [drillingStatus.data?.antipode]);

  return <div ref={containerRef} className="h-full w-full" aria-label="Globo terrestre interativo" />;
}
