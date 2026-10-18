// Серке — муляж туши козла, как на официальных турнирах (кожаное чучело в козьей шкуре, без головы и крови):
// тело-бочонок, культя шеи перетянута верёвкой, обрубки ног связаны попарно, короткий хвост.
// Длинная ось — X (голова к +X), ноги вниз (−Y). Размер как у настоящего: ~0,9 м, «вес» ~30 кг.
import * as THREE from 'three';

function furTexture(w, h, base, belly) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  // спина темнее, к брюху (низ текстуры) светлее
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, base); gr.addColorStop(0.62, base); gr.addColorStop(1, belly);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // пятна: бурые и тёмные, с мягкими краями (пёстрый козёл)
  for (let i = 0; i < 7; i++) {
    const x = Math.random() * w, y = Math.random() * h * 0.7, r = 25 + Math.random() * 60;
    const col = Math.random() < 0.6 ? '122,86,54' : '58,46,38';
    for (let k = 0; k < 6; k++) {
      const rx = x + (Math.random() - 0.5) * r * 0.8, ry = y + (Math.random() - 0.5) * r * 0.5, rr = r * (0.4 + Math.random() * 0.5);
      const pg = g.createRadialGradient(rx, ry, 0, rx, ry, rr);
      pg.addColorStop(0, `rgba(${col},0.85)`); pg.addColorStop(0.7, `rgba(${col},0.6)`); pg.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = pg; g.beginPath(); g.ellipse(rx, ry, rr * 1.3, rr * 0.8, Math.random(), 0, 6.3); g.fill();
    }
  }
  g.lineCap = 'round';
  for (let i = 0; i < 9000; i++) { // шерстинки: длинные, вдоль тела, с завитками
    const x = Math.random() * w, y = Math.random() * h, l = 4 + Math.random() * 10, a = 0.15 + (Math.random() - 0.5) * 0.7;
    const light = Math.random();
    g.strokeStyle = light < 0.35 ? `rgba(40,30,20,${0.1 + Math.random() * 0.14})` : `rgba(${225 + Math.random() * 30},${215 + Math.random() * 30},${195 + Math.random() * 30},${0.2 + Math.random() * 0.25})`; // светлые шерстинки, редкие тёмные
    g.lineWidth = 0.6 + Math.random() * 0.9;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 + 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  // грязь и пыль степи
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(120,95,60,${Math.random() * 0.18})`; g.beginPath(); g.ellipse(Math.random() * w, h * (0.5 + Math.random() * 0.5), 6 + Math.random() * 20, 3 + Math.random() * 8, 0, 0, 6.3); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
// бугристая поверхность шерсти — карта нормалей из шума
function bumpTexture(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) {
    const x = Math.random() * w, y = Math.random() * h, l = 3 + Math.random() * 8;
    const nx = 128 + (Math.random() - 0.5) * 120, ny = 128 + (Math.random() - 0.5) * 120;
    g.strokeStyle = `rgb(${nx|0},${ny|0},235)`; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (Math.random() - 0.5) * 3); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function makeSerke() {
  const g = new THREE.Group();
  const hide = new THREE.MeshStandardMaterial({ map: furTexture(512, 256, '#d6cbb8', '#efe8da'), normalMap: bumpTexture(256, 128), normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.95 });
  hide.map.repeat.set(2, 1); hide.normalMap.repeat.set(3, 2);
  const legHide = hide.clone(); legHide.map = hide.map.clone(); legHide.map.repeat.set(1, 0.5); legHide.map.needsUpdate = true;
  const rope = new THREE.MeshStandardMaterial({ color: '#7a6040', roughness: 0.9 });
  // тело: профиль бочонка вдоль X (грудь шире, к крупу уже), чуть сплюснуто с боков, с неровностями
  const prof = [];
  const L = 0.9;
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const r = 0.2 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + t * 0.94)), 0.55) * (1 + 0.12 * Math.sin(t * Math.PI * 1.3)) + 0.012;
    prof.push(new THREE.Vector2(Math.max(0.03, r), t * L - L / 2));
  }
  const bodyGeo = new THREE.LatheGeometry(prof, 28);
  bodyGeo.rotateZ(-Math.PI / 2); // ось вращения → X
  const p = bodyGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.05 * Math.sin(x * 23 + z * 9) + 0.04 * Math.sin(y * 17 + x * 5); // бугристость набивки
    p.setXYZ(i, x, y * 0.92 * n + (y < 0 ? y * 0.08 : 0), z * 0.82 * n);
  }
  bodyGeo.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeo, hide);
  body.castShadow = true;
  g.add(body);
  // культя шеи (голова отрезана у муляжа) и перетяжка верёвкой
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.2, 14), hide);
  neck.rotation.z = -Math.PI / 2 + 0.35; neck.position.set(L / 2 + 0.04, 0.06, 0);
  neck.castShadow = true; g.add(neck);
  const neckCap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), new THREE.MeshStandardMaterial({ color: '#7a6248', roughness: 0.8 })); // зашитая кожа
  neckCap.position.set(L / 2 + 0.13, 0.1, 0); neckCap.scale.set(0.5, 1, 1); g.add(neckCap);
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 6, 16), rope);
  tie.rotation.y = Math.PI / 2; tie.rotation.x = 0.35; tie.position.set(L / 2 + 0.06, 0.07, 0); g.add(tie);
  // обрубки ног: передние и задние, связаны попарно у копыт
  const legGeo = new THREE.CapsuleGeometry(0.04, 0.24, 4, 8);
  for (const [lx, pair] of [[L / 2 - 0.16, 'front'], [-L / 2 + 0.16, 'hind']]) {
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, legHide);
      leg.position.set(lx, -0.24, s * 0.06);
      leg.rotation.set(s * 0.25, 0, pair === 'front' ? 0.25 : -0.25); // к другу другу, чуть вперёд/назад
      leg.castShadow = true; g.add(leg);
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.06, 8), new THREE.MeshStandardMaterial({ color: '#1d1712', roughness: 0.6 }));
      hoof.position.set(lx + (pair === 'front' ? 0.09 : -0.09), -0.42, s * 0.015);
      g.add(hoof);
    }
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.013, 6, 14), rope); // верёвка вокруг пары ног
    band.rotation.x = Math.PI / 2; band.position.set(lx + (pair === 'front' ? 0.07 : -0.07), -0.36, 0); g.add(band);
  }
  // хвост
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 8), hide);
  tail.rotation.z = Math.PI / 2 + 0.6; tail.position.set(-L / 2 - 0.02, 0.1, 0); g.add(tail);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
