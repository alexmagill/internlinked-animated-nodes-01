// We set up a number of 'balls' (defined by 'NOB') which move around the screen.
// When they are close enough to each other (defined by 'link') they connect.
// There are two types of connection, straight and curvy.

let balls = [];
let NOB = 30; // NOB = Number of balls
let link = 0; // set in setup + resize
let parentElement = 'background'; // The element ID that we'll attach the canvas to.

// Set the colour palette
let backgroundColor = '#201F2C'; // Background colour (redraw each frame)
let ballColor = [249, 220, 92]; // Ball + outlines (stroke) RGB
let linkLineColor = [249, 220, 92]; // Linear link RGB
let linkCurveColor = [49, 133, 252]; // Curve link RGB
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

  // Hover “glow” (filled halo)
  hoverScale: 4,
  hoverA1: 0.10, // within 45px
  hoverA2: 0.20, // within 15px
  hoverA3: 0.30, // within 5px
};

// UI tools
let ui = {
  wrap: null,
  panel: null,     // new: the actual settings panel
  isHidden: true,  // hidden by default
  inputs: {},
  toggleBtn: null, // the subtle always-visible button
};

// Quick function to convert base RGB colours to p5.js rgba colour model
// Inputs are:
// rgbColor = an RGB array
// alphaValue = RGBA alpha value from 0 to 1
function setAlpha(rgbColor, alphaValue) {
  const rgbOutput = rgbColor.slice(); // copy array
  const a = Math.round(255 * alphaValue);
  rgbOutput.push(a);
  return rgbOutput;
}

function rgbArrayToHex(rgb) {
  const [r, g, b] = rgb;
  return (
    '#' +
    [r, g, b]
      .map(v => {
        const h = Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
        return h;
      })
      .join('')
  );
}

function hexToRgbArray(hex) {
  const clean = String(hex).replace('#', '').trim();
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b];
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

  // Panel (everything configurable goes in here)
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

  // Fields
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
    input.input(() => f.set(input.value()));

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
    input.input(() => (ballStyle.fill = hexToRgbArray(input.value())));

    input.style('width', '42px');
    input.style('height', '26px');
    input.style('padding', '0');
    input.style('border', 'none');
    input.style('background', 'transparent');
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
    input.input(() => (ballStyle.ring1 = hexToRgbArray(input.value())));

    input.style('width', '42px');
    input.style('height', '26px');
    input.style('padding', '0');
    input.style('border', 'none');
    input.style('background', 'transparent');
  }

  // Ring 2 colour (this was parented to ui.wrap before)
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
    input.input(() => (ballStyle.ring2 = hexToRgbArray(input.value())));

    input.style('width', '42px');
    input.style('height', '26px');
    input.style('padding', '0');
    input.style('border', 'none');
    input.style('background', 'transparent');
  }

  // Sliders (these were added to ui.wrap before)
  addSliderRow(ui.panel, 'Ball size', 4, 30, 1, () => ballStyle.size, v => (ballStyle.size = v));
  addSliderRow(ui.panel, 'Ring 1 alpha', 0, 1, 0.01, () => ballStyle.ring1Alpha, v => (ballStyle.ring1Alpha = v), v => Number(v).toFixed(2));
  addSliderRow(ui.panel, 'Ring 2 alpha', 0, 1, 0.01, () => ballStyle.ring2Alpha, v => (ballStyle.ring2Alpha = v), v => Number(v).toFixed(2));
  addSliderRow(ui.panel, 'Ring 1 scale', 1, 8, 0.1, () => ballStyle.ring1Scale, v => (ballStyle.ring1Scale = v), v => Number(v).toFixed(1));
  addSliderRow(ui.panel, 'Ring 2 scale', 1, 12, 0.1, () => ballStyle.ring2Scale, v => (ballStyle.ring2Scale = v), v => Number(v).toFixed(1));
  addSliderRow(ui.panel, 'Hover scale', 1, 10, 0.1, () => ballStyle.hoverScale, v => (ballStyle.hoverScale = v), v => Number(v).toFixed(1));

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
    inp.style('width', '42px');
    inp.style('height', '26px');
    inp.style('padding', '0');
    inp.style('border', 'none');
    inp.style('background', 'transparent');
  });

  // Hidden by default
  ui.panel.style('display', ui.isHidden ? 'none' : 'block');
}

function toggleColourUI() {
  ui.isHidden = !ui.isHidden;
  if (ui.panel) ui.panel.style('display', ui.isHidden ? 'none' : 'block');
  if (ui.toggleBtn) ui.toggleBtn.style('opacity', ui.isHidden ? '0.75' : '1');
}

// Keyboard shortcut: press "h" to hide/show
function keyPressed() {
  if (key === 'h' || key === 'H') {
    if (ui.wrap) toggleColourUI();
  }
}

function addSectionTitle(parent, text) {
  const t = createDiv(text);
  t.parent(parent);
  t.style('margin-top', '10px');
  t.style('font-weight', '600');
  t.style('font-size', '12px');
  t.style('opacity', '0.95');
  return t;
}

function addSliderRow(parent, labelText, min, max, step, getValue, onChange, format = v => v) {
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
  });

  s.style('width', '120px');
  return s;
}

function setup() {
  frameRate(30);

  const myCanvas = createCanvas(windowWidth, windowHeight);
  myCanvas.parent(parentElement);

  link = windowWidth / 8;

  buildColourUI();
  
  ballStyle.fill = ballColor.slice();
  ballStyle.ring1 = ballColor.slice();
  ballStyle.ring2 = ballColor.slice();

  balls = [];
  for (let i = 0; i < NOB; i++) {
    balls.push(new Ball());
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  link = windowWidth / 8;
}

function draw() {
  background(backgroundColor);

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

function Ball() {
  this.d = ballStyle.size;

  this.xPos = random(this.d, width - this.d / 2);
  this.yPos = random(this.d, height - this.d / 2);

  this.xPosf = random(0.2, 4);
  this.yPosf = random(0.2, 2);

  // Separate direction per axis (less constrained movement)
  this.xDir = Math.random() < 0.5 ? -1 : 1;
  this.yDir = Math.random() < 0.5 ? -1 : 1;

  // Control points for bezier (kept from your original approach)
  this.xPosPlus = random(this.d, width - this.d / 2);
  this.yPosPlus = random(this.d, height - this.d / 2);

  this.disp = function () {
    // If you want size changes to apply live:
    this.d = ballStyle.size;
  
    // Core ball
    fill(ballStyle.fill[0], ballStyle.fill[1], ballStyle.fill[2]);
    noStroke();
    ellipse(this.xPos, this.yPos, this.d, this.d);
  
    // Ring 1
    stroke(setAlpha(ballStyle.ring1, ballStyle.ring1Alpha));
    noFill();
    ellipse(this.xPos, this.yPos, this.d * ballStyle.ring1Scale, this.d * ballStyle.ring1Scale);
  
    // Ring 2
    stroke(setAlpha(ballStyle.ring2, ballStyle.ring2Alpha));
    ellipse(this.xPos, this.yPos, this.d * ballStyle.ring2Scale, this.d * ballStyle.ring2Scale);
  
    // Hover glows (circular proximity)
    const mdx = mouseX - this.xPos;
    const mdy = mouseY - this.yPos;
    const md2 = mdx * mdx + mdy * mdy;
  
    const glowD = this.d * ballStyle.hoverScale;
  
    if (md2 < 45 * 45) {
      fill(setAlpha(ballStyle.fill, ballStyle.hoverA1));
      noStroke();
      ellipse(this.xPos, this.yPos, glowD, glowD);
    }
    if (md2 < 15 * 15) {
      fill(setAlpha(ballStyle.fill, ballStyle.hoverA2));
      noStroke();
      ellipse(this.xPos, this.yPos, glowD, glowD);
    }
    if (md2 < 5 * 5) {
      fill(setAlpha(ballStyle.fill, ballStyle.hoverA3));
      noStroke();
      ellipse(this.xPos, this.yPos, glowD, glowD);
    }
  };

  this.move = function () {
    this.xPos += this.xPosf * this.xDir;
    this.yPos += this.yPosf * this.yDir;

    // Wrap-around (kept as in your original)
    if (this.xPos > width - this.d / 2) {
      this.xPos = 0 + this.d / 2;
    } else if (this.xPos < this.d / 2) {
      this.xPos = width - this.d / 2;
    }

    if (this.yPos > height - this.d / 2) {
      this.yPos = 0 + this.d / 2;
    } else if (this.yPos < this.d / 2) {
      this.yPos = height - this.d / 2;
    }
  };

  // Unified connector: computes distance once (squared)
  this.connectTo = function (other) {
    const dx = this.xPos - other.xPos;
    const dy = this.yPos - other.yPos;
    const d2 = dx * dx + dy * dy;

    const link2 = link * link;

    // Straight line further out (link * 1.5)
    const lineThresh = link * 1.5;
    const lineThresh2 = lineThresh * lineThresh;

    if (d2 < lineThresh2) {
      stroke(setAlpha(linkLineColor, 0.05));
      line(this.xPos, this.yPos, other.xPos, other.yPos);
    }

    // Curves nearer in, with stepped alpha similar to your 3 curve bands
    // (link) -> 0.025, (link/1.5) -> 0.1, (link/2) -> 0.2
    // Note: test in order from tightest to loosest so the strongest one wins.
    const nearThresh = link / 2;
    const midThresh = link / 1.5;
    const farThresh = link;

    const near2 = nearThresh * nearThresh;
    const mid2 = midThresh * midThresh;
    const far2 = farThresh * farThresh;

    let curveAlpha = 0;

    if (d2 < near2) curveAlpha = 0.2;
    else if (d2 < mid2) curveAlpha = 0.1;
    else if (d2 < far2) curveAlpha = 0.025;

    if (curveAlpha > 0) {
      stroke(setAlpha(linkCurveColor, curveAlpha));
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