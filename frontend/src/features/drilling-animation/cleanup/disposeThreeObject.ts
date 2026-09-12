import type { Material, Object3D, Texture } from "three";

interface DisposableGeometry {
  dispose: () => void;
}
interface DisposableObject extends Object3D {
  geometry?: DisposableGeometry;
  material?: Material | Material[];
}

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    if (value && typeof value === "object" && "isTexture" in value) {
      (value as Texture).dispose();
    }
  }
  material.dispose();
}

export function disposeThreeObject(root: Object3D): void {
  root.traverse((object) => {
    const disposable = object as DisposableObject;
    disposable.geometry?.dispose();
    if (Array.isArray(disposable.material)) {
      disposable.material.forEach(disposeMaterial);
    } else if (disposable.material) {
      disposeMaterial(disposable.material);
    }
  });
  root.clear();
}
