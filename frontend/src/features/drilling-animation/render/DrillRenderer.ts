import * as THREE from "three";

import { clampProgress } from "../drillingMath";

const ORIGIN_X = -1.08;
const DESTINATION_X = 1.08;

export class DrillRenderer {
  readonly group = new THREE.Group();
  private readonly probe: THREE.Mesh;
  private readonly traversedPositions: THREE.BufferAttribute;
  private readonly centerRing: THREE.Mesh;

  constructor() {
    this.group.name = "drill-route";
    const route = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(ORIGIN_X, 0, 0),
        new THREE.Vector3(DESTINATION_X, 0, 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0x9fe6cf, transparent: true, opacity: 0.34 }),
    );
    this.group.add(route);

    const endpointGeometry = new THREE.SphereGeometry(0.025, 10, 6);
    const originMarker = new THREE.Mesh(
      endpointGeometry,
      new THREE.MeshBasicMaterial({ color: 0xf8d878 }),
    );
    originMarker.position.x = ORIGIN_X;
    originMarker.name = "origem";
    const destinationMarker = new THREE.Mesh(
      endpointGeometry.clone(),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9 }),
    );
    destinationMarker.position.x = DESTINATION_X;
    destinationMarker.name = "antipoda";
    this.group.add(originMarker, destinationMarker);

    const traversedGeometry = new THREE.BufferGeometry();
    this.traversedPositions = new THREE.BufferAttribute(
      new Float32Array([ORIGIN_X, 0, 0, ORIGIN_X, 0, 0]),
      3,
    );
    traversedGeometry.setAttribute("position", this.traversedPositions);
    this.group.add(
      new THREE.Line(
        traversedGeometry,
        new THREE.LineBasicMaterial({ color: 0xf8d878, transparent: true, opacity: 0.95 }),
      ),
    );

    this.probe = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe49a }),
    );
    this.group.add(this.probe);

    this.centerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.115, 0.012, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xfff1bd, transparent: true, opacity: 0.4 }),
    );
    this.centerRing.rotation.x = Math.PI / 2;
    this.group.add(this.centerRing);
    this.setProgress(0);
  }

  setProgress(progress: number): void {
    const normalized = clampProgress(progress);
    const x = ORIGIN_X + (DESTINATION_X - ORIGIN_X) * normalized;
    this.probe.position.x = x;
    this.traversedPositions.setXYZ(1, x, 0, 0);
    this.traversedPositions.needsUpdate = true;
    const centerProximity = Math.max(0, 1 - Math.abs(normalized - 0.5) * 14);
    const scale = 1 + centerProximity * 1.2;
    this.centerRing.scale.setScalar(scale);
    const material = this.centerRing.material as THREE.MeshBasicMaterial;
    material.opacity = 0.28 + centerProximity * 0.68;
  }
}
