import { describe, expect, it, vi } from "vitest";

import { trackMapReadiness, type MapReadinessStatus, type ReadinessMapLike } from "./mapReadiness";

type Listener = () => void;

function fakeMap() {
  const listeners = new Map<string, Set<Listener>>();
  const map: ReadinessMapLike & { emit: (type: string) => void; count: () => number } = {
    on: (type, listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    off: (type, listener) => listeners.get(type)?.delete(listener),
    emit: (type) => listeners.get(type)?.forEach((listener) => listener()),
    count: () => [...listeners.values()].reduce((total, set) => total + set.size, 0),
  };
  return map;
}

function setup(elapsedMs: number) {
  vi.useFakeTimers();
  const statuses: Array<[MapReadinessStatus, string | undefined]> = [];
  const map = fakeMap();
  let now = elapsedMs;
  const stop = trackMapReadiness(map, {
    onStatus: (status, reason) => statuses.push([status, reason]),
    minVisibleMs: 1_600,
    timeoutMs: 12_000,
    now: () => now,
    setTimer: (callback, delay) => Number(setTimeout(callback, delay)),
    clearTimer: (id) => clearTimeout(id),
  });
  return {
    map,
    statuses,
    stop,
    advance: (ms: number) => {
      now += ms;
      vi.advanceTimersByTime(ms);
    },
  };
}

describe("trackMapReadiness", () => {
  it("reports real lifecycle stages and waits for the first idle after load", () => {
    const { map, statuses, advance } = setup(2_000);
    map.emit("style.load");
    map.emit("idle"); // idle before load must not reveal a half-initialised globe
    expect(statuses.at(-1)?.[0]).toBe("loading-cartography");
    map.emit("load");
    expect(statuses.at(-1)?.[0]).toBe("preparing");
    map.emit("idle");
    expect(statuses.at(-1)).toEqual(["ready", "idle"]);
    expect(map.count()).toBe(0);
    advance(20_000);
    expect(statuses.filter(([status]) => status === "ready")).toHaveLength(1);
    vi.useRealTimers();
  });

  it("keeps the entry screen for the minimum time to avoid a flash", () => {
    const { map, statuses, advance } = setup(300);
    map.emit("load");
    map.emit("idle");
    expect(statuses.at(-1)?.[0]).toBe("preparing");
    advance(1_299);
    expect(statuses.at(-1)?.[0]).toBe("preparing");
    advance(1);
    expect(statuses.at(-1)).toEqual(["ready", "idle"]);
    vi.useRealTimers();
  });

  it("never traps the visitor: a safety timeout reveals the app", () => {
    const { map, statuses, advance } = setup(0);
    map.emit("style.load");
    advance(11_999);
    expect(statuses.some(([status]) => status === "ready")).toBe(false);
    advance(1);
    expect(statuses.at(-1)).toEqual(["ready", "timeout"]);
    expect(map.count()).toBe(0);
    vi.useRealTimers();
  });

  it("cleans up listeners and timers when stopped", () => {
    const { map, statuses, stop, advance } = setup(0);
    stop();
    expect(map.count()).toBe(0);
    advance(20_000);
    expect(statuses.some(([status]) => status === "ready")).toBe(false);
    vi.useRealTimers();
  });
});
