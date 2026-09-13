import * as THREE from "three";

import { VISUAL_LAYER_RADII } from "../drilling.constants";
import type { EarthLayer } from "../drillingMath";
import type { DrillingQualityProfile } from "../performance/qualityProfile";

interface LayerVisual {
  name: EarthLayer;
  innerRadius: number;
  outerRadius: number;
  color: number;
}

const LAYERS: LayerVisual[] = [
  { name: "Crosta", innerRadius: VISUAL_LAYER_RADII.crustInner, outerRadius: VISUAL_LAYER_RADII.surface, color: 0x5fa884 },
  { name: "Manto", innerRadius: VISUAL_LAYER_RADII.outerCore, outerRadius: VISUAL_LAYER_RADII.crustInner, color: 0xa9583b },
  { name: "Núcleo externo", innerRadius: VISUAL_LAYER_RADII.innerCore, outerRadius: VISUAL_LAYER_RADII.outerCore, color: 0xe09b32 },
  { name: "Núcleo interno", innerRadius: 0, outerRadius: VISUAL_LAYER_RADII.innerCore, color: 0xffd98a },
];

export class EarthInteriorRenderer {
  readonly group = new THREE.Group();
  private readonly highlightColor = new THREE.Color(0xffffff);
  private readonly materials = new Map<
    EarthLayer,
    { material: THREE.MeshBasicMaterial; base: THREE.Color }
  >();
  private activeLayer: EarthLayer | null = null;

  constructor(profile: DrillingQualityProfile) {
    this.group.name = "earth-interior";
    const segments = Math.max(32, profile.sphereSegments * 2);

    LAYERS.forEach((layer, index) => {
      const material = new THREE.MeshBasicMaterial({
        color: layer.color,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
      });
      const geometry = layer.innerRadius === 0
        ? new THREE.CircleGeometry(layer.outerRadius, segments)
        : new THREE.RingGeometry(layer.innerRadius, layer.outerRadius, segments);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = layer.name;
      mesh.position.z = index * 0.01;
      this.group.add(mesh);
      this.materials.set(layer.name, { material, base: new THREE.Color(layer.color) });

      const boundary = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: segments }, (_, pointIndex) => {
            const angle = (pointIndex / segments) * Math.PI * 2;
            return new THREE.Vector3(
              Math.cos(angle) * layer.outerRadius,
              Math.sin(angle) * layer.outerRadius,
              0.08,
            );
          }),
        ),
        new THREE.LineBasicMaterial({
          color: 0xf0fdf4,
          transparent: true,
          opacity: index === 0 ? 0.58 : 0.28,
        }),
      );
      boundary.name = `${layer.name}-limite`;
      this.group.add(boundary);
    });

    const axis = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.004, 0.01),
      new THREE.MeshBasicMaterial({ color: 0xe7fff5, transparent: true, opacity: 0.2 }),
    );
    axis.position.z = 0.09;
    this.group.add(axis);
  }

  setActiveLayer(activeLayer: EarthLayer): void {
    if (activeLayer === this.activeLayer) return;
    this.activeLayer = activeLayer;
    this.materials.forEach(({ material, base }, layer) => {
      material.color.copy(base);
      if (layer === activeLayer) material.color.lerp(this.highlightColor, 0.16);
      material.opacity = layer === activeLayer ? 1 : 0.72;
    });
  }
}
