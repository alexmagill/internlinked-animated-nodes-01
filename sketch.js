// We set up a number of 'balls' (defined by 'NOB') which move around the screen.
// When they are close enough to each other (defined by 'link') they connect.
// There are two types of connection, straight and curvy.

var balls=[];
var NOB = 30; // NOB = Number of balls
var link = document.documentElement.clientWidth  / 8; // base interlinking measurement on screen width
var parentElement = 'background'; // The element ID that we'll attach the canvas to.

function setup() {
  frameRate(30);
  var myCanvas = createCanvas(windowWidth,windowHeight);
  myCanvas.parent(parentElement); // set this up on the background element
  for(var i=0; i<NOB; i++)
  {
    balls.push(new Ball());
  }
}

function draw() {
  background('#201F2C');
  for(var i=0; i<NOB; i++)
  {
    for(var j=0; j<NOB; j++){
      if(i!=j){
        balls[i].axconnect(balls[j]);
        balls[i].exconnect(balls[j]);
        balls[i].connect(balls[j]);
        balls[i].reconnect(balls[j]);
      }
    }
    balls[i].disp();
    balls[i].move();
  }
}

function Ball()
{
  this.d = 10;
  this.xPos= random(this.d,width-this.d/2);
  this.yPos= random(this.d,height-this.d/2);
  this.xPosf=random(0.2,4);
  this.yPosf=random(0.2,2);

  var plusOrMinus = Math.random() < 0.5 ? -1 : 1;

  this.xPosPlus=random(this.d,width-this.d/2);
  this.yPosPlus=random(this.d,height-this.d/2);

  this.disp=function()
  {
    fill(249, 220, 92);
    noStroke();
    ellipse(this.xPos,this.yPos,this.d,this.d);
    stroke('rgba(249, 220, 92, 0.6)');
    noFill();
    ellipse(this.xPos,this.yPos,this.d*2,this.d*2);
    stroke('rgba(249, 220, 92, 0.3)');
    ellipse(this.xPos,this.yPos,this.d*4,this.d*4);
    if (Math.abs(mouseX - this.xPos) < 45 && Math.abs(mouseY - this.yPos) < 45) {
      fill('rgba(249, 220, 92, 0.1)');
      ellipse(this.xPos,this.yPos,this.d*4,this.d*4);
    }
    if (Math.abs(mouseX - this.xPos) < 15 && Math.abs(mouseY - this.yPos) < 15) {
      fill('rgba(249, 220, 92, 0.2)');
      ellipse(this.xPos,this.yPos,this.d*4,this.d*4);
    }
    if (Math.abs(mouseX - this.xPos) < 5 && Math.abs(mouseY - this.yPos) < 5) {
      fill('rgba(249, 220, 92, 0.3)');
      ellipse(this.xPos,this.yPos,this.d*4,this.d*4);
    }
  };
  
  this.move=function()
  {
    this.xPos += this.xPosf * plusOrMinus;
    this.yPos += this.yPosf * plusOrMinus;
    if(this.xPos > width-this.d/2) {
      this.xPos = 0 + this.d/2;
    } else if (this.xPos < this.d/2) {
      this.xPos = width - this.d/2;
    }
    if (this.yPos > height-this.d/2) {
      this.yPos = 0 + this.d/2;
    } else if (this.yPos < this.d/2) {
      this.yPos = height - this.d/2;
    }
  };

  this.connect = function(other)
  {
    if(dist(this.xPos,this.yPos,other.xPos,other.yPos) < link / 2)
    {
    stroke('rgba(49, 133, 252, .2)');
    noFill();
    beginShape();
    vertex(this.xPos, this.yPos);
    bezierVertex(this.xPosPlus, this.yPos, other.xPos, other.yPosPlus, other.xPos, other.yPos);
    endShape();
    }
  };
  
  this.exconnect = function(other)
  {
    if(dist(this.xPos,this.yPos,other.xPos,other.yPos) < link / 1.5)
    {
    stroke('rgba(49, 133, 252, .1)');
    noFill();
    beginShape();
    vertex(this.xPos, this.yPos);
    bezierVertex(this.xPosPlus, this.yPos, other.xPos, other.yPosPlus, other.xPos, other.yPos);
    endShape();
    }
  };

this.axconnect = function(other)
  {
    if(dist(this.xPos,this.yPos,other.xPos,other.yPos) < link)
    {
    stroke('rgba(49, 133, 252, .025)');
    noFill();
    beginShape();
    vertex(this.xPos, this.yPos);
    bezierVertex(this.xPosPlus, this.yPos, other.xPos, other.yPosPlus, other.xPos, other.yPos);
    endShape();
    }
  };
  
  this.reconnect = function(other)
  {
    if(dist(this.xPos,this.yPos,other.xPos,other.yPos) < link * 1.5)
    {
    stroke('rgba(249, 220, 92, .05)');
    line(this.xPos,this.yPos,other.xPos,other.yPos);
    }
  };
}
