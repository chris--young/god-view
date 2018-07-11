'use strict'

const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl');

const _360_DEGREES = Math.PI * 2;
const ONE_DEGREE = _360_DEGREES / 360;

const loadPrograms = Promise.all([
  loadProgram('shaders/earth'),
  loadProgram('shaders/heart')
]);

const setting = window.location.href.match(/([a-z]*)\=([a-z]*)/);
const key = setting && setting[1];
const value = setting && setting[2];

let size = 'large';

if (key === 'quality') {
  switch (value) {
    case 'low':
      size = 'small';
      break;
    case 'medium':
      size = 'medium';
      break;
    case 'high':
      size = 'large';
      break;
  }
}

loadPrograms.then((programs) => {

  const light = {
    position: LA.Vector(Array)(3)(),
    color: LA.Vector(Array)(3)([0.9, 0.9, 0.9]),
    brightness: 0.9,
    rotation: ONE_DEGREE * 90
  };

  const camera = {
    rotation: LA.Vector(Array)(3)([0, 0, 0]),
    position: orbit(0, 0, 0, 1)
  };

  initGL(light, programs);

  const loadAssets = Promise.all([
    loadObj(`models/${size}/sphere.obj`),
    loadObj('models/heart2.obj'),
    loadTexture(programs[0], `textures/${size}/colormap.png`, 'u_texture', 0),
    loadTexture(programs[0], `textures/${size}/specmask.png`, 'u_specularMask', 1),
    loadTexture(programs[0], `textures/${size}/bumpmap.png`, 'u_bumpMap', 2),
    loadTexture(programs[0], `textures/${size}/citylights.png`, 'u_cityLights', 3),
    loadTexture(programs[0], `textures/${size}/clouds.png`, 'u_clouds', 4)
  ]);

  loadAssets.then((assets) => {

    const earth = {
      obj: assets[0],
      rotation: LA.Vector(Array)(3)([0, Math.PI, 0]),
      program: programs[0],
      shininess: 30,
      color: assets[1],
      specularColor: LA.Vector(Array)(3)([0.2, 0.6, 0.8])
    };

    let rgb = 1 / 255;

    const heart = {
      obj: assets[1],
      rotation: LA.Vector(Array)(3)(),
      size: 0.025,
      program: programs[1],
      shininess: 10,
      specularColor: LA.Vector(Array)(3)([253 * rgb, 120 * rgb, 90 * rgb]),
      attack: 2000,
      sustain: 2000,
      decay: 2000
    };

    function match(gps) {
      const now = Date.now();
      const x = gps.lat * ONE_DEGREE;
      const y = gps.lon * ONE_DEGREE;

      return Object.assign({}, heart, {
        birth: now,
        death: now + heart.attack + heart.sustain + heart.decay,
        color: LA.Vector(Array)(4)([248 * rgb, 45 * rgb, 125 * rgb, 1]),
        offset: [x + Math.PI, y],
        position: orbit(0.025, x, y, 0.02)
      });
    }

    const bodies = [
      match({ lat: 0, lon: 0 }),
      match({ lat: 34.052235, lon: -118.243683 }) // LA
    ];

    console.log(bodies);

    function loop() {
      const now = Date.now();
      const c = camera.position.reduce((a, b) => a.concat(b));

      // earth.rotation[1] += 0.001;
      // light.rotation = 0; // (15 * (new Date(now).getUTCHours() + 1));

      const x = Math.cos(light.rotation);
      const z = Math.sin(light.rotation);

      light.position = LA.Vector(Array)(3)([x, 0, z]);

      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(earth.program);
      bindUniform(earth.program, 'u_specularColor', 'uniform3fv', earth.specularColor);
      bindUniform(earth.program, 'u_shininess', 'uniform1f', earth.shininess);
      bindAttribute(earth.program, 'a_shape', earth.obj.shape, 3);
      bindAttribute(earth.program, 'a_normal', earth.obj.normals, 3);
      bindAttribute(earth.program, 'a_texture', earth.obj.texture, 2);

      bindUniform(earth.program, 'u_lightPosition', 'uniform3fv', light.position);
      bindUniform(earth.program, 'u_camera', 'uniformMatrix4fv', c);
      bindUniform(earth.program, 'u_rotation', 'uniform3fv', earth.rotation);

      gl.drawArrays(gl.TRIANGLES, 0, earth.obj.shape.length / 3);

      bodies.forEach((body, index) => {
        if (now > body.death)
          return bodies.splice(index, 1);
      });

      bodies.forEach((body) => {
        /* if (Date.now() < body.time + body.attack)
          body.color[3] += 0.01;
        else if (Date.now() > body.time + body.attack + body.sustain &&
                 Date.now() < body.time + body.attack + body.sustain + body.decay)
          body.color[3] -= 0.01; */

        body.position = orbit(heart.size, earth.rotation[0] + body.offset[0], earth.rotation[1] + body.offset[1], 0.01);

        const nxc = Math.cos(-earth.rotation[0] - body.offset[0]);
        const nxs = Math.sin(-earth.rotation[0] - body.offset[0]);

        const nxMatrix = LA.Matrix(Array)(4)([
          [1,   0,    0, 0],
          [0, nxc, -nxs, 0],
          [0, nxs,  nxc, 0],
          [0,   0,    0, 1]
        ]);

        const nyc = Math.cos(ONE_DEGREE * 90);
        const nys = Math.sin(ONE_DEGREE * 90);

        const nyMatrix = LA.Matrix(Array)(4)([
          [ nyc, 0, nys, 0],
          [   0, 1,   0, 0],
          [-nys, 0, nyc, 0],
          [   0, 0,   0, 1]
        ]);

        const p = LA.multiply(body.position, nxMatrix, nyMatrix).reduce((a, b) => a.concat(b));

        gl.useProgram(body.program);
        bindUniform(body.program, 'u_color', 'uniform4fv', body.color);
        bindUniform(body.program, 'u_specularColor', 'uniform3fv', body.specularColor);
        bindUniform(body.program, 'u_shininess', 'uniform1f', body.shininess);
        bindAttribute(body.program, 'a_shape', body.obj.shape, 3);
        bindAttribute(body.program, 'a_normal', body.obj.normals, 3);

        bindUniform(body.program, 'u_lightPosition', 'uniform3fv', light.position);
        bindUniform(body.program, 'u_camera', 'uniformMatrix4fv', c);
        bindUniform(body.program, 'u_size', 'uniform1f', body.size);
        bindUniform(body.program, 'u_rotation', 'uniform3fv', body.rotation);
        bindUniform(body.program, 'u_position', 'uniformMatrix4fv', p);

        gl.drawArrays(gl.TRIANGLES, 0, body.obj.shape.length / 3);
      });

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);

    setInterval(() => {
      const lat = getRandomInt(-90, 90);
      const lon = getRandomInt(-180, 180);

      bodies.push(match({ lat, lon }))
    }, 1000);

    function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
    }

    document.addEventListener('keydown', (event) => {
      switch (event.which) {
        case 39: // right
          light.rotation -= ONE_DEGREE;
          break;
        case 37: // left
          light.rotation += ONE_DEGREE;
          break;
      }
    });

    let drag = false;

    document.addEventListener('mouseup', () => {
      drag = false;
      document.body.style.cursor = '-webkit-grab';
    });

    document.addEventListener('mousedown', () => {
      drag = true;
      document.body.style.cursor = '-webkit-grabbing';
    });

    document.addEventListener('mousemove', (event) => {
      if (drag) {
        camera.rotation[1] -= ONE_DEGREE * event.movementX * 0.5;
        camera.rotation[0] -= ONE_DEGREE * event.movementY * 0.5;
        camera.position = orbit(0, camera.rotation[0], camera.rotation[1], 1);

        const x = camera.rotation[1] % _360_DEGREES * 2;
        const y = camera.rotation[0] % _360_DEGREES * 2;

        document.body.style.backgroundPosition = `${x}% ${y}%`;
      }
    });

  });

});

function orbit(size, x, y, distance) {
  const z = 1 + size + distance;

  const tMatrix = LA.Matrix(Array)(4)([
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, z],
    [0, 0, 0, 1]
  ]);

  const xc = Math.cos(x);
  const xs = Math.sin(x);

  const xMatrix = LA.Matrix(Array)(4)([
    [1,  0,   0, 0],
    [0, xc, -xs, 0],
    [0, xs,  xc, 0],
    [0,  0,   0, 1]
  ]);

  const yc = Math.cos(y);
  const ys = Math.sin(y);

  const yMatrix = LA.Matrix(Array)(4)([
    [ yc, 0, ys, 0],
    [  0, 1,  0, 0],
    [-ys, 0, yc, 0],
    [  0, 0,  0, 1]
  ]);

  return LA.multiply(yMatrix, xMatrix, tMatrix);
}
