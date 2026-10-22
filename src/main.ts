import * as THREE from "three";
import { createCortanaHologram } from "./entities/CortanaHologram";
import { checkCortanaApiHealth, isCortanaApiConfigured, sendCortanaMessage, type ChatTurn, type CortanaWorldState } from "./services/CortanaApi";
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
const voiceButton = document.querySelector<HTMLButtonElement>("#voice-button");
const chatForm = document.querySelector<HTMLFormElement>("#chat-form");
const chatInput = document.querySelector<HTMLInputElement>("#chat-input");
const sendButton = document.querySelector<HTMLButtonElement>("#send-button");
const statusLabel = document.querySelector<HTMLElement>("#system-status-label");
const mapToggle = document.querySelector<HTMLButtonElement>("#map-toggle");
const mapPanel = document.querySelector<HTMLElement>("#map-panel");
const mapClose = document.querySelector<HTMLButtonElement>("#map-close");
const mapCanvas = document.querySelector<HTMLCanvasElement>("#map-canvas");
const mapLocationsEl = document.querySelector<HTMLElement>("#map-locations");
const mapCountEl = document.querySelector<HTMLElement>("#map-count");
const locationNameEl = document.querySelector<HTMLElement>("#location-name");
const locationBiomeEl = document.querySelector<HTMLElement>("#location-biome");
if (!canvas || !messageEl || !missionStateEl || !progressEl || !coordinatesEl || !toastEl || !talkButton || !resetButton || !touchInteract || !voiceButton || !chatForm || !chatInput || !sendButton || !statusLabel || !mapToggle || !mapPanel || !mapClose || !mapCanvas || !mapLocationsEl || !mapCountEl || !locationNameEl || !locationBiomeEl) throw new Error("Nie udało się uruchomić interfejsu gry.");

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

type DataFragment = { id: string; label: string; position: THREE.Vector3; group: THREE.Group; collected: boolean };
const fragmentSpecs = [
  { id: "fragment-forest", label: "Archiwum lasu", position: new THREE.Vector3(-18, 0, 18) },
  { id: "fragment-lake", label: "Echo jeziora", position: new THREE.Vector3(-78, 0, -35) },
  { id: "fragment-citadel", label: "Sygnał Cytadeli", position: new THREE.Vector3(26, 0, -72) },
];
const savedFragments = new Set<string>(JSON.parse(localStorage.getItem("cortara-data-fragments") ?? "[]") as string[]);
const dataFragments: DataFragment[] = fragmentSpecs.map((spec) => {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.8, 1), new THREE.MeshStandardMaterial({
    color: "#b8f8ff", emissive: "#39dfff", emissiveIntensity: 2.5, metalness: 0.2, roughness: 0.18
  }));
  core.position.y = 2.6; core.scale.set(0.7, 1.5, 0.7); group.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.07, 6, 32), new THREE.MeshBasicMaterial({
    color: "#8cefff", transparent: true, opacity: 0.8
  }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 1.2; group.add(ring);
  group.position.copy(spec.position); group.userData.core = core; group.userData.ring = ring;
  const collected = savedFragments.has(spec.id); group.visible = !collected; scene.add(group);
  return { ...spec, group, collected };
});

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

// Proceduralny hologram przewodniczki, nie wymagający zewnętrznego modelu 3D.
const cortanaHologram = createCortanaHologram();
cortanaHologram.group.position.set(-5.5, 0, -2.5);
scene.add(cortanaHologram.group);
let cortanaSpeaking = false;

type WorldLocation = {
  id: string;
  name: string;
  description: string;
  area: string;
  x: number;
  z: number;
  radius: number;
  discovered: boolean;
};
const locationSpecs = [
  { id: "valley", name: "Dolina Cytadeli", description: "Bezpieczny punkt startowy pod przezroczystą kopułą.", area: "Zielone Serce", x: 0, z: 8, radius: 40, discoveredByDefault: true },
  { id: "crystal-clearing", name: "Polana Kryształów", description: "Pole świecących kryształów wokół pradawnego szlaku.", area: "Zielone Serce", x: 0, z: -8, radius: 23 },
  { id: "forest-archive", name: "Archiwum Lasu", description: "Fragmenty danych ukryte wśród drzew.", area: "Zielone Serce", x: -18, z: 18, radius: 18 },
  { id: "relay", name: "Przekaźnik Kopuły", description: "Węzeł energetyczny misji wprowadzającej.", area: "Dolina Cytadeli", x: 32, z: 30, radius: 23 },
  { id: "citadel-ruins", name: "Ruiny Cytadeli", description: "Stare wieże i zapisane w kamieniu ślady cywilizacji.", area: "Dolina Cytadeli", x: 0, z: -52, radius: 24 },
  { id: "data-echo", name: "Echo Archiwum", description: "Uszkodzony zapis ekspedycji, który można odzyskać.", area: "Strefa Zapisów", x: -78, z: -35, radius: 19 },
  { id: "lake", name: "Echo Jeziora", description: "Spokojny akwen i naturalny punkt orientacyjny.", area: "Brzeg Jeziora", x: -95, z: -105, radius: 30 },
  { id: "western-grove", name: "Zachodni Gaj", description: "Gęsty fragment leśnego ekosystemu.", area: "Zielone Serce", x: -138, z: 44, radius: 28 },
  { id: "eastern-ridge", name: "Wschodni Grzbiet", description: "Wyniesiony szlak z widokiem na kopułę.", area: "Zielone Serce", x: 138, z: 78, radius: 28 },
];
function loadStringSet(storageKey: string): Set<string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []);
  } catch {
    return new Set<string>();
  }
}
const knownLocations = loadStringSet("cortara-discovered-locations");
locationSpecs.forEach((spec) => {
  if ("discoveredByDefault" in spec && spec.discoveredByDefault) knownLocations.add(spec.id);
});
const worldLocations: WorldLocation[] = locationSpecs.map((spec) => ({
  id: spec.id,
  name: spec.name,
  description: spec.description,
  area: spec.area,
  x: spec.x,
  z: spec.z,
  radius: spec.radius,
  discovered: knownLocations.has(spec.id),
}));
let mapOpen = false;
let lastMapDraw = 0;
let lastLocationRefresh = 0;

function renderMap(): void {
  const context = mapCanvas.getContext("2d");
  if (!context) return;
  const width = mapCanvas.width;
  const height = mapCanvas.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#06131e";
  context.fillRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const scale = (Math.min(width, height) - 66) / 360;
  const px = (x: number) => cx + x * scale;
  const py = (z: number) => cy + z * scale;

  context.strokeStyle = "rgba(102, 213, 245, 0.12)";
  context.lineWidth = 1;
  for (let step = -160; step <= 160; step += 40) {
    context.beginPath(); context.moveTo(px(step), py(-180)); context.lineTo(px(step), py(180)); context.stroke();
    context.beginPath(); context.moveTo(px(-180), py(step)); context.lineTo(px(180), py(step)); context.stroke();
  }
  context.strokeStyle = "rgba(95, 223, 255, 0.38)";
  context.lineWidth = 2;
  context.beginPath(); context.arc(cx, cy, 180 * scale, 0, Math.PI * 2); context.stroke();

  // The lake is represented schematically; this is a game map, not a geographic survey.
  context.fillStyle = "rgba(36, 143, 181, 0.32)";
  context.strokeStyle = "rgba(83, 209, 240, 0.42)";
  context.beginPath();
  context.ellipse(px(-95), py(-105), 92 * scale, 58 * scale, -0.35, 0, Math.PI * 2);
  context.fill(); context.stroke();

  // Dotted paths only suggest navigation; they do not imply roads have been built.
  context.setLineDash([5, 7]);
  context.strokeStyle = "rgba(118, 230, 255, 0.22)";
  worldLocations.filter((location) => location.discovered).forEach((location) => {
    if (location.id === "valley") return;
    context.beginPath(); context.moveTo(px(0), py(8)); context.lineTo(px(location.x), py(location.z)); context.stroke();
  });
  context.setLineDash([]);

  worldLocations.forEach((location) => {
    const x = px(location.x), y = py(location.z);
    context.beginPath(); context.arc(x, y, location.discovered ? 7 : 6, 0, Math.PI * 2);
    context.fillStyle = location.discovered ? "#73e8ff" : "#294c5d";
    context.fill();
    context.strokeStyle = location.discovered ? "#d4fbff" : "#567e8f";
    context.lineWidth = 2; context.stroke();
    context.fillStyle = location.discovered ? "#e5fbff" : "#8daab8";
    context.font = "bold 15px Inter, sans-serif";
    context.textAlign = "center"; context.textBaseline = "middle";
    context.fillText(location.discovered ? "•" : "?", x, y + 0.5);
    if (location.discovered) {
      context.font = "12px Inter, sans-serif";
      context.textAlign = "left";
      context.fillStyle = "rgba(225, 248, 255, 0.94)";
      context.fillText(location.name, x + 11, y - 11);
    }
  });

  // Player marker.
  const playerX = px(player.position.x);
  const playerY = py(player.position.z);
  context.save();
  context.translate(playerX, playerY);
  context.fillStyle = "#ffe29a";
  context.strokeStyle = "#fff6d5";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -11); context.lineTo(8, 8); context.lineTo(0, 4); context.lineTo(-8, 8);
  context.closePath(); context.fill(); context.stroke();
  context.restore();

  context.fillStyle = "#9bc2d3";
  context.font = "11px Inter, sans-serif";
  context.textAlign = "left"; context.textBaseline = "top";
  context.fillText("MAPA REGIONAL · 360 × 360 m", 14, 12);
  context.textAlign = "right";
  context.fillText("N ↑", width - 14, 12);
}

function refreshMapList(): void {
  mapCountEl.textContent = "ODKRYTE LOKACJE: " + worldLocations.filter((location) => location.discovered).length + "/" + worldLocations.length;
  mapLocationsEl.replaceChildren();
  const discovered = worldLocations.filter((location) => location.discovered);
  discovered.forEach((location) => {
    const item = document.createElement("div");
    item.className = "map-location-item";
    const title = document.createElement("strong");
    title.textContent = location.name;
    const detail = document.createElement("small");
    detail.textContent = location.area + " · " + location.description;
    item.append(title, detail);
    mapLocationsEl.append(item);
  });
  const remaining = worldLocations.length - discovered.length;
  if (remaining > 0) {
    const note = document.createElement("div");
    note.className = "map-unknown-note";
    note.textContent = "Nieodkryte punkty: " + remaining + ". Zbliż się do znaczników „?” na mapie, aby poznać ich nazwy.";
    mapLocationsEl.append(note);
  }
}

function setMapOpen(open: boolean): void {
  mapOpen = open;
  mapPanel.hidden = !open;
  mapToggle.setAttribute("aria-expanded", String(open));
  mapToggle.textContent = open ? "ZAMKNIJ MAPĘ [M]" : "MAPA ŚWIATA [M]";
  if (open) {
    renderMap();
    refreshMapList();
  }
}
function updateLocationDiscovery(): void {
  let changed = false;
  for (const location of worldLocations) {
    if (location.discovered) continue;
    const dx = player.position.x - location.x;
    const dz = player.position.z - location.z;
    if (Math.sqrt(dx * dx + dz * dz) <= location.radius) {
      location.discovered = true;
      knownLocations.add(location.id);
      changed = true;
      showToast("Odkryto lokację: " + location.name);
    }
  }
  if (changed) {
    localStorage.setItem("cortara-discovered-locations", JSON.stringify([...knownLocations]));
    refreshMapList();
    renderMap();
  }
  const near = worldLocations
    .map((location) => ({
      location,
      distance: Math.hypot(player.position.x - location.x, player.position.z - location.z),
    }))
    .filter((entry) => entry.location.discovered && entry.distance <= entry.location.radius + 18)
    .sort((a, b) => a.distance - b.distance)[0];
  locationNameEl.textContent = near ? near.location.name : "Niezbadana okolica";
  locationBiomeEl.textContent = near ? near.location.area.toLocaleUpperCase("pl-PL") : "ZIELONE SERCE";
}

const keys = new Set<string>();
let touchMove: MoveDirection | null = null;
let relayActivated = localStorage.getItem("cortara-relay-activated") === "true";
let toastTimer = 0, cameraYaw = 0, cameraPitch = 0.22, isDragging = false, lastPointerX = 0, lastPointerY = 0;
function showToast(text: string): void {
  toastEl.textContent = text; toastEl.classList.add("visible"); window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("visible"), 2600);
}
function updateMission(): void {
  const found = dataFragments.filter((fragment) => fragment.collected).length;
  const total = dataFragments.length;
  progressEl.style.width = relayActivated ? "100%" : `${Math.round((found / total) * 75)}%`;
  missionStateEl.textContent = relayActivated ? "MISJA UKOŃCZONA · SIEĆ PRZYWRÓCONA"
    : found < total ? `CEL: ZBIERZ FRAGMENTY DANYCH · ${found}/${total}` : "CEL: AKTYWUJ PRZEKAŹNIK";
  const inventory = document.querySelector<HTMLElement>("#fragment-count");
  if (inventory) inventory.textContent = `FRAGMENTY ${found}/${total}`;
  messageEl.textContent = relayActivated
    ? "Świetna praca. Przekaźnik odpowiada, a pierwsza sieć Doliny Cytadeli została przywrócona."
    : found < total ? `Zebrane fragmenty danych: ${found} z ${total}. Szukaj unoszących się błękitnych kryształów i naciśnij E w ich pobliżu.`
    : "Wszystkie fragmenty są zebrane. Wróć do przekaźnika i naciśnij E, aby przywrócić sieć.";
}
function interact(): void {
  const nearby = dataFragments.filter((fragment) => !fragment.collected)
    .sort((a, b) => player.position.distanceTo(a.position) - player.position.distanceTo(b.position))[0];
  if (nearby && player.position.distanceTo(nearby.position) < 10) {
    nearby.collected = true; nearby.group.visible = false; savedFragments.add(nearby.id);
    localStorage.setItem("cortara-data-fragments", JSON.stringify([...savedFragments]));
    updateMission(); showToast(`Zebrano: ${nearby.label}`); return;
  }
  if (player.position.distanceTo(relay.position) > 16) {
    showToast(nearby ? "Fragment danych jest niedaleko. Podejdź bliżej i naciśnij E." : "Cel jest dalej. Rozejrzyj się za błękitnymi fragmentami danych.");
    messageEl.textContent = "Eksploruj dolinę i zbierz trzy fragmenty danych. Naciśnij E, gdy stoisz blisko błękitnego kryształu.";
    return;
  }
  if (relayActivated) { messageEl.textContent = "Przekaźnik działa poprawnie. Pierwsza sieć została przywrócona."; showToast("Przekaźnik działa stabilnie."); return; }
  const found = dataFragments.filter((fragment) => fragment.collected).length;
  if (found < dataFragments.length) {
    showToast(`Brakujące dane: ${found}/${dataFragments.length}. Najpierw znajdź fragmenty.`);
    messageEl.textContent = `Przekaźnik potrzebuje trzech fragmentów danych. Masz ${found} z ${dataFragments.length}.`; return;
  }
  relayActivated = true; localStorage.setItem("cortara-relay-activated", "true");
  relayOrb.material = makeOrbMaterial(true); relayLight.color.set("#71ffcb"); updateMission();
  showToast("Misja ukończona: sieć przekaźnika przywrócona.");
}
function speakCurrentMessage(): void {
  if (!("speechSynthesis" in window)) {
    showToast("Ta przeglądarka nie obsługuje odczytu głosowego.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(messageEl.textContent ?? "Witaj w Cortarze.");
  utterance.lang = "pl-PL";
  utterance.rate = 0.94;
  utterance.pitch = 1.06;
  const polishVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("pl"));
  if (polishVoice) utterance.voice = polishVoice;
  utterance.onstart = () => { cortanaSpeaking = true; };
  utterance.onend = () => { cortanaSpeaking = false; };
  utterance.onerror = () => { cortanaSpeaking = false; showToast("Nie udało się odtworzyć głosu. Sprawdź głos polski w ustawieniach urządzenia."); };
  window.speechSynthesis.speak(utterance);
}
const chatHistory: ChatTurn[] = [];
function getWorldState(): CortanaWorldState {
  return {
    biome: "Zielone Serce",
    location: "Dolina Cytadeli",
    relay_activated: relayActivated,
    x: Math.round(player.position.x),
    z: Math.round(player.position.z),
  };
}
function demoReply(message: string): string {
  const text = message.toLocaleLowerCase("pl-PL");
  if (text.includes("przekaźnik") || text.includes("przekaznik") || text.includes("misj")) {
    return relayActivated
      ? "Pierwszy przekaźnik jest aktywny. Możesz eksplorować Dolinę Cytadeli; kolejne obszary dodamy w dalszych etapach."
      : "Niebieski węzeł na wschodzie to nasz cel. Podejdź do niego i naciśnij E, aby aktywować pierwszy przekaźnik.";
  }
  if (text.includes("kopuł") || text.includes("kopul")) {
    return "Kopuła jest przezroczystą powłoką ochronną w fikcyjnym świecie Cortary. W tym prototypie jej stan jest częścią symulacji, a nie rzeczywistym modelem fizycznym.";
  }
  if (text.includes("gdzie") || text.includes("lokaliz")) {
    const state = getWorldState();
    return `Jesteś w okolicy ${state.location}. Współrzędne w grze: X ${state.x}, Z ${state.z}.`;
  }
  return "Jestem teraz w trybie demonstracyjnym. Interfejs i hologram działają, ale prawdziwa rozmowa AI wymaga wdrożonego backendu FastAPI i konfiguracji klucza po stronie serwera.";
}
async function submitChat(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message || sendButton.disabled) return;
  chatInput.value = "";
  sendButton.disabled = true;
  messageEl.textContent = "Analizuję Twoją wiadomość…";
  try {
    if (!isCortanaApiConfigured()) {
      const answer = demoReply(message);
      messageEl.textContent = answer;
      chatHistory.push({ role: "user", content: message }, { role: "assistant", content: answer });
      showToast("Tryb demonstracyjny — backend AI nie jest jeszcze podłączony.");
      return;
    }
    const result = await sendCortanaMessage({
      message,
      history: chatHistory.slice(-10),
      world_state: getWorldState(),
    });
    messageEl.textContent = result.message;
    chatHistory.push({ role: "user", content: message }, { role: "assistant", content: result.message });
    if (chatHistory.length > 12) chatHistory.splice(0, chatHistory.length - 12);
    if (result.mode === "demo") showToast("Odpowiedź demonstracyjna.");
  } catch (error) {
    messageEl.textContent = demoReply(message);
    showToast(error instanceof Error ? `AI offline: ${error.message}` : "AI offline — używam trybu demonstracyjnego.");
  } finally {
    sendButton.disabled = false;
    chatInput.focus();
  }
}
function talk(): void {
  messageEl.textContent = "Jestem Cortana, Twoja przewodniczka. Napisz pytanie poniżej. Gdy backend AI nie jest skonfigurowany, odpowiadam w trybie demonstracyjnym.";
  chatInput.focus();
}
async function refreshBackendStatus(): Promise<void> {
  statusLabel.textContent = "TRYB DEMO";
  if (!isCortanaApiConfigured()) return;
  statusLabel.textContent = "SPRAWDZAM AI…";
  const ready = await checkCortanaApiHealth();
  statusLabel.textContent = ready ? "CORTANA AI ONLINE" : "AI NIEDOSTĘPNE";
}
function resetMission(): void {
  relayActivated = false; localStorage.removeItem("cortara-relay-activated");
  dataFragments.forEach((fragment) => { fragment.collected = false; fragment.group.visible = true; });
  savedFragments.clear(); localStorage.removeItem("cortara-data-fragments");
  relayOrb.material = makeOrbMaterial(false); relayLight.color.set("#42dfff"); updateMission();
  showToast("Misja i zebrane fragmenty zostały zresetowane.");
}
updateMission();
updateLocationDiscovery();
refreshMapList();
talkButton.addEventListener("click", talk);
voiceButton.addEventListener("click", speakCurrentMessage);
mapToggle.addEventListener("click", () => setMapOpen(!mapOpen));
mapClose.addEventListener("click", () => setMapOpen(false));
chatForm.addEventListener("submit", (event) => { void submitChat(event); });
void refreshBackendStatus();
resetButton.addEventListener("click", resetMission); touchInteract.addEventListener("click", interact);
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const target = event.target;
  if (target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable)) return;
  if (key === "m" && !event.repeat) {
    event.preventDefault();
    setMapOpen(!mapOpen);
    return;
  }
  if (key === "escape" && mapOpen) {
    setMapOpen(false);
    return;
  }
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift", "e"].includes(key)) event.preventDefault();
  keys.add(key);
  if (key === "e" && !event.repeat) interact();
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
  const elapsed = performance.now() * 0.001;
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
  dataFragments.forEach((fragment, index) => {
    if (fragment.collected) return;
    fragment.group.position.y = Math.sin(elapsed * 1.8 + index) * 0.45;
    fragment.group.rotation.y += delta * (0.45 + index * 0.12);
    const core = fragment.group.userData.core as THREE.Mesh;
    const ring = fragment.group.userData.ring as THREE.Mesh;
    ring.rotation.z += delta * 0.8;
    core.scale.y = 1.5 + Math.sin(elapsed * 2 + index) * 0.12;
  });
  cortanaHologram.update(performance.now() * 0.001, cortanaSpeaking);
  crystals.rotation.y += delta * 0.015; domeGrid.rotation.y += delta * 0.0015;
  water.material.opacity = 0.78 + Math.sin(performance.now() * 0.0008) * 0.05;
  desiredCamera.copy(player.position).add(new THREE.Vector3(Math.sin(cameraYaw) * 9 * Math.cos(cameraPitch), 4 + Math.sin(cameraPitch) * 9, Math.cos(cameraYaw) * 9 * Math.cos(cameraPitch)));
  camera.position.lerp(desiredCamera, 1 - Math.exp(-5 * delta));
  lookTarget.copy(player.position).add(new THREE.Vector3(0, 1.4, 0)); camera.lookAt(lookTarget);
  coordinatesEl.textContent = `X ${Math.round(player.position.x).toString().padStart(3, "0")} · Z ${Math.round(player.position.z).toString().padStart(3, "0")}`;
  if (elapsed - lastLocationRefresh >= 0.25) {
    lastLocationRefresh = elapsed;
    updateLocationDiscovery();
    if (mapOpen && performance.now() - lastMapDraw >= 180) { lastMapDraw = performance.now(); renderMap(); }
  }
  renderer.render(scene, camera);
}
animate();
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8)); renderer.setSize(window.innerWidth, window.innerHeight);
});
if (relayActivated) { relayOrb.material = makeOrbMaterial(true); relayLight.color.set("#71ffcb"); }
