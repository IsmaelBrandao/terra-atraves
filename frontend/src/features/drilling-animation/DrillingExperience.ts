import type { Map as MapLibreMap, ProjectionSpecification } from "maplibre-gl";

import { DRILLING_TELEMETRY_EVENT, TELEMETRY_INTERVAL_MS } from "./drilling.constants";
import { telemetryAtProgress } from "./drillingMath";
import {
  INITIAL_DRILLING_MACHINE,
  transitionDrillingMachine,
  type DrillingMachineSnapshot,
  type DrillingVisualState,
} from "./drillingMachine";
import { createDrillingTimeline, sampleTimeline } from "./drillingTimeline";
import { EarthInteriorOverlay } from "./layers/EarthInteriorOverlay";
import type { DrillingQualityProfile } from "./performance/qualityProfile";
import { FrameLoop } from "./render/FrameLoop";

interface CameraSnapshot {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  projection: ProjectionSpecification;
}

interface ToggleHandler {
  isEnabled: () => boolean;
  enable: () => void;
  disable: () => void;
}

interface GeographicPoint {
  latitude: number;
  longitude: number;
}

export interface DrillingExperienceOptions {
  map: MapLibreMap;
  origin: GeographicPoint;
  destination: GeographicPoint;
  quality: DrillingQualityProfile;
  reducedMotion: boolean;
  onStateChange: (state: DrillingVisualState) => void;
}

export class DrillingExperience {
  private readonly timeline;
  private readonly loop: FrameLoop;
  private readonly cameraSnapshot: CameraSnapshot;
  private readonly interactionSnapshot = new Map<ToggleHandler, boolean>();
  private machine: DrillingMachineSnapshot = { ...INITIAL_DRILLING_MACHINE };
  private overlay: EarthInteriorOverlay | null = null;
  private lastTelemetryAt = -Infinity;
  private revealingStarted = false;
  private finished = false;

  constructor(private readonly options: DrillingExperienceOptions) {
    this.timeline = createDrillingTimeline(options.reducedMotion);
    const center = options.map.getCenter();
    this.cameraSnapshot = {
      center: [center.lng, center.lat],
      zoom: options.map.getZoom(),
      bearing: options.map.getBearing(),
      pitch: options.map.getPitch(),
      projection: options.map.getProjection(),
    };
    this.loop = new FrameLoop((elapsedMs) => this.renderFrame(elapsedMs));
  }

  start(): void {
    if (this.loop.isRunning || this.finished) return;
    this.captureAndDisableInteractions();
    this.options.map.stop();
    this.options.map.setProjection({ type: "globe" });
    this.moveToOrigin();
    this.machine = transitionDrillingMachine(this.machine, { type: "ADVANCE", target: "preparing" });
    this.options.onStateChange(this.machine.state);
    this.overlay = new EarthInteriorOverlay(this.options.quality);
    this.overlay.mount(this.options.map.getContainer());
    this.loop.start();
  }

  pause(): void {
    if (!this.loop.isRunning || this.machine.state === "paused") return;
    this.loop.pause();
    this.options.map.stop();
    this.machine = transitionDrillingMachine(this.machine, { type: "PAUSE" });
    this.options.onStateChange(this.machine.state);
  }

  resume(): void {
    if (this.machine.state !== "paused") return;
    this.machine = transitionDrillingMachine(this.machine, { type: "RESUME" });
    this.options.onStateChange(this.machine.state);
    this.loop.resume();
  }

  cancel(): void {
    if (this.finished) return;
    this.loop.cancel();
    this.options.map.stop();
    this.machine = transitionDrillingMachine(this.machine, { type: "CANCEL" });
    this.options.onStateChange(this.machine.state);
    this.removeVisualOverlay();
    this.options.map.setProjection(this.cameraSnapshot.projection);
    this.restoreInteractions();
    this.options.map.easeTo({
      center: this.cameraSnapshot.center,
      zoom: this.cameraSnapshot.zoom,
      bearing: this.cameraSnapshot.bearing,
      pitch: this.cameraSnapshot.pitch,
      duration: this.options.reducedMotion ? 0 : 450,
    });
    this.finished = true;
  }

  dispose(): void {
    this.loop.cancel();
    this.removeVisualOverlay();
    this.restoreInteractions();
    this.finished = true;
  }

  private renderFrame(elapsedMs: number): boolean {
    const sample = sampleTimeline(this.timeline, elapsedMs);
    if (sample.state !== this.machine.state) {
      this.machine = transitionDrillingMachine(this.machine, {
        type: "ADVANCE",
        target: sample.state,
      });
      this.options.onStateChange(this.machine.state);
      this.handleSemanticState(this.machine.state);
    }

    this.overlay?.setProgress(sample.progress);
    if (elapsedMs - this.lastTelemetryAt >= TELEMETRY_INTERVAL_MS || sample.completed) {
      this.dispatchTelemetry(sample.progress);
      this.lastTelemetryAt = elapsedMs;
    }

    if (sample.completed) {
      this.finish();
      return false;
    }
    return true;
  }

  private handleSemanticState(state: DrillingVisualState): void {
    if (state === "zooming_out") {
      this.options.map.easeTo({
        center: [this.options.origin.longitude, this.options.origin.latitude],
        offset: this.visualOffset(),
        zoom: 0.85,
        bearing: 0,
        pitch: 0,
        duration: this.options.reducedMotion ? 0 : 1_000,
      });
    }
    if (state === "showing_route") {
      this.overlay?.show();
    }
    if (state === "revealing_destination" && !this.revealingStarted) {
      this.revealingStarted = true;
      this.overlay?.hide();
      this.options.map.flyTo({
        center: [this.options.destination.longitude, this.options.destination.latitude],
        offset: this.visualOffset(),
        zoom: 3.2,
        bearing: 0,
        pitch: 0,
        duration: this.options.reducedMotion ? 0 : 1_050,
        essential: true,
      });
    }
  }

  private finish(): void {
    if (this.finished) return;
    this.removeVisualOverlay();
    this.restoreInteractions();
    this.finished = true;
  }

  private removeVisualOverlay(): void {
    this.overlay?.dispose();
    this.overlay = null;
  }

  private dispatchTelemetry(progress: number): void {
    window.dispatchEvent(
      new CustomEvent(DRILLING_TELEMETRY_EVENT, { detail: telemetryAtProgress(progress) }),
    );
  }

  private captureAndDisableInteractions(): void {
    const map = this.options.map;
    const handlers: ToggleHandler[] = [
      map.boxZoom,
      map.doubleClickZoom,
      map.dragPan,
      map.dragRotate,
      map.keyboard,
      map.scrollZoom,
      map.touchPitch,
      map.touchZoomRotate,
    ];
    handlers.forEach((handler) => {
      this.interactionSnapshot.set(handler, handler.isEnabled());
      handler.disable();
    });
  }

  private moveToOrigin(): void {
    this.options.map.easeTo({
      center: [this.options.origin.longitude, this.options.origin.latitude],
      offset: this.visualOffset(),
      zoom: 1.55,
      bearing: 0,
      pitch: 0,
      duration: 0,
    });
  }

  private visualOffset(): [number, number] {
    return window.innerWidth < 640 ? [0, -190] : [180, 0];
  }

  private restoreInteractions(): void {
    this.interactionSnapshot.forEach((wasEnabled, handler) => {
      if (wasEnabled) handler.enable();
    });
    this.interactionSnapshot.clear();
  }
}
