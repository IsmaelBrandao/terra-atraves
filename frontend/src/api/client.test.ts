import { afterEach, describe, expect, it, vi } from "vitest";

import { getDrilling, reverseLocation } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API query cancellation", () => {
  it.each([
    ["reverse geocoding", (signal: AbortSignal) => reverseLocation(-3.7319, -38.5267, signal)],
    ["drilling status", (signal: AbortSignal) => getDrilling("job-id", signal)],
  ])("forwards AbortSignal for %s", async (_name, request) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await request(controller.signal);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });
});
