// Portal covers and a preview video for «Сыбыс», filmed by headless Chrome from the game itself.
//
//   node sybys/tools/covers.mjs [--seed 5] [--no-video] [--ffmpeg path]
//
// Output in dist/sybys-covers/: cover-landscape.png 1920x1080, cover-portrait.png 800x1200,
// cover-square.png 800x800, video-landscape.mp4 1920x1080 (about 15 s, 30 fps, no sound;
// the first half second is the cover, as CrazyGames asks).
// Time is driven by hand: the page's animation frames are called with a made-up clock, one per video frame.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i < 0 ? def : process.argv[i + 1];
};
const SEED = +arg('seed', 5);
const FFMPEG = arg('ffmpeg', 'C:/Users/prote/Downloads/TEMIRLAB-посты/сборка/ffmpeg.exe');
const VIDEO = !process.argv.includes('--no-video');
const out = path.join(repo, 'dist', 'sybys-covers');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const S = await serve(repo);
const B = await chrome();
await B.init(`
  window.__t = 0;
  window.requestAnimationFrame = (cb) => { window.__cb = cb; return 1; };
  try { localStorage.clear(); localStorage.setItem('sybys.tutDone', 'true'); } catch {}
`);
const tick = (n = 1, ms = 1000 / 30) => B.js(`(() => { for (let k = 0; k < ${n}; k++) { window.__t += ${ms}; const cb = window.__cb; window.__cb = null; cb && cb(window.__t); } })()`);
const wait = (ms) => B.js(`new Promise((r) => setTimeout(r, ${ms}))`);

// the title as on the covers: the game's own lettering, out of the top-left corner where CrazyGames puts labels
const TITLE = `(() => {
  document.getElementById('ui').style.display = 'none';
  const t = document.createElement('div');
  t.id = 'coverTitle';
  t.innerHTML = '<h1>Sybys</h1><div class="orn">' + document.querySelector('.title .orn').innerHTML + '</div><p>Steppe Intrigue</p>';
  t.style.cssText = 'position:fixed;left:0;right:0;bottom:7%;text-align:center;z-index:20;color:#fff4dc';
  const h = t.querySelector('h1');
  h.style.cssText = 'margin:0;font-family:Georgia,serif;font-weight:700;letter-spacing:.08em;line-height:1;font-size:' + Math.round(Math.min(innerWidth * 0.17, innerHeight * 0.2)) + 'px;background:linear-gradient(180deg,#fff3cf 10%,#f2c25a 55%,#b8792a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 6px 18px rgba(0,0,0,.6))';
  const o = t.querySelector('.orn');
  o.style.cssText = 'width:' + Math.round(innerWidth * 0.3) + 'px;margin:6px auto;color:#f2c25a';
  o.querySelector('svg').style.cssText = 'display:block;width:100%';
  const p = t.querySelector('p');
  p.style.cssText = 'margin:0;font-family:Georgia,serif;font-style:italic;font-size:' + Math.round(Math.min(innerWidth * 0.045, innerHeight * 0.05)) + 'px;text-shadow:0 2px 10px rgba(0,0,0,.8)';
  const shade = document.createElement('div');
  shade.style.cssText = 'position:fixed;inset:0;z-index:19;background:linear-gradient(180deg,rgba(0,0,0,0) 45%,rgba(14,8,6,.75))';
  document.body.append(shade, t);
})()`;

async function cover(name, w, h, frames) {
  await B.open(`${S.url}/sybys/?lang=en&covers&seed=${SEED}`, w, h);
  await wait(1500); // models
  await tick(frames);
  await B.js(TITLE);
  await tick(1);
  await B.shot(path.join(out, `cover-${name}.png`));
  console.log('cover', name);
}

try {
  await cover('landscape', 1920, 1080, 240);
  await cover('portrait', 800, 1200, 240);
  await cover('square', 800, 800, 240);

  if (VIDEO) {
    const frames = path.join(out, 'frames');
    fs.mkdirSync(frames, { recursive: true });
    let n = 0;
    const shoot = async (count, each = async () => {}) => {
      for (let k = 0; k < count; k++) {
        await each(k);
        await tick(1);
        await B.shot(path.join(frames, `f${String(n++).padStart(4, '0')}.jpg`), 'jpeg');
      }
    };
    await B.open(`${S.url}/sybys/?lang=en&covers&seed=${SEED}`, 1920, 1080);
    await wait(1500);
    await tick(240);
    // 0.5 s: the cover itself
    await B.js(TITLE);
    await shoot(15);
    // 4 s: the steppe at sunset, the title fades
    await B.js(`document.getElementById('coverTitle').style.transition = 'opacity 1s'; document.getElementById('coverTitle').style.opacity = 0`);
    await shoot(120);
    // 10 s: the game: riders with the khan's word, Karasai's sabres, a forged order caught
    await B.js(`(() => { document.getElementById('ui').style.display = ''; [...document.querySelectorAll('div')].filter((d) => d.id === 'coverTitle' || d.style.zIndex === '19').forEach((d) => d.remove()); [...document.querySelectorAll('button')].find((b) => b.innerText.includes('Play')).click(); })()`);
    await wait(100);
    await B.js(`[...document.querySelectorAll('button')].find((b) => b.innerText.includes('To the steppe')).click()`);
    await wait(100);
    await B.js(`(() => { const s = window.__sybys; s.g.horses = 5; s.view.zoomAt(innerWidth * 0.5, innerHeight * 0.55, 1.35); })()`);
    await shoot(300, async (k) => {
      if (k % 30 === 5) await B.js(`(() => { const s = window.__sybys; s.g.horses = Math.max(s.g.horses, 2); s.act('word', s.S.suggest(s.g)); })()`);
      if (k === 70) await B.js(`(() => { const s = window.__sybys; s.g.horses = 5; const r = s.g.map.regions.filter((r) => r.tribe === 2).sort((a, b) => s.g.t[a.id] - s.g.t[b.id])[0]; s.act('karasai', r.id); })()`);
      if (k === 100) await B.js(`(() => { const s = window.__sybys; s.S.spawnPlot(s.g); })()`);
      if (k === 175) await B.js(`(() => { const s = window.__sybys; const f = s.g.riders.find((r) => r.kind === 'false'); if (f) s.intercept(f.id); })()`);
    });
    const mp4 = path.join(out, 'video-landscape.mp4');
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(frames, 'f%04d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', mp4]);
    fs.rmSync(frames, { recursive: true, force: true });
    console.log('video', mp4, (fs.statSync(mp4).size / 1e6).toFixed(1) + ' MB');
  }
  if (B.errors.length) console.log('errors', B.errors);
} finally {
  B.close();
  S.close();
}
