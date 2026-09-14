import { expect, type Page } from "@playwright/test";

export const DRILLING_ID = "89d31e48-8bd3-4c28-a4f0-dae0e660594f";

/** Small landscape JPEG served in place of Wikimedia uploads, so tests never hit the network. */
const TEST_PHOTO = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCABkAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDm9tG2pNtG2vaueVYj20bak20baLhYj20bak20baLhYj20bak20baLhYj20bak20baLhYj20bak20baLhYj20bak20baLhYj20bak20baLhYj20bak20baLhYj20bak20baLhYk20bak20bai5diPbRtqTbRtouFiPbRtqTbRtouFiPbRtqTbRtouFiPbRtqTbRtouFiPbRtqTbRtouFiPbRtqTbRtouFiPbRtqTbRtouFiPbRtqTbRtouFiPbRtqTbRtouFiTbRtqTbRtqbl2I9tG2pNtG2i4WI9tG2pNtIxVFLOwVR1JOBRcLDNtG2oU1G0kfaJQPQsCAatbaSknswsR7aNtSbaNtO4WI9tG2pNtG2i4WI9tG2pNtG2i4WI9tG2pNtG2i4WI9tG2pNtVpb+0i6zBjjOF5zSckt2FiXbRtrOl1nqIofoXP9P/AK9U5NQupespUZzheMVjLEQW2oWOl20bak201ykal3YKo6ljgCtbmlhu2kcrGpZ2CqOpJwKzrrXI0+W2Tef7zcD8uv8AKsie4muW3TSFz2z0H4VhOvFbak3NW51mNflt13n+83A/LrWVNcS3DbpZCx7Z6D8KiorknUlPcQVLDcz25/dSsvfGePyqKioTa2A1odbOcTwjGeqH+h/xrRhu7a4OIplY5xjoT+BrmKK3jiJLfULnXbaNtc7Dql3Cf9aXGc4fnP49atvr7FSEtwrdiz5H5YFbrEQa1HdGvtqOWWKBcyyKgwSMnr9PWsCXU7yXOZioznCfLj8uaqVEsSuiC5uzazbIP3QaU4+g/X/CqU2s3Dn90FiGfqf1/wAKz6KxlWm+oiSWeWdsyyM/cZPSo6KKybuAUUUUAb13r0afLap5h/vtwPy6n9Kxp7ma5fdNIXI6Z6D6CoqKuVSUtwbuFFFFQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf/9k=", "base64");

export const oceanJob = {
  id: DRILLING_ID,
  status: "completed",
  progress: 100,
  stage: "completed",
  origin: { latitude: -3.7319, longitude: -38.5267 },
  antipode: { latitude: 3.7319, longitude: 141.4733 },
  destination: {
    type: "ocean",
    country: null,
    state: null,
    nearest_place: { name: "Jayapura", country: "Indonesia", coordinates: { latitude: -2.533, longitude: 140.7 }, distance_km: 698.1 },
    nearest_land: {
      coordinates: { latitude: 7.3678, longitude: 143.835 },
      distance_km: 479.7,
      country: null,
      nearest_place: { name: "Agana", country: "Guam", coordinates: { latitude: 13.47, longitude: 144.75 }, distance_km: 682.4 },
    },
  },
  origin_label: "Fortaleza, Ceará, Brasil",
  destination_label: "Oceano",
  destination_is_land: false,
  nearest_place: "Jayapura",
  nearest_place_distance_m: 698_065,
  error: null,
  created_at: "2026-09-13T12:00:00Z",
  completed_at: "2026-09-13T12:00:01Z",
};

export const landJob = {
  ...oceanJob,
  origin: { latitude: 3.7319, longitude: 141.4733 },
  antipode: { latitude: -3.7319, longitude: -38.5267 },
  destination: {
    type: "land",
    country: { name: "Brasil", iso_a2: "BR", iso_a3: "BRA" },
    state: { name: "Ceará", admin: "Brazil" },
    nearest_place: { name: "Fortaleza", country: "Brazil", coordinates: { latitude: -3.7481, longitude: -38.5819 }, distance_km: 6.4 },
    nearest_land: null,
  },
  origin_label: null,
  destination_label: "Brasil",
  destination_is_land: true,
};

interface MockOptions {
  job?: typeof oceanJob | typeof landJob;
  reverse?: { display_name: string; address: Record<string, string> };
  wikimedia?: "photo" | "missing";
}

export async function mockExperienceApis(page: Page, options: MockOptions = {}) {
  const job = options.job ?? oceanJob;
  const reverse = options.reverse ?? {
    display_name: "Rua Solon Pinheiro, Centro, Fortaleza, Ceará, Brasil",
    address: { road: "Rua Solon Pinheiro", city: "Fortaleza", state: "Ceará", country: "Brasil" },
  };
  const requests = { drillingsCreated: 0, wikimedia: 0 };

  await page.route("**/api/v1/locations/reverse?*", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      json: { latitude: Number(url.searchParams.get("lat")), longitude: Number(url.searchParams.get("lon")), ...reverse, cached: true },
    });
  });
  await page.route("**/api/v1/drillings", (route) => {
    requests.drillingsCreated += 1;
    return route.fulfill({ status: 202, json: { id: DRILLING_ID, status: "queued", status_url: `/api/v1/drillings/${DRILLING_ID}` } });
  });
  await page.route(`**/api/v1/drillings/${DRILLING_ID}`, (route) => route.fulfill({ json: job }));

  await page.route(/https:\/\/(pt|en)\.wikipedia\.org\/w\/api\.php/, (route) => {
    requests.wikimedia += 1;
    const title = new URL(route.request().url()).searchParams.get("titles") ?? "";
    const coordinates = title === "Fortaleza" ? [{ lat: -3.7328, lon: -38.5269 }] : [{ lat: -2.533, lon: 140.717 }];
    const page = options.wikimedia === "photo" && (title === "Jayapura" || title === "Fortaleza")
      ? { title, pageimage: `${title}_skyline.jpg`, coordinates }
      : { title, missing: true };
    return route.fulfill({ json: { query: { pages: [page] } } });
  });
  await page.route(/https:\/\/commons\.wikimedia\.org\/w\/api\.php/, (route) => {
    requests.wikimedia += 1;
    const file = new URL(route.request().url()).searchParams.get("titles")?.replace("File:", "") ?? "photo.jpg";
    return route.fulfill({
      json: {
        query: {
          pages: [{
            imageinfo: [{
              thumburl: `https://upload.wikimedia.org/test/${file}`,
              thumbwidth: 1280,
              thumbheight: 800,
              descriptionurl: `https://commons.wikimedia.org/wiki/File:${file}`,
              mime: "image/jpeg",
              extmetadata: {
                Artist: { value: "<a href=\"#\">Fotógrafa de Teste</a>" },
                LicenseShortName: { value: "CC BY-SA 4.0" },
                LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0" },
              },
            }],
          }],
        },
      },
    });
  });
  await page.route("https://upload.wikimedia.org/**", (route) => {
    requests.wikimedia += 1;
    return route.fulfill({ body: TEST_PHOTO, contentType: "image/jpeg" });
  });

  return requests;
}

export async function waitForMapReady(page: Page) {
  await expect(page.locator("main")).toHaveAttribute("data-map-status", "ready", { timeout: 20_000 });
  await expect(page.getByTestId("loading-screen")).toHaveCount(0);
}

export async function mapCenter(page: Page) {
  const container = page.locator("[data-center-lat]");
  return {
    latitude: Number(await container.getAttribute("data-center-lat")),
    longitude: Number(await container.getAttribute("data-center-lng")),
    zoom: Number(await container.getAttribute("data-zoom")),
  };
}

export async function digAndWaitForDiscovery(page: Page) {
  await page.getByRole("button", { name: "CAVAR" }).click();
  await expect(page.getByTestId("drilling-depth")).toBeVisible({ timeout: 10_000 });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 60_000 });
  return dialog;
}

export async function expectNoHorizontalOverflow(page: Page) {
  const { viewport, content } = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(content).toBe(viewport);
}
