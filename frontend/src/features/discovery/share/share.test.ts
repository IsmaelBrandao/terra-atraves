import { afterEach, describe, expect, it, vi } from "vitest";

import { fortalezaReverse, oceanJob } from "../../../test/fixtures";
import { describeLocation } from "../../location/formatLocation";
import { buildDiscovery } from "../discoveryContent";
import { buildShareCardContent } from "./shareCardContent";
import { buildShareUrl, canUseWebShare, clearSharedOriginFromAddressBar, copyText, shareWithDevice } from "./shareLink";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("buildShareUrl", () => {
  it("uses the origin coordinates and drops unrelated state", () => {
    expect(buildShareUrl({ latitude: -3.731912, longitude: -38.526734 }, "https://terraatraves.app/?foo=1#x")).toBe(
      "https://terraatraves.app/?lat=-3.7319&lon=-38.5267",
    );
  });
});

describe("clearSharedOriginFromAddressBar", () => {
  it("removes lat/lon but keeps other parameters", () => {
    window.history.replaceState(null, "", "/?lat=1&lon=2&lang=pt");
    clearSharedOriginFromAddressBar();
    expect(window.location.search).toBe("?lang=pt");
  });
});

describe("copyText", () => {
  it("uses the async clipboard when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    await expect(copyText("https://x")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://x");
  });

  it("falls back to execCommand when the clipboard is denied", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true });
    await expect(copyText("https://x")).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("reports failure when nothing can copy", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
    Object.defineProperty(document, "execCommand", { value: vi.fn().mockReturnValue(false), configurable: true });
    await expect(copyText("https://x")).resolves.toBe(false);
  });
});

describe("shareWithDevice", () => {
  it("is unavailable without the Web Share API, silently", async () => {
    vi.stubGlobal("navigator", { ...navigator, share: undefined });
    expect(canUseWebShare()).toBe(false);
    await expect(shareWithDevice({ url: "https://x" })).resolves.toBe("unavailable");
  });

  it("distinguishes a user cancel from a failure", async () => {
    vi.stubGlobal("navigator", { ...navigator, share: vi.fn().mockRejectedValue(new DOMException("x", "AbortError")) });
    await expect(shareWithDevice({ url: "https://x" })).resolves.toBe("cancelled");
    vi.stubGlobal("navigator", { ...navigator, share: vi.fn().mockRejectedValue(new Error("boom")) });
    await expect(shareWithDevice({ url: "https://x" })).resolves.toBe("failed");
    vi.stubGlobal("navigator", { ...navigator, share: vi.fn().mockResolvedValue(undefined) });
    await expect(shareWithDevice({ url: "https://x" })).resolves.toBe("shared");
  });
});

describe("buildShareCardContent", () => {
  it("summarises origin, antipode, distance and nearest land", () => {
    const discovery = buildDiscovery(oceanJob, describeLocation(fortalezaReverse))!;
    const content = buildShareCardContent(discovery, "https://terraatraves.app/?lat=-3.7319&lon=-38.5267");
    expect(content).toMatchObject({
      originTitle: "Fortaleza",
      originSubtitle: "Ceará, Brasil",
      destinationTitle: "Oceano Pacífico",
      kindLabel: "Destino oceânico",
      distanceLabel: "12.742 km através da Terra",
      footnote: "Terra firme mais próxima: Indonésia · 480 km",
      siteLabel: "terraatraves.app",
      filename: "terra-atraves-fortaleza-oceano-pacifico.png",
    });
  });

  it("does not print a generic land label as if it were a name", () => {
    const destination = oceanJob.destination!;
    const unnamed = buildDiscovery({ ...oceanJob, destination: { ...destination, nearest_land: { ...destination.nearest_land!, country: null } } }, null)!;
    expect(buildShareCardContent(unnamed, "https://terraatraves.app/").footnote).toBe("Terra firme mais próxima a 480 km");
  });
});
