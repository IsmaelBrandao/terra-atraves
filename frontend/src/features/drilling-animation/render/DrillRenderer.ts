import * as THREE from "three";

import { clampProgress } from "../drillingMath";

const ORIGIN_X = -1.08;
const DESTINATION_X = 1.08;

export class DrillRenderer {
  readonly group = new THREE.Group();
  private readonly probe: THREE.Mesh;
  private readonly traversedRoute: THREE.Mesh;
  private readonly centerRing: THREE.Mesh;

  constructor() {
    this.group.name = "drill-route";
    const route = new THREE.Mesh(
      new THREE.BoxGeometry(DESTINATION_X - ORIGIN_X, 0.008, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x9fe6cf, transparent: true, opacity: 0.42, depthTest: false }),
    );
    route.position.z = 0.12;
    this.group.add(route);

    const endpointGeometry = new THREE.CircleGeometry(0.035, 20);
    const originMarker = new THREE.Mesh(
      endpointGeometry,
      new THREE.MeshBasicMaterial({ color: 0xf8d878 }),
    );
    originMarker.position.x = ORIGIN_X;
    originMarker.position.z = 0.15;
    originMarker.name = "origem";
    const destinationMarker = new THREE.Mesh(
      endpointGeometry.clone(),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9 }),
    );
    destinationMarker.position.x = DESTINATION_X;
    destinationMarker.position.z = 0.15;
    destinationMarker.name = "antipoda";
    this.group.add(originMarker, destinationMarker);

    this.traversedRoute = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.026, 0.025),
      new THREE.MeshBasicMaterial({ color: 0xffe49a, transparent: true, opacity: 0.92, depthTest: false }),
    );
    this.traversedRoute.position.z = 0.14;
    this.group.add(this.traversedRoute);

    this.probe = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.04, 0.11, 4, 12),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, depthTest: false }),
    );
    this.probe.rotation.z = Math.PI / 2;
    this.probe.position.z = 0.2;
    this.probe.name = "sonda";
    const probeHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.07, 0.09, 24),
      new THREE.MeshBasicMaterial({ color: 0xcffafe, transparent: true, opacity: 0.65, depthTest: false, side: THREE.DoubleSide }),
    );
    this.probe.add(probeHalo);
    this.group.add(this.probe);

    this.centerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.115, 0.012, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.28, depthTest: false }),
    );
    this.centerRing.position.z = 0.16;
    this.group.add(this.centerRing);
    this.setProgress(0);
  }

  setProgress(progress: number): void {
    const normalized = clampProgress(progress);
    const x = ORIGIN_X + (DESTINATION_X - ORIGIN_X) * normalized;
    this.probe.position.x = x;
    const traversedLength = Math.max(0.001, x - ORIGIN_X);
    this.traversedRoute.scale.x = traversedLength;
    this.traversedRoute.position.x = ORIGIN_X + traversedLength / 2;
    const centerProximity = Math.max(0, 1 - Math.abs(normalized - 0.5) * 14);
    const scale = 1 + centerProximity * 0.35;
    this.centerRing.scale.setScalar(scale);
    const material = this.centerRing.material as THREE.MeshBasicMaterial;
    material.opacity = 0.12 + centerProximity * 0.48;
  }
}
