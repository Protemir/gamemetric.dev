// Зрители вдоль поля и аул за ними: люди в шапках (часть — в цветах команд), верёвка-ограждение, юрты.
// Всё instanced: ~700 человек за 3 вызова отрисовки. На гол зрители подпрыгивают и машут.
import * as THREE from 'three';

const excite = { value: 0 }, time = { value: 0 };
function bounce(mat) { // общий для тела и головы сдвиг вверх: фаза от позиции экземпляра
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.excite = excite; sh.uniforms.time = time;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float excite; uniform float time;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 3.1;
        float idle = sin(time * 1.3 + ph) * .015;
        transformed.y += idle + excite * abs(sin(time * 9. + ph)) * .28;`);
  };
  return mat;
}
const CLOTHES = ['#3a3a42', '#5a4632', '#2c3a52', '#6b2a2a', '#4a5a3a', '#7a6a58', '#1f1f24', '#8a7a62', '#3c2f4a', '#565656'];

function yurt() {
  const g = new THREE.Group();
  const felt = new THREE.CanvasTexture((() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#e9e1cf'; x.fillRect(0, 0, 256, 64);
    x.fillStyle = '#a3242c'; x.fillRect(0, 6, 256, 9); // орнаментальная лента
    x.strokeStyle = '#e2a83a'; x.lineWidth = 2;
    for (let i = 0; i < 256; i += 16) { x.beginPath(); x.arc(i + 8, 10, 3.5, 0, 6.3); x.stroke(); }
    for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(120,100,70,${Math.random() * 0.08})`; x.fillRect(Math.random() * 256, 16 + Math.random() * 48, 3, 3); }
    return c;
  })());
  felt.colorSpace = THREE.SRGBColorSpace; felt.wrapS = THREE.RepeatWrapping; felt.repeat.set(3, 1);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 1.9, 28, 1, true), new THREE.MeshLambertMaterial({ map: felt, side: THREE.DoubleSide }));
  wall.position.y = 0.95; g.add(wall);
  const roof = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(3.5, 0), new THREE.Vector2(2.6, 0.75), new THREE.Vector2(1.2, 1.35), new THREE.Vector2(0.55, 1.5)], 28), new THREE.MeshLambertMaterial({ color: '#ddd3bd', side: THREE.DoubleSide }));
  roof.position.y = 1.9; g.add(roof);
  const top = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 6, 20), new THREE.MeshLambertMaterial({ color: '#6b4a2a' }));
  top.rotation.x = Math.PI / 2; top.position.y = 3.42; g.add(top); // шаңырақ
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), new THREE.MeshLambertMaterial({ color: '#8a3a1c' }));
  door.position.set(0, 0.7, 3.42); g.add(door);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function makeCrowd(scene, { lenX = 60, rowZ = 43 } = {}) {
  const root = new THREE.Group();
  const people = [];
  // ряды по длинным сторонам и за казанами, с просветами
  for (const side of [-1, 1]) for (let row = 0; row < 3; row++) for (let x = -lenX; x <= lenX; x += 1.05 + Math.random() * 0.5) {
    if (Math.random() < 0.12) continue;
    people.push([x + (Math.random() - 0.5) * 0.4, side * (rowZ + row * 1.25 + Math.random() * 0.4), row]);
  }
  for (const side of [-1, 1]) for (let row = 0; row < 2; row++) for (let z = -26; z <= 26; z += 1.2 + Math.random() * 0.6) {
    if (Math.random() < 0.15) continue;
    people.push([side * (72 + row * 1.3 + Math.random() * 0.4), z, row]);
  }
  const N = people.length;
  const bodyGeo = new THREE.CapsuleGeometry(0.21, 0.78, 3, 8); bodyGeo.translate(0, 0.62, 0);
  const headGeo = new THREE.SphereGeometry(0.13, 10, 8); headGeo.translate(0, 1.36, 0);
  const hatGeo = new THREE.ConeGeometry(0.15, 0.24, 8); hatGeo.translate(0, 1.55, 0); // қалпақ
  const bodies = new THREE.InstancedMesh(bodyGeo, bounce(new THREE.MeshLambertMaterial()), N);
  const heads = new THREE.InstancedMesh(headGeo, bounce(new THREE.MeshLambertMaterial({ color: '#c79a76' })), N);
  const hats = new THREE.InstancedMesh(hatGeo, bounce(new THREE.MeshLambertMaterial()), N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  people.forEach(([x, z, row], i) => {
    const k = 0.9 + Math.random() * 0.22;
    p.set(x, row * 0.12, z); // задние ряды чуть выше — как на насыпи
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.atan2(-x, -z) + (Math.random() - 0.5) * 0.6); // смотрят на поле
    s.set(k, k * (0.92 + Math.random() * 0.16), k);
    m.compose(p, q, s);
    bodies.setMatrixAt(i, m); heads.setMatrixAt(i, m); hats.setMatrixAt(i, m);
    heads.setColorAt(i, c.set('#c79a76').offsetHSL(0, 0, (Math.random() - 0.5) * 0.12));
    hats.setColorAt(i, c.set(Math.random() < 0.6 ? '#f0ece2' : '#2a2420'));
  });
  for (const im of [bodies, heads, hats]) { im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; root.add(im); }
  // верёвка на столбиках вдоль поля
  const postMat = new THREE.MeshLambertMaterial({ color: '#8a6a44' }), ropeMat = new THREE.LineBasicMaterial({ color: '#e8dcc0' });
  for (const side of [-1, 1]) {
    const pts = [];
    for (let x = -lenX; x <= lenX; x += 6) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.1, 5), postMat);
      post.position.set(x, 0.55, side * (rowZ - 1.6)); root.add(post);
      pts.push(new THREE.Vector3(x, 1.0, side * (rowZ - 1.6)));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ropeMat));
  }
  // аул за зрителями
  for (const [x, z, r] of [[-34, -60, 0.3], [-14, -63, -0.2], [12, -61, 0.5], [36, -64, 0], [-24, 62, 2.9], [20, 63, 3.3]]) {
    const y = yurt(); y.position.set(x, 0, z); y.rotation.y = r + (z > 0 ? Math.PI : 0); root.add(y);
  }
  scene.add(root);

  let cheerT = 0;
  return {
    root,
    paint(teamA, teamB) { // треть болеет за своих (одежда цвета команды), остальные — в обычном
      people.forEach(([x, z], i) => {
        const r = Math.random();
        const col = r < 0.18 ? teamA : r < 0.34 ? teamB : CLOTHES[(Math.random() * CLOTHES.length) | 0];
        bodies.setColorAt(i, c.set(col).offsetHSL(0, -0.05, (Math.random() - 0.5) * 0.08));
      });
      bodies.instanceColor.needsUpdate = true;
    },
    cheer(sec = 3) { cheerT = sec; },
    update(dt) {
      time.value += dt;
      cheerT = Math.max(0, cheerT - dt);
      excite.value += ((cheerT > 0 ? 1 : 0.06) - excite.value) * (1 - Math.exp(-dt * 4));
    },
  };
}
