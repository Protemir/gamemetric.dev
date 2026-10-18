// Всадник-шабандоз: чапан в цвете команды, тымақ, ноги по бокам коня. Собран из простых тел,
// стоит в седле (кость saddle_socket) и качается вместе с конём. Наклоны задаёт игра:
// lean — вперёд на скорости, reach — тянется вбок (тартыс / подбор мешка), side ±1 — к какому боку.
import * as THREE from 'three';

const skin = new THREE.MeshStandardMaterial({ color: '#c58f66', roughness: 0.7 });
const boots = new THREE.MeshStandardMaterial({ color: '#2a1d15', roughness: 0.55 });
const fur = new THREE.MeshStandardMaterial({ color: '#5a3f2a', roughness: 1 });
const trousers = new THREE.MeshStandardMaterial({ color: '#2d2a2a', roughness: 0.9 });
const gold = new THREE.MeshStandardMaterial({ color: '#d9a43a', roughness: 0.45, metalness: 0.4 });
const chapans = new Map();
function chapan(color) {
  if (!chapans.has(color)) chapans.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
  return chapans.get(color);
}
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
function part(geo, mat, x, y, z, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
// кость от точки a до точки b (капсула вдоль отрезка)
function limb(r, a, b, mat, parent) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const m = part(cap(r, Math.max(0.01, len - r * 2)), mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, parent);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

export class Rider {
  // horse — объект коня из world.js (obj, tilt), color — цвет чапана
  constructor(horse, color) {
    const obj = horse.obj, sock = obj.getObjectByName('saddle_socket');
    this.root = new THREE.Group(); // таз всадника
    this.upper = new THREE.Group(); // всё выше пояса: наклоняется
    this.root.add(this.upper);
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const coat = chapan(color);
    // ноги: бедро вперёд-вниз, голень вниз по боку коня, сапог
    for (const s of [-1, 1]) {
      const hip = V(s * 0.13, 0.02, 0), knee = V(s * 0.31, -0.2, 0.2), ankle = V(s * 0.33, -0.6, 0.1);
      limb(0.075, hip, knee, trousers, this.root);
      limb(0.06, knee, ankle, boots, this.root);
      limb(0.055, ankle, V(s * 0.33, -0.63, 0.24), boots, this.root);
    }
    // полы чапана свисают на седло
    const skirt = part(new THREE.CylinderGeometry(0.2, 0.33, 0.36, 14, 1, true), coat, 0, -0.08, -0.03, this.root);
    skirt.material = coat.clone(); skirt.material.side = THREE.DoubleSide;
    // корпус
    part(cap(0.17, 0.3), coat, 0, 0.3, 0, this.upper).scale.set(1.1, 1, 0.85);
    part(new THREE.TorusGeometry(0.17, 0.025, 6, 18), gold, 0, 0.13, 0, this.upper).rotation.x = Math.PI / 2; // пояс
    part(new THREE.TorusGeometry(0.1, 0.03, 6, 14), gold, 0, 0.55, 0.01, this.upper).rotation.x = Math.PI / 2; // ворот
    // голова и тымақ
    this.head = part(new THREE.SphereGeometry(0.1, 14, 10), skin, 0, 0.7, 0.02, this.upper);
    const hat = part(new THREE.SphereGeometry(0.125, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), fur, 0, 0.74, 0, this.upper);
    hat.scale.set(1, 1.05, 1.05);
    part(new THREE.ConeGeometry(0.07, 0.1, 10), coat, 0, 0.86, 0, this.upper); // бархатный верх тымақа
    for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.04, 0.16, 0.12), fur, s * 0.12, 0.66, -0.01, this.upper); // уши тымақа
    part(new THREE.BoxGeometry(0.2, 0.12, 0.05), fur, 0, 0.64, -0.11, this.upper); // назатыльник
    // руки: держат повод перед собой; правая (s=-1) — та, что берёт мешок
    this.arms = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.21, 0.48, 0);
      this.upper.add(arm);
      limb(0.055, V(0, 0, 0), V(s * 0.04, -0.24, 0.12), coat, arm);
      limb(0.045, V(s * 0.04, -0.24, 0.12), V(-s * 0.06, -0.26, 0.38), coat, arm);
      part(new THREE.SphereGeometry(0.045, 8, 6), skin, -s * 0.06, -0.26, 0.4, arm);
      this.arms.push(arm);
    }
    // в седло: строим в осях коня у кости седла, потом крепим к кости
    obj.updateMatrixWorld(true);
    const sp = obj.worldToLocal(sock.getWorldPosition(new THREE.Vector3()));
    this.root.position.set(sp.x, sp.y + 0.1, sp.z - 0.03);
    horse.tilt.add(this.root);
    this.root.updateMatrixWorld(true);
    sock.attach(this.root);
    this.lean = 0; this.reach = 0; this.side = -1;
  }
  // точка, где висит мешок у правого бедра (в осях всадника)
  sackAnchor() { return this.root; }
  update(dt, speed, reach, side) {
    const k = 1 - Math.exp(-dt * 6);
    this.lean += (Math.min(speed / 9, 1) * 0.35 - this.lean) * k; // на галопе ложится вперёд
    this.reach += (reach - this.reach) * k;
    this.side = side || this.side;
    this.upper.rotation.set(this.lean, 0, this.reach * 0.5 * this.side);
    const arm = this.arms[this.side < 0 ? 0 : 1];
    arm.rotation.set(-this.reach * 0.6, 0, this.reach * 1.1 * this.side);
  }
}
