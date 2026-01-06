import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './style.css';

// --- Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('app').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// --- Helpers ---
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// Grid planes
const gridXZ = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
gridXZ.rotation.x = Math.PI / 2; // Make it Z-X plane but Three uses Y as up
// Wait, in Three.js standard: X=red, Y=green (up), Z=blue
// We want Z to be "Time" (longitudinal)
// X to be f1 amplitude
// Y to be f2 amplitude
// So XZ plane is for f1, YZ plane is for f2
scene.add(gridXZ);

// --- State ---
let f1 = 2;
let f2 = 3;
let opacity = 0.8;
let speed = 0.5;
const pointsCount = 1000;
const length = 10;

// --- Camera Constants ---
const cameraTargets = {
  '3d': {
    pos: new THREE.Vector3(5, 5, 8),
    target: new THREE.Vector3(0, 0, 0),
    title: "自由 3D 探索",
    desc: "这是波在时间轴(Z)上前进的原始路径。白色波形是两个频率的矢量叠加，它反映了信号的真实能量随时间的变化。"
  },
  f1: {
    pos: new THREE.Vector3(0, 0, 10),
    target: new THREE.Vector3(0, 0, 0),
    title: "F1 频率隔离",
    desc: "从正面看去，Y轴方向的振动完全重叠在一条线上（变成0）。你会看到纯粹的频率1波形。这证明了正交基可以完美分离信号。"
  },
  f2: {
    pos: new THREE.Vector3(10, 0, 0),
    target: new THREE.Vector3(0, 0, 0),
    title: "F2 频率隔离",
    desc: "转动相机90度。现在 X轴分量消失。这里只有频率2在跳动。信号隔离的关键在于：不同轴上的分量互不投射。"
  },
  top: {
    pos: new THREE.Vector3(1, 10, 0),
    target: new THREE.Vector3(0, 0, 0),
    title: "俯瞰 (XZ/YZ 分离)",
    desc: "从上方观察，你可以同时看到 XZ 和 YZ 两个投影平面。它们就像书本的两页，互成90度，互不隶属。"
  },
  xy: {
    pos: new THREE.Vector3(0, 0, 0.1), // This is actually front view in our layout (looking toward Z)
    // Wait, with gridXZ rotated, my coordinates are:
    // X=f1, Y=f2, Z=time
    // So looking down Z shows XY-relationship (Lissajous)
    pos: new THREE.Vector3(0, 0, 5),
    target: new THREE.Vector3(0, 0, -1),
    title: "相依模式 (Lissajous)",
    desc: "暂时忽略时间流动。小球在 XY 平面的运动构成利萨茹图形。正交性意味着它们在长周期内均匀覆盖空间，不偏向任何一边。"
  },
  iso: {
    pos: new THREE.Vector3(6, 6, 6),
    target: new THREE.Vector3(0, 0, 0),
    title: "等轴测视图",
    desc: "一种平衡的视角，最适合观察 3D 路径与各个投影平面之间的对应关系。看！小球始终落在它的分身（投影点）之上。"
  }
};

let currentTarget = cameraTargets['3d'];

function setCameraView(viewId) {
  currentTarget = cameraTargets[viewId];

  // UI Update
  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
  const btn = document.getElementById(`view-${viewId}`);
  if (btn) btn.classList.add('active');

  // Update Tutorial text with animation
  const titleEl = document.getElementById('tut-title');
  const textEl = document.getElementById('tut-text');

  titleEl.style.opacity = 0;
  textEl.style.opacity = 0;

  setTimeout(() => {
    titleEl.innerText = currentTarget.title;
    textEl.innerText = currentTarget.desc;
    titleEl.style.opacity = 1;
    textEl.style.opacity = 1;
  }, 200);
}

// --- Objects ---
function createLine(color) {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({ color, linewidth: 2, transparent: true, opacity: 1 });
  return new THREE.Line(geometry, material);
}

const lineX = createLine(0x60efff); // Projection on X-Z
const lineY = createLine(0xff60ad); // Projection on Y-Z
const lineSum = createLine(0xffffff); // 3D Path
lineSum.material.linewidth = 3;

scene.add(lineX, lineY, lineSum);

// Current point indicators
const sphereGeom = new THREE.SphereGeometry(0.1, 16, 16);
const dotX = new THREE.Mesh(sphereGeom, new THREE.MeshBasicMaterial({ color: 0x60efff }));
const dotY = new THREE.Mesh(sphereGeom, new THREE.MeshBasicMaterial({ color: 0xff60ad }));
const dotSum = new THREE.Mesh(sphereGeom, new THREE.MeshBasicMaterial({ color: 0xffffff }));
scene.add(dotX, dotY, dotSum);

// --- Update Function ---
function updateCurves() {
  const positionsX = [];
  const positionsY = [];
  const positionsSum = [];

  let integral = 0;
  const dt = length / pointsCount;

  for (let i = 0; i < pointsCount; i++) {
    const t = (i / pointsCount) * length - length / 2;
    const st = (i / pointsCount) * length;

    const xVal = Math.sin(2 * Math.PI * f1 * (st / length));
    const yVal = Math.sin(2 * Math.PI * f2 * (st / length));
    const zVal = st - length / 2;

    positionsX.push(xVal, 0, zVal);
    positionsY.push(0, yVal, zVal);
    positionsSum.push(xVal, yVal, zVal);

    integral += xVal * yVal * dt;
  }

  lineX.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionsX, 3));
  lineY.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionsY, 3));
  lineSum.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionsSum, 3));

  lineSum.material.opacity = opacity;

  document.getElementById('ortho-check').innerHTML = `
    ∫ sin(${f1}Hz) · sin(${f2}Hz) dt ≈ ${integral.toFixed(3)}
    <br>
    ${Math.abs(integral) < 0.1 ? "✅ 正交：它们互不干涉" : "❌ 不完全正交"}
  `;
}

// --- Interaction ---
document.getElementById('f1-range').addEventListener('input', (e) => {
  f1 = parseFloat(e.target.value);
  document.getElementById('f1-val').innerText = `${f1} Hz`;
  updateCurves();
});

document.getElementById('f2-range').addEventListener('input', (e) => {
  f2 = parseFloat(e.target.value);
  document.getElementById('f2-val').innerText = `${f2} Hz`;
  updateCurves();
});

document.getElementById('speed-range').addEventListener('input', (e) => {
  speed = parseFloat(e.target.value);
  document.getElementById('speed-val').innerText = `${speed.toFixed(1)}x`;
});

document.getElementById('opacity-range').addEventListener('input', (e) => {
  opacity = parseFloat(e.target.value);
  updateCurves();
});

document.getElementById('view-3d').addEventListener('click', () => setCameraView('3d'));
document.getElementById('view-f1').addEventListener('click', () => setCameraView('f1'));
document.getElementById('view-f2').addEventListener('click', () => setCameraView('f2'));
document.getElementById('view-top').addEventListener('click', () => setCameraView('top'));
document.getElementById('view-xy').addEventListener('click', () => setCameraView('xy'));
document.getElementById('view-iso').addEventListener('click', () => setCameraView('iso'));

// --- Animation Loop ---
let lastTime = 0;
let progress = 0;

function animate(time) {
  requestAnimationFrame(animate);
  const deltaTime = time - lastTime;
  lastTime = time;

  controls.update();

  // Smooth camera transition
  if (currentTarget) {
    camera.position.lerp(currentTarget.pos, 0.05);
    controls.target.lerp(currentTarget.target, 0.05);
  }

  // Progress logic based on speed
  progress += (deltaTime * 0.001 * speed);
  const t = progress % 1;
  const st = t * length;

  const xVal = Math.sin(2 * Math.PI * f1 * (st / length));
  const yVal = Math.sin(2 * Math.PI * f2 * (st / length));
  const zVal = st - length / 2;

  dotX.position.set(xVal, 0, zVal);
  dotY.position.set(0, yVal, zVal);
  dotSum.position.set(xVal, yVal, zVal);

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initial run
updateCurves();
setCameraView('3d');
animate(0);
