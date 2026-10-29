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
const timeToggle = document.querySelector<HTMLButtonElement>("#time-toggle");
const timeLabel = document.querySelector<HTMLElement>("#time-label");
const audioToggle = document.querySelector<HTMLButtonElement>("#audio-toggle");
const audioLabel = document.querySelector<HTMLElement>("#audio-label");
const journalToggle = document.querySelector<HTMLButtonElement>("#journal-toggle");
const journalPanel = document.querySelector<HTMLElement>("#journal-panel");
const journalClose = document.querySelector<HTMLButtonElement>("#journal-close");
const journalSummary = document.querySelector<HTMLElement>("#journal-summary");
const journalQuests = document.querySelector<HTMLElement>("#journal-quests");
const journalEntries = document.querySelector<HTMLOListElement>("#journal-entries");
const expeditionPointsEl = document.querySelector<HTMLElement>("#expedition-points");
if (!canvas || !messageEl || !missionStateEl || !progressEl || !coordinatesEl || !toastEl || !talkButton || !resetButton || !touchInteract || !voiceButton || !chatForm || !chatInput || !sendButton || !statusLabel || !mapToggle || !mapPanel || !mapClose || !mapCanvas || !mapLocationsEl || !mapCountEl || !locationNameEl || !locationBiomeEl || !timeToggle || !timeLabel || !audioToggle || !audioLabel || !journalToggle || !journalPanel || !journalClose || !journalSummary || !journalQuests || !journalEntries || !expeditionPointsEl) throw new Error("Nie udało się uruchomić interfejsu gry.");

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

const skyLight = new THREE.HemisphereLight("#d7f6ff", "#253b43", 2.0);
scene.add(skyLight);
const sun = new THREE.DirectionalLight("#fff0cb", 3.0);
sun.position.set(-80, 140, 45); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -100; sun.shadow.camera.right = 100; sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;

scene.add(sun);

// Stylizowany cykl dobowy niezależny od rzeczywistego czasu.
const daySky = new THREE.Color("#8fc9e7");
const nightSky = new THREE.Color("#071426");
const dawnSky = new THREE.Color("#df987d");
const dayFog = new THREE.Color("#9ccedb");
const nightFog = new THREE.Color("#14263e");
const duskFog = new THREE.Color("#8a718e");
const daySun = new THREE.Color("#fff0cb");
const nightSun = new THREE.Color("#9bbfff");
const starsGeometry = new THREE.BufferGeometry();
const starPositions: number[] = [];
let starSeed = 1;
function starRandom(): number { const value = Math.sin(starSeed++ * 127.1) * 43758.5453; return value - Math.floor(value); }
for (let i = 0; i < 420; i++) {
  const angle = starRandom() * Math.PI * 2;
  const y = 100 + starRandom() * 570;
  const radius = Math.sqrt(850 * 850 - y * y);
  starPositions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
}
starsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
const starsMaterial = new THREE.PointsMaterial({ color: "#d7edff", size: 2.2, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: false });
const stars = new THREE.Points(starsGeometry, starsMaterial);
stars.frustumCulled = false;
scene.add(stars);
let dayCyclePaused = false;
const dayCycleSeconds = 240;
let dayCyclePhase = 0.25;
function updateDayNight(delta: number): void {
  if (!dayCyclePaused) dayCyclePhase = (dayCyclePhase + delta / dayCycleSeconds) % 1;
  const solar = Math.sin(dayCyclePhase * Math.PI * 2);
  const daylight = THREE.MathUtils.smoothstep(solar, -0.16, 0.38);
  const twilight = THREE.MathUtils.clamp(1 - Math.abs(solar) * 2.6, 0, 1);
  const night = 1 - daylight;
  const duskBlend = twilight * (solar < 0 ? 0.45 : 1);
  scene.background = daySky.clone().lerp(nightSky, night).lerp(dawnSky, duskBlend * 0.58);
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.color.copy(dayFog.clone().lerp(nightFog, night).lerp(duskFog, duskBlend * 0.52));
    scene.fog.density = 0.00145 + night * 0.00055;
  }
  skyLight.intensity = 0.48 + daylight * 1.65;
  skyLight.color.copy(nightSky.clone().lerp(daySky, daylight));
  skyLight.groundColor.set(night > 0.65 ? "#101c35" : "#253b43");
  sun.color.copy(nightSun.clone().lerp(daySun, daylight));
  sun.intensity = 0.12 + daylight * 2.88;
  const angle = dayCyclePhase * Math.PI * 2;
  sun.position.set(Math.cos(angle) * 220, 25 + Math.max(0, solar) * 180, Math.sin(angle) * 160);
  starsMaterial.opacity = THREE.MathUtils.clamp(night * 1.12, 0, 0.92);
  updateAmbientForPhase(night);
  timeLabel.textContent = night > 0.72 ? "NOC" : daylight < 0.38 ? (solar > 0 ? "ŚWIT" : "ZMIERZCH") : "DZIEŃ";
  timeToggle.textContent = dayCyclePaused ? "WZNÓW CYKL" : "PAUZA CYKLU";
  timeToggle.setAttribute("aria-pressed", String(dayCyclePaused));
}
timeToggle.addEventListener("click", () => { dayCyclePaused = !dayCyclePaused; updateDayNight(0); });

let audioContext: AudioContext | null = null;
let ambientGain: GainNode | null = null;
let ambientOscillator: OscillatorNode | null = null;
let windOscillator: OscillatorNode | null = null;
let audioEnabled = false;
let lastDiscoveryChime = 0;
function updateAudioUi(): void {
  audioToggle.textContent = audioEnabled ? "WYŁĄCZ DŹWIĘK" : "WŁĄCZ DŹWIĘK";
  audioToggle.setAttribute("aria-pressed", String(audioEnabled));
  audioLabel.textContent = audioEnabled ? "AMBIENT AKTYWNY" : "DŹWIĘK WYŁĄCZONY";
}
function startAmbientAudio(): void {
  if (audioContext) {
    audioEnabled = true;
    if (ambientGain) ambientGain.gain.setTargetAtTime(0.035, audioContext.currentTime, 0.6);
    if (audioContext.state === "suspended") void audioContext.resume();
    updateAudioUi();
    return;
  }
  if (!window.AudioContext) { showToast("Ta przeglądarka nie obsługuje Web Audio."); return; }
  audioContext = new window.AudioContext();
  const ctx = audioContext;
  const master = ctx.createGain(); master.gain.value = 0.035; master.connect(ctx.destination); ambientGain = master;
  const lowpass = ctx.createBiquadFilter(); lowpass.type = "lowpass"; lowpass.frequency.value = 360; lowpass.Q.value = 0.45; lowpass.connect(master);
  ambientOscillator = ctx.createOscillator(); ambientOscillator.type = "sine"; ambientOscillator.frequency.value = 68;
  const droneGain = ctx.createGain(); droneGain.gain.value = 0.24;
  ambientOscillator.connect(droneGain); droneGain.connect(lowpass); ambientOscillator.start();
  windOscillator = ctx.createOscillator(); windOscillator.type = "triangle"; windOscillator.frequency.value = 0.13;
  const windDepth = ctx.createGain(); windDepth.gain.value = 35;
  const windFilter = ctx.createBiquadFilter(); windFilter.type = "lowpass"; windFilter.frequency.value = 260;
  windOscillator.connect(windDepth); windDepth.connect(windFilter.frequency); windFilter.connect(master); windOscillator.start();
  audioEnabled = true;
  updateAudioUi();
}
function stopAmbientAudio(): void {
  audioEnabled = false;
  if (audioContext && ambientGain) ambientGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.18);
  updateAudioUi();
}
function playDiscoveryChime(): void {
  if (!audioEnabled || !audioContext || audioContext.state !== "running") return;
  const now = audioContext.currentTime;
  if (now - lastDiscoveryChime < 0.7) return;
  lastDiscoveryChime = now;
  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const oscillator = audioContext!.createOscillator();
    const gain = audioContext!.createGain();
    oscillator.type = "sine";
    const start = now + index * 0.08;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.1, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
    oscillator.connect(gain); gain.connect(audioContext!.destination);
    oscillator.start(start); oscillator.stop(start + 0.45);
  });
}
function updateAmbientForPhase(night: number): void {
  if (!audioEnabled || !audioContext || !ambientOscillator) return;
  ambientOscillator.frequency.setTargetAtTime(62 + night * 22, audioContext.currentTime, 1.2);
}
audioToggle.addEventListener("click", () => {
  if (audioEnabled) stopAmbientAudio();
  else startAmbientAudio();
});

const groundGeometry = new THREE.PlaneGeometry(1800, 1800, 90, 90);
groundGeometry.rotateX(-Math.PI / 2);
function terrainHeight(x: number, z: number): number {
  const rolling = Math.sin(x * 0.012) * 2.8 + Math.cos(z * 0.014) * 2.4;
  const ridges = Math.sin((x + z) * 0.021) * 1.6;
  const ridgeMask = Math.max(0, Math.min(1, (x - 45) / 110));
  const hills = Math.sin(x * 0.028) * Math.cos(z * 0.024) * 3.2 * ridgeMask;
  const basin = -Math.exp(-((x + 100) ** 2 + (z + 105) ** 2) / 7800) * 2.4;
  return rolling + ridges + hills + basin;
}
const positions = groundGeometry.attributes.position;
for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i), z = positions.getZ(i);
  positions.setY(i, terrainHeight(x, z));
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

// Proceduralne biomy 3D — geometria generowana lokalnie w Three.js.
const biomeRoot = new THREE.Group();
const pineMat = new THREE.MeshStandardMaterial({ color: "#245b50", roughness: 0.96 });
const trunkMat = new THREE.MeshStandardMaterial({ color: "#72513a", roughness: 1 });
const rockMat = new THREE.MeshStandardMaterial({ color: "#77858c", roughness: 0.88 });
const crystalBiomeMat = new THREE.MeshStandardMaterial({ color: "#74dce9", emissive: "#1d8096", emissiveIntensity: 0.7, roughness: 0.24, metalness: 0.16 });
function addBiomePatch(name: string, x: number, z: number, rx: number, rz: number, color: string): void {
 const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({color,roughness:1,transparent:true,opacity:0.36,side:THREE.DoubleSide}));
 mesh.name=name; mesh.rotation.x=-Math.PI/2; mesh.position.set(x,0.12,z); mesh.scale.set(rx,rz,1); mesh.receiveShadow=true; biomeRoot.add(mesh);
}
function addBiomeRock(x:number,z:number,size:number,seed:number):void{
 const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(size,1),rockMat);
 rock.position.set(x,size*0.55,z); rock.scale.set(1+(seed%3)*0.13,0.65+(seed%4)*0.08,0.85+(seed%2)*0.2);
 rock.rotation.set(seed*0.13,seed*0.7,seed*0.09); rock.castShadow=true; rock.receiveShadow=true; biomeRoot.add(rock);
}
function addPine(x:number,z:number,scale:number,seed:number):void{
 const group=new THREE.Group();
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.22*scale,0.42*scale,4.8*scale,7),trunkMat);
 trunk.position.y=2.4*scale; trunk.castShadow=true; group.add(trunk);
 for(let tier=0;tier<3;tier++){
  const crown=new THREE.Mesh(new THREE.ConeGeometry((2.5-tier*0.45)*scale,3.2*scale,7),pineMat);
  crown.position.y=(4.1+tier*1.65)*scale; crown.rotation.y=seed*0.23+tier; crown.castShadow=true; group.add(crown);
 }
 group.position.set(x,0,z); group.rotation.y=seed*0.31; biomeRoot.add(group);
}
function addCrystalCluster(x:number,z:number,scale:number,seed:number):void{
 const group=new THREE.Group();
 for(let n=0;n<3;n++){
  const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(scale*(0.55+n*0.16),1),crystalBiomeMat);
  crystal.position.set((n-1)*scale*0.9,scale*(0.55+n*0.1),(seed%3-1)*scale*0.35);
  crystal.rotation.set(0.1*n,seed+n,0.14*(n-1)); crystal.scale.y=1.5+n*0.18; crystal.castShadow=true; group.add(crystal);
 }
 group.position.set(x,0,z); biomeRoot.add(group);
}
function biomeRandom(seed:number):number{const value=Math.sin(seed*127.1+311.7)*43758.5453;return value-Math.floor(value);}
addBiomePatch("Dżungla pod kopułą",-140,30,110,125,"#1c6d4d");
addBiomePatch("Kamienisty grzbiet",145,70,100,115,"#87969c");
addBiomePatch("Piaszczysty brzeg",-105,-105,125,86,"#c3b477");
addBiomePatch("Ruiny Cytadeli",0,-52,72,65,"#697b80");
addBiomePatch("Polana Kryształów",0,-8,49,42,"#397f8d");
let biomeSeed=1;
for(let i=0;i<64;i++){const seed=biomeSeed++;addPine(-205+biomeRandom(seed)*130,-30+biomeRandom(seed+90)*155,0.85+biomeRandom(seed+180)*0.95,seed);}
for(let i=0;i<52;i++){const seed=biomeSeed++;addBiomeRock(92+biomeRandom(seed)*125,8+biomeRandom(seed+90)*140,1.8+biomeRandom(seed+180)*4.5,seed);}
for(let i=0;i<34;i++){const seed=biomeSeed++;const angle=biomeRandom(seed)*Math.PI*2;const radius=48+biomeRandom(seed+90)*82;addCrystalCluster(Math.cos(angle)*radius,-8+Math.sin(angle)*radius*0.75,1.2+biomeRandom(seed+180)*2.1,seed);}
scene.add(biomeRoot);

// Łagodne ścieżki łączące najważniejsze obszary doliny.
const pathMaterial = new THREE.MeshStandardMaterial({ color: "#9aab8d", roughness: 1, transparent: true, opacity: 0.54 });
function addTrail(points: THREE.Vector3[], radius: number): void {
  const grounded = points.map((point) => new THREE.Vector3(point.x, terrainHeight(point.x, point.z) + 0.16, point.z));
  const curve = new THREE.CatmullRomCurve3(grounded);
  const trail = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, radius, 5, false), pathMaterial);
  trail.name = "Naturalna ścieżka"; trail.receiveShadow = true; scene.add(trail);
}
addTrail([new THREE.Vector3(0,0,12),new THREE.Vector3(-18,0,0),new THREE.Vector3(-32,0,-22),new THREE.Vector3(-15,0,-42),new THREE.Vector3(0,0,-52)],1.5);
addTrail([new THREE.Vector3(0,0,12),new THREE.Vector3(25,0,20),new THREE.Vector3(32,0,30)],1.25);
addTrail([new THREE.Vector3(-22,0,6),new THREE.Vector3(-52,0,-15),new THREE.Vector3(-76,0,-56),new THREE.Vector3(-95,0,-105)],1.8);

// Instanced low-poly flowers reduce draw calls.
const flowerStemMaterial = new THREE.MeshStandardMaterial({ color: "#7ba66a", roughness: 1 });
const flowerHeadMaterial = new THREE.MeshStandardMaterial({ color: "#c5eaff", emissive: "#327f9c", emissiveIntensity: 0.18, roughness: 0.72 });
const flowerStemGeometry = new THREE.CylinderGeometry(0.035, 0.05, 0.48, 5);
const flowerHeadGeometry = new THREE.IcosahedronGeometry(0.16, 0);
const flowerCount = 180;
const flowerStems = new THREE.InstancedMesh(flowerStemGeometry, flowerStemMaterial, flowerCount);
const flowerHeads = new THREE.InstancedMesh(flowerHeadGeometry, flowerHeadMaterial, flowerCount);
const flowerDummy = new THREE.Object3D();
for (let i = 0; i < flowerCount; i++) {
  const x = -95 + biomeRandom(i + 701) * 180;
  const z = -5 + biomeRandom(i + 901) * 120;
  const y = terrainHeight(x, z);
  const scale = 0.65 + biomeRandom(i + 1101) * 0.9;
  flowerDummy.position.set(x, y + 0.24 * scale, z); flowerDummy.scale.setScalar(scale);
  flowerDummy.rotation.y = biomeRandom(i + 1301) * Math.PI * 2; flowerDummy.updateMatrix(); flowerStems.setMatrixAt(i, flowerDummy.matrix);
  flowerDummy.position.y = y + 0.52 * scale; flowerDummy.scale.setScalar(scale * 0.9); flowerDummy.updateMatrix(); flowerHeads.setMatrixAt(i, flowerDummy.matrix);
}
flowerStems.instanceMatrix.needsUpdate = true; flowerHeads.instanceMatrix.needsUpdate = true;
scene.add(flowerStems, flowerHeads);

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

// Gęstsza dżungla z wariacją rozmiaru i kierunku koron.
for(let i=0;i<46;i++){const seed=biomeSeed++;const tree=makeTree(-190+biomeRandom(seed)*110,-28+biomeRandom(seed+91)*118,0.7+biomeRandom(seed+181)*1.3);tree.rotation.y=biomeRandom(seed+271)*Math.PI*2;biomeRoot.add(tree);}

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


type LoreTerminal = { id: string; title: string; text: string; position: THREE.Vector3; group: THREE.Group };
type Relic = { id: string; name: string; lore: string; position: THREE.Vector3; group: THREE.Group };
type EnergyGate = { id: string; name: string; required: string; position: THREE.Vector3; group: THREE.Group; ring: THREE.Mesh; core: THREE.Mesh; unlocked: boolean };
const gateSpecs = [
 {id:"gate-forest",name:"Brama Szmaragdowa",required:"relic-seed",position:new THREE.Vector3(-214,0,-18),color:"#72ffc6"},
 {id:"gate-ridge",name:"Brama Prądów",required:"relic-compass",position:new THREE.Vector3(202,0,-112),color:"#7bbcff"},
 {id:"gate-heart",name:"Brama Rdzenia",required:"relic-heart",position:new THREE.Vector3(92,0,202),color:"#d7a0ff"},
];
const relicSpecs = [
 {id:"relic-seed",name:"Ziarno Biosfery",lore:"Nasiono przechowuje wzór pierwszych roślin, które przystosowały się do życia pod kopułą.",position:new THREE.Vector3(-168,0,-18)},
 {id:"relic-compass",name:"Kompas Prądów",lore:"Kompas reaguje na przepływ energii pod powierzchnią i wskazuje zapomniane węzły.",position:new THREE.Vector3(148,0,-112)},
 {id:"relic-heart",name:"Serce Kryształu",lore:"W minerale zapisano rytm rdzenia kopuły: trzy krótkie impulsy i jeden długi.",position:new THREE.Vector3(92,0,138)},
];
const loreTerminalSpecs = [
  { id: "lore-dome", title: "Dziennik Kopuły · 01", text: "Pierwszy zespół badawczy uruchomił kopułę, by chronić dolinę przed gwałtownymi zmianami klimatu. W archiwum brakuje jednak zapisu o tym, kto zaprojektował jej rdzeń.", position: new THREE.Vector3(-138, 0, 44) },
  { id: "lore-citadel", title: "Zapis Cytadeli · 02", text: "Stare wieże nie były fortecą. Ich układ kierował sygnały pomiędzy węzłami energetycznymi, zanim sieć przestała odpowiadać. Trzy fragmenty danych mogą pomóc odtworzyć połączenie.", position: new THREE.Vector3(0, 0, -52) },
  { id: "lore-lake", title: "Echo Jeziora · 03", text: "Woda wzmacnia słabe impulsy emitowane przez podziemne kryształy. Nocą ich światło układa się w powtarzalny wzór — być może jest to pozostałość dawnego systemu nawigacji.", position: new THREE.Vector3(-95, 0, -105) },
];
const readTerminals = loadStringSet("cortara-read-terminals");
const unlockedGates = loadStringSet("cortara-unlocked-gates");
const collectedRelics = loadStringSet("cortara-collected-relics");
const relics: Relic[] = relicSpecs.map((spec,index)=>{
 const group=new THREE.Group();
 const colors=["#63ffbf","#5f9dff","#d59cff"];
 const core=new THREE.Mesh(index===0?new THREE.IcosahedronGeometry(1.35,1):index===1?new THREE.OctahedronGeometry(1.6,0):new THREE.DodecahedronGeometry(1.45,0),new THREE.MeshStandardMaterial({color:"#c9f8ff",emissive:colors[index],emissiveIntensity:2,metalness:.38,roughness:.16}));
 core.position.y=2.4; group.add(core);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(2.15,.065,7,36),new THREE.MeshBasicMaterial({color:colors[index],transparent:true,opacity:.85}));
 ring.rotation.x=Math.PI/2; ring.position.y=1.5; group.add(ring);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.65,.55,7),stoneMat);base.position.y=.28;group.add(base);
 group.position.set(spec.position.x,terrainHeight(spec.position.x,spec.position.z),spec.position.z);
 group.userData.core=core;group.userData.ring=ring;group.userData.phase=index*1.9;
 group.visible=!collectedRelics.has(spec.id);scene.add(group);
 return {...spec,group};
});
const energyGates: EnergyGate[] = gateSpecs.map((spec,index)=>{
 const group=new THREE.Group();
 const frameMat=new THREE.MeshStandardMaterial({color:"#233d50",metalness:.72,roughness:.28,emissive:spec.color,emissiveIntensity:.22});
 const left=new THREE.Mesh(new THREE.CylinderGeometry(.7,.95,11,8),frameMat);left.position.set(-4.2,5.5,0);left.castShadow=true;group.add(left);
 const right=left.clone();right.position.x=4.2;group.add(right);
 const top=new THREE.Mesh(new THREE.BoxGeometry(9.2,1.15,1.25),frameMat);top.position.set(0,11,0);top.castShadow=true;group.add(top);
 const unlocked=unlockedGates.has(spec.id);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(3.55,.16,10,56),new THREE.MeshStandardMaterial({color:spec.color,emissive:spec.color,emissiveIntensity:unlocked?2.5:.35,metalness:.25,roughness:.2,transparent:true,opacity:unlocked?.9:.45}));
 ring.position.set(0,5.5,.15);group.add(ring);
 const core=new THREE.Mesh(new THREE.PlaneGeometry(6.4,8.7),new THREE.MeshBasicMaterial({color:spec.color,transparent:true,opacity:unlocked?.22:.07,side:THREE.DoubleSide,depthWrite:false}));
 core.position.set(0,5.4,0);group.add(core);
 const baseMesh=new THREE.Mesh(new THREE.CylinderGeometry(4.7,5.2,.7,8),stoneMat);baseMesh.position.y=.35;baseMesh.receiveShadow=true;group.add(baseMesh);
 group.position.set(spec.position.x,terrainHeight(spec.position.x,spec.position.z),spec.position.z);group.userData.phase=index*1.4;scene.add(group);
 return {...spec,group,ring,core,unlocked};
});
let expeditionPoints = 0;
try {
  const storedPoints = Number(localStorage.getItem("cortara-expedition-points") ?? "0");
  expeditionPoints = Number.isFinite(storedPoints) ? Math.max(0, Math.floor(storedPoints)) : 0;
} catch { expeditionPoints = 0; }
const loreTerminals: LoreTerminal[] = loreTerminalSpecs.map((spec, index) => {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.9, 1.1, 8), stoneMat);
  base.position.y = 0.55; base.castShadow = true; base.receiveShadow = true; group.add(base);
  const column = new THREE.Mesh(new THREE.BoxGeometry(1.45, 3.2, 0.75), paleMat);
  column.position.y = 2.55; column.castShadow = true; group.add(column);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.65, 0.18), new THREE.MeshStandardMaterial({ color: "#5ce8ff", emissive: "#19bce8", emissiveIntensity: 1.6, metalness: 0.3, roughness: 0.22 }));
  screen.position.set(0, 3.2, -0.48); group.add(screen);
  const beacon = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.07, 6, 32), new THREE.MeshBasicMaterial({ color: "#7cecff", transparent: true, opacity: 0.8 }));
  beacon.rotation.x = Math.PI / 2; beacon.position.y = 0.16; group.add(beacon);
  group.position.copy(spec.position); group.position.y = terrainHeight(spec.position.x, spec.position.z); group.userData.screen = screen; group.userData.beacon = beacon; group.userData.phase = index * 1.7;
  scene.add(group);
  return { ...spec, group };
});

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
let journalOpen = false;
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

type JournalEntry = { text: string; time: string };
const journalStorageKey = "cortara-expedition-journal";
function loadJournalEntries(): JournalEntry[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(journalStorageKey) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((entry): entry is JournalEntry => !!entry && typeof entry.text === "string" && typeof entry.time === "string").slice(0, 12);
  } catch { return []; }
}
let journalLog = loadJournalEntries();
function recordJournal(text: string): void {
  const entry = { text, time: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) };
  if (journalLog[0]?.text === text) return;
  journalLog = [entry, ...journalLog].slice(0, 12);
  localStorage.setItem(journalStorageKey, JSON.stringify(journalLog));
  renderJournal();
}
function renderJournal(): void {
  const found = dataFragments.filter((fragment) => fragment.collected).length;
  const discovered = worldLocations.filter((location) => location.discovered).length;
  const quests = [
    { title: "Archiwista", detail: "Zbierz trzy fragmenty danych", count: found, total: dataFragments.length, done: found === dataFragments.length },
    { title: "Kartograf", detail: "Odkryj 5 lokacji", count: Math.min(discovered, 5), total: 5, done: discovered >= 5 },
    { title: "Przywrócenie sieci", detail: "Aktywuj przekaźnik w Dolinie", count: relayActivated ? 1 : 0, total: 1, done: relayActivated },
    { title: "Kolekcjoner reliktów", detail: "Odnajdź trzy starożytne artefakty", count: relics.filter((relic)=>collectedRelics.has(relic.id)).length, total: 3, done: relics.every((relic)=>collectedRelics.has(relic.id)) },
    { title: "Strażnik przejść", detail: "Odblokuj trzy bramy energetyczne", count: energyGates.filter((gate)=>gate.unlocked).length, total: 3, done: energyGates.every((gate)=>gate.unlocked) },
  ];
  journalSummary.textContent = "ZADANIA: " + quests.filter((quest) => quest.done).length + "/" + quests.length + " UKOŃCZONE";
  expeditionPointsEl.textContent = expeditionPoints + " PKT";
  const relicCountEl = document.querySelector<HTMLElement>("#relic-count");
  if (relicCountEl) relicCountEl.textContent = relics.filter((relic)=>collectedRelics.has(relic.id)).length + "/3 ZEBRANE";
  const gatesCountEl = document.querySelector<HTMLElement>("#gates-count");
  if (gatesCountEl) gatesCountEl.textContent = energyGates.filter((gate)=>gate.unlocked).length + "/3 OTWARTE";
  journalQuests.replaceChildren();
  quests.forEach((quest) => {
    const item = document.createElement("div"); item.className = "journal-quest" + (quest.done ? " complete" : "");
    const title = document.createElement("strong"); title.textContent = (quest.done ? "✓ " : "◇ ") + quest.title;
    const detail = document.createElement("small"); detail.textContent = quest.detail;
    const progress = document.createElement("div"); progress.className = "journal-progress";
    const fill = document.createElement("span"); fill.style.width = String(Math.round(quest.count / quest.total * 100)) + "%"; progress.append(fill);
    const count = document.createElement("small"); count.className = "journal-count"; count.textContent = quest.count + "/" + quest.total;
    item.append(title, detail, progress, count); journalQuests.append(item);
  });
  journalEntries.replaceChildren();
  if (journalLog.length === 0) {
    const empty = document.createElement("li"); empty.className = "journal-empty"; empty.textContent = "Brak wpisów. Eksploruj świat, zbieraj fragmenty i odkrywaj nowe miejsca."; journalEntries.append(empty);
  } else {
    journalLog.forEach((entry) => {
      const item = document.createElement("li");
      const time = document.createElement("time"); time.textContent = entry.time;
      const detail = document.createElement("span"); detail.textContent = entry.text;
      item.append(time, detail); journalEntries.append(item);
    });
  }
}
function setJournalOpen(open: boolean): void {
  journalOpen = open;
  journalPanel.hidden = !open;
  journalToggle.setAttribute("aria-expanded", String(open));
  journalToggle.textContent = open ? "ZAMKNIJ DZIENNIK [J]" : "DZIENNIK [J]";
  if (open) renderJournal();
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
      recordJournal("Odkryto: " + location.name);
      playDiscoveryChime();
    }
  }
  if (changed) {
    localStorage.setItem("cortara-discovered-locations", JSON.stringify([...knownLocations]));
    refreshMapList();
    renderMap();
    renderJournal();
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
  const nearestGate=energyGates.map((gate)=>({gate,distance:Math.hypot(player.position.x-gate.position.x,player.position.z-gate.position.z)})).filter((item)=>item.distance<13).sort((a,b)=>a.distance-b.distance)[0];
  if(nearestGate){
    const gate=nearestGate.gate;
    if(!gate.unlocked){
      if(!collectedRelics.has(gate.required)){
        const needed=relicSpecs.find((item)=>item.id===gate.required);
        messageEl.textContent=gate.name+": wymagany artefakt — "+(needed?.name??"nieznany relikt")+".";
        showToast("Brama zamknięta · znajdź wymagany artefakt");return;
      }
      gate.unlocked=true;unlockedGates.add(gate.id);localStorage.setItem("cortara-unlocked-gates",JSON.stringify([...unlockedGates]));
      (gate.ring.material as THREE.MeshStandardMaterial).opacity=.9;
      (gate.ring.material as THREE.MeshStandardMaterial).emissiveIntensity=2.5;
      (gate.core.material as THREE.MeshBasicMaterial).opacity=.22;
      expeditionPoints+=75;localStorage.setItem("cortara-expedition-points",String(expeditionPoints));
      recordJournal("Odblokowano bramę: "+gate.name+" (+75 pkt)");renderJournal();playDiscoveryChime();
      messageEl.textContent=gate.name+" została aktywowana. Przejście energetyczne jest otwarte.";
      showToast("Brama energetyczna odblokowana · +75 pkt");return;
    }
    messageEl.textContent=gate.name+" jest aktywna. Przejście do kolejnego regionu jest odblokowane.";
    showToast("Brama otwarta · nowy obszar dostępny");return;
  }
  const relic = relics.filter((entry)=>!collectedRelics.has(entry.id))
    .map((entry)=>({entry,distance:Math.hypot(player.position.x-entry.position.x,player.position.z-entry.position.z)}))
    .filter((item)=>item.distance<11).sort((a,b)=>a.distance-b.distance)[0];
  if(relic){
    collectedRelics.add(relic.entry.id);
    localStorage.setItem("cortara-collected-relics",JSON.stringify([...collectedRelics]));
    relic.entry.group.visible=false; expeditionPoints+=50;
    localStorage.setItem("cortara-expedition-points",String(expeditionPoints));
    messageEl.textContent=relic.entry.name+": "+relic.entry.lore;
    recordJournal("Odnaleziono artefakt: "+relic.entry.name+" (+50 pkt)");
    renderJournal();playDiscoveryChime();showToast("Relikt zabezpieczony · +50 punktów ekspedycji");return;
  }
  const terminal = loreTerminals
    .filter((entry) => !readTerminals.has(entry.id))
    .map((entry) => ({ entry, distance: Math.hypot(player.position.x - entry.position.x, player.position.z - entry.position.z) }))
    .filter((item) => item.distance < 12)
    .sort((a, b) => a.distance - b.distance)[0];
  if (terminal) {
    readTerminals.add(terminal.entry.id);
    localStorage.setItem("cortara-read-terminals", JSON.stringify([...readTerminals]));
    expeditionPoints += 25;
    localStorage.setItem("cortara-expedition-points", String(expeditionPoints));
    messageEl.textContent = terminal.entry.title + ": " + terminal.entry.text;
    recordJournal("Odczytano terminal: " + terminal.entry.title + " (+25 pkt)");
    renderJournal();
    showToast("Zapis odzyskany · +25 punktów ekspedycji");
    return;
  }
  const nearby = dataFragments.filter((fragment) => !fragment.collected)
    .sort((a, b) => player.position.distanceTo(a.position) - player.position.distanceTo(b.position))[0];
  if (nearby && player.position.distanceTo(nearby.position) < 10) {
    nearby.collected = true; nearby.group.visible = false; savedFragments.add(nearby.id);
    localStorage.setItem("cortara-data-fragments", JSON.stringify([...savedFragments]));
    updateMission(); recordJournal("Zebrano fragment: " + nearby.label); renderJournal(); showToast(`Zebrano: ${nearby.label}`); return;
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
  recordJournal("Aktywowano przekaźnik — sieć przywrócona.");
  renderJournal();
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
  recordJournal("Misja główna została zresetowana.");
  renderJournal();
}
updateMission();
updateLocationDiscovery();
refreshMapList();
renderJournal();
talkButton.addEventListener("click", talk);
voiceButton.addEventListener("click", speakCurrentMessage);
mapToggle.addEventListener("click", () => setMapOpen(!mapOpen));
mapClose.addEventListener("click", () => setMapOpen(false));
journalToggle.addEventListener("click", () => setJournalOpen(!journalOpen));
journalClose.addEventListener("click", () => setJournalOpen(false));
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
    if (mapOpen) setJournalOpen(false);
    return;
  }
  if (key === "j" && !event.repeat) {
    event.preventDefault();
    setJournalOpen(!journalOpen);
    if (journalOpen) setMapOpen(false);
    return;
  }
  if (key === "escape" && (mapOpen || journalOpen)) {
    setMapOpen(false);
    setJournalOpen(false);
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
  updateDayNight(delta);
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
  player.position.y = terrainHeight(player.position.x, player.position.z);
  suit.position.y = 1.2 + (input.lengthSq() > 0 ? Math.sin(performance.now() * 0.012) * 0.05 : 0);
  relayOrb.rotation.y += delta * 0.62; relayOrb.rotation.x += delta * 0.18; relayRing.rotation.z += delta * 0.42;
  energyGates.forEach((gate,index)=>{
    const phase=Number(gate.group.userData.phase??index);
    gate.ring.rotation.y=Math.sin(elapsed*.45+phase)*.06;
    gate.ring.rotation.z=Math.sin(elapsed*.6+phase)*.035;
    const material=gate.ring.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity=gate.unlocked?2.1+Math.sin(elapsed*2+phase)*.55:.28+Math.sin(elapsed*1.4+phase)*.12;
    (gate.core.material as THREE.MeshBasicMaterial).opacity=gate.unlocked?.2+Math.sin(elapsed*1.5+phase)*.035:.045+Math.sin(elapsed*1.1+phase)*.018;
  });
  relics.forEach((relic,index)=>{
    if(collectedRelics.has(relic.id))return;
    const core=relic.group.userData.core as THREE.Mesh;
    const ring=relic.group.userData.ring as THREE.Mesh;
    const phase=Number(relic.group.userData.phase??index);
    core.rotation.y+=delta*(.35+index*.12);
    core.position.y=2.4+Math.sin(elapsed*1.6+phase)*.28;
    ring.rotation.z+=delta*(.38+index*.08);
    (core.material as THREE.MeshStandardMaterial).emissiveIntensity=1.65+Math.sin(elapsed*2.1+phase)*.55;
  });
  loreTerminals.forEach((terminal, index) => {
    const screen = terminal.group.userData.screen as THREE.Mesh;
    const beacon = terminal.group.userData.beacon as THREE.Mesh;
    screen.rotation.y = Math.sin(elapsed * 0.8 + index) * 0.04;
    screen.scale.setScalar(readTerminals.has(terminal.id) ? 0.88 : 1 + Math.sin(elapsed * 2 + index) * 0.035);
    beacon.rotation.z += delta * 0.35;
    (screen.material as THREE.MeshStandardMaterial).emissiveIntensity = readTerminals.has(terminal.id) ? 0.25 : 1.4 + Math.sin(elapsed * 2 + index) * 0.45;
  });
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
