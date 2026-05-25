const html = document.documentElement;
let animationEnabled = true;
let animationFrameId = null;

(function () {
  const saved = localStorage.getItem('pm-theme') || 'dark';
  html.setAttribute('data-theme', saved);
})();

function toggleTheme() {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('pm-theme', next);
  // Sync to any open tool iframe (same-origin)
  try {
    const frameDoc = document.getElementById('tool-frame').contentDocument;
    if (frameDoc) frameDoc.documentElement.setAttribute('data-theme', next);
  } catch (_) {}
}

function showLanding() {
  if (!animationEnabled) {
    animationEnabled = true;
    if (!animationFrameId) {
      frame(); // Resume the loop
    }
  }
  document.getElementById('landing').style.display = 'flex';
  document.getElementById('tool-view').classList.remove('active');
  document.getElementById('tool-frame').src = '';
  setActiveTab('home');
}

function openTool(src, toolId) {
  const rawBaseUrl = html.dataset.baseUrl || '/';
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : rawBaseUrl + '/';
  const toolSrc = new URL(src, window.location.origin + baseUrl).pathname;
  animationEnabled = false; // Stop canvas loops
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('landing').style.display = 'none';
  document.getElementById('tool-view').classList.add('active');
  document.getElementById('tool-frame').src = toolSrc;
  setActiveTab(toolId);
}

function setActiveTab(id) {
  document.querySelectorAll('.tool-tab').forEach(t => {
    t.classList.remove('active');
    t.removeAttribute('aria-current');
  });
  const tab = document.getElementById('tab-' + id);
  if (tab) {
    tab.classList.add('active');
    tab.setAttribute('aria-current', 'page');
  }
}

// Attach all global navigation and theme methods to window
window.toggleTheme = toggleTheme;
window.showLanding = showLanding;
window.openTool = openTool;

/* ================================================================
   DNA CANVAS
================================================================ */
const canvas = document.getElementById('dna-canvas');
const ctx    = canvas.getContext('2d');
let   animT  = 0;

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const HELICES = [
  { xFrac: 0.07,  phaseOff: 0 },
  { xFrac: 0.93,  phaseOff: Math.PI * 0.85 },
  { xFrac: 0.5,   phaseOff: Math.PI * 1.3  },
];

function getVar(name) {
  return getComputedStyle(html).getPropertyValue(name).trim();
}

// Pull raw R,G,B values from CSS variables
function getChannels(prefix) {
  return [
    parseInt(getVar('--' + prefix + '-r')) || 0,
    parseInt(getVar('--' + prefix + '-g')) || 0,
    parseInt(getVar('--' + prefix + '-b')) || 0,
  ];
}

function drawHelix(cx, phaseOff, alpha) {
  const amp     = Math.min(55, canvas.width * 0.04);
  const waveLen = 130;
  const h       = canvas.height + 80;

  const s1 = getChannels('strand-1');
  const s2 = getChannels('strand-2');
  const rungs = [
    getChannels('rung-0'),
    getChannels('rung-1'),
    getChannels('rung-2'),
    getChannels('rung-3'),
  ];

  const rungStep = 22;
  for (let y = -40; y < h; y += rungStep) {
    const t  = (y / waveLen) * Math.PI * 2 + animT + phaseOff;
    const x1 = cx + Math.sin(t) * amp;
    const x2 = cx + Math.sin(t + Math.PI) * amp;
    const rc = rungs[Math.floor((y + 40) / rungStep) % 4];

    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.strokeStyle = `rgba(${rc[0]},${rc[1]},${rc[2]},${alpha * 0.38})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x1, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rc[0]},${rc[1]},${rc[2]},${alpha * 0.7})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x2, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rc[0]},${rc[1]},${rc[2]},${alpha * 0.7})`;
    ctx.fill();
  }

  ctx.beginPath();
  for (let y = -40; y < h; y += 2) {
    const x = cx + Math.sin((y / waveLen) * Math.PI * 2 + animT + phaseOff) * amp;
    y === -40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.strokeStyle = `rgba(${s1[0]},${s1[1]},${s1[2]},${alpha * 0.75})`;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.beginPath();
  for (let y = -40; y < h; y += 2) {
    const x = cx + Math.sin((y / waveLen) * Math.PI * 2 + animT + phaseOff + Math.PI) * amp;
    y === -40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.strokeStyle = `rgba(${s2[0]},${s2[1]},${s2[2]},${alpha * 0.75})`;
  ctx.lineWidth = 1.8;
  ctx.stroke();
}

function frame() {
  if (!animationEnabled) {
    animationFrameId = null;
    return; // Don't schedule next frame when disabled
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const alpha = parseFloat(getVar('--canvas-alpha')) || 0.5;
  for (const h of HELICES) drawHelix(canvas.width * h.xFrac, h.phaseOff, alpha);
  animT += 0.004;
  animationFrameId = requestAnimationFrame(frame);
}

frame();

/* ================================================================
   SEQUENCE TICKER
================================================================ */
const BASES  = 'ATGCATGCTAGCGCGTATGCATTAGCGCATGCAT';
const ticker = document.getElementById('seq-ticker');
let   seqOff = 0;

setInterval(function () {
  if (!ticker) return;
  const cols = Math.floor((ticker.clientWidth || 860) / 9) + 4;
  let seq = '';
  for (let i = 0; i < cols; i++) seq += BASES[(i + seqOff) % BASES.length];
  ticker.textContent = seq;
  seqOff = (seqOff + 1) % BASES.length;
}, 120);
