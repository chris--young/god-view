'use strict'

function loadObj(path, invert) {
  return fetch(path)
    .then(res => res.text())
    .then((text) => {
      const vs = [];
      const vts = [];
      const vns = [];
      const shape = [];
      const normals = [];
      const texture = [];

      text.split('\n').forEach((line) => {
        if (/^v [\-\d\.]* [\-\d\.]* [\-\d\.]*$/.test(line)) {
          vs.push(line.substr(2).split(' ').map(Number));
        } else if (/^vt [\-\d\.]* [\-\d\.]*$/.test(line)) {
          vts.push(line.substr(3).split(' ').map(Number));
        } else if (/^vn [\-\d\.]* [\-\d\.]* [\-\d\.]*$/.test(line)) {
          vns.push(line.substr(3).split(' ').map(Number));
        } else if (/^f [\d\.]*\/[\d\.]*\/[\d\.]* [\d\.]*\/[\d\.]*\/[\d\.]* [\d\.]*\/[\d\.]*\/[\d\.]*$/.test(line)) {
          const points = line.substr(2).split(' ');

          points.forEach((point) => {
            const parts = point.split('/');

            vs[parts[0] - 1].forEach(v => shape.push(v));
            vts[parts[1] - 1].forEach(vt => texture.push(vt));
            vns[parts[2] - 1].forEach(vn => normals.push(vn));
          });
        }
      });

      return { shape, normals, texture };
    });
}
