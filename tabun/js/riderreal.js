// Всадник: персонаж Mixamo (Heraklios — длинный кафтан, сапоги) из «Көкпара», посаженный в седло поворотами костей.
// Кафтан перекрашивается (коричневая ткань → нужный цвет, красная окантовка → золото).
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import * as SkeletonUtils from '../vendor/utils/SkeletonUtils.js';

export async function loadRiderProto(url) {
  const g = await new GLTFLoader().loadAsync(url);
  const root = g.scene;
  root.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.material) o.material.metalness = 0; } });
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  return { root, height: box.max.y - box.min.y };
}

function recolor(img, hue, sat) {
  const k = Math.min(1, 1024 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i] / 255, gg = p[i + 1] / 255, b = p[i + 2] / 255;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, s = mx - mn;
    if (s < 0.06) continue;
    let h = mx === r ? ((gg - b) / s) % 6 : mx === gg ? (b - r) / s + 2 : (r - gg) / s + 4; h *= 60; if (h < 0) h += 360;
    let nh, ns, nl;
    if ((h < 14 || h > 340) && s > 0.25) { nh = 42; ns = 0.75; nl = Math.min(0.75, l * 1.35 + 0.08); }
    else if (h >= 14 && h <= 60 && mx > 0.18) { nh = hue; ns = sat; nl = Math.min(0.62, l * 1.12); }
    else continue;
    const C = (1 - Math.abs(2 * nl - 1)) * ns, X = C * (1 - Math.abs(((nh / 60) % 2) - 1)), m = nl - C / 2;
    const [r1, g1, b1] = nh < 60 ? [C, X, 0] : nh < 120 ? [X, C, 0] : nh < 180 ? [0, C, X] : nh < 240 ? [0, X, C] : nh < 300 ? [X, 0, C] : [C, 0, X];
    p[i] = (r1 + m) * 255; p[i + 1] = (g1 + m) * 255; p[i + 2] = (b1 + m) * 255;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 4;
  return t;
}

const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
const Qa = new THREE.Quaternion(), Qb = new THREE.Quaternion(), Qr = new THREE.Quaternion();
function rot(model, bone, axis, ang) {
  if (!bone || !ang) return;
  model.getWorldQuaternion(Qr).invert();
  bone.parent.getWorldQuaternion(Qa); Qa.premultiply(Qr);
  Qb.setFromAxisAngle(axis, ang);
  bone.quaternion.premultiply(Qa.clone().invert().multiply(Qb).multiply(Qa));
  bone.updateMatrixWorld(true);
}
const SEAT = [
  ['LeftUpLeg', AZ, 0.42], ['RightUpLeg', AZ, -0.42],
  ['LeftUpLeg', AX, -1.15], ['RightUpLeg', AX, -1.15],
  ['LeftLeg', AX, 1.55], ['RightLeg', AX, 1.55],
  ['LeftFoot', AX, -0.35], ['RightFoot', AX, -0.35],
  ['Spine', AX, 0.18],
  ['LeftArm', AZ, -1.2], ['RightArm', AZ, 1.0],
  ['LeftArm', AY, -0.55], ['RightArm', AY, 0.2],
  ['LeftForeArm', AY, -1.1], ['RightForeArm', AY, 0.5],
];

// посаженный всадник: группа с началом координат в тазу, смотрит в −Z (как кони)
export function makeSeatedRider(proto, height, hue, sat) {
  const model = SkeletonUtils.clone(proto.root);
  model.traverse((o) => {
    if (o.isMesh) {
      const mats = [o.material].flat().map((m) => { const nm = m.clone(); if (m.map?.image) nm.map = recolor(m.map.image, hue, sat); return nm; });
      o.material = Array.isArray(o.material) ? mats : mats[0];
      o.frustumCulled = false;
    }
  });
  model.scale.setScalar(height / proto.height);
  model.updateMatrixWorld(true);
  const bone = (n) => model.getObjectByName('mixamorig' + n);
  for (const [b, ax, a] of SEAT) rot(model, bone(b), ax, a);
  const root = new THREE.Group();
  root.add(model);
  model.updateMatrixWorld(true);
  const hips = model.worldToLocal(bone('Hips').getWorldPosition(new THREE.Vector3())).multiply(model.scale);
  model.position.set(-hips.x, -hips.y, -hips.z);
  // Mixamo смотрит в +Z, кони — в −Z
  model.rotation.y = Math.PI;
  model.position.applyAxisAngle(AY, Math.PI);
  root.userData.hand = bone('RightHand');
  return root;
}
