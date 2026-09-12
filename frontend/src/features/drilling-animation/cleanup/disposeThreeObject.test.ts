import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { disposeThreeObject } from "./disposeThreeObject";

describe("disposeThreeObject", () => {
  it("disposes geometry, material and textures before clearing the scene", () => {
    const scene = new THREE.Scene();
    const geometry = new THREE.SphereGeometry();
    const texture = new THREE.Texture();
    const material = new THREE.MeshBasicMaterial({ map: texture });
    scene.add(new THREE.Mesh(geometry, material));
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const textureDispose = vi.spyOn(texture, "dispose");

    disposeThreeObject(scene);

    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(textureDispose).toHaveBeenCalledOnce();
    expect(scene.children).toHaveLength(0);
  });
});
