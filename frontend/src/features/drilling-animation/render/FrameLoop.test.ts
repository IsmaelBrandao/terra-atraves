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
    callbacks.get(2)?.(100);
    expect(frame).toHaveBeenLastCalledWith(100);
    loop.pause();
    expect(cancel).toHaveBeenCalledWith(3);
    loop.resume();
    expect(request).toHaveBeenCalledTimes(4);
    callbacks.get(4)?.(5_000);
    expect(frame).toHaveBeenLastCalledWith(100);
    callbacks.get(5)?.(5_050);
    expect(frame).toHaveBeenLastCalledWith(150);
    loop.cancel();
    expect(cancel).toHaveBeenCalledWith(6);
    expect(loop.isRunning).toBe(false);
  });
});
