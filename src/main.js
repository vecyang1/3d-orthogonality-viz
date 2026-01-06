import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { gsap } from 'gsap';
import './style.css';

// --- Configuration ---
const CONFIG = {
  f1: 2.0,
  f2: 3.0,
  phase: 0, // In degrees
  speed: 0.5,
  points: 1200,
  length: 12,
  isAudioOn: false
};

// --- Three.js Essentials ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080a0f);
scene.fog = new THREE.Fog(0x080a0f, 10, 2000); // Massive increase to accommodate telephoto

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
  '3d': {
    p: [8, 6, 10], t: [0, 0, 0],
    title: "什么是正交 (Orthogonality)?",
    desc: "正交意味着独立。如果你从 X 轴看过去，$f_2$ 的运动投影始终为 0。这意味着它们互不干涉。"
  },
  'top': {
    p: [0.1, 15, 0], t: [0, 0, 0],
    title: "独立维度",
    desc: "看这两个平面：它们成 90° 夹角。正交函数就像物理上的 X 轴和 Y 轴，拥有完全独立的自由度。"
  },
  'xy': {
    p: [0, 0, 5], t: [0, 0, -1],
    title: "相关性 = 重叠度",
    desc: "看 XY 平面：\n1. 直线 = 不正交 (信息完全重复)\n2. 圆形/方框 = 正交 (信号独立)\n不正交意味着波形在逻辑上合二为一了。"
  },
  'f1': { p: [0, 0, 12], t: [0, 0, 0], title: "频道 1 (XZ Plane)", desc: "在这个维度下，$f_2$ 无论多强都不可见。这就是通信中『频分复用』的物理基础。" },
  'f2': { p: [12, 0, 0], t: [0, 0, 0], title: "频道 2 (YZ Plane)", desc: "同样的，在这个频道里，$f_1$ 被完全物理性过滤了。" },
  'iso': { p: [7, 7, 7], t: [0, 0, 0], title: "3D 视角", desc: "请尝试调节频率和相位，观察白色路径在什么时候会塌陷成一条扁平的直线。" }
};

function transitionCamera(id) {
  const cam = TARGETS[id];
  const isIsoView = (id === 'f1' || id === 'f2');

  // FOV 1.5 is like a super-telescope: zero perspective, clean isolation
  gsap.to(camera, {
    fov: isIsoView ? 1.5 : 60,
    duration: 1.5,
    onUpdate: () => camera.updateProjectionMatrix()
  });

  // DistMult 25 is enough for a clean telephoto effect without being too far
  const distMult = isIsoView ? 25 : 1;

  gsap.to(camera.position, {
    x: cam.p[0] * distMult,
    y: cam.p[1] * distMult,
    z: cam.p[2] * distMult,
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
  let power1 = 0;
  let power2 = 0;
  const dt = CONFIG.length / CONFIG.points;
  const phiRad = (CONFIG.phase * Math.PI) / 180;

  for (let i = 0; i < CONFIG.points; i++) {
    const tRelative = i / CONFIG.points;
    const t = tRelative * CONFIG.length;
    const z = t - CONFIG.length / 2;

    const x = Math.sin(2 * Math.PI * CONFIG.f1 * tRelative);
    const y = Math.sin(2 * Math.PI * CONFIG.f2 * tRelative + phiRad);

    p1.push(x, 0, z);
    p2.push(0, y, z);
    pSum.push(x, y, z);

    integral += x * y * dt;
    power1 += x * x * dt;
    power2 += y * y * dt;
  }

  curveF1.geometry.setAttribute('position', new THREE.Float32BufferAttribute(p1, 3));
  curveF2.geometry.setAttribute('position', new THREE.Float32BufferAttribute(p2, 3));
  curveSum.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pSum, 3));

  const norm = Math.sqrt(power1 * power2);
  const corr = (norm > 0) ? (integral / norm).toFixed(3) : "0.000";
  const absCorr = Math.abs(parseFloat(corr));

  document.getElementById('stat-corr').innerText = corr;
  const orthoScore = (100 - absCorr * 100).toFixed(1);
  document.getElementById('stat-ortho').innerText = `${orthoScore}%`;

  // --- Advanced State Machine for Tutorial Text ---
  const tutTitle = document.getElementById('tut-title');
  const tutText = document.getElementById('tut-text');
  const box = document.querySelector('.tutorial-container');

  const activeBtn = document.querySelector('.preset-btn.active');
  const activeId = activeBtn ? activeBtn.id.replace('view-', '') : '3d';
  const isIsoView = (activeId === 'f1' || activeId === 'f2');

  // Helper styles
  const setStyle = (status) => {
    if (!box) return;
    if (status === 'critical') {
      box.style.borderLeftColor = '#ff60ad';
      box.style.background = 'rgba(255, 96, 173, 0.15)';
      curveSum.material.color.setHex(0xff60ad);
    } else if (status === 'magic') {
      box.style.borderLeftColor = '#ffd700'; // Gold for IQ magic
      box.style.background = 'rgba(255, 215, 0, 0.1)';
      curveSum.material.color.setHex(0xffffff);
    } else {
      box.style.borderLeftColor = '#60efff';
      box.style.background = 'rgba(255, 255, 255, 0.05)';
      curveSum.material.color.setHex(0xffffff);
    }
  };

  // Logic Tree
  if (absCorr > 0.9) {
    // SCENARIO 1: COLLISION (Unusable)
    setStyle('critical');
    if (isIsoView) {
      tutTitle.innerText = "🚨 视觉欺骗 (Visual Illusion)";
      tutText.innerText = "切勿当真！虽然你在这里只看到一条波形，那是因为我们作弊式地把它们分在不同轴上。在现实电路中，这两个重叠的信号早已『血肉相连』，无法物理分离。";
    } else {
      tutTitle.innerText = "🚀 信号重叠 (Collision)";
      tutText.innerText = `维度坍缩！路径变成了一条死板的线。这意味着 $X$ 和 $Y$ 携带了完全冗余的信息。你无法再区分它们，带宽被浪费了。`;
    }
  }
  else if (CONFIG.f1 === CONFIG.f2 && Math.abs(absCorr) < 0.1) {
    // SCENARIO 2: I/Q ORTHOGONALITY (Same Freq, Phase 90/270)
    setStyle('magic');
    tutTitle.innerText = "✨ I/Q 正交 (Quadrature Magic)";
    tutText.innerText = "这就是通信的魔法！虽然频率一模一样，但相位差 90° 让它们像『咬合的齿轮』一样互不干扰。看那个圆（或螺旋），那是它们独立的证明。";
  }
  else {
    // SCENARIO 3: FREQUENCY ORTHOGONALITY / NORMAL
    setStyle('normal');

    // Restore preset-specific text if strictly orthogonal or just exploring
    if (TARGETS[activeId]) {
      // Add specific context for Iso views when mathematically safe
      if (isIsoView && absCorr < 0.1) {
        tutTitle.innerText = activeId === 'f1' ? "✅ 完美频分 (F1 Clean)" : "✅ 完美频分 (F2 Clean)";
        tutText.innerText = "正交性生效。在这个频率下，$f_2$ 的所有能量刚好在一个周期内正负抵消。这里的『过滤』是真实的数学胜利，而不仅仅是视觉隔离。";
      } else {
        tutTitle.innerText = TARGETS[activeId].title;
        tutText.innerText = TARGETS[activeId].desc;
      }
    }
  }
}

// --- Main Animation Loop ---
let progress = 0;
let lastTime = 0;

function animate(time) {
  const deltaTime = time - lastTime;
  lastTime = time;
  requestAnimationFrame(animate);
  controls.update();

  progress += (deltaTime * 0.001 * CONFIG.speed);
  const t = progress % 1;
  const realT = t * CONFIG.length;
  const phiRad = (CONFIG.phase * Math.PI) / 180;

  const x = Math.sin(2 * Math.PI * CONFIG.f1 * t);
  const y = Math.sin(2 * Math.PI * CONFIG.f2 * t + phiRad);
  const z = realT - CONFIG.length / 2;

  dotF1.position.set(x, 0, z);
  dotF2.position.set(0, y, z);
  dotSum.position.set(x, y, z);

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

document.getElementById('phase-range').addEventListener('input', (e) => {
  CONFIG.phase = parseFloat(e.target.value);
  document.getElementById('phase-val').innerText = `${CONFIG.phase}°`;
  updateGeometry();
  updateAudioFreqs();
});

// Scenario Automation
const applyScenario = (freq1, freq2, phaseDeg) => {
  CONFIG.f1 = freq1;
  CONFIG.f2 = freq2;
  CONFIG.phase = phaseDeg;

  // Update UI Elements
  document.getElementById('f1-range').value = freq1;
  document.getElementById('f2-range').value = freq2;
  document.getElementById('phase-range').value = phaseDeg;
  document.getElementById('f1-val').innerText = `${freq1.toFixed(1)} Hz`;
  document.getElementById('f2-val').innerText = `${freq2.toFixed(1)} Hz`;
  document.getElementById('phase-val').innerText = `${phaseDeg}°`;

  // Provide tactile feedback animation
  gsap.to('.control-panel', { x: -5, duration: 0.1, yoyo: true, repeat: 1 });

  updateGeometry();
  updateAudioFreqs();
};

document.getElementById('scene-fdm').addEventListener('click', () => applyScenario(2.0, 3.0, 0));
document.getElementById('scene-bad').addEventListener('click', () => applyScenario(2.0, 2.0, 0));
document.getElementById('scene-iq').addEventListener('click', () => applyScenario(2.0, 2.0, 90));

// Preset Buttons
['3d', 'top', 'f1', 'f2', 'xy', 'iso'].forEach(id => {
  document.getElementById(`view-${id}`).addEventListener('click', () => transitionCamera(id));
});

// Visibility Toggle
document.getElementById('show-sum').addEventListener('change', (e) => {
  const visible = e.target.checked;
  curveSum.visible = visible;
  dotSum.visible = visible;
  connX.visible = visible;
  connY.visible = visible;
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
