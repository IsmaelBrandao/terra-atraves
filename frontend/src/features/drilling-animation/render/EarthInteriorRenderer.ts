import * as THREE from "three";

import { VISUAL_LAYER_RADII } from "../drilling.constants";
import type { EarthLayer } from "../drillingMath";
import type { DrillingQualityProfile } from "../performance/qualityProfile";

const LAYERS: Array<{
  name: EarthLayer;
  radius: number;
  color: number;
}> = [
  { name: "Crosta", radius: VISUAL_LAYER_RADII.surface, color: 0x82c7a5 },
  { name: "Manto", radius: VISUAL_LAYER_RADII.crustInner, color: 0xd58a47 },
  { name: "Núcleo externo", radius: VISUAL_LAYER_RADII.outerCore, color: 0xf2b84b },
  { name: "Núcleo interno", radius: VISUAL_LAYER_RADII.innerCore, color: 0xfff0bd },
];

export class EarthInteriorRenderer {
  readonly group = new THREE.Group();
  private readonly materials = new Map<EarthLayer, THREE.MeshPhongMaterial>();

  constructor(profile: DrillingQualityProfile) {
    this.group.name = "earth-interior";
    LAYERS.forEach((layer, index) => {
      const material = new THREE.MeshPhongMaterial({
        color: layer.color,
        transparent: true,
        opacity: profile.shellOpacity + index * 0.055,
        wireframe: index === 0,
        flatShading: index === 1,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const geometry = new THREE.SphereGeometry(
        layer.radius,
        profile.sphereSegments,
        Math.max(12, Math.floor(profile.sphereSegments / 2)),
        0,
        Math.PI * 1.65,
      );
      const sphere = new THREE.Mesh(geometry, material);
      sphere.name = layer.name;
      sphere.rotation.x = Math.PI / 9;
      sphere.rotation.y = -Math.PI / 7;
      this.group.add(sphere);
      this.materials.set(layer.name, material);

      const boundary = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: profile.sphereSegments }, (_, pointIndex) => {
            const angle = (pointIndex / profile.sphereSegments) * Math.PI * 2;
            return new THREE.Vector3(0, Math.cos(angle) * layer.radius, Math.sin(angle) * layer.radius);
          }),
        ),
        new THREE.LineBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: 0.3 + index * 0.09,
        }),
      );
      boundary.name = `${layer.name}-limite`;
      this.group.add(boundary);
    });

    const equator = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: profile.sphereSegments }, (_, index) => {
          const angle = (index / profile.sphereSegments) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
        }),
      ),
      new THREE.LineBasicMaterial({ color: 0xb9eed6, transparent: true, opacity: 0.26 }),
    );
    this.group.add(equator);

    if (profile.decorativeGlow) {
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 20, 12),
        new THREE.MeshBasicMaterial({ color: 0xffdf88, transparent: true, opacity: 0.58 }),
      );
      glow.name = "center-glow";
      this.group.add(glow);
    }
  }

  setActiveLayer(activeLayer: EarthLayer): void {
    this.materials.forEach((material, layer) => {
      material.emissive.setHex(layer === activeLayer ? 0x3f2412 : 0x000000);
      material.emissiveIntensity = layer === activeLayer ? 0.5 : 0;
    });
  }
}
