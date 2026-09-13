import * as THREE from "three";

import { disposeThreeObject } from "../cleanup/disposeThreeObject";
import { telemetryAtProgress } from "../drillingMath";
import type { DrillingQualityProfile } from "../performance/qualityProfile";
import { DrillRenderer } from "../render/DrillRenderer";
import { EarthInteriorRenderer } from "../render/EarthInteriorRenderer";

export class EarthInteriorOverlay {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera();
  private readonly earth: EarthInteriorRenderer;
  private readonly drill = new DrillRenderer();
  private readonly wrapper = document.createElement("div");
  private readonly canvas = document.createElement("canvas");
  private readonly renderer: THREE.WebGLRenderer;
  private resizeObserver: ResizeObserver | null = null;
  private disposed = false;

  constructor(profile: DrillingQualityProfile) {
    this.earth = new EarthInteriorRenderer(profile);
    this.scene.add(this.earth.group, this.drill.group);
    this.camera.position.set(0, 0, 4);
    this.camera.lookAt(0, 0, 0);

    this.wrapper.className = "drilling-cutaway-overlay";
    this.wrapper.setAttribute("aria-hidden", "true");
    this.canvas.className = "drilling-cutaway-canvas";
    this.wrapper.append(this.canvas, this.createCaption("ORIGEM", "drilling-cutaway-origin"));
    this.wrapper.append(this.createCaption("ANTÍPODA", "drilling-cutaway-destination"));
    this.wrapper.append(this.createCaption("CORTE INTERNO DA TERRA", "drilling-cutaway-title"));

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: profile.level !== "LOW_END",
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.level === "LOW_END" ? 1 : 1.5));
  }

  mount(host: HTMLElement): void {
    host.append(this.wrapper);
    this.resizeObserver = new ResizeObserver(() => this.resize(host));
    this.resizeObserver.observe(host);
    this.resize(host);
    this.renderer.compile(this.scene, this.camera);
    this.render();
  }

  show(): void {
    this.wrapper.classList.add("drilling-cutaway-overlay--visible");
  }

  hide(): void {
    this.wrapper.classList.remove("drilling-cutaway-overlay--visible");
  }

  setProgress(visualProgress: number, physicalProgress: number): void {
    this.drill.setProgress(visualProgress);
    this.earth.setActiveLayer(telemetryAtProgress(physicalProgress).layer);
    this.render();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    disposeThreeObject(this.scene);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.wrapper.remove();
  }

  private resize(host: HTMLElement): void {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const aspect = width / height;
    const viewHeight = width < 640 ? Math.max(2.9, 2.55 / aspect) : 2.75;
    const viewWidth = viewHeight * aspect;
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
    this.earth.group.position.y = width < 640 ? viewHeight * 0.14 : 0;
    this.drill.group.position.y = this.earth.group.position.y;
    this.renderer.setSize(width, height, false);
    this.render();
  }

  private render(): void {
    if (!this.disposed) this.renderer.render(this.scene, this.camera);
  }

  private createCaption(text: string, className: string): HTMLSpanElement {
    const caption = document.createElement("span");
    caption.className = className;
    caption.textContent = text;
    return caption;
  }
}
