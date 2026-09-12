type FrameRequest = (callback: FrameRequestCallback) => number;
type FrameCancel = (handle: number) => void;

export class FrameLoop {
  private handle: number | null = null;
  private elapsedMs = 0;
  private previousTimestamp: number | null = null;
  private running = false;
  private paused = false;

  constructor(
    private readonly onFrame: (elapsedMs: number) => boolean,
    private readonly requestFrame: FrameRequest = (callback) => window.requestAnimationFrame(callback),
    private readonly cancelFrame: FrameCancel = (handle) => window.cancelAnimationFrame(handle),
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.elapsedMs = 0;
    this.previousTimestamp = null;
    this.schedule();
  }

  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.previousTimestamp = null;
    this.clearScheduledFrame();
  }

  resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.schedule();
  }

  cancel(): void {
    this.running = false;
    this.paused = false;
    this.previousTimestamp = null;
    this.clearScheduledFrame();
  }

  get isRunning(): boolean {
    return this.running;
  }

  private readonly tick = (timestamp: number): void => {
    this.handle = null;
    if (!this.running || this.paused) return;
    if (this.previousTimestamp !== null) {
      this.elapsedMs += Math.max(0, timestamp - this.previousTimestamp);
    }
    this.previousTimestamp = timestamp;
    const keepRunning = this.onFrame(this.elapsedMs);
    if (keepRunning && this.running) this.schedule();
    else this.running = false;
  };

  private schedule(): void {
    if (this.handle === null) this.handle = this.requestFrame(this.tick);
  }

  private clearScheduledFrame(): void {
    if (this.handle === null) return;
    this.cancelFrame(this.handle);
    this.handle = null;
  }
}
