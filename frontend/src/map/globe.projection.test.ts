import { describe, expect, it, vi } from "vitest";

import { enforceGlobeProjection, watchGlobeProjection } from "./globe.projection";

type ProjectionMap = Parameters<typeof enforceGlobeProjection>[0];

function projectionMap(projection = "mercator", worldCopies = true) {
  let currentProjection = projection;
  let renderWorldCopies = worldCopies;
  let styleLoadListener: (() => void) | undefined;

  const map = {
    getProjection: vi.fn(() => ({ type: currentProjection })),
    setProjection: vi.fn(({ type }: { type: string }) => {
      currentProjection = type;
    }),
    getRenderWorldCopies: vi.fn(() => renderWorldCopies),
    setRenderWorldCopies: vi.fn((value: boolean) => {
      renderWorldCopies = value;
    }),
    on: vi.fn((event: string, listener: () => void) => {
      if (event === "style.load") styleLoadListener = listener;
    }),
    off: vi.fn(),
  };

  return {
    map: map as unknown as ProjectionMap,
    rawMap: map,
    emitStyleLoad: () => styleLoadListener?.(),
    resetStyle: () => {
      currentProjection = "mercator";
      renderWorldCopies = true;
    },
  };
}

describe("globe projection", () => {
  it("enforces globe projection and disables world copies", () => {
    const { map, rawMap } = projectionMap();

    enforceGlobeProjection(map);

    expect(rawMap.setProjection).toHaveBeenCalledWith({ type: "globe" });
    expect(rawMap.setRenderWorldCopies).toHaveBeenCalledWith(false);
  });

  it("sets the globe when MapLibre has not exposed a projection yet", () => {
    const { map, rawMap } = projectionMap();
    rawMap.getProjection.mockReturnValueOnce(undefined as never);

    enforceGlobeProjection(map);

    expect(rawMap.setProjection).toHaveBeenCalledWith({ type: "globe" });
  });

  it("restores the globe whenever the remote style finishes loading", () => {
    const { map, rawMap, emitStyleLoad, resetStyle } = projectionMap();
    const stopWatching = watchGlobeProjection(map);

    expect(rawMap.on).toHaveBeenCalledWith("style.load", expect.any(Function));
    emitStyleLoad();
    resetStyle();
    emitStyleLoad();

    expect(rawMap.setProjection).toHaveBeenCalledTimes(2);
    expect(rawMap.setRenderWorldCopies).toHaveBeenCalledTimes(2);

    stopWatching();
    expect(rawMap.off).toHaveBeenCalledWith("style.load", expect.any(Function));
  });

  it("does not reapply an already-correct projection", () => {
    const { map, rawMap } = projectionMap("globe", false);

    enforceGlobeProjection(map);

    expect(rawMap.setProjection).not.toHaveBeenCalled();
    expect(rawMap.setRenderWorldCopies).not.toHaveBeenCalled();
  });
});
