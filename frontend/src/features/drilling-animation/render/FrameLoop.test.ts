import { describe, expect, it, vi } from "vitest";

import { FrameLoop } from "./FrameLoop";

describe("FrameLoop", () => {
  it("pauses, resumes and cancels the scheduled animation frame", () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    const request = vi.fn((callback: FrameRequestCallback) => {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    });
    const cancel = vi.fn((id: number) => callbacks.delete(id));
    const frame = vi.fn(() => true);
    const loop = new FrameLoop(frame, request, cancel);

    loop.start();
    callbacks.get(1)?.(0);
    expect(request).toHaveBeenCalledTimes(2);
    loop.pause();
    expect(cancel).toHaveBeenCalledWith(2);
    loop.resume();
    expect(request).toHaveBeenCalledTimes(3);
    loop.cancel();
    expect(cancel).toHaveBeenCalledWith(3);
    expect(loop.isRunning).toBe(false);
  });
});
