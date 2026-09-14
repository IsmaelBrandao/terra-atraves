import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  digAndWaitForDiscovery,
  expectNoHorizontalOverflow,
  landJob,
  mockExperienceApis,
  waitForMapReady,
} from "./support/experience";

test.describe("discovery modal", () => {
  test.setTimeout(120_000);

  test("ocean result: modal, image, calculation, sharing, close and reopen", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    // Desktop Chromium may or may not expose Web Share; force the fallback path deterministically.
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true });
    });
    const requests = await mockExperienceApis(page, { wikimedia: "photo" });

    await page.goto("/?lat=-3.7319&lon=-38.5267");
    await waitForMapReady(page);
    await expect(page.getByRole("heading", { name: "Fortaleza" })).toBeVisible();

    await page.getByRole("button", { name: "CAVAR" }).click();
    const hud = page.getByRole("region", { name: "Perfuração em andamento" });
    await expect(hud).toBeVisible({ timeout: 10_000 });
    await expect(hud.getByRole("button", { name: "Pausar experiência" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fortaleza" })).toHaveCount(0);
    await expect(page.locator(".app-header")).toHaveCSS("opacity", "0");

    // No image lookup while the result does not exist yet — only once the discovery is shown.
    await expect(page.getByText("Revelando o antípoda", { exact: true })).toBeVisible({ timeout: 60_000 });
    expect(requests.wikimedia).toBe(0);
    const dialog = page.getByRole("dialog", { name: "Oceano" });
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => requests.wikimedia).toBeGreaterThan(0);

    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog.getByText("Você chegou ao outro lado da Terra")).toBeVisible();
    await expect(dialog.getByText("≈ 12.742 km")).toBeVisible();
    const facts = dialog.locator(".discovery-facts");
    await expect(facts.getByText("Destino direto")).toBeVisible();
    await expect(facts.getByText("Terra firme mais próxima")).toBeVisible();
    await expect(facts.getByText("Pequena ilha ou costa")).toBeVisible();
    await expect(facts.getByText("Localidade habitada próxima")).toBeVisible();
    await expect(facts.getByText("Jayapura")).toBeVisible();
    await expect(dialog).not.toContainText("null");
    await expect(dialog.locator("table")).toHaveCount(0);

    const photo = dialog.getByRole("img", { name: /Fotografia de Jayapura/ });
    await expect(photo).toHaveAttribute("loading", "lazy");
    await expect(dialog.getByText("Foto: Fotógrafa de Teste")).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Wikimedia Commons" })).toHaveAttribute("href", /commons\.wikimedia\.org/);

    await dialog.getByText("Como calculamos?").click();
    await expect(dialog.getByText("Latitude invertida")).toBeVisible();
    await expect(dialog.getByText("−38,5267° + 180° = 141,4733°")).toBeVisible();

    await dialog.getByRole("button", { name: "Compartilhar" }).click();
    await expect(dialog.getByRole("button", { name: "Compartilhar pelo dispositivo" })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Copiar link" }).click();
    await expect(dialog.getByText("Link copiado")).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(copied).search).toBe("?lat=-3.7319&lon=-38.5267");

    const downloadPromise = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Baixar imagem da descoberta" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("terra-atraves-fortaleza-oceano.png");
    await download.saveAs("../output/ui-ux/e2e-share-card.png");

    const accessibility = await new AxeBuilder({ page }).include(".discovery-modal").analyze();
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);

    await page.keyboard.press("Escape"); // closes the share menu first
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    const reopen = page.getByRole("button", { name: "Ver descoberta" });
    await expect(reopen).toBeVisible();
    await expect(reopen).toBeFocused();

    await reopen.click();
    await expect(page.getByRole("dialog", { name: "Oceano" })).toBeVisible();
    await page.getByRole("button", { name: "Fechar descoberta" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await reopen.click();
    await page.getByRole("button", { name: "Ver no globo" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(reopen).toBeVisible();
  });

  test("land result adapts the content and keeps an elegant fallback without image", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "share", {
        value: () => Promise.reject(new Error("share failed")),
        configurable: true,
      });
      Object.defineProperty(Navigator.prototype, "clipboard", {
        value: { writeText: () => Promise.resolve() },
        configurable: true,
      });
    });
    await mockExperienceApis(page, {
      job: landJob,
      wikimedia: "missing",
      reverse: { display_name: "Local não identificado", address: {} },
    });
    await page.goto("/?lat=3.7319&lon=141.4733");
    await waitForMapReady(page);
    const dialog = await digAndWaitForDiscovery(page);

    await expect(dialog).toHaveAccessibleName("Fortaleza");
    await expect(dialog.getByText("Ceará, Brasil").first()).toBeVisible();
    await expect(dialog.locator(".discovery-facts").getByText("País")).toBeVisible();
    await expect(dialog.locator(".discovery-facts").getByText("Estado / província")).toBeVisible();
    await expect(dialog.locator(".discovery-facts").getByText("Terra firme mais próxima")).toHaveCount(0);
    await expect(dialog.getByText("Local não identificado")).toHaveCount(0);

    await expect(dialog.locator(".destination-media")).toHaveAttribute("data-state", "fallback", { timeout: 10_000 });
    await expect(dialog.locator(".destination-art svg")).toBeVisible();
    await expect(dialog.locator("img")).toHaveCount(0);

    await dialog.getByRole("button", { name: "Compartilhar" }).click();
    await dialog.getByRole("button", { name: "Compartilhar pelo dispositivo" }).click();
    await expect(dialog.getByText("Link copiado")).toBeVisible();

    await dialog.getByRole("button", { name: "Escolher outro local" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Selecione qualquer ponto da Terra" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ver descoberta" })).toHaveCount(0);
  });

  test("mobile 360: compact result modal without overflow and with touch-sized actions", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await mockExperienceApis(page, { wikimedia: "photo" });
    await page.goto("/?lat=-3.7319&lon=-38.5267");
    await waitForMapReady(page);
    await expectNoHorizontalOverflow(page);
    const dialog = await digAndWaitForDiscovery(page);
    await expect(dialog.getByRole("img", { name: /Fotografia/ })).toBeVisible();
    await dialog.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
    await expectNoHorizontalOverflow(page);

    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(8);
    expect(box!.x + box!.width).toBeLessThanOrEqual(352);
    expect(box!.height).toBeLessThanOrEqual(800);

    const frame = await dialog.locator(".destination-media__frame").boundingBox();
    expect(frame!.width / frame!.height).toBeCloseTo(1.6, 1);

    for (const name of ["Fechar descoberta", "Compartilhar", "Repetir perfuração", "Escolher outro local", "Ver no globo"]) {
      const button = await dialog.getByRole("button", { name, exact: true }).boundingBox();
      expect(button!.height, name).toBeGreaterThanOrEqual(44);
      expect(button!.width, name).toBeGreaterThanOrEqual(44);
    }
  });
});
