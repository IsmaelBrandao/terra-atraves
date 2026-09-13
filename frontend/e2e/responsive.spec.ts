import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "notebook-1366", width: 1366, height: 768 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-360", width: 360, height: 800 },
] as const;

test("keeps the globe and initial guidance usable at all target widths", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator("main")).toHaveAttribute("data-map-status", "ready", { timeout: 20_000 });
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Selecione qualquer ponto da Terra" })).toBeVisible();
    const layout = await page.evaluate(() => {
      const panelRect = document.querySelector("aside")?.getBoundingClientRect();
      return {
        viewportWidth: document.documentElement.clientWidth,
        contentWidth: document.documentElement.scrollWidth,
        panel: panelRect
          ? { left: panelRect.left, right: panelRect.right, bottom: panelRect.bottom }
          : null,
      };
    });
    expect(layout.contentWidth).toBe(layout.viewportWidth);
    expect(layout.panel?.left).toBeGreaterThanOrEqual(0);
    expect(layout.panel?.right).toBeLessThanOrEqual(viewport.width);
    expect(layout.panel?.bottom).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: `../output/playwright/phase4/after-${viewport.name}.png` });
  }
});
