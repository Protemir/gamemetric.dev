// Казан для көкпара — как строят в аулах: кольцо старых грузовых покрышек в два яруса,
// внутри утрамбованная земля бугристой шапкой, вокруг вытоптанная копытами тёмная земля.
// Верхний ярус покрашен через одну: белая и цвета команды (краска облезла, в пыли).
import * as THREE from 'three';

function canvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}
function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
// протектор: поперечные шашки по окружности покрышки (u — вдоль покрышки, v — поперёк)
const treadCanvas = canvas(256, 64, (g, w, h) => {
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 16) {
    g.fillStyle = '#3a3a3a';
    g.fillRect(x, 6, 7, 22); g.fillRect(x + 8, 36, 7, 22); // шашки протектора в шахматном порядке
  }
  g.fillStyle = '#555'; g.fillRect(0, 30, w, 4); // центральная канавка
});
const treadNormal = (() => { // из протектора — карта нормалей (выпуклые шашки)
  const src = treadCanvas.getContext('2d').getImageData(0, 0, 256, 64).data;
  return tex(canvas(256, 64, (g, w, h) => {
    const d = g.createImageData(w, h), H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = (H(x - 1, y) - H(x + 1, y)) * 2.5, ny = (H(x, y - 1) - H(x, y + 1)) * 2.5, i = (y * w + x) * 4;
      d.data[i] = 128 + nx * 127; d.data[i + 1] = 128 + ny * 127; d.data[i + 2] = 255; d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
  }), false);
})();
function rubber(paint) { // резина, сверху пыль; paint — облезлая краска верхнего яруса
  return new THREE.MeshStandardMaterial({
    map: tex(canvas(256, 64, (g, w, h) => {
      g.fillStyle = paint || '#242322'; g.fillRect(0, 0, w, h);
      const dust = g.createLinearGradient(0, 0, 0, h); // пыль гуще сверху покрышки
      dust.addColorStop(0, 'rgba(165,140,100,0.32)'); dust.addColorStop(0.5, 'rgba(165,140,100,0.05)'); dust.addColorStop(1, 'rgba(165,140,100,0.2)');
      g.fillStyle = dust; g.fillRect(0, 0, w, h);
      for (let i = 0; i < (paint ? 70 : 50); i++) { // краска облезла мелкими сколами
        g.fillStyle = paint ? 'rgba(40,38,36,' + (0.5 + Math.random() * 0.4) + ')' : 'rgba(90,86,80,' + Math.random() * 0.3 + ')';
        g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random());
      }
    })),
    normalMap: treadNormal, normalScale: new THREE.Vector2(0.9, 0.9), roughness: paint ? 0.8 : 0.93,
  });
}
// земля насыпи: комья, солома, следы копыт
const soilMap = tex(canvas(256, 256, (g, w, h) => {
  g.fillStyle = '#7a5f3e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const v = Math.random();
    g.fillStyle = v < 0.45 ? `rgba(70,52,32,${0.3 + Math.random() * 0.4})` : v < 0.85 ? `rgba(150,122,84,${0.2 + Math.random() * 0.3})` : `rgba(205,180,120,${0.4})`;
    g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 1 + Math.random() * 3, Math.random() * 3, 0, 6.3); g.fill();
  }
  g.strokeStyle = 'rgba(215,190,130,0.5)'; g.lineWidth = 1; // соломинки
  for (let i = 0; i < 120; i++) { const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8); g.stroke(); }
}));
soilMap.repeat.set(2, 2);

export function makeKazan(teamColor, R) {
  const g = new THREE.Group();
  // покрышки лежат плашмя по кругу, два яруса со сдвигом на половину покрышки
  const TR = 0.5, TT = 0.2, ring = R + 0.05, LAYERS = 3;
  // профиль покрышки: широкий протектор, плоские боковины, скруглённые плечи (а не бублик)
  const prof = [], ri = TR - TT * 1.1, ro = TR + TT, hh = TT * 0.85, rr = 0.06;
  for (let i = 0; i <= 4; i++) { const a = (i / 4) * Math.PI / 2; prof.push(new THREE.Vector2(ro - rr + Math.sin(a) * rr, -hh + rr - Math.cos(a) * rr)); }
  for (let i = 0; i <= 4; i++) { const a = (i / 4) * Math.PI / 2; prof.push(new THREE.Vector2(ro - rr + Math.cos(a) * rr, hh - rr + Math.sin(a) * rr)); }
  prof.push(new THREE.Vector2(ri + 0.03, hh * 0.8), new THREE.Vector2(ri, hh * 0.3), new THREE.Vector2(ri, -hh * 0.3), new THREE.Vector2(ri + 0.03, -hh * 0.8));
  prof.push(prof[0].clone());
  const tire = new THREE.LatheGeometry(prof, 18);
  const n = Math.floor((2 * Math.PI * ring) / (TR * 2.05));
  const team = new THREE.Color(teamColor).lerp(new THREE.Color('#9a8a70'), 0.25).getStyle();
  const mats = [rubber(), rubber('#d8d2c4'), rubber(team)];
  const lists = [[], [], []];
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), Pp = new THREE.Vector3();
  for (let layer = 0; layer < LAYERS; layer++) for (let i = 0; i < n; i++) {
    const a = ((i + layer * 0.5) / n) * Math.PI * 2;
    Pp.set(Math.cos(a) * ring, TT * 0.85 + layer * TT * 1.75 + (Math.random() - 0.5) * 0.02, Math.sin(a) * ring);
    Q.setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.08, Math.random() * 6.3, (Math.random() - 0.5) * 0.08)); // лежат неровно
    const m = layer < LAYERS - 1 ? 0 : i % 2 ? 1 : 2; // верхний ярус покрашен через одну
    lists[m].push(M.compose(Pp, Q, S).clone());
  }
  lists.forEach((l, k) => {
    const im = new THREE.InstancedMesh(tire, mats[k], l.length);
    l.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = im.receiveShadow = true;
    g.add(im);
  });
  // насыпь внутри: от верхнего яруса покрышек шапкой вверх, с комьями
  const topY = TT * 0.85 + (LAYERS - 1) * TT * 1.75 + TT * 0.6;
  const mp = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; mp.push(new THREE.Vector2(Math.max(0.001, (1 - t) * (ring - 0.05)), topY - 0.02 + Math.pow(t, 0.6) * 0.45)); }
  const mound = new THREE.LatheGeometry(mp, 48);
  const p = mound.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) + Math.sin(x * 5.3 + z * 2.1) * 0.035 + Math.sin(z * 7.7 - x * 3.4) * 0.025); }
  mound.computeVertexNormals();
  const fill = new THREE.Mesh(mound, new THREE.MeshStandardMaterial({ map: soilMap, roughness: 1, side: THREE.DoubleSide }));
  fill.castShadow = fill.receiveShadow = true;
  g.add(fill);
  // под покрышками — земля, чтобы не просвечивало
  const core = new THREE.Mesh(new THREE.CylinderGeometry(ring - 0.1, ring - 0.1, topY, 32, 1, true), new THREE.MeshStandardMaterial({ map: soilMap, roughness: 1, side: THREE.DoubleSide }));
  core.position.y = topY / 2; g.add(core);
  // вытоптанная земля вокруг: текстура в плане (комья и следы копыт), к степи плавно исчезает
  const trampled = tex(canvas(256, 256, (c, w, h) => {
    c.fillStyle = 'rgb(104,80,50)'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { const v = Math.random(); c.fillStyle = v < 0.5 ? 'rgba(70,52,32,' + (0.3 + Math.random() * 0.4) + ')' : 'rgba(150,124,86,' + (0.2 + Math.random() * 0.3) + ')'; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2, Math.random() * 3, 0, 6.3); c.fill(); }
    for (let i = 0; i < 22; i++) { const x = Math.random() * w, y = Math.random() * h; c.fillStyle = 'rgba(50,36,22,0.3)'; c.beginPath(); c.ellipse(x, y, 5, 6, Math.random() * 3, 0, 6.3); c.fill(); c.fillStyle = 'rgba(120,96,62,0.35)'; c.beginPath(); c.ellipse(x, y + 2, 2, 2.5, 0, 0, 6.3); c.fill(); }
  }));
  const apronMat = new THREE.MeshLambertMaterial({ map: trampled, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  apronMat.onBeforeCompile = (sh) => { // прозрачность по расстоянию от центра казана
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vR;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvR = length(position.xy);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vR;').replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.a *= 0.92 * (1.0 - smoothstep(' + (R + 1.5).toFixed(1) + ', ' + (R + 8).toFixed(1) + ', vR));');
  };
  const apron = new THREE.Mesh(new THREE.CircleGeometry(R + 8, 64), apronMat);
  const uv = apron.geometry.attributes.uv, pa = apron.geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pa.getX(i) / 4, pa.getY(i) / 4); // плитка 4×4 м
  apron.rotation.x = -Math.PI / 2; apron.position.y = 0.02; apron.receiveShadow = true;
  g.add(apron);
  g.userData.topY = topY + 0.3; // куда ложится туша после гола
  return g;
}
