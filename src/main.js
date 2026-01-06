import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { gsap } from 'gsap';
import './style.css';

// --- Configuration ---
const CONFIG = {
  f1: 2.0,
  f2: 3.0,
  amp1: 1.0,
  amp2: 1.0,
  phase: 0, // In degrees
  speed: 0.5,
  points: 1200,
  length: 12,
  isAudioOn: false,
  mode: 'sine' // sine, square, wave, poly
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
const createCurve = (color, width = 3) => {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({ color, linewidth: width, transparent: true, opacity: 0.9 });
  return new THREE.Line(geometry, material);
};

const curveF1 = createCurve(0x60efff, 3); // X-Z (Frequency 1)
const curveF2 = createCurve(0xff60ad, 3); // Y-Z (Frequency 2)
const curveSum = createCurve(0xffffff, 5); // 3D Composite Path

scene.add(curveF1, curveF2, curveSum);

// Animated Dots
const dotGeom = new THREE.SphereGeometry(0.15, 32, 32);
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
  'iso': { p: [7, 7, 7], t: [0, 0, 0], title: "3D 视角", desc: "请尝试调节频率和相位，观察白色路径在什么时候会塌陷成一条扁平的直线。" },
  'comp': {
    p: [4, 4, 10], t: [0, 0, 0],
    title: "合成信号分析 (Composite)",
    desc: "专注观察白色合成波。调节 Amplitude 滑块可以看到它如何被某个分量主导。在『主动降噪 (ANC)』模式下，你会看到它完全消失！"
  }
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

// --- Math Helpers ---
const getWalsh = (f, t) => {
  // Simulating Walsh functions using Square waves with varying density
  // f acts as the 'sequency' (number of zero crossings)
  return Math.sign(Math.sin(2 * Math.PI * f * t));
};

const getWavelet = (f, t, offset) => {
  // Morlet Wavelet: Sine wave localized by a Gaussian window
  // We map 'f' to position shift to show Time-Division Orthogonality
  const center = (offset ? 0.75 : 0.25) * CONFIG.length;
  // Frequency controls width/density, here we simplify:
  // f controls the carrier frequency inside the packet
  const sigma = 1.0;
  const localT = (t * CONFIG.length) - center;
  const envelope = Math.exp(-(localT * localT) / (2 * sigma * sigma));
  return envelope * Math.sin(2 * Math.PI * f * localT);
};

const getLegendre = (n, x) => {
  // Legendre Polynomials (Recursive definition)
  if (n === 0) return 1;
  if (n === 1) return x;
  let p_prev2 = 1;
  let p_prev1 = x;
  let p_curr = x;

  for (let k = 2; k <= n; k++) {
    p_curr = ((2 * k - 1) * x * p_prev1 - (k - 1) * p_prev2) / k;
    p_prev2 = p_prev1;
    p_prev1 = p_curr;
  }
  return p_curr;
};

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
    const tReal = tRelative * CONFIG.length; // 0 to 12
    const z = tReal - CONFIG.length / 2;

    let x, y;

    if (CONFIG.mode === 'square') {
      // Walsh: Phase shift doesn't make sense for ideal Walsh, but time shift does
      // We implement a simple frequency-based Square wave for demo
      const tShift = (CONFIG.phase / 360) / (CONFIG.f2 || 1);
      x = getWalsh(CONFIG.f1, tRelative) * 0.8 * CONFIG.amp1;
      y = Math.sign(Math.sin(2 * Math.PI * CONFIG.f2 * (tRelative + tShift))) * 0.8 * CONFIG.amp2;
    }
    else if (CONFIG.mode === 'wave') {
      // Wavelet: 'Phase' here shifts the position of packet 2
      const shift = (CONFIG.phase / 360) * CONFIG.length * 0.5;
      // We separate them in time by default unless collided
      // f1 is at 25% mark, f2 is at 75% mark normally
      // 'f' param primarily controls carrier freq

      const center1 = 0.3 * CONFIG.length;
      const center2 = 0.7 * CONFIG.length - shift; // Phase slider moves packet 2

      const sigma = 0.8;
      const t1 = tReal - center1;
      const t2 = tReal - center2;

      const env1 = Math.exp(-(t1 * t1) / (2 * sigma));
      const env2 = Math.exp(-(t2 * t2) / (2 * sigma));

      x = env1 * Math.sin(2 * Math.PI * CONFIG.f1 * t1) * CONFIG.amp1;
      y = env2 * Math.sin(2 * Math.PI * CONFIG.f2 * t2) * CONFIG.amp2;
    }
    else if (CONFIG.mode === 'poly') {
      // Scale t from [0, 12] to [-1, 1] for Legendre
      const tNorm = (tRelative * 2) - 1;
      const order1 = Math.round(CONFIG.f1); // Map frequency slider to Order
      const order2 = Math.round(CONFIG.f2);
      x = getLegendre(order1, tNorm) * CONFIG.amp1;
      y = getLegendre(order2, tNorm) * CONFIG.amp2;
    }
    else {
      // Default Sine
      x = Math.sin(2 * Math.PI * CONFIG.f1 * tRelative) * CONFIG.amp1;
      y = Math.sin(2 * Math.PI * CONFIG.f2 * tRelative + phiRad) * CONFIG.amp2;
    }

    p1.push(x, 0, z);
    p2.push(0, y, z);
    pSum.push(x, y, z);

    // Pearson correlation uses centered/normalized values, but for signal orthogonality
    // we care about the raw dot product integral in the definition interval.
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

  updateTutorialState(absCorr);
}

// Extracted Tutorial Logic
function updateTutorialState(absCorr) {
  const tutTitle = document.getElementById('tut-title');
  const tutText = document.getElementById('tut-text');
  const box = document.querySelector('.tutorial-container');
  const activeBtn = document.querySelector('.preset-btn.active');
  const activeId = activeBtn ? activeBtn.id.replace('view-', '') : '3d';
  const isIsoView = (activeId === 'f1' || activeId === 'f2');

  const setStyle = (status) => {
    if (!box) return;
    if (status === 'critical') {
      box.style.borderLeftColor = '#ff60ad';
      box.style.background = 'rgba(255, 96, 173, 0.15)';
      curveSum.material.color.setHex(0xff60ad);
    } else if (status === 'magic') {
      box.style.borderLeftColor = '#ffd700';
      box.style.background = 'rgba(255, 215, 0, 0.1)';
      curveSum.material.color.setHex(0xffffff);
    } else {
      box.style.borderLeftColor = '#60efff';
      box.style.background = 'rgba(255, 255, 255, 0.05)';
      curveSum.material.color.setHex(0xffffff);
    }
  };

  if (absCorr > 0.8) {
    setStyle('critical');
    if (CONFIG.mode === 'wave') {
      tutTitle.innerText = "💥 波包碰撞 (Packet Collision)";
      tutText.innerText = "时间域上的碰撞！两个波包重叠了，信息无法区分。";
    } else if (CONFIG.mode === 'poly') {
      tutTitle.innerText = "📐 维度重合 (Basis Collapse)";
      tutText.innerText = "当多项式的阶数相同时（比如都是 $x^2$），它们就是同一个向量，正交性为零。";
    } else {
      tutTitle.innerText = isIsoView ? "🚨 视觉欺骗 (Visual Illusion)" : "🚀 信号重叠 (Collision)";
      tutText.innerText = isIsoView ? "别被骗了。虽然看起来分开了，但因为正交性破灭，这只是几何作图的假象。" : "两个信号已经同化，无法分离。";
    }
  } else {
    // Orthogonal
    setStyle('normal');
    if (CONFIG.mode === 'wave') {
      tutTitle.innerText = "🌊 时域正交 (Time Orthogonality)";
      tutText.innerText = "波包分离。只要它们在时间上不重叠，乘积的积分就是 0。这是最直观的『时分复用』。";
    } else if (CONFIG.mode === 'square') {
      tutTitle.innerText = "🧱 Walsh 正交 (CDMA Code)";
      tutText.innerText = "即使是方波，只要按照特定的节奏（Walsh 码）翻转，在这个周期内的总面积也会抵消为零。";
    } else if (CONFIG.mode === 'poly') {
      tutTitle.innerText = "🎓 勒让德正交 (Legendre)";
      tutText.innerText = `数学之美！F1=${Math.round(CONFIG.f1)}阶 vs F2=${Math.round(CONFIG.f2)}阶。虽然一个是直线($x$)，另一个可能是抛物线($x^2$)，但在[-1, 1]空间内，它们也是互相垂直的向量！`;
    } else if (CONFIG.f1 === CONFIG.f2 && (Math.abs(CONFIG.phase % 180 - 90) < 10)) {
      setStyle('magic');
      tutTitle.innerText = "✨ I/Q 正交 (Magic)";
      tutText.innerText = "同频也能正交！相位差 90° 创造了奇迹。";
    } else {
      if (TARGETS[activeId]) {
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

// Amplitude Sliders
document.getElementById('amp1-range').addEventListener('input', (e) => {
  CONFIG.amp1 = parseFloat(e.target.value);
  document.getElementById('amp1-val').innerText = CONFIG.amp1.toFixed(1);
  updateGeometry();
});

document.getElementById('amp2-range').addEventListener('input', (e) => {
  CONFIG.amp2 = parseFloat(e.target.value);
  document.getElementById('amp2-val').innerText = CONFIG.amp2.toFixed(1);
  updateGeometry();
});

// Advanced Scenarios
const applyScenarioAdvanced = (type) => {
  // Reset Amps
  CONFIG.amp1 = 1.0;
  CONFIG.amp2 = 1.0;

  if (type === 'anc') {
    // Noise Cancellation: Same Freq, Same Amp, Inverse Phase
    CONFIG.f1 = 2.0;
    CONFIG.f2 = 2.0;
    CONFIG.phase = 180;
    gsap.to(camera.position, { duration: 1, x: 5, y: 5, z: 12 }); // Goto Comp View
  } else if (type === 'beat') {
    // Beat Freq: Very close frequencies
    CONFIG.f1 = 5.0;
    CONFIG.f2 = 5.5;
    CONFIG.phase = 0;
  } else if (type === 'am') {
    // AM Radio: Carrier + Modulation
    // Here we can't truly multiply f1*f2 in this additive viz, 
    // but we can show how low freq f1 dominates the path shape
    CONFIG.f1 = 1.0; // Signal
    CONFIG.f2 = 12.0; // Carrier
    CONFIG.phase = 0;
    CONFIG.amp2 = 0.5;
  }

  // Update UI
  document.getElementById('f1-range').value = CONFIG.f1;
  document.getElementById('f2-range').value = CONFIG.f2;
  document.getElementById('phase-range').value = CONFIG.phase;
  document.getElementById('amp1-range').value = CONFIG.amp1;
  document.getElementById('amp2-range').value = CONFIG.amp2;

  document.getElementById('f1-val').innerText = CONFIG.f1.toFixed(1) + ' Hz';
  document.getElementById('f2-val').innerText = CONFIG.f2.toFixed(1) + ' Hz';
  document.getElementById('phase-val').innerText = CONFIG.phase + '°';
  document.getElementById('amp1-val').innerText = CONFIG.amp1.toFixed(1);
  document.getElementById('amp2-val').innerText = CONFIG.amp2.toFixed(1);

  updateGeometry();
  updateAudioFreqs();
};

document.getElementById('scene-anc').addEventListener('click', () => applyScenarioAdvanced('anc'));
document.getElementById('scene-beat').addEventListener('click', () => applyScenarioAdvanced('beat'));
document.getElementById('scene-am').addEventListener('click', () => applyScenarioAdvanced('am'));

// Preset Buttons
['3d', 'top', 'f1', 'f2', 'xy', 'iso', 'comp'].forEach(id => {
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

// Mode Buttons
['sine', 'square', 'wave', 'poly'].forEach(mode => {
  document.getElementById(`mode-${mode}`)?.addEventListener('click', () => {
    CONFIG.mode = mode;
    document.querySelectorAll('[id^="mode-"]').forEach(b => b.classList.remove('active'));
    document.getElementById(`mode-${mode}`).classList.add('active');
    updateGeometry();

    // Show mode-specific tutorial
    const tutTitle = document.getElementById('tut-title');
    const tutText = document.getElementById('tut-text');
    const modeDescriptions = {
      'sine': { title: "📶 正弦波模式 (5G/WiFi)", desc: "这是现代无线通信的基础。通过傅里叶变换，任何复杂信号都能分解为正弦波的叠加。" },
      'square': { title: "🧱 沃尔什/方波模式 (CDMA)", desc: "3G通信的核心！这些方波像数字编码一样只有0和1，却依然能保持正交。多个用户可以共享频率。" },
      'wave': { title: "🌊 小波模式 (AI/图像)", desc: "小波是时间局域化的波包。它们通过『时间错开』来实现正交，是JPEG2000和神经网络的数学基础。" },
      'poly': { title: "🎓 多项式模式 (勒让德)", desc: "高等数学的美！$x$ 和 $x^2-1/2$ 这样的多项式也能正交。阶数不同 = 向量垂直。这是量子力学的基础。" }
    };
    if (modeDescriptions[mode]) {
      tutTitle.innerText = modeDescriptions[mode].title;
      tutText.innerText = modeDescriptions[mode].desc;
    }
  });
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
