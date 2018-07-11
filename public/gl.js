'use strict'

function bindUniform(program, key, type, value) {
  gl.useProgram(program);

  const location = gl.getUniformLocation(program, key);

  if (!location)
    throw new Error('Failed to get uniform location: ' + key);

  if (Array.isArray(value))
    value = new Float32Array(value);

  if (type === 'uniformMatrix4fv')
    gl.uniformMatrix4fv(location, false, value);
  else
    gl[type](location, value);
}

function bindAttribute(program, key, value, size) {
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  const location = gl.getAttribLocation(program, key);

  if (!~location)
    throw new Error('Failed to get attribute location: ' + key);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(value), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

function loadTexture(program, path, key, index) {
  return new Promise((resolve) => {
    const img = new Image();

    img.addEventListener('load', () => {
      const texture = gl.createTexture();
      const location = gl.getUniformLocation(program, key);

      gl.useProgram(program);
      gl.activeTexture(gl[`TEXTURE${index}`]);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(location, index);

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resizeImg(img));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.generateMipmap(gl.TEXTURE_2D);

      resolve(texture);
    });

    img.src = path;
  });
}

function initGL(light, programs) {
  const aspect = canvas.clientWidth / canvas.clientHeight;
  const perspective = makeFrustrum(Math.PI / 4, aspect).reduce((a, b) => a.concat(b));

  gl.canvas.width = gl.canvas.clientWidth * window.devicePixelRatio;
  gl.canvas.height = gl.canvas.clientHeight * window.devicePixelRatio;

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  programs.forEach((program) => {
    bindUniform(program, 'u_lightBrightness', 'uniform1f', light.brightness);
    bindUniform(program, 'u_lightColor', 'uniform3fv', light.color);
    bindUniform(program, 'u_perspective', 'uniformMatrix4fv', perspective);
  });
}

function loadProgram(path) {
  const vertexShader = loadShader(`${path}/vertex.glsl`, gl.VERTEX_SHADER);
  const fragmentShader = loadShader(`${path}/fragment.glsl`, gl.FRAGMENT_SHADER);

  return Promise.all([vertexShader, fragmentShader])
    .then((shaders) => {
      const program = gl.createProgram();

      gl.attachShader(program, shaders[0]);
      gl.attachShader(program, shaders[1]);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program);

        gl.deleteProgram(program);

        throw new Error('Failed to link program: ' + log);
      }

      gl.useProgram(program);

      return program;
    });
}

function loadShader(path, type) {
  return fetch(path)
    .then(res => res.text())
    .then((text) => {
      const shader = gl.createShader(type);

      gl.shaderSource(shader, text);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);

        gl.deleteShader(shader);

        throw new Error('Failed to compile shader: ' + log);
      }

      return shader;
    });
}

function resizeImg(img) {
  if (isPowerOfTwo(img.width) && isPowerOfTwo(img.height))
    return img;

  const canvas = document.createElement('canvas');

  canvas.width = nextHighestPowerOfTwo(img.width);
  canvas.height = nextHighestPowerOfTwo(img.height);

  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0, img.width, img.height);

  return canvas;
}

function isPowerOfTwo(x) {
  return (x & (x - 1)) === 0;
}

function nextHighestPowerOfTwo(x) {
  --x;

  for (let i = 1; i < 32; i <<= 1)
    x = x | x >> i;

  return x + 1;
}

function makeFrustrum(fieldOfView, aspect)  {
  const depth = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfView);
  const near = 1;
  const far = 100;
  const range = 1 / (near - far);

  return LA.Matrix(Array)(4)([
    [depth / aspect,     0,                    0,  0],
    [             0, depth,                    0,  0],
    [             0,     0, (near + far) * range, -1],
    [             0,     0,   near * far * range,  1]
  ]);
}
