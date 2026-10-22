import * as THREE from "three";
import "./styles.css";

type MoveDirection = "forward" | "back" | "left" | "right";
const canvas = document.querySelector<HTMLCanvasElement>("#world");
const messageEl = document.querySelector<HTMLElement>("#cortana-message");
const missionStateEl = document.querySelector<HTMLElement>("#mission-state");
const progressEl = document.querySelector<HTMLElement>("#mission-progress");
const coordinatesEl = document.querySelector<HTMLElement>("#coordinates");
const toastEl = document.querySelector<HTMLElement>("#toast");
const talkButton = document.querySelector<HTMLButtonElement>("#talk-button");
const resetButton = document.querySelector<HTMLButtonElement>("#reset-button");
const touchInteract = document.querySelector<HTMLButtonElement>("#touch-interact");
if (!canvas || !messageEl || !missionStateEl || !progressEl || !coordinatesEl || !toastEl || !talkButton || !resetButton || !touchInteract) throw new Error("Nie udało się uruchomić interfejsu gry.");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#8fc9e7");
scene.fog = new THREE.FogExp2("#9ccedb", 0.0018);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

scene.add(new THREE.HemisphereLight("#d7f6ff", "#253b43", 2.0));
const sun = new THREE.DirectionalLight("#fff0cb", 3.0);
sun.position.set(-80, 140, 45); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -100; sun.shadow.camera.right = 100; sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
scene.add(sun);

const groundGeometry = new THREE.PlaneGeometry(1800, 1800, 90, 90);
groundGeometry.rotateX(-Math.PI / 2);
const positions = groundGeometry.attributes.position;
for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i), z = positions.getZ(i);
  positions.setY(i, Math.sin(x * 0.018) * 2.6 + Math.cos(z * 0.022) * 2.2 + Math.sin((x + z) * 0.035) * 1.2);
}
groundGeometry.computeVertexNormals();
const ground = new THREE.Mesh(groundGeometry, new THREE.MeshStandardMaterial({ color: "#416d57", roughness: 0.96 }));
ground.receiveShadow = true; scene.add(ground);

const domeGeometry = new THREE.SphereGeometry(850, 72, 48, 0, Math.PI * 2, 0, Math.PI / 2);
const domeMaterial = new THREE.MeshPhysicalMaterial({ color: "#73dfff", roughness: 0.24, metalness: 0.08, transparent: true, opacity: 0.105, side: THREE.BackSide, depthWrite: false, transmission: 0.08, thickness: 0.6 });
const dome = new THREE.Mesh(domeGeometry, domeMaterial);
dome.position.y = 2; dome.renderOrder = 2; scene.add(dome);

const domeGrid = new THREE.Group();
const gridMaterial = new THREE.LineBasicMaterial({ color: "#98e9ff", transparent: true, opacity: 0.15 });
for (let lat = 1; lat <= 7; lat++) {
  const phi = (Math.PI / 2) * (lat / 8), radius = 850 * Math.sin(phi), y = 2 + 850 * Math.cos(phi);
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
  const points = curve.getPoints(160).map((p) => new THREE.Vector3(p.x, y, p.y));
  domeGrid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
}
for (let meridian = 0; meridian < 12; meridian++) {
  const angle = (Math.PI * 2 * meridian) / 12, points: THREE.Vector3[] = [];
  for (let step = 0; step <= 48; step++) {
    const phi = (Math.PI / 2) * (step / 48);
    points.push(new THREE.Vector3(850 * Math.sin(phi) * Math.cos(angle), 2 + 850 * Math.cos(phi), 850 * Math.sin(phi) * Math.sin(angle)));
  }
  domeGrid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
}
domeGrid.renderOrder = 3; scene.add(domeGrid);

const water = new THREE.Mesh(new THREE.CircleGeometry(110, 72), new THREE.MeshStandardMaterial({ color: "#278caa", roughness: 0.26, metalness: 0.12, transparent: true, opacity: 0.85 }));
water.rotation.x = -Math.PI / 2; water.position.set(-95, 0.45, -105); scene.add(water);

const stoneMat = new THREE.MeshStandardMaterial({ color: "#6e8791", roughness: 0.65, metalness: 0.25 });
const paleMat = new THREE.MeshStandardMaterial({ color: "#c3e5e8", roughness: 0.34, metalness: 0.32 });
const citadel = new THREE.Group();
function addTower(x: number, z: number, height: number, radius: number): void {
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.64, radius, height, 8), stoneMat);
  tower.position.set(x, height / 2, z); tower.castShadow = true; tower.receiveShadow = true; citadel.add(tower);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.9, height * 0.16, 8), paleMat);
  cap.position.set(x, height + height * 0.08, z); cap.castShadow = true; citadel.add(cap);
}
const mainHall = new THREE.Mesh(new THREE.CylinderGeometry(18, 24, 23, 12), paleMat);
mainHall.position.set(0, 11.5, -42); mainHall.castShadow = true; mainHall.receiveShadow = true; citadel.add(mainHall);
const roof = new THREE.Mesh(new THREE.ConeGeometry(23, 13, 12), stoneMat);
roof.position.set(0, 29, -42); roof.castShadow = true; citadel.add(roof);
addTower(-24, -42, 30, 7); addTower(24, -42, 27, 6); addTower(-18, -67, 19, 5); addTower(18, -67, 21, 5);
scene.add(citadel);

const crystalMaterial = new THREE.MeshStandardMaterial({ color: "#70eaff", emissive: "#16bde8", emissiveIntensity: 1.8, roughness: 0.24, metalness: 0.1 });
const crystals = new THREE.Group();
for (let i = 0; i < 22; i++) {
  const angle = (i / 22) * Math.PI * 2, radius = 24 + (i % 4) * 5, height = 2.5 + (i % 5) * 1.5;
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.3 + (i % 3) * 0.5, 0), crystalMaterial);
  crystal.position.set(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius - 8); crystal.scale.y = height / 2; crystal.rotation.y = angle; crystals.add(crystal);
}
scene.add(crystals);

function makeTree(x: number, z: number, scale: number): THREE.Group {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * scale, 0.9 * scale, 7 * scale, 7), new THREE.MeshStandardMaterial({ color: "#644d3b", roughness: 1 }));
  trunk.position.y = 3.5 * scale; trunk.castShadow = true; group.add(trunk);
  const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(3.8 * scale, 1), new THREE.MeshStandardMaterial({ color: "#327e62", roughness: 0.95 }));
  canopy.position.y = 7.4 * scale; canopy.scale.set(1, 1.2, 1); canopy.castShadow = true; group.add(canopy);
  group.position.set(x, 0, z); return group;
}
for (let i = 0; i < 130; i++) {
  const angle = Math.random() * Math.PI * 2, radius = 85 + Math.random() * 560, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
  if (Math.abs(x) < 65 && z < 38 && z > -95) continue;
  scene.add(makeTree(x, z, 0.65 + Math.random() * 1.3));
}

const relay = new THREE.Group();
const relayBase = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.4, 2.4, 8), stoneMat);
relayBase.position.y = 1.2; relayBase.castShadow = true; relay.add(relayBase);
const relayPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.4, 8, 8), paleMat);
relayPillar.position.y = 6; relayPillar.castShadow = true; relay.add(relayPillar);
const makeOrbMaterial = (active: boolean) => new THREE.MeshStandardMaterial({ color: active ? "#d5fff3" : "#9af7ff", emissive: active ? "#66ffbc" : "#22caff", emissiveIntensity: active ? 3.4 : 2.8, roughness: 0.1, metalness: 0.2 });
const relayOrb = new THREE.Mesh(new THREE.IcosahedronGeometry(3.2, 2), makeOrbMaterial(false));
relayOrb.position.y = 11; relay.add(relayOrb);
const relayLight = new THREE.PointLight("#42dfff", 28, 65, 1.7); relayLight.position.y = 11; relay.add(relayLight);
const relayRing = new THREE.Mesh(new THREE.TorusGeometry(5.1, 0.12, 8, 72), new THREE.MeshBasicMaterial({ color: "#80edff", transparent: true, opacity: 0.85 }));
relayRing.position.y = 7; relayRing.rotation.x = Math.PI / 2.5; relay.add(relayRing);
relay.position.set(32, 0, 30); scene.add(relay);

const player = new THREE.Group();
const suit = new THREE.Mesh(new THREE.CapsuleGeometry(0.65, 1.1, 4, 8), new THREE.MeshStandardMaterial({ color: "#213b53", roughness: 0.48, metalness: 0.42 }));
suit.position.y = 1.2; suit.castShadow = true; player.add(suit);
const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 12), new THREE.MeshStandardMaterial({ color: "#bdefff", emissive: "#2d7897", emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.18 }));
helmet.position.y = 2.15; helmet.castShadow = true; player.add(helmet);
const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.36), stoneMat); backpack.position.set(0, 1.25, 0.55); player.add(backpack);
player.position.set(0, 0, 8); scene.add(player);

const keys = new Set<string>();
let touchMove: MoveDirection | null = null;
let relayActivated = localStorage.getItem("cortara-relay-activated") === "true";
let toastTimer = 0, cameraYaw = 0, cameraPitch = 0.22, isDragging = false, lastPointerX = 0, lastPointerY = 0;
function showToast(text: string): void {
  toastEl.textContent = text; toastEl.classList.add("visible"); window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("visible"), 2600);
}
function updateMission(): void {
  progressEl.style.width = relayActivated ? "100%" : "9%";
  missionStateEl.textContent = relayActivated ? "CEL UKOŃCZONY: PRZEKAŹNIK AKTYWNY" : "CEL: ODNAJDŹ I AKTYWUJ PRZEKAŹNIK";
  messageEl.textContent = relayActivated
    ? "Świetna praca. Przekaźnik odpowiada, a mapa Doliny Cytadeli została zaktualizowana. To dopiero pierwszy węzeł sieci."
    : "Witaj w Cortarze. Kopuła jest stabilna. Świecący węzeł na wschodzie to nasz pierwszy przekaźnik.";
}
function interact(): void {
  if (player.position.distanceTo(relay.position) > 16) {
    showToast("Przekaźnik jest dalej. Podążaj za niebieskim światłem.");
    messageEl.textContent = "Przekaźnik znajduje się na wschód od Ciebie. Podejdź bliżej, a pomogę go aktywować.";
    return;
  }
  if (relayActivated) { messageEl.textContent = "Przekaźnik działa poprawnie. Możemy teraz zbadać kolejną strefę."; showToast("Przekaźnik działa stabilnie."); return; }
  relayActivated = true; localStorage.setItem("cortara-relay-activated", "true");
  relayOrb.material = makeOrbMaterial(true); relayLight.color.set("#71ffcb"); updateMission(); showToast("Misja ukończona: przekaźnik aktywny.");
}
function talk(): void {
  messageEl.textContent = relayActivated
    ? "Dzięki Tobie pierwszy węzeł znów działa. W tej wersji jestem demonstracyjną przewodniczką; w kolejnym etapie podłączymy bezpieczny backend prawdziwej AI."
    : "Znam to miejsce z zapisów archiwum. Podejdź do niebieskiego przekaźnika i naciśnij E. Wtedy sprawdzimy, czy sieć kopuły odpowie.";
}
function resetMission(): void {
  relayActivated = false; localStorage.removeItem("cortara-relay-activated");
  relayOrb.material = makeOrbMaterial(false); relayLight.color.set("#42dfff"); updateMission(); showToast("Misja została zresetowana.");
}
updateMission();
talkButton.addEventListener("click", talk); resetButton.addEventListener("click", resetMission); touchInteract.addEventListener("click", interact);
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift", "e"].includes(key)) event.preventDefault();
  keys.add(key); if (key === "e" && !event.repeat) interact();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());
canvas.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse") { isDragging = true; lastPointerX = event.clientX; lastPointerY = event.clientY; canvas.setPointerCapture(event.pointerId); }
});
canvas.addEventListener("pointermove", (event) => {
  if (!isDragging) return;
  cameraYaw -= (event.clientX - lastPointerX) * 0.004;
  cameraPitch = THREE.MathUtils.clamp(cameraPitch + (event.clientY - lastPointerY) * 0.002, -0.12, 0.72);
  lastPointerX = event.clientX; lastPointerY = event.clientY;
});
canvas.addEventListener("pointerup", () => { isDragging = false; });
canvas.addEventListener("pointercancel", () => { isDragging = false; });
document.querySelectorAll<HTMLButtonElement>("[data-move]").forEach((button) => {
  const direction = button.dataset.move as MoveDirection;
  const start = (event: PointerEvent) => { event.preventDefault(); touchMove = direction; button.setPointerCapture(event.pointerId); };
  const stop = () => { if (touchMove === direction) touchMove = null; };
  button.addEventListener("pointerdown", start); button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop); button.addEventListener("lostpointercapture", stop);
});

const clock = new THREE.Clock();
const desiredCamera = new THREE.Vector3(), lookTarget = new THREE.Vector3();
function animate(): void {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
  const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
  const input = new THREE.Vector3();
  if (keys.has("w") || keys.has("arrowup") || touchMove === "forward") input.add(forward);
  if (keys.has("s") || keys.has("arrowdown") || touchMove === "back") input.sub(forward);
  if (keys.has("d") || keys.has("arrowright") || touchMove === "right") input.add(right);
  if (keys.has("a") || keys.has("arrowleft") || touchMove === "left") input.sub(right);
  if (input.lengthSq() > 0) {
    input.normalize(); player.position.addScaledVector(input, (keys.has("shift") ? 10 : 5.8) * delta); player.rotation.y = Math.atan2(input.x, input.z);
  }
  player.position.x = THREE.MathUtils.clamp(player.position.x, -790, 790);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -790, 790);
  suit.position.y = 1.2 + (input.lengthSq() > 0 ? Math.sin(performance.now() * 0.012) * 0.05 : 0);
  relayOrb.rotation.y += delta * 0.62; relayOrb.rotation.x += delta * 0.18; relayRing.rotation.z += delta * 0.42;
  crystals.rotation.y += delta * 0.015; domeGrid.rotation.y += delta * 0.0015;
  water.material.opacity = 0.78 + Math.sin(performance.now() * 0.0008) * 0.05;
  desiredCamera.copy(player.position).add(new THREE.Vector3(Math.sin(cameraYaw) * 9 * Math.cos(cameraPitch), 4 + Math.sin(cameraPitch) * 9, Math.cos(cameraYaw) * 9 * Math.cos(cameraPitch)));
  camera.position.lerp(desiredCamera, 1 - Math.exp(-5 * delta));
  lookTarget.copy(player.position).add(new THREE.Vector3(0, 1.4, 0)); camera.lookAt(lookTarget);
  coordinatesEl.textContent = `X ${Math.round(player.position.x).toString().padStart(3, "0")} · Z ${Math.round(player.position.z).toString().padStart(3, "0")}`;
  renderer.render(scene, camera);
}
animate();
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8)); renderer.setSize(window.innerWidth, window.innerHeight);
});
if (relayActivated) { relayOrb.material = makeOrbMaterial(true); relayLight.color.set("#71ffcb"); }
