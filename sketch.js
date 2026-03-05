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

function setup() {
  frameRate(30);

  const myCanvas = createCanvas(windowWidth, windowHeight);
  myCanvas.parent(parentElement);

  link = windowWidth / 8;

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
  this.d = 10;

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
    fill(249, 220, 92);
    noStroke();
    ellipse(this.xPos, this.yPos, this.d, this.d);

    stroke(setAlpha(ballColor, 0.6));
    noFill();
    ellipse(this.xPos, this.yPos, this.d * 2, this.d * 2);

    stroke(setAlpha(ballColor, 0.3));
    ellipse(this.xPos, this.yPos, this.d * 4, this.d * 4);

    // Circular mouse proximity checks (squared distance)
    const mdx = mouseX - this.xPos;
    const mdy = mouseY - this.yPos;
    const md2 = mdx * mdx + mdy * mdy;

    if (md2 < 45 * 45) {
      fill(setAlpha(ballColor, 0.1));
      noStroke();
      ellipse(this.xPos, this.yPos, this.d * 4, this.d * 4);
    }
    if (md2 < 15 * 15) {
      fill(setAlpha(ballColor, 0.2));
      noStroke();
      ellipse(this.xPos, this.yPos, this.d * 4, this.d * 4);
    }
    if (md2 < 5 * 5) {
      fill(setAlpha(ballColor, 0.3));
      noStroke();
      ellipse(this.xPos, this.yPos, this.d * 4, this.d * 4);
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