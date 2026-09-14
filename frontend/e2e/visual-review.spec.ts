import { expect, test, type Page } from "@playwright/test";

import { waitForMapReady } from "./support/experience";

/**
 * Manual review captures against the REAL local stack (API, PostGIS, Celery, Wikimedia).
 * Not part of `test:e2e`; run with `npm run test:visual` while the backend is up.
 */
const OUT = "../output/ui-ux/screenshots";
const FORTALEZA = "/?lat=-3.7319&lon=-38.5267";
const FORTALEZA_ANTIPODE = "/?lat=3.7319&lon=141.4733";

async function settleDiscovery(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 90_000 });
  await expect(dialog.locator(".destination-media")).toHaveAttribute("data-state", /loaded|fallback/, { timeout: 20_000 });
  await page.waitForTimeout(900);
  return dialog;
}

test.describe("@visual review captures", () => {
  test.setTimeout(240_000);

  test("desktop journey", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByTestId("loading-screen")).toBeVisible();
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${OUT}/01-loading.png` });

    await waitForMapReady(page);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/02-brazil-initial.png` });

    await page.goto(FORTALEZA);
    await waitForMapReady(page);
    await expect(page.getByRole("heading", { name: "Fortaleza" })).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/03-selected-location.png` });

    await page.getByRole("button", { name: "CAVAR" }).click();
    await expect(page.getByText("MANTO", { exact: true })).toBeVisible({ timeout: 40_000 });
    await page.waitForTimeout(2_600);
    await page.screenshot({ path: `${OUT}/04-drilling-minimal-ui.png` });

    const ocean = await settleDiscovery(page);
    await page.screenshot({ path: `${OUT}/05-result-ocean.png` });

    await ocean.getByText("Como calculamos?").click();
    await ocean.locator(".calculation").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/07-result-details-expanded.png` });

    await ocean.locator(".discovery-body").evaluate((element) => element.scrollTo(0, 0));
    await ocean.getByText("Como calculamos?").click();
    await ocean.getByRole("button", { name: "Compartilhar" }).click();
    await expect(ocean.getByRole("button", { name: "Copiar link" })).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/08-share-menu.png` });

    const download = page.waitForEvent("download");
    await ocean.getByRole("button", { name: "Baixar imagem da descoberta" }).click();
    await (await download).saveAs(`${OUT}/share-card-ocean.png`);

    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/extra-desktop-discovery-closed.png` });

    await page.goto(FORTALEZA_ANTIPODE);
    await waitForMapReady(page);
    await page.getByRole("button", { name: "CAVAR" }).click();
    await settleDiscovery(page);
    await page.screenshot({ path: `${OUT}/06-result-land.png` });
  });

  test("mobile 390 journey", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await waitForMapReady(page);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/09-mobile-initial.png` });

    await page.goto(FORTALEZA);
    await waitForMapReady(page);
    await expect(page.getByRole("heading", { name: "Fortaleza" })).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: `${OUT}/extra-mobile-selected.png` });
    await page.getByRole("button", { name: "CAVAR" }).click();
    await expect(page.getByText("MANTO", { exact: true })).toBeVisible({ timeout: 40_000 });
    await page.waitForTimeout(2_000);
    await page.screenshot({ path: `${OUT}/extra-mobile-drilling.png` });
    await settleDiscovery(page);
    await page.screenshot({ path: `${OUT}/10-mobile-result.png` });
  });

  test("mobile 360 initial", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");
    await waitForMapReady(page);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/extra-mobile-360-initial.png` });
  });
});
