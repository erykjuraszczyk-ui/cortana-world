import * as THREE from "three";

/**
 * Stylizowany, proceduralny hologram 3D Cortany.
 * Celowo zbudowany z geometrii Three.js, aby działał bez pobierania zewnętrznych modeli.
 */
export class CortanaHologram {
  readonly group = new THREE.Group();
  private readonly avatar = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly halo: THREE.Mesh;
  private readonly rings: THREE.Mesh[] = [];
  private readonly scanBands: THREE.Mesh[] = [];
  private readonly eyes: THREE.Mesh[] = [];
  private readonly glow: THREE.PointLight;

  constructor() {
    const cyan = new THREE.MeshStandardMaterial({
      color: "#69eaff", emissive: "#1ccfff", emissiveIntensity: 1.15,
      metalness: 0.18, roughness: 0.25, transparent: true, opacity: 0.64,
    });
    const bright = new THREE.MeshBasicMaterial({ color: "#b9fbff", transparent: true, opacity: 0.92 });
    const deep = new THREE.MeshStandardMaterial({
      color: "#246fbd", emissive: "#147ee8", emissiveIntensity: 0.9,
      metalness: 0.36, roughness: 0.22, transparent: true, opacity: 0.72,
    });
    const line = new THREE.MeshBasicMaterial({ color: "#4bdfff", transparent: true, opacity: 0.76 });

    const addMesh = (
      parent: THREE.Object3D,
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      position: [number, number, number],
      scale?: [number, number, number],
    ): THREE.Mesh => {
      const object = new THREE.Mesh(geometry, material);
      object.position.set(...position);
      if (scale) object.scale.set(...scale);
      parent.add(object);
      return object;
    };

    // Ground projection and rotating rings anchor the hologram to the terrain.
    const platform = addMesh(this.group, new THREE.CylinderGeometry(1.05, 1.25, 0.12, 48), deep, [0, 0.12, 0]);
    platform.receiveShadow = true;
    this.halo = addMesh(
      this.group,
      new THREE.TorusGeometry(1.42, 0.035, 8, 72),
      new THREE.MeshBasicMaterial({ color: "#75eaff", transparent: true, opacity: 0.82 }),
      [0, 0.22, 0],
    );
    this.halo.rotation.x = Math.PI / 2;
    for (const [radius, height, speed] of [[1.05, 0.32, 1], [1.34, 0.48, -0.7], [0.8, 0.62, 0.55]] as const) {
      const ring = addMesh(this.group, new THREE.TorusGeometry(radius, 0.018, 6, 64), line, [0, height, 0]);
      ring.rotation.x = Math.PI / 2;
      ring.userData.spin = speed;
      this.rings.push(ring);
    }

    this.avatar.position.y = 0.32;
    this.group.add(this.avatar);
    const torso = addMesh(this.avatar, new THREE.CapsuleGeometry(0.48, 1.15, 4, 12), cyan, [0, 3.05, 0]);
    torso.scale.set(1.0, 1.0, 0.72);
    addMesh(this.avatar, new THREE.SphereGeometry(0.68, 20, 14), deep, [0, 2.05, 0], [0.9, 0.65, 0.67]);
    addMesh(this.avatar, new THREE.CylinderGeometry(0.17, 0.2, 0.36, 12), bright, [0, 4.05, 0]);
    addMesh(this.avatar, new THREE.SphereGeometry(0.1, 12, 10), bright, [0, 4.45, 0]);

    // Head, translucent hair and clearly readable facial lights.
    const headShell = addMesh(this.head, new THREE.SphereGeometry(0.68, 28, 20), cyan, [0, 0, 0], [0.82, 1.0, 0.76]);
    headShell.material = cyan.clone();
    (headShell.material as THREE.MeshStandardMaterial).opacity = 0.48;
    addMesh(this.head, new THREE.SphereGeometry(0.7, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58), deep, [0, 0.22, 0.03], [0.9, 1.0, 0.84]);
    // Long, simple holographic hair locks frame the face.
    for (const side of [-1, 1]) {
      addMesh(this.head, new THREE.CapsuleGeometry(0.12, 0.82, 3, 8), deep, [side * 0.49, -0.35, 0.02], [1, 1, 0.8]);
      const eye = addMesh(this.head, new THREE.SphereGeometry(0.075, 12, 10), bright, [side * 0.22, 0.02, -0.49], [1, 0.78, 0.45]);
      this.eyes.push(eye);
    }
    addMesh(this.head, new THREE.ConeGeometry(0.07, 0.19, 8), bright, [0, -0.12, -0.48], [0.7, 1, 0.6]);
    const mouth = addMesh(this.head, new THREE.TorusGeometry(0.14, 0.018, 6, 22, Math.PI), bright, [0, -0.29, -0.47]);
    mouth.rotation.z = Math.PI;
    this.head.position.y = 4.8;
    this.avatar.add(this.head);

    // Upper arms pivot at the shoulders, enabling a subtle greeting gesture.
    this.leftArm.position.set(-0.62, 3.75, 0);
    this.rightArm.position.set(0.62, 3.75, 0);
    this.avatar.add(this.leftArm, this.rightArm);
    for (const [arm, side] of [[this.leftArm, -1], [this.rightArm, 1]] as const) {
      addMesh(arm, new THREE.CapsuleGeometry(0.16, 0.64, 3, 8), cyan, [side * 0.12, -0.55, 0], [1, 1, 0.9]);
      addMesh(arm, new THREE.SphereGeometry(0.19, 12, 10), bright, [side * 0.15, -1.04, -0.01]);
    }
    // A light, stylized skirt-like silhouette fades out toward the projection.
    addMesh(this.avatar, new THREE.ConeGeometry(0.78, 1.12, 24, 1, true), cyan, [0, 1.48, 0], [1, 1, 0.68]);
    for (let i = 0; i < 5; i++) {
      const band = addMesh(this.avatar, new THREE.TorusGeometry(0.5 + i * 0.035, 0.012, 5, 36), line, [0, 2.25 + i * 0.34, 0]);
      band.rotation.x = Math.PI / 2;
      this.scanBands.push(band);
    }

    this.glow = new THREE.PointLight("#3edfff", 7, 16, 1.8);
    this.glow.position.set(0, 3.0, 0.5);
    this.group.add(this.glow);
    this.group.rotation.y = Math.PI; // Face the player at the initial spawn point.
    this.group.userData.name = "Cortana hologram";
    this.group.userData.interactive = true;
  }

  update(timeSeconds: number, speaking = false): void {
    this.avatar.position.y = 0.32 + Math.sin(timeSeconds * 1.45) * 0.09;
    this.head.rotation.y = Math.sin(timeSeconds * 0.62) * 0.075;
    this.head.rotation.x = Math.sin(timeSeconds * 0.9) * 0.025;
    this.leftArm.rotation.z = Math.sin(timeSeconds * (speaking ? 8 : 1.5)) * (speaking ? 0.18 : 0.035) + 0.1;
    this.rightArm.rotation.z = speaking
      ? -0.38 + Math.sin(timeSeconds * 8.5) * 0.2
      : -0.06 + Math.sin(timeSeconds * 1.7) * 0.025;
    this.halo.rotation.z = timeSeconds * 0.22;
    this.rings.forEach((ring) => {
      ring.rotation.z += 0.003 * Number(ring.userData.spin ?? 1);
      ring.position.y = Number(ring.userData.spin) > 0 ? 0.32 + Math.sin(timeSeconds * 1.4) * 0.035 : 0.48;
    });
    this.scanBands.forEach((band, index) => {
      band.position.y = 2.22 + ((timeSeconds * 0.45 + index * 0.32) % 1.6);
    });
    const blink = Math.sin(timeSeconds * 2.1) > 0.985 ? 0.12 : 1;
    this.eyes.forEach((eye) => eye.scale.y = blink);
    (this.halo.material as THREE.MeshBasicMaterial).opacity = speaking ? 1 : 0.64 + Math.sin(timeSeconds * 2.2) * 0.15;
    this.glow.intensity = speaking ? 10 : 6.5 + Math.sin(timeSeconds * 1.8) * 0.8;
  }
}

export function createCortanaHologram(): CortanaHologram {
  return new CortanaHologram();
}
