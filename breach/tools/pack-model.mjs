// Packs a Poly Haven glTF download into one small GLB for the game: keeps the colour maps only
// (the game lights props with Lambert), shrinks them to 512 px and embeds everything.
//   node breach/tools/pack-model.mjs <folder>/<name>.gltf <out.glb> [maxTexture]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [src, dst, maxTex = '512'] = process.argv.slice(2);
const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.dirname(src);
const j = JSON.parse(fs.readFileSync(src, 'utf8'));
const bins = (j.buffers || []).map((b) => fs.readFileSync(path.join(dir, decodeURIComponent(b.uri))));

for (const m of j.materials || []) {
  delete m.normalTexture;
  delete m.occlusionTexture;
  delete m.emissiveTexture;
  if (m.pbrMetallicRoughness) delete m.pbrMetallicRoughness.metallicRoughnessTexture;
  delete m.extensions;
}
delete j.extensionsUsed;
delete j.extensionsRequired;
const usedTex = new Set();
for (const m of j.materials || []) {
  const t = m.pbrMetallicRoughness?.baseColorTexture;
  if (t) usedTex.add(t.index);
}
const usedImg = new Set([...usedTex].map((t) => j.textures[t].source));

const parts = [];
let off = 0;
const push = (buf) => {
  const pad = (4 - (off % 4)) % 4;
  if (pad) {
    parts.push(Buffer.alloc(pad));
    off += pad;
  }
  const at = off;
  parts.push(buf);
  off += buf.length;
  return at;
};
const views = [];
const viewMap = new Map();
(j.bufferViews || []).forEach((v, i) => {
  const b = bins[v.buffer || 0];
  const data = b.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
  const nv = { ...v, buffer: 0, byteOffset: push(data) };
  viewMap.set(i, views.length);
  views.push(nv);
});
for (const a of j.accessors || []) if (a.bufferView !== undefined) a.bufferView = viewMap.get(a.bufferView);
// images: shrink and embed the colour maps, drop the rest
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pack-'));
const imgMap = new Map();
const images = [];
(j.images || []).forEach((im, i) => {
  if (!usedImg.has(i)) return;
  const file = path.join(dir, decodeURIComponent(im.uri));
  const out = path.join(tmp, `img${i}.jpg`);
  // keep the aspect, at most maxTex on the long side
  const meta = execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.Drawing; $i=[System.Drawing.Image]::FromFile('${file}'); "$($i.Width) $($i.Height)"; $i.Dispose()`]).toString().trim().split(/\s+/).map(Number);
  const k = Math.min(1, +maxTex / Math.max(meta[0], meta[1]));
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(here, 'resize.ps1'), file, out, String(Math.round(meta[0] * k)), String(Math.round(meta[1] * k)), '82']);
  const data = fs.readFileSync(out);
  imgMap.set(i, images.length);
  views.push({ buffer: 0, byteOffset: push(data), byteLength: data.length });
  images.push({ bufferView: views.length - 1, mimeType: 'image/jpeg' });
});
const texMap = new Map();
const textures = [];
(j.textures || []).forEach((t, i) => {
  if (!usedTex.has(i)) return;
  texMap.set(i, textures.length);
  textures.push({ ...t, source: imgMap.get(t.source) });
});
for (const m of j.materials || []) {
  const t = m.pbrMetallicRoughness?.baseColorTexture;
  if (t) t.index = texMap.get(t.index);
}
j.bufferViews = views;
j.images = images;
j.textures = textures;
if (!textures.length) delete j.samplers;
const bin = Buffer.concat(parts);
j.buffers = [{ byteLength: bin.length }];
let jb = Buffer.from(JSON.stringify(j), 'utf8');
jb = Buffer.concat([jb, Buffer.alloc((4 - (jb.length % 4)) % 4, 0x20)]);
const bb = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
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
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${path.basename(dst)}: ${(fs.statSync(dst).size / 1024).toFixed(0)} KB, ${images.length} images`);
