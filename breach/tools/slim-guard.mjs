// Slims the guard avatar for the game: drops the hat, the teeth and the normal / roughness maps
// (the game lights characters with Lambert, which uses only the colour map), then repacks the binary.
//   node breach/tools/slim-guard.mjs <readyplayer.me.glb> breach/assets/models/Guard.glb [--keep-maps]
// --keep-maps keeps the normal and roughness maps (the characters are drawn with standard materials since 22.11)
import fs from 'node:fs';

const [src, dst, flag] = process.argv.slice(2);
const keepMaps = flag === '--keep-maps';
const buf = fs.readFileSync(src);
const jsonLen = buf.readUInt32LE(12);
const j = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
const binStart = 20 + jsonLen + 8;
const bin = buf.subarray(binStart, binStart + buf.readUInt32LE(20 + jsonLen));

const DROP = new Set(['Wolf3D_Headwear', 'Wolf3D_Teeth']);
for (const n of j.nodes) if (n.children) n.children = n.children.filter((c) => !DROP.has(j.nodes[c].name));
for (const s of j.scenes) s.nodes = s.nodes.filter((c) => !DROP.has(j.nodes[c].name));
if (!keepMaps)
  for (const m of j.materials) {
    delete m.normalTexture;
    delete m.occlusionTexture;
    delete m.emissiveTexture;
    if (m.pbrMetallicRoughness) delete m.pbrMetallicRoughness.metallicRoughnessTexture;
  }

// what is still reachable from the scene
const used = { nodes: new Set(), meshes: new Set(), skins: new Set(), materials: new Set(), accessors: new Set(), textures: new Set(), images: new Set(), views: new Set() };
const walk = (i) => {
  if (used.nodes.has(i)) return;
  used.nodes.add(i);
  const n = j.nodes[i];
  if (n.mesh !== undefined) used.meshes.add(n.mesh);
  if (n.skin !== undefined) used.skins.add(n.skin);
  for (const c of n.children || []) walk(c);
};
for (const s of j.scenes) for (const n of s.nodes) walk(n);
for (const k of used.skins) {
  const s = j.skins[k];
  if (s.inverseBindMatrices !== undefined) used.accessors.add(s.inverseBindMatrices);
  for (const jn of s.joints) walk(jn);
}
for (const k of used.meshes) {
  for (const p of j.meshes[k].primitives) {
    for (const a of Object.values(p.attributes)) used.accessors.add(a);
    if (p.indices !== undefined) used.accessors.add(p.indices);
    for (const t of p.targets || []) for (const a of Object.values(t)) used.accessors.add(a);
    if (p.material !== undefined) used.materials.add(p.material);
  }
}
for (const k of used.materials) {
  const m = j.materials[k];
  for (const t of [m.pbrMetallicRoughness?.baseColorTexture, m.pbrMetallicRoughness?.metallicRoughnessTexture, m.normalTexture, m.occlusionTexture, m.emissiveTexture]) if (t) used.textures.add(t.index);
}
for (const k of used.textures) used.images.add(j.textures[k].source);
for (const k of used.accessors) if (j.accessors[k].bufferView !== undefined) used.views.add(j.accessors[k].bufferView);
for (const k of used.images) used.views.add(j.images[k].bufferView);

// renumber everything that survived
const remap = (arr, set) => {
  const m = new Map();
  const out = [];
  arr.forEach((x, i) => {
    if (set.has(i)) {
      m.set(i, out.length);
      out.push(x);
    }
  });
  return [out, m];
};
const parts = [];
let off = 0;
const [views, vMap] = remap(j.bufferViews, used.views);
for (const v of views) {
  const data = bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
  const pad = (4 - (off % 4)) % 4;
  if (pad) parts.push(Buffer.alloc(pad));
  off += pad;
  v.byteOffset = off;
  parts.push(data);
  off += data.length;
}
const [accessors, aMap] = remap(j.accessors, used.accessors);
for (const a of accessors) if (a.bufferView !== undefined) a.bufferView = vMap.get(a.bufferView);
const [images, iMap] = remap(j.images, used.images);
for (const im of images) im.bufferView = vMap.get(im.bufferView);
const [textures, tMap] = remap(j.textures, used.textures);
for (const t of textures) t.source = iMap.get(t.source);
const [materials, mMap] = remap(j.materials, used.materials);
for (const m of materials) for (const t of [m.pbrMetallicRoughness?.baseColorTexture, m.pbrMetallicRoughness?.metallicRoughnessTexture, m.normalTexture, m.occlusionTexture, m.emissiveTexture]) if (t) t.index = tMap.get(t.index);
const [meshes, meMap] = remap(j.meshes, used.meshes);
for (const me of meshes) {
  for (const p of me.primitives) {
    for (const k of Object.keys(p.attributes)) p.attributes[k] = aMap.get(p.attributes[k]);
    if (p.indices !== undefined) p.indices = aMap.get(p.indices);
    for (const t of p.targets || []) for (const k of Object.keys(t)) t[k] = aMap.get(t[k]);
    if (p.material !== undefined) p.material = mMap.get(p.material);
  }
}
const [skins, sMap] = remap(j.skins, used.skins);
const [nodes, nMap] = remap(j.nodes, used.nodes);
for (const n of nodes) {
  if (n.mesh !== undefined) n.mesh = meMap.get(n.mesh);
  if (n.skin !== undefined) n.skin = sMap.get(n.skin);
  if (n.children) n.children = n.children.map((c) => nMap.get(c));
}
for (const s of skins) {
  if (s.inverseBindMatrices !== undefined) s.inverseBindMatrices = aMap.get(s.inverseBindMatrices);
  s.joints = s.joints.map((x) => nMap.get(x));
  if (s.skeleton !== undefined) s.skeleton = nMap.get(s.skeleton);
}
for (const s of j.scenes) s.nodes = s.nodes.map((c) => nMap.get(c));
Object.assign(j, { bufferViews: views, accessors, images, textures, materials, meshes, skins, nodes });
if (j.samplers && !textures.length) delete j.samplers;
const newBin = Buffer.concat(parts);
j.buffers = [{ byteLength: newBin.length }];

let jb = Buffer.from(JSON.stringify(j), 'utf8');
jb = Buffer.concat([jb, Buffer.alloc((4 - (jb.length % 4)) % 4, 0x20)]);
const bb = Buffer.concat([newBin, Buffer.alloc((4 - (newBin.length % 4)) % 4)]);
const head = Buffer.alloc(12);
head.write('glTF', 0);
head.writeUInt32LE(2, 4);
head.writeUInt32LE(12 + 8 + jb.length + 8 + bb.length, 8);
const ch = (len, type) => {
  const b = Buffer.alloc(8);
  b.writeUInt32LE(len, 0);
  b.write(type, 4);
  return b;
};
fs.writeFileSync(dst, Buffer.concat([head, ch(jb.length, 'JSON'), jb, ch(bb.length, 'BIN\0'), bb]));
console.log(`${src}: ${buf.length} -> ${dst}: ${12 + 8 + jb.length + 8 + bb.length} bytes, ${images.length} images, ${meshes.length} meshes`);
