import type { Map } from "maplibre-gl";

type GlobeProjectionMap = Pick<
  Map,
  | "getProjection"
  | "setProjection"
  | "getRenderWorldCopies"
  | "setRenderWorldCopies"
  | "on"
  | "off"
>;

export function enforceGlobeProjection(map: GlobeProjectionMap): void {
  if (map.getProjection()?.type !== "globe") {
    map.setProjection({ type: "globe" });
  }

  if (map.getRenderWorldCopies()) {
    map.setRenderWorldCopies(false);
  }
}

export function watchGlobeProjection(map: GlobeProjectionMap): () => void {
  const enforce = () => enforceGlobeProjection(map);
  map.on("style.load", enforce);

  return () => map.off("style.load", enforce);
}
