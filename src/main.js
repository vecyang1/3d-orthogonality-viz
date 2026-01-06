import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { gsap } from 'gsap';
import './style.css';

// --- Configuration ---
const CONFIG = {
  f1: 2.0,
  f2: 3.0,
  speed: 0.5,
  points: 1200,
  length: 12,
  isAudioOn: false
};

// --- Three.js Essentials ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080a0f);
scene.fog = new THREE.Fog(0x080a0f, 5, 25);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 6, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('app').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- Lights ---
const mainLight = new THREE.PointLight(0x60efff, 2, 50);
mainLight.position.set(5, 5, 5);
scene.add(mainLight, new THREE.AmbientLight(0xffffff, 0.2));

// --- Grid ---
const gridHelper = new THREE.GridHelper(30, 30, 0x1f262f, 0x11161d);
gridHelper.position.y = -2;
scene.add(gridHelper);

// Planes (Subtle visualization of the orthogonal spaces)
const planeGeom = new THREE.PlaneGeometry(15, 15);
const planeMat = new THREE.MeshBasicMaterial({ color: 0x11161d, transparent: true, opacity: 0.3, side: THREE.DoubleSide });

const xzPlane = new THREE.Mesh(planeGeom, planeMat);
xzPlane.rotation.x = Math.PI / 2;
scene.add(xzPlane);

// --- Audio System ---
let audioCtx, osc1, osc2, gainNode;

function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

  osc1 = audioCtx.createOscillator();
  osc2 = audioCtx.createOscillator();
  osc1.type = 'sine';
  osc2.type = 'sine';

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc1.start();
  osc2.start();
}

function updateAudioFreqs() {
  if (!audioCtx) return;
  // Map visualization Hz to audible spectrum (e.g. 2Hz -> 220Hz)
  osc1.frequency.setTargetAtTime(CONFIG.f1 * 110, audioCtx.currentTime, 0.1);
  osc2.frequency.setTargetAtTime(CONFIG.f2 * 110, audioCtx.currentTime, 0.1);
}

// --- Geometry Objects ---
const createCurve = (color, width = 2) => {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({ color, linewidth: width, transparent: true, opacity: 0.8 });
  return new THREE.Line(geometry, material);
};

const curveF1 = createCurve(0x60efff, 2); // X-Z (Frequency 1)
const curveF2 = createCurve(0xff60ad, 2); // Y-Z (Frequency 2)
const curveSum = createCurve(0xffffff, 4); // 3D Composite Path

scene.add(curveF1, curveF2, curveSum);

// Animated Dots
const dotGeom = new THREE.SphereGeometry(0.12, 24, 24);
const dotF1 = new THREE.Mesh(dotGeom, new THREE.MeshBasicMaterial({ color: 0x60efff }));
const dotF2 = new THREE.Mesh(dotGeom, new THREE.MeshBasicMaterial({ color: 0xff60ad }));
const dotSum = new THREE.Mesh(dotGeom, new THREE.MeshBasicMaterial({ color: 0xffffff }));

// Connector Lines (Dashed projection lines)
const connectorMat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.2, gapSize: 0.1, transparent: true, opacity: 0.4 });
const connectorGeomX = new THREE.BufferGeometry();
const connectorGeomY = new THREE.BufferGeometry();
const connX = new THREE.Line(connectorGeomX, connectorMat);
const connY = new THREE.Line(connectorGeomY, connectorMat);

scene.add(dotF1, dotF2, dotSum, connX, connY);

// --- Camera & Tutorial Targets ---
const TARGETS = {
  '3d': { p: [8, 6, 10], t: [0, 0, 0], title: "Vector Mastery", desc: "这是波在时间轴上前进的原始路径。白色波形是两个独立分量的矢量叠加。" },
  'top': { p: [0.1, 12, 0], t: [0, 0, 0], title: "Spectral Topography", desc: "从上方俯瞰，你可以看清两个频率如何占据完全独立的物理维度。" },
  'f1': { p: [0, 0, 12], t: [0, 0, 0], title: "F1 信号提取", desc: "锁定 X-Z 平面。此时 Y 轴的扰动完全消失，你得到了纯净的 Channel 1。" },
  'f2': { p: [12, 0, 0], t: [0, 0, 0], title: "F2 信号提取", desc: "锁定 Y-Z 平面。同理，X 轴的分量被物理性过滤。" },
  'xy': { p: [0, 0, 5], t: [0, 0, -1], title: "相依模式 (Lissajous)", desc: "剥离时间轴。正交频率在长周期内会均匀扫过整个空间，互不相关。" },
  'iso': { p: [7, 7, 7], t: [0, 0, 0], title: "Isometric Balance", desc: "完美的等轴侧视角，观察 3D 母体与其投影分身的同步共振。" }
};

function transitionCamera(id) {
  const cam = TARGETS[id];

  gsap.to(camera.position, {
    x: cam.p[0], y: cam.p[1], z: cam.p[2],
    duration: 1.5,
    ease: "power2.inOut"
  });

  gsap.to(controls.target, {
    x: cam.t[0], y: cam.t[1], z: cam.t[2],
    duration: 1.5,
    ease: "power2.inOut"
  });

  // UI Updates
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`view-${id}`)?.classList.add('active');

  const tutTitle = document.getElementById('tut-title');
  const tutText = document.getElementById('tut-text');
  gsap.fromTo([tutTitle, tutText], { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.1 });
  tutTitle.innerText = cam.title;
  tutText.innerText = cam.desc;
}

// --- Geometry Generation ---
function updateGeometry() {
  const p1 = [], p2 = [], pSum = [];
  let integral = 0;
  const dt = CONFIG.length / CONFIG.points;

  for (let i = 0; i < CONFIG.points; i++) {
    const t = (i / CONFIG.points) * CONFIG.length;
    const z = t - CONFIG.length / 2;

    const x = Math.sin(2 * Math.PI * CONFIG.f1 * (t / CONFIG.length));
    const y = Math.sin(2 * Math.PI * CONFIG.f2 * (t / CONFIG.length));

    p1.push(x, 0, z);
    p2.push(0, y, z);
    pSum.push(x, y, z);

    integral += x * y * dt;
  }

  curveF1.geometry.setAttribute('position', new THREE.Float32BufferAttribute(p1, 3));
  curveF2.geometry.setAttribute('position', new THREE.Float32BufferAttribute(p2, 3));
  curveSum.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pSum, 3));

  // Compute Live Statistics
  const corr = (integral / (CONFIG.length / 2)).toFixed(3);
  document.getElementById('stat-corr').innerText = corr;
  document.getElementById('stat-ortho').innerText = `${(100 - Math.abs(corr) * 100).toFixed(1)}%`;
}

// --- Main Animation Loop ---
let progress = 0;
let lastTime = 0;

function animate(time) {
  const deltaTime = time - lastTime;
  lastTime = time;

  requestAnimationFrame(animate);
  controls.update();

  // Moving progress based on speed
  progress += (deltaTime * 0.001 * CONFIG.speed);
  const t = progress % 1;
  const realT = t * CONFIG.length;

  const x = Math.sin(2 * Math.PI * CONFIG.f1 * t);
  const y = Math.sin(2 * Math.PI * CONFIG.f2 * t);
  const z = realT - CONFIG.length / 2;

  dotF1.position.set(x, 0, z);
  dotF2.position.set(0, y, z);
  dotSum.position.set(x, y, z);

  // Update Dynamic Projection Connectors
  connectorGeomX.setAttribute('position', new THREE.Float32BufferAttribute([x, y, z, x, 0, z], 3));
  connectorGeomY.setAttribute('position', new THREE.Float32BufferAttribute([x, y, z, 0, y, z], 3));
  connX.computeLineDistances();
  connY.computeLineDistances();

  renderer.render(scene, camera);
}

// --- Event Listeners ---
document.getElementById('f1-range').addEventListener('input', (e) => {
  CONFIG.f1 = parseFloat(e.target.value);
  document.getElementById('f1-val').innerText = `${CONFIG.f1.toFixed(1)} Hz`;
  updateGeometry();
  updateAudioFreqs();
});

document.getElementById('f2-range').addEventListener('input', (e) => {
  CONFIG.f2 = parseFloat(e.target.value);
  document.getElementById('f2-val').innerText = `${CONFIG.f2.toFixed(1)} Hz`;
  updateGeometry();
  updateAudioFreqs();
});

document.getElementById('audio-toggle').addEventListener('click', () => {
  if (!audioCtx) initAudio();

  CONFIG.isAudioOn = !CONFIG.isAudioOn;
  const btn = document.getElementById('audio-toggle');
  const icon = document.getElementById('audio-icon');
  const text = document.getElementById('audio-text');

  if (CONFIG.isAudioOn) {
    audioCtx.resume();
    gainNode.gain.exponentialRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
    btn.classList.add('on');
    icon.innerText = '🔊';
    text.innerText = '音频同步中... (Click to Mute)';
    updateAudioFreqs();
  } else {
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
    btn.classList.remove('on');
    icon.innerText = '🔇';
    text.innerText = '激活音频同步 (Audio On)';
  }
});

// Preset Buttons
['3d', 'top', 'f1', 'f2', 'xy', 'iso'].forEach(id => {
  document.getElementById(`view-${id}`).addEventListener('click', () => transitionCamera(id));
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Initialization ---
updateGeometry();
animate(0);
transitionCamera('3d');
