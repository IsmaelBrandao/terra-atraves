import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const drillingId = "89d31e48-8bd3-4c28-a4f0-dae0e660594f";

async function mockApplicationApi(page: Page) {
  await page.route("**/api/v1/locations/reverse?*", async (route) => {
    await route.fulfill({
      json: {
        latitude: -3.7319,
        longitude: -38.5267,
        display_name: "Fortaleza, Ceará, Brasil",
        address: { city: "Fortaleza", state: "Ceará", country: "Brasil" },
        cached: true,
      },
    });
  });
  await page.route("**/api/v1/drillings", async (route) => {
    await route.fulfill({
      status: 202,
      json: { id: drillingId, status: "queued", status_url: `/api/v1/drillings/${drillingId}` },
    });
  });
  await page.route(`**/api/v1/drillings/${drillingId}`, async (route) => {
    await route.fulfill({
      json: {
        id: drillingId,
        status: "completed",
        progress: 100,
        stage: "completed",
        origin: { latitude: -3.7319, longitude: -38.5267 },
        antipode: { latitude: 3.7319, longitude: 141.4733 },
        destination: {
          type: "ocean",
          country: null,
          state: null,
          nearest_place: null,
          nearest_land: {
            coordinates: { latitude: 3.9, longitude: 140.1 },
            distance_km: 479.7,
            country: { name: "Indonésia", iso_a2: "ID", iso_a3: "IDN" },
            nearest_place: {
              name: "Biak",
              country: "Indonésia",
              coordinates: { latitude: -1.18, longitude: 136.08 },
              distance_km: 479.7,
            },
          },
        },
        origin_label: "Fortaleza, Ceará, Brasil",
        destination_label: "Oceano Pacífico",
        destination_is_land: false,
        nearest_place: null,
        nearest_place_distance_m: null,
        error: null,
        created_at: "2026-09-13T12:00:00Z",
        completed_at: "2026-09-13T12:00:01Z",
      },
    });
  });
}

async function selectPoint(page: Page) {
  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible();
  await canvas.click({ position: { x: 640, y: 330 } });
  await expect(page.getByRole("heading", { name: "Fortaleza" })).toBeVisible();
}

test("covers the complete drilling journey and remains accessible", async ({ page }) => {
  await mockApplicationApi(page);
  await page.goto("/");

  let apiRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/")) apiRequests += 1;
  });
  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible();
  await canvas.dragTo(canvas, {
    sourcePosition: { x: 720, y: 320 },
    targetPosition: { x: 560, y: 320 },
  });
  await page.mouse.wheel(0, -180);
  await expect.poll(() => apiRequests).toBe(0);

  await selectPoint(page);
  await page.screenshot({ path: "../output/playwright/phase4/after-selected-1280.png" });
  await page.getByRole("button", { name: "Preparar perfuração" }).click();
  await expect(page.getByRole("button", { name: "CAVAR" })).toBeEnabled();

  await page.getByRole("button", { name: "CAVAR" }).click();
  await page.getByRole("button", { name: "Pausar experiência" }).click();
  await expect(page.getByRole("button", { name: "Continuar experiência" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar experiência" }).click();
  await page.getByRole("button", { name: "Cancelar experiência" }).click();
  await expect(page.getByRole("button", { name: "CAVAR" })).toBeVisible();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "CAVAR" }).click();
  await expect(page.getByRole("heading", { name: "Oceano Pacífico" })).toBeVisible();
  await expect(page.getByText("Terra firme mais próxima")).toBeVisible();
  await page.screenshot({ path: "../output/playwright/phase4/after-result-1280.png" });

  const accessibility = await new AxeBuilder({ page }).analyze();
  const seriousViolations = accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
  expect(seriousViolations).toEqual([]);

  await page.getByRole("button", { name: "Repetir perfuração" }).click();
  await expect(page.getByRole("heading", { name: "Oceano Pacífico" })).toBeVisible();
  await page.getByRole("button", { name: "Escolher outro local" }).click();
  await expect(page.getByRole("heading", { name: "Explore o planeta e selecione um ponto" })).toBeVisible();
});
