'use strict';

const vxShaderStr =
`#version 300 es
in vec3 aVertexPosition;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

void main(void)
{
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
}
`;

const fsShaderStr =
`#version 300 es
precision highp float;
 
//uniform float uColorInd;
//uniform sampler2D uTexture;
uniform float uCellWidth;
uniform float uTime;
uniform float offX, offY, zoom;
uniform sampler2D Tex2D;
 
out vec4 oColor;

vec2 CmpSet( float r, float i )
{
  vec2 R;

  R.x = r;
  R.y = i;
 
  return R;
}
 
vec2 CmpAdd( vec2 A, vec2 B )
{
  return vec2(A.x + B.x, A.y + B.y);
}
 
vec2 CmpMul( vec2 A, vec2 B )
{
  return vec2(A.x * B.x - A.y * B.y, A.x * B.y + A.y * B.x);
}
 
float CmpLen( vec2 A )
{
  return sqrt(A.x * A.x + A.y * A.y);
}
 
int Mand( vec2 Z )
{
  int n = 0;
  vec2 Z0 = Z;
 
  while (n < 255 && CmpLen(Z) < 2.)
  {
    Z = CmpAdd(CmpMul(Z, Z), Z0);
    n++;
  }
  return n;
}
 
void main(void)
{
  vec2 Z;
  int color;
  vec2 xy = vec2(gl_FragCoord) / 500.0;

  xy.x -= 0.5 + offX;
  xy.y -= 0.5 + offY;
  xy *= (-zoom + 1.) / 25.;
  //xy /= zoom;

 
  Z = vec2(gl_FragCoord.x / 130. - 2., gl_FragCoord.y / 130. - 2.);
  Z += xy;
  color = Mand(Z);
  oColor = vec4(color / 13 * 4/* * sin(uTime)*/ % 255, color * 315 % 255, (color + 1) * 52 % 255, 1.);
  //texture(uTexture, vec2(float(color) / 255., 0.5)); 
  oColor.xyz *= uCellWidth;
}`;

let gl;
function initGL (canvas) {
  try {
    gl = canvas.getContext('webgl2');
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  } catch (e) {
  }
  if (!gl) {
    alert('Could not initialize WebGL');
  }
}

function getShader (gl, type, str) {
  let shader;
  shader = gl.createShader(type);

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

let shaderProgram;

function initShaders () {
  let fragmentShader = getShader(gl, gl.FRAGMENT_SHADER, fsShaderStr);
  let vertexShader = getShader(gl, gl.VERTEX_SHADER, vxShaderStr);

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Could not initialize shaders');
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, 'uPMatrix');
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, 'uMVMatrix');
  shaderProgram.uCellWidth = gl.getUniformLocation(shaderProgram, 'uCellWidth');
  shaderProgram.uTime = gl.getUniformLocation(shaderProgram, 'uTime');
  shaderProgram.offX = gl.getUniformLocation(shaderProgram, 'offX');
  shaderProgram.offY = gl.getUniformLocation(shaderProgram, 'offY');
  shaderProgram.zoom = gl.getUniformLocation(shaderProgram, 'zoom');
  shaderProgram.Tex2D = gl.getUniformLocation(shaderProgram, 'Tex2D');

}

let mvMatrix = mat4.create();
let pMatrix = mat4.create();
let checkersCellWidth = 30;
let timeMs = Date.now();
let startTime = Date.now();
let offX = 0.0;
let offY = 0.0;
let zoom = 1.0;
let Tex2D;

function setUniforms () {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
  gl.uniform1f(shaderProgram.uCellWidth, checkersCellWidth);
  gl.uniform1f(shaderProgram.uTime, timeMs);
  gl.uniform1f(shaderProgram.offX, offX);
  gl.uniform1f(shaderProgram.offY, offY);
  gl.uniform1f(shaderProgram.zoom, zoom);
}

let squareVertexPositionBuffer;

function initBuffers () {
  squareVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  let vertices = [
    1.0, 1.0, 0.0,
    -1.0, 1.0, 0.0,
    1.0, -1.0, 0.0,
    -1.0, -1.0, 0.0
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  squareVertexPositionBuffer.itemSize = 3;
  squareVertexPositionBuffer.numItems = 4;
}

function drawScene () {
  timeMs = (Date.now() - startTime) / 1000;
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

  mat4.identity(mvMatrix);

  mat4.translate(mvMatrix, [-1.5, 0.0, -7.0]);

  mat4.translate(mvMatrix, [1.5, 0.0, 4.55]);
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  setUniforms();
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
}

function tick () {
  window.requestAnimationFrame(tick);
  updateCheckersCellWidth();
  drawScene();
  // console.log('tick' + new Date());
}

function loadTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  let isPowerOf2 = function (value) {
    return (value & (value - 1)) == 0;
  }
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
      width, height, border, srcFormat, srcType,
      pixel);

  const image = new Image();
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        srcFormat, srcType, image);

    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = url;

  return texture;
}
function webGLStart () {
  // default cell width
  document.getElementById('inputCheckersCellWidth').value = 30;

  let canvas = document.getElementById('webglCanvas');
  canvas.addEventListener('mousemove', control);
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('mouseout', mouseUp);
  canvas.addEventListener('wheel', mouseWheel);
  initGL(canvas);
  Tex2D = loadTexture(gl, 'myImage.png');
  initShaders();
  initBuffers();


  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  tick();
}

function updateCheckersCellWidth () {
  let data = document.getElementById('inputCheckersCellWidth').value;
  checkersCellWidth = parseInt(data);
  if (isNaN(checkersCellWidth)) checkersCellWidth = 1;
}

let xNew, xOld, yNew, yOld;
let IsClicked = false;

function mouseDown() {
  IsClicked = true;
}

function mouseUp() {
  IsClicked = false;
  xNew = undefined;
  yNew = undefined;
}

function mouseWheel(e) {
  let oldZoom = zoom;
  zoom += e.wheelDelta / 240.0;
  if (zoom <= 0) {
    zoom = 0.1
  }
  else {
    // offX += (zoom - oldZoom) / 100;
    // offY += (zoom - oldZoom) / 100
  }
  console.log(oldZoom, zoom, e.wheelDelta)
}

function control(e) {
  if (IsClicked) {
    xOld = xNew;
    xNew = e.clientX;
    yOld = yNew;
    yNew = e.clientY;
    if (xOld !== undefined) {
      offX += (xNew - xOld) / 200.0
    }
    if (yOld !== undefined) {
      offY += (yOld - yNew) / 200.0
    }
  }
}
document.body.onload = webGLStart;

