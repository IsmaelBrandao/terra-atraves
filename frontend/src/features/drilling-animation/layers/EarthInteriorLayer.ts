import type { CustomLayerInterface, CustomRenderMethodInput, Map as MapLibreMap } from "maplibre-gl";
import { MercatorCoordinate } from "maplibre-gl";
import * as THREE from "three";

import { disposeThreeObject } from "../cleanup/disposeThreeObject";
import { telemetryAtProgress } from "../drillingMath";
import type { DrillingQualityProfile } from "../performance/qualityProfile";
import { DrillRenderer } from "../render/DrillRenderer";
import { EarthInteriorRenderer } from "../render/EarthInteriorRenderer";

export const EARTH_INTERIOR_LAYER_ID = "terra-atraves-earth-interior";
const VISUAL_WORLD_RADIUS = 0.17;

export interface GeographicPoint {
  latitude: number;
  longitude: number;
}

export class EarthInteriorLayer implements CustomLayerInterface {
  readonly id = EARTH_INTERIOR_LAYER_ID;
  readonly type = "custom" as const;
  readonly renderingMode = "3d" as const;

  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly earth: EarthInteriorRenderer;
  private readonly drill = new DrillRenderer();
  private readonly modelMatrix: THREE.Matrix4;
  private map: MapLibreMap | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private disposed = false;

  constructor(origin: GeographicPoint, profile: DrillingQualityProfile) {
    this.earth = new EarthInteriorRenderer(profile);
    this.scene.add(this.earth.group, this.drill.group);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const light = new THREE.DirectionalLight(0xffe8bd, 1.8);
    light.position.set(-2, 3, 4);
    this.scene.add(light);

    const anchor = MercatorCoordinate.fromLngLat([origin.longitude, origin.latitude]);
    this.modelMatrix = new THREE.Matrix4()
      .makeTranslation(anchor.x, anchor.y, anchor.z)
      .scale(new THREE.Vector3(VISUAL_WORLD_RADIUS, -VISUAL_WORLD_RADIUS, VISUAL_WORLD_RADIUS))
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2.4));
  }

  onAdd(map: MapLibreMap, gl: WebGL2RenderingContext): void {
    this.map = map;
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: false,
      alpha: true,
    });
    this.renderer.autoClear = false;
    this.renderer.setPixelRatio(1);
  }

  render(_gl: WebGL2RenderingContext, options: CustomRenderMethodInput): void {
    if (!this.renderer || this.disposed) return;
    const projection = new THREE.Matrix4().fromArray(options.defaultProjectionData.mainMatrix);
    this.camera.projectionMatrix.copy(projection).multiply(this.modelMatrix);
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.renderer.resetState();
  }

  setProgress(progress: number): void {
    this.drill.setProgress(progress);
    this.earth.setActiveLayer(telemetryAtProgress(progress).layer);
    this.map?.triggerRepaint();
  }

  onRemove(): void {
    this.dispose();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    disposeThreeObject(this.scene);
    this.renderer?.resetState();
    this.renderer?.dispose();
    this.renderer = null;
    this.map = null;
  }
}
