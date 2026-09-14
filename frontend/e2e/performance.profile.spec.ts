import { expect, test, type Page } from "@playwright/test";

const drillingId = "89d31e48-8bd3-4c28-a4f0-dae0e660594f";

async function mockApi(page: Page) {
  await page.route("**/api/v1/locations/reverse?*", (route) => route.fulfill({
    json: { latitude: -3.7319, longitude: -38.5267, display_name: "Fortaleza, Ceará, Brasil", address: {}, cached: true },
  }));
  await page.route("**/api/v1/drillings", (route) => route.fulfill({
    status: 202,
    json: { id: drillingId, status: "queued", status_url: `/api/v1/drillings/${drillingId}` },
  }));
  await page.route(`**/api/v1/drillings/${drillingId}`, (route) => route.fulfill({
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
        nearest_land: { coordinates: { latitude: 3.9, longitude: 140.1 }, distance_km: 479.7, country: null, nearest_place: null },
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
  }));
}

test("@profile measures warm-up, 10 cycles and 4x CPU", async ({ page, context }) => {
  const cycleCount = Number(process.env.PROFILE_CYCLES ?? "10");
  test.setTimeout(cycleCount * 50_000 + 120_000);
  await mockApi(page);
  const forceLowEnd = process.env.PROFILE_LOW_END === "1";
  await page.addInitScript((lowEnd) => {
    if (lowEnd) {
      Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, get: () => 4 });
    }
    const metrics = { longTasks: [] as number[], frameTimes: [] as number[], importMs: -1 };
    Object.defineProperty(window, "__terraProfile", { value: metrics });
    new PerformanceObserver((list) => {
      metrics.longTasks.push(...list.getEntries().map((entry) => entry.duration));
    }).observe({ type: "longtask", buffered: true });
    let previous = 0;
    const frame = (time: number) => {
      if (previous) metrics.frameTimes.push(time - previous);
      previous = time;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    window.addEventListener("terra-atraves:three-loaded", ((event: CustomEvent<{ durationMs: number }>) => {
      metrics.importMs = event.detail.durationMs;
    }) as EventListener);
  }, forceLowEnd);
  await page.goto("/");
  const canvas = page.locator(".maplibregl-canvas");
  await expect(page.locator("main")).toHaveAttribute("data-map-status", "ready", { timeout: 20_000 });
  await expect(canvas).toBeVisible();
  await canvas.click({ position: { x: 640, y: 330 } });
  await expect(page.getByRole("heading", { name: "Fortaleza" })).toBeVisible();
  await expect(page.getByRole("button", { name: "CAVAR" })).toBeEnabled();
  await page.waitForTimeout(2_500);

  const client = await context.newCDPSession(page);
  await client.send("Performance.enable");
  await client.send("HeapProfiler.enable");

  const destination = page.getByRole("heading", { name: "Oceano Pacífico" });
  const run = async (buttonName: "CAVAR" | "Repetir perfuração") => {
    await page.getByRole("button", { name: buttonName }).click();
    await destination.waitFor({ state: "hidden" });
    await destination.waitFor({ state: "visible", timeout: 35_000 });
  };
  const heapMb = async () => {
    await client.send("HeapProfiler.collectGarbage");
    const { metrics } = await client.send("Performance.getMetrics");
    return Number((metrics.find(({ name }) => name === "JSHeapUsedSize")!.value / 1_048_576).toFixed(2));
  };

  await page.evaluate(() => {
    const profile = (window as unknown as { __terraProfile: { longTasks: number[]; frameTimes: number[] } }).__terraProfile;
    profile.longTasks.length = 0;
    profile.frameTimes.length = 0;
  });
  await client.send("Profiler.enable");
  await client.send("Profiler.setSamplingInterval", { interval: 1_000 });
  await client.send("Profiler.start");
  const firstRun = run("CAVAR");
  if (forceLowEnd) {
    await expect(page.getByText("qualidade adaptativa", { exact: false })).toBeVisible();
  }
  await firstRun;
  const { profile: cpuProfile } = await client.send("Profiler.stop");
  const sampleCounts = new Map<number, number>();
  for (const nodeId of cpuProfile.samples ?? []) {
    sampleCounts.set(nodeId, (sampleCounts.get(nodeId) ?? 0) + 1);
  }
  const hotFunctions = cpuProfile.nodes
    .map((node) => ({
      function: node.callFrame.functionName || "(anônimo)",
      source: node.callFrame.url.split("/").at(-1) || "browser",
      samples: sampleCounts.get(node.id) ?? 0,
    }))
    .filter(({ samples }) => samples > 0)
    .sort((a, b) => b.samples - a.samples)
    .slice(0, 8);
  const regularMetrics = await page.evaluate(() => {
    const profile = (window as unknown as { __terraProfile: { longTasks: number[]; frameTimes: number[]; importMs: number } }).__terraProfile;
    const usableFrames = profile.frameTimes.filter((duration) => duration > 0 && duration < 250);
    const elapsed = usableFrames.reduce((sum, duration) => sum + duration, 0);
    return {
      importMs: Number(profile.importMs.toFixed(2)),
      fps: Number(((usableFrames.length / elapsed) * 1_000).toFixed(1)),
      longTasks: profile.longTasks.map((duration) => Number(duration.toFixed(1))),
    };
  });

  const heapSamples: number[] = [];
  for (let cycle = 0; cycle < cycleCount; cycle += 1) {
    await run("Repetir perfuração");
    heapSamples.push(await heapMb());
  }

  await page.evaluate(() => {
    const profile = (window as unknown as { __terraProfile: { frameTimes: number[] } }).__terraProfile;
    profile.frameTimes.length = 0;
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await run("Repetir perfuração");
  await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const lowEndFps = await page.evaluate(() => {
    const frames = (window as unknown as { __terraProfile: { frameTimes: number[] } }).__terraProfile.frameTimes.filter((duration) => duration > 0 && duration < 250);
    return Number(((frames.length / frames.reduce((sum, duration) => sum + duration, 0)) * 1_000).toFixed(1));
  });

  console.log(`PROFILE_RESULT ${JSON.stringify({
    ...regularMetrics,
    hotFunctions,
    heapMb: heapSamples,
    heapMinMb: Math.min(...heapSamples),
    heapMaxMb: Math.max(...heapSamples),
    heapDeltaMb: Number(((heapSamples.at(-1) ?? 0) - (heapSamples[0] ?? 0)).toFixed(2)),
    lowEnd4xFps: lowEndFps,
    mapCanvasCount: await page.locator(".maplibregl-canvas").count(),
  })}`);
});
