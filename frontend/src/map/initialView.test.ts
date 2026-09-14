import { describe, expect, it } from "vitest";

import { BRAZIL_VIEW_CENTER, getInitialGlobeZoom, parseSharedOrigin, resolveInitialGlobeView } from "./initialView";

describe("parseSharedOrigin", () => {
  it("accepts valid latitude and longitude", () => {
    expect(parseSharedOrigin("?lat=-3.7319&lon=-38.5267")).toEqual({ latitude: -3.7319, longitude: -38.5267 });
    expect(parseSharedOrigin("?lon=180&lat=90")).toEqual({ latitude: 90, longitude: 180 });
    expect(parseSharedOrigin("?lat=-90&lon=-180")).toEqual({ latitude: -90, longitude: -180 });
  });

  it.each([
    ["", "missing parameters"],
    ["?lat=10", "missing longitude"],
    ["?lat=90.0001&lon=0", "latitude above 90"],
    ["?lat=0&lon=-180.5", "longitude below -180"],
    ["?lat=abc&lon=10", "non numeric"],
    ["?lat=1e1&lon=10", "exponent notation"],
    ["?lat=&lon=10", "empty value"],
    ["?lat=Infinity&lon=10", "infinity"],
    ["?lat=0x10&lon=10", "hexadecimal"],
  ])("ignores %s (%s)", (search) => {
    expect(parseSharedOrigin(search)).toBeNull();
  });
});

describe("resolveInitialGlobeView", () => {
  it("always opens on Brazil without a shared origin", () => {
    const view = resolveInitialGlobeView("", 1440, 900);
    expect(view.center).toEqual(BRAZIL_VIEW_CENTER);
    expect(view.sharedOrigin).toBeNull();
  });

  it("falls back to Brazil when the shared URL is invalid", () => {
    expect(resolveInitialGlobeView("?lat=200&lon=10", 390, 844).center).toEqual(BRAZIL_VIEW_CENTER);
  });

  it("uses the shared origin instead of Brazil", () => {
    const view = resolveInitialGlobeView("?lat=38.7223&lon=-9.1393", 1440, 900);
    expect(view.center).toEqual([-9.1393, 38.7223]);
    expect(view.sharedOrigin).toEqual({ latitude: 38.7223, longitude: -9.1393 });
  });
});

describe("getInitialGlobeZoom", () => {
  it("keeps the whole planet framed and scales with the viewport", () => {
    const desktop = getInitialGlobeZoom(1920, 1080);
    const notebook = getInitialGlobeZoom(1366, 768);
    const phone = getInitialGlobeZoom(360, 800);
    expect(desktop).toBeGreaterThan(notebook);
    expect(notebook).toBeGreaterThan(phone);
    expect(phone).toBeGreaterThanOrEqual(0.9);
    expect(desktop).toBeLessThanOrEqual(2.6);
  });
});
