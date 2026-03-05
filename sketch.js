// Linked nodes (optimised)
// Key optimisations:
// - No per-call RGBA array allocations (replaces setAlpha with strokeRGBA/fillRGBA)
// - Precomputed distance thresholds (thr) updated only on resize
// - Tighter hover-glow logic (fewer state changes and fewer comparisons)
// - pixelDensity(1) for better performance on high-DPI screens

let balls = [];
let NOB = 30; // Number of balls
let link = 0; // set in setup + resize
let parentElement = 'background'; // The element ID that we'll attach the canvas to.

// Base colours
let backgroundColor = '#201F2C'; // Background colour (redraw each frame)
let linkLineColor = [249, 220, 92]; // Linear link RGB
let linkCurveColor = [49, 133, 252]; // Curve link RGB

let colourDrift = false;

// Ball styling
let ballStyle = {
  // Core ball
  size: 10,
  fill: [249, 220, 92],

  // Ring surrounds
  ring1: [249, 220, 92],
  ring1Alpha: 0.6,
  ring1Scale: 2,

  ring2: [249, 220, 92],
  ring2Alpha: 0.3,
  ring2Scale: 4,

  // Hover glow (filled halo)
  hoverScale: 4,
  hoverA1: 0.10, // within 45px
  hoverA2: 0.20, // within 15px
  hoverA3: 0.30, // within 5px
};

// Cached thresholds (squared distances)
let thr = {
  line2: 0,
  near2: 0,
  mid2: 0,
  far2: 0,
};

function updateThresholds() {
  const line = link * 1.5;
  const near = link / 2;
  const mid = link / 1.5;
  const far = link;

  thr.line2 = line * line;
  thr.near2 = near * near;
  thr.mid2 = mid * mid;
  thr.far2 = far * far;
}

// UI tools
let ui = {
  wrap: null,
  panel: null,
  isHidden: true, // hidden by default
  inputs: {},
  toggleBtn: null,
};

const SETTINGS_KEY = 'linked-nodes-settings-v1';

/* ---------------------------
   Colour helpers
---------------------------- */

function strokeRGBA(rgb, alpha01) {
  stroke(rgb[0], rgb[1], rgb[2], 255 * alpha01);
}

function fillRGBA(rgb, alpha01) {
  fill(rgb[0], rgb[1], rgb[2], 255 * alpha01);
}

function rgbArrayToHex(rgb) {
  const [r, g, b] = rgb;
  return (
    '#' +
    [r, g, b]
      .map(v => {
        const h = Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, '0');
        return h;
      })
      .join('')
  );
}

function hexToRgbArray(hex) {
  const clean = String(hex).replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b];
}

/* ---------------------------
   Settings (save/load/copy)
---------------------------- */

function getSettingsSnapshot() {
  return {
    backgroundColor,
    linkLineColor,
    linkCurveColor,
    ballStyle: JSON.parse(JSON.stringify(ballStyle)),
  };
}

function applySettingsSnapshot(s) {
  if (!s) return;

  if (typeof s.backgroundColor === 'string') backgroundColor = s.backgroundColor;
  if (Array.isArray(s.linkLineColor)) linkLineColor = s.linkLineColor;
  if (Array.isArray(s.linkCurveColor)) linkCurveColor = s.linkCurveColor;

  if (s.ballStyle && typeof s.ballStyle === 'object') {
    ballStyle = { ...ballStyle, ...s.ballStyle };
  }

  refreshUIFromState();
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(getSettingsSnapshot()));
  } catch (e) {}
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    applySettingsSnapshot(JSON.parse(raw));
  } catch (e) {}
}

function copySettingsToClipboard() {
  const txt = JSON.stringify(getSettingsSnapshot(), null, 2);
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt);
}

function resetSettingsToDefaults() {
  backgroundColor = '#201F2C';
  linkLineColor = [249, 220, 92];
  linkCurveColor = [49, 133, 252];
  ballStyle = {
    size: 10,
    fill: [249, 220, 92],
    ring1: [249, 220, 92],
    ring1Alpha: 0.6,
    ring1Scale: 2,
    ring2: [249, 220, 92],
    ring2Alpha: 0.3,
    ring2Scale: 4,
    hoverScale: 4,
    hoverA1: 0.10,
    hoverA2: 0.20,
    hoverA3: 0.30,
  };

  refreshUIFromState();
  saveSettings();
}

function randomiseSettings() {
  backgroundColor =
    '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

  linkLineColor = [random(100, 255), random(100, 255), random(100, 255)];
  linkCurveColor = [random(50, 255), random(50, 255), random(50, 255)];

  ballStyle.fill = [random(150, 255), random(150, 255), random(150, 255)];
  ballStyle.ring1 = ballStyle.fill.slice();
  ballStyle.ring2 = ballStyle.fill.slice();

  ballStyle.size = random(6, 20);
  ballStyle.ring1Scale = random(1.5, 3);
  ballStyle.ring2Scale = random(3, 7);
  ballStyle.ring1Alpha = random(0.2, 0.8);
  ballStyle.ring2Alpha = random(0.1, 0.5);
  ballStyle.hoverScale = random(3, 8);

  refreshUIFromState();
}

/* ---------------------------
   UI helpers
---------------------------- */

function addSectionTitle(parent, text) {
  const t = createDiv(text);
  t.parent(parent);
  t.style('margin-top', '10px');
  t.style('font-weight', '600');
  t.style('font-size', '12px');
  t.style('opacity', '0.95');
  return t;
}

function addSliderRow(
  parent,
  labelText,
  min,
  max,
  step,
  getValue,
  onChange,
  format = v => v,
  inputKey = null
) {
  const row = createDiv('');
  row.parent(parent);
  row.style('display', 'grid');
  row.style('grid-template-columns', '1fr auto');
  row.style('align-items', 'center');
  row.style('gap', '10px');
  row.style('margin-top', '8px');

  const label = createDiv(labelText);
  label.parent(row);
  label.style('font-size', '12px');
  label.style('opacity', '0.9');

  const right = createDiv('');
  right.parent(row);
  right.style('display', 'flex');
  right.style('align-items', 'center');
  right.style('gap', '8px');

  const value = createDiv(format(getValue()));
  value.parent(right);
  value.style('font-size', '12px');
  value.style('opacity', '0.9');
  value.style('min-width', '28px');
  value.style('text-align', 'right');

  const s = createSlider(min, max, getValue(), step);
  s.parent(right);
  s.input(() => {
    const v = s.value();
    onChange(v);
    value.html(format(v));
    saveSettings();
  });

  s.style('width', '120px');

  if (inputKey) ui.inputs[inputKey] = { slider: s, valueEl: value, format };

  return s;
}

function refreshUIFromState() {
  if (!ui || !ui.inputs) return;

  // Base colour pickers
  if (ui.inputs.background) ui.inputs.background.value(backgroundColor);
  if (ui.inputs.line) ui.inputs.line.value(rgbArrayToHex(linkLineColor));
  if (ui.inputs.curve) ui.inputs.curve.value(rgbArrayToHex(linkCurveColor));

  // Ball colour pickers
  if (ui.inputs.ballFill) ui.inputs.ballFill.value(rgbArrayToHex(ballStyle.fill));
  if (ui.inputs.ring1) ui.inputs.ring1.value(rgbArrayToHex(ballStyle.ring1));
  if (ui.inputs.ring2) ui.inputs.ring2.value(rgbArrayToHex(ballStyle.ring2));

  const setSlider = (key, newValue) => {
    const entry = ui.inputs[key];
    if (!entry || !entry.slider) return;
    entry.slider.value(newValue);
    if (entry.valueEl) entry.valueEl.html(entry.format(newValue));
  };

  setSlider('ballSize', ballStyle.size);
  setSlider('ring1Alpha', ballStyle.ring1Alpha);
  setSlider('ring2Alpha', ballStyle.ring2Alpha);
  setSlider('ring1Scale', ballStyle.ring1Scale);
  setSlider('ring2Scale', ballStyle.ring2Scale);
  setSlider('hoverScale', ballStyle.hoverScale);
}

function toggleColourUI() {
  ui.isHidden = !ui.isHidden;
  if (ui.panel) ui.panel.style('display', ui.isHidden ? 'none' : 'block');
  if (ui.toggleBtn) ui.toggleBtn.style('opacity', ui.isHidden ? '0.75' : '1');
}

function buildColourUI() {
  // Container
  ui.wrap = createDiv('');
  ui.wrap.id('colour-ui');
  ui.wrap.parent(parentElement);

  // Always-visible subtle toggle button (gear)
  ui.toggleBtn = createButton('⚙︎');
  ui.toggleBtn.parent(ui.wrap);
  ui.toggleBtn.mousePressed(toggleColourUI);

  ui.toggleBtn.style('width', '34px');
  ui.toggleBtn.style('height', '34px');
  ui.toggleBtn.style('border-radius', '999px');
  ui.toggleBtn.style('border', '1px solid rgba(255,255,255,0.18)');
  ui.toggleBtn.style('background', 'rgba(0,0,0,0.22)');
  ui.toggleBtn.style('color', '#fff');
  ui.toggleBtn.style('cursor', 'pointer');
  ui.toggleBtn.style('padding', '0');
  ui.toggleBtn.style('line-height', '1');
  ui.toggleBtn.style('font-size', '16px');
  ui.toggleBtn.style('opacity', '0.75');

  // Panel
  ui.panel = createDiv('');
  ui.panel.parent(ui.wrap);

  // Header
  const header = createDiv('');
  header.parent(ui.panel);
  header.style('display', 'flex');
  header.style('align-items', 'center');
  header.style('justify-content', 'space-between');
  header.style('gap', '8px');

  const title = createDiv('Settings');
  title.parent(header);
  title.style('font-weight', '600');

  const closeBtn = createButton('Close');
  closeBtn.parent(header);
  closeBtn.mousePressed(() => {
    if (!ui.isHidden) toggleColourUI();
  });

  // Buttons row
  const btnRow = createDiv('');
  btnRow.parent(ui.panel);
  btnRow.style('display', 'flex');
  btnRow.style('gap', '8px');
  btnRow.style('margin-top', '10px');

  const saveBtn = createButton('Save');
  saveBtn.parent(btnRow);
  saveBtn.mousePressed(saveSettings);

  const loadBtn = createButton('Load');
  loadBtn.parent(btnRow);
  loadBtn.mousePressed(loadSettings);

  const copyBtn = createButton('Copy');
  copyBtn.parent(btnRow);
  copyBtn.mousePressed(copySettingsToClipboard);

  const resetBtn = createButton('Reset');
  resetBtn.parent(btnRow);
  resetBtn.mousePressed(resetSettingsToDefaults);

  const randomBtn = createButton('🎲');
  randomBtn.parent(btnRow);
  randomBtn.mousePressed(randomiseSettings);

  // Base fields
  const fields = [
    { key: 'background', label: 'Background', get: () => backgroundColor, set: v => (backgroundColor = v) },
    { key: 'line', label: 'Link lines', get: () => rgbArrayToHex(linkLineColor), set: v => (linkLineColor = hexToRgbArray(v)) },
    { key: 'curve', label: 'Curves', get: () => rgbArrayToHex(linkCurveColor), set: v => (linkCurveColor = hexToRgbArray(v)) },
  ];

  fields.forEach(f => {
    const row = createDiv('');
    row.parent(ui.panel);
    row.style('display', 'flex');
    row.style('align-items', 'center');
    row.style('justify-content', 'space-between');
    row.style('gap', '10px');
    row.style('margin-top', '8px');

    const label = createDiv(f.label);
    label.parent(row);
    label.style('font-size', '12px');
    label.style('opacity', '0.9');

    const input = createInput(f.get(), 'color');
    input.parent(row);
    input.input(() => {
      f.set(input.value());
      saveSettings();
    });

    ui.inputs[f.key] = input;
  });

  // Ball styling
  addSectionTitle(ui.panel, 'Ball styling');

  // Ball fill colour
  {
    const row = createDiv('');
    row.parent(ui.panel);
    row.style('display', 'flex');
    row.style('align-items', 'center');
    row.style('justify-content', 'space-between');
    row.style('gap', '10px');
    row.style('margin-top', '8px');

    const label = createDiv('Ball fill');
    label.parent(row);
    label.style('font-size', '12px');
    label.style('opacity', '0.9');

    const input = createInput(rgbArrayToHex(ballStyle.fill), 'color');
    input.parent(row);
    input.input(() => {
      ballStyle.fill = hexToRgbArray(input.value());
      saveSettings();
    });

    input.style('width', '42px');
    input.style('height', '26px');
    input.style('padding', '0');
    input.style('border', 'none');
    input.style('background', 'transparent');

    ui.inputs.ballFill = input;
  }

  // Ring 1 colour
  {
    const row = createDiv('');
    row.parent(ui.panel);
    row.style('display', 'flex');
    row.style('align-items', 'center');
    row.style('justify-content', 'space-between');
    row.style('gap', '10px');
    row.style('margin-top', '8px');

    const label = createDiv('Ring 1');
    label.parent(row);
    label.style('font-size', '12px');
    label.style('opacity', '0.9');

    const input = createInput(rgbArrayToHex(ballStyle.ring1), 'color');
    input.parent(row);
    input.input(() => {
      ballStyle.ring1 = hexToRgbArray(input.value());
      saveSettings();
    });

    input.style('width', '42px');
    input.style('height', '26px');
    input.style('padding', '0');
    input.style('border', 'none');
    input.style('background', 'transparent');

    ui.inputs.ring1 = input;
  }

  // Ring 2 colour
  {
    const row = createDiv('');
    row.parent(ui.panel);
    row.style('display', 'flex');
    row.style('align-items', 'center');
    row.style('justify-content', 'space-between');
    row.style('gap', '10px');
    row.style('margin-top', '8px');

    const label = createDiv('Ring 2');
    label.parent(row);
    label.style('font-size', '12px');
    label.style('opacity', '0.9');

    const input = createInput(rgbArrayToHex(ballStyle.ring2), 'color');
    input.parent(row);
    input.input(() => {
      ballStyle.ring2 = hexToRgbArray(input.value());
      saveSettings();
    });

    input.style('width', '42px');
    input.style('height', '26px');
    input.style('padding', '0');
    input.style('border', 'none');
    input.style('background', 'transparent');

    ui.inputs.ring2 = input;
  }

  // Sliders
  addSliderRow(ui.panel, 'Ball size', 4, 30, 1, () => ballStyle.size, v => (ballStyle.size = v), v => v, 'ballSize');
  addSliderRow(ui.panel, 'Ring 1 alpha', 0, 1, 0.01, () => ballStyle.ring1Alpha, v => (ballStyle.ring1Alpha = v), v => Number(v).toFixed(2), 'ring1Alpha');
  addSliderRow(ui.panel, 'Ring 2 alpha', 0, 1, 0.01, () => ballStyle.ring2Alpha, v => (ballStyle.ring2Alpha = v), v => Number(v).toFixed(2), 'ring2Alpha');
  addSliderRow(ui.panel, 'Ring 1 scale', 1, 8, 0.1, () => ballStyle.ring1Scale, v => (ballStyle.ring1Scale = v), v => Number(v).toFixed(1), 'ring1Scale');
  addSliderRow(ui.panel, 'Ring 2 scale', 1, 12, 0.1, () => ballStyle.ring2Scale, v => (ballStyle.ring2Scale = v), v => Number(v).toFixed(1), 'ring2Scale');
  addSliderRow(ui.panel, 'Hover scale', 1, 10, 0.1, () => ballStyle.hoverScale, v => (ballStyle.hoverScale = v), v => Number(v).toFixed(1), 'hoverScale');

  // Wrap styling
  ui.wrap.style('position', 'absolute');
  ui.wrap.style('top', '12px');
  ui.wrap.style('left', '12px');
  ui.wrap.style('z-index', '9999');
  ui.wrap.style('font-family', 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif');
  ui.wrap.style('user-select', 'none');

  // Panel styling
  ui.panel.style('margin-top', '8px');
  ui.panel.style('padding', '10px 12px');
  ui.panel.style('border-radius', '10px');
  ui.panel.style('background', 'rgba(0,0,0,0.35)');
  ui.panel.style('backdrop-filter', 'blur(6px)');
  ui.panel.style('-webkit-backdrop-filter', 'blur(6px)');
  ui.panel.style('color', '#fff');
  ui.panel.style('font-size', '13px');

  // Make the basic colour inputs tidy
  Object.values(ui.inputs).forEach(inp => {
    // Slider entries are objects, skip those
    if (!inp || typeof inp.value !== 'function') return;
    inp.style('width', '42px');
    inp.style('height', '26px');
    inp.style('padding', '0');
    inp.style('border', 'none');
    inp.style('background', 'transparent');
  });

  // Hidden by default
  ui.panel.style('display', ui.isHidden ? 'none' : 'block');

  // Ensure UI reflects any loaded settings
  refreshUIFromState();
}

// Keyboard shortcut: press "h" to hide/show, press "c" to toggle colour drift
function keyPressed() {
  if (key === 'h' || key === 'H') {
    if (ui.wrap) toggleColourUI();
  }

  if (key === 'c' || key === 'C') {
    colourDrift = !colourDrift;
  }
}

/* ---------------------------
   p5 lifecycle
---------------------------- */

function setup() {
  frameRate(30);
  pixelDensity(1);

  const myCanvas = createCanvas(windowWidth, windowHeight);
  myCanvas.parent(parentElement);

  link = windowWidth / 8;
  updateThresholds();

  loadSettings();
  buildColourUI();

  balls = [];
  for (let i = 0; i < NOB; i++) balls.push(new Ball());
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  link = windowWidth / 8;
  updateThresholds();
}

function draw() {
  if (colourDrift) {
    const t = deltaTime / 16.67; // normalise for frame rate

    // Drift curves (more noticeable)
    linkCurveColor[0] = (linkCurveColor[0] + 1.2 * t) % 256;
    linkCurveColor[1] = (linkCurveColor[1] + 0.9 * t) % 256;
    linkCurveColor[2] = (linkCurveColor[2] + 0.6 * t) % 256;

    // Drift lines (subtle)
    linkLineColor[0] = (linkLineColor[0] + 0.25 * t) % 256;
    linkLineColor[1] = (linkLineColor[1] + 0.18 * t) % 256;
    linkLineColor[2] = (linkLineColor[2] + 0.12 * t) % 256;
  }

  background(backgroundColor);

  // Debug indicator (optional)
  noStroke();
  fill(255);
  textSize(12);
  text(colourDrift ? 'drift: ON' : 'drift: OFF', 12, height - 12);

  // Only draw each pair once
  for (let i = 0; i < NOB; i++) {
    for (let j = i + 1; j < NOB; j++) {
      balls[i].connectTo(balls[j]);
    }
  }

  for (let i = 0; i < NOB; i++) {
    balls[i].disp();
    balls[i].move();
  }
}

/* ---------------------------
   Ball
---------------------------- */

function Ball() {
  this.d = ballStyle.size;

  this.xPos = random(this.d, width - this.d / 2);
  this.yPos = random(this.d, height - this.d / 2);

  this.xPosf = random(0.2, 4);
  this.yPosf = random(0.2, 2);

  // Separate direction per axis (less constrained movement)
  this.xDir = Math.random() < 0.5 ? -1 : 1;
  this.yDir = Math.random() < 0.5 ? -1 : 1;

  // Control points for bezier (original approach)
  this.xPosPlus = random(this.d, width - this.d / 2);
  this.yPosPlus = random(this.d, height - this.d / 2);

  this.disp = function () {
    // Apply size changes live
    this.d = ballStyle.size;

    // Core ball
    fill(ballStyle.fill[0], ballStyle.fill[1], ballStyle.fill[2]);
    noStroke();
    ellipse(this.xPos, this.yPos, this.d, this.d);

    // Ring 1
    strokeRGBA(ballStyle.ring1, ballStyle.ring1Alpha);
    noFill();
    ellipse(this.xPos, this.yPos, this.d * ballStyle.ring1Scale, this.d * ballStyle.ring1Scale);

    // Ring 2
    strokeRGBA(ballStyle.ring2, ballStyle.ring2Alpha);
    ellipse(this.xPos, this.yPos, this.d * ballStyle.ring2Scale, this.d * ballStyle.ring2Scale);

    // Hover glows (optimised branching)
    const mdx = mouseX - this.xPos;
    const mdy = mouseY - this.yPos;
    const md2 = mdx * mdx + mdy * mdy;

    if (md2 < 45 * 45) {
      const glowD = this.d * ballStyle.hoverScale;
      noStroke();

      fillRGBA(ballStyle.fill, ballStyle.hoverA1);
      ellipse(this.xPos, this.yPos, glowD, glowD);

      if (md2 < 15 * 15) {
        fillRGBA(ballStyle.fill, ballStyle.hoverA2);
        ellipse(this.xPos, this.yPos, glowD, glowD);

        if (md2 < 5 * 5) {
          fillRGBA(ballStyle.fill, ballStyle.hoverA3);
          ellipse(this.xPos, this.yPos, glowD, glowD);
        }
      }
    }
  };

  this.move = function () {
    this.xPos += this.xPosf * this.xDir;
    this.yPos += this.yPosf * this.yDir;

    // Wrap-around
    if (this.xPos > width - this.d / 2) this.xPos = 0 + this.d / 2;
    else if (this.xPos < this.d / 2) this.xPos = width - this.d / 2;

    if (this.yPos > height - this.d / 2) this.yPos = 0 + this.d / 2;
    else if (this.yPos < this.d / 2) this.yPos = height - this.d / 2;
  };

  // Unified connector: distance once (squared), thresholds cached
  this.connectTo = function (other) {
    const dx = this.xPos - other.xPos;
    const dy = this.yPos - other.yPos;
    const d2 = dx * dx + dy * dy;

    if (d2 < thr.line2) {
      strokeRGBA(linkLineColor, 0.05);
      line(this.xPos, this.yPos, other.xPos, other.yPos);
    }

    let curveAlpha = 0;
    if (d2 < thr.near2) curveAlpha = 0.2;
    else if (d2 < thr.mid2) curveAlpha = 0.1;
    else if (d2 < thr.far2) curveAlpha = 0.025;

    if (curveAlpha > 0) {
      strokeRGBA(linkCurveColor, curveAlpha);
      noFill();
      beginShape();
      vertex(this.xPos, this.yPos);
      bezierVertex(
        this.xPosPlus, this.yPos,
        other.xPos, other.yPosPlus,
        other.xPos, other.yPos
      );
      endShape();
    }
  };
}