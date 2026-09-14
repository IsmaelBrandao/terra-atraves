import { expect, test } from "@playwright/test";

import { mapCenter, mockExperienceApis, waitForMapReady } from "./support/experience";

const BRAZIL = { latitude: -12, longitude: -54 };

test.describe("entry and initial camera", () => {
  test("shows the entry screen immediately and hides the map until it is really usable", async ({ page }) => {
    await mockExperienceApis(page);
    let styleServedAt = 0;
    await page.route("**/styles/liberty", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_500));
      const response = await route.fetch();
      styleServedAt = Date.now();
      await route.fulfill({ response });
    });

    await page.goto("/", { waitUntil: "commit" });
    const loading = page.getByTestId("loading-screen");
    await expect(loading).toBeVisible();
    await expect(loading).toContainText("Terra Através");
    await expect(page.getByRole("status").first()).toHaveText(/Inicializando globo…|Carregando cartografia…/);
    await expect(loading).not.toContainText("%");

    const cover = await loading.boundingBox();
    const viewport = page.viewportSize()!;
    expect(cover).toMatchObject({ x: 0, y: 0, width: viewport.width, height: viewport.height });

    // While the cartography is still downloading the globe must stay hidden and non-interactive.
    await page.waitForTimeout(2_000);
    await expect(loading).toHaveCSS("opacity", "1");
    await expect(page.locator("main")).not.toHaveAttribute("data-map-status", "ready");
    await expect(page.locator("main")).toHaveAttribute("inert", "");

    await waitForMapReady(page);
    const readyAt = Date.now();
    expect(styleServedAt).toBeGreaterThan(0);
    expect(readyAt).toBeGreaterThan(styleServedAt);
    const mapState = await page.evaluate(() => ({
      canvas: document.querySelector(".maplibregl-canvas") !== null,
      inert: document.querySelector("main")?.hasAttribute("inert"),
    }));
    expect(mapState).toEqual({ canvas: true, inert: false });
  });

  test("does not trap the visitor when cartography never arrives", async ({ page }) => {
    test.setTimeout(45_000);
    await mockExperienceApis(page);
    await page.route("**/styles/liberty", (route) => route.abort());
    await page.goto("/");
    await expect(page.getByTestId("loading-screen")).toBeVisible();
    await expect(page.locator("main")).toHaveAttribute("data-map-status", "ready", { timeout: 16_000 });
    await expect(page.getByTestId("loading-screen")).toHaveCount(0);
  });

  test("opens centred on Brazil with guidance only", async ({ page }) => {
    await mockExperienceApis(page);
    await page.goto("/");
    await waitForMapReady(page);
    const center = await mapCenter(page);
    expect(center.latitude).toBeCloseTo(BRAZIL.latitude, 1);
    expect(center.longitude).toBeCloseTo(BRAZIL.longitude, 1);
    expect(center.zoom).toBeGreaterThan(1);
    expect(center.zoom).toBeLessThan(2.6);
    await expect(page.getByRole("heading", { name: "Selecione qualquer ponto da Terra" })).toBeVisible();
    await expect(page.getByText("Gire, aproxime e toque em um local para começar.")).toBeVisible();
    await expect(page.getByRole("button", { name: "CAVAR" })).toHaveCount(0);
    await expect(page.locator("table")).toHaveCount(0);
  });

  test("a valid shared link centres on its origin, marks it and waits for CAVAR", async ({ page }) => {
    const requests = await mockExperienceApis(page, {
      reverse: { display_name: "Lisboa, Portugal", address: { city: "Lisboa", state: "Lisboa", country: "Portugal" } },
    });
    await page.goto("/?lat=38.7223&lon=-9.1393");
    await waitForMapReady(page);
    const center = await mapCenter(page);
    expect(center.latitude).toBeCloseTo(38.7223, 3);
    expect(center.longitude).toBeCloseTo(-9.1393, 3);
    await expect(page.getByRole("heading", { name: "Lisboa" })).toBeVisible();
    await expect(page.getByText("38,7223° N")).toBeVisible();
    await expect(page.getByRole("button", { name: "CAVAR" })).toBeEnabled();
    await page.waitForTimeout(1_500);
    expect(requests.drillingsCreated).toBe(0);
    await expect(page.getByTestId("drilling-depth")).toHaveCount(0);
    expect(page.url()).toContain("lat=38.7223");
  });

  test("an invalid shared link is ignored and Brazil opens normally", async ({ page }) => {
    await mockExperienceApis(page);
    await page.goto("/?lat=123&lon=abc");
    await waitForMapReady(page);
    const center = await mapCenter(page);
    expect(center.latitude).toBeCloseTo(BRAZIL.latitude, 1);
    expect(center.longitude).toBeCloseTo(BRAZIL.longitude, 1);
    await expect(page.getByRole("heading", { name: "Selecione qualquer ponto da Terra" })).toBeVisible();
    expect(new URL(page.url()).search).toBe("");
  });
});
