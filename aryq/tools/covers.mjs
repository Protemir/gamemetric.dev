// Portal covers and a preview video for Арык, rendered by headless Chrome from the game itself.
//
//   node aryq/tools/covers.mjs [--seed 1004] [--days 70] [--ffmpeg path] [--no-video]
//
// Output in dist/aryq-covers/: cover-landscape.png 1920x1080, cover-portrait.png 800x1200,
// cover-square.png 800x800, video-landscape.mp4 1920x1080 and video-portrait.mp4 1080x1620
// (about 15 s, 30 fps, no sound; the first half second is the cover, as CrazyGames asks).
// The valley fills the whole picture; the title stays out of the top-left corner, where CrazyGames
// puts its labels. The page's own animation loop is off: every frame is drawn by hand.
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
const SEED = +arg('seed', 1004);
const DAYS = +arg('days', 70);
const FFMPEG = arg('ffmpeg', 'C:/Users/prote/Downloads/TEMIRLAB-посты/сборка/ffmpeg.exe');
const out = path.join(repo, 'dist', 'aryq-covers');
fs.mkdirSync(out, { recursive: true });

const S = await serve(repo);
const B = await chrome();
// no hints, no names on the field, no loop of its own
await B.init("window.requestAnimationFrame = () => 0; try { localStorage.clear(); localStorage.setItem('aryq.taught', '9'); localStorage.setItem('aryq.labelsSeen', 'true'); localStorage.setItem('aryq.litSeen', 'true'); } catch {}");

const TITLE = {
  landscape: 'right: 6%; top: 50%; transform: translateY(-50%); text-align: right;',
  portrait: 'left: 0; right: 0; bottom: 7%; text-align: center;',
  square: 'left: 0; right: 0; bottom: 8%; text-align: center;',
};
const TITLE_SIZE = { landscape: 0.16, portrait: 0.17, square: 0.16 };

// a valley some way into the game: canals dug by the bot, orchards green, water running
async function scene(w, h, kind, { title = true, days = DAYS, scale = 2 } = {}) {
  await B.cdp('Emulation.setDeviceMetricsOverride', { width: w * scale, height: h * scale, deviceScaleFactor: 1, mobile: false });
  await B.open(`${S.url}/aryq/?debug&lang=en&seed=${SEED}&autostart`, w * scale, h * scale);
  await B.js(`(() => {
    const st = document.createElement('style');
    st.textContent = '#hud, #hint, #ui, .update { display: none !important; } canvas#game { transform-origin: 0 0; } .cover-title { position: fixed; z-index: 50; margin: 0; padding: 0.3em 0.5em; background: radial-gradient(closest-side, rgba(20,24,16,0.6), rgba(20,24,16,0)); font-family: "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif; font-weight: 900; line-height: 0.9; letter-spacing: -0.02em; color: #fff8ea; -webkit-text-stroke: 0.05em #3b2718; paint-order: stroke fill; text-shadow: 0 0.05em 0 #3b2718, 0 0.12em 0.3em rgba(0,0,0,0.45); ${TITLE[kind]} } .cover-title small { display: block; font-size: 0.32em; letter-spacing: 0.02em; margin-top: 0.12em; color: #bfe6ff; }';
    document.head.append(st);
    ${title ? `const tt = document.createElement('p'); tt.className = 'cover-title'; tt.style.fontSize = (Math.min(innerWidth, innerHeight) * ${TITLE_SIZE[kind]}) + 'px'; tt.innerHTML = 'Aryk<small>Water the Valley</small>'; document.body.append(tt);` : ''}
    const { g, S, view, state } = window.__aryq;
    const dig = (o) => { const p = S.planFor(g, o); if (!p || !p.cells.length || p.cells.length > g.dig) return; S.startStroke(g, p.from); for (const c of p.cells) if (!S.extend(g, c).ok) break; S.endStroke(g); };
    for (let t = 0; t < ${days}; t += 0.5) { for (const o of g.objects) if (o.s < 0.99) dig(o); S.advance(g, 0.5); for (const o of g.objects) o.thirst = Math.min(o.thirst, 0.1); }
    for (let k = 0; k < 6; k++) S.flowStep(g);
    state.ghost = null; state.labels = null; state.hintPath = null;
    // the valley fills the picture
    const cv = document.getElementById('game');
    const s = Math.max(innerWidth / view.bw, innerHeight / view.bh);
    cv.style.transform = 'translate(' + (innerWidth / 2 - (view.ox + view.bw / 2) * s) + 'px,' + (innerHeight / 2 - (view.oy + view.bh / 2) * s) + 'px) scale(' + s + ')';
    window.__t = 1000;
    for (let k = 0; k < 40; k++) { window.__t += 33; view.draw(g, window.__t, state); }
    return true;
  })()`);
}

async function shot(file, w, h, scale) {
  const r = await B.cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w * scale, height: h * scale, scale: 1 / scale } });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
}

const SIZES = { landscape: [1920, 1080], portrait: [800, 1200], square: [800, 800] };
try {
  for (const [kind, [w, h]] of Object.entries(SIZES)) {
    const scale = kind === 'landscape' ? 1 : 2;
    await scene(w, h, kind, { scale });
    await shot(path.join(out, `cover-${kind}.png`), w, h, scale);
    console.log('cover', kind);
  }
  if (!process.argv.includes('--no-video')) {
    const VIDEO = { landscape: [1920, 1080], portrait: [1080, 1620] };
    for (const [kind, [w, h]] of Object.entries(VIDEO)) {
      const frames = path.join(out, 'frames-' + kind);
      fs.rmSync(frames, { recursive: true, force: true });
      fs.mkdirSync(frames);
      await scene(w, h, kind, { scale: 1 });
      await shot(path.join(frames, 'cover.png'), w, h, 1);
      let n = 0;
      for (; n < 15; n++) fs.copyFileSync(path.join(frames, 'cover.png'), path.join(frames, `f${String(n).padStart(4, '0')}.png`));
      // the clip: an earlier moment of the same valley, played at a person's pace: a canal is dug
      // cell by cell to every thirsty orchard, water runs on, orchards turn green
      await scene(w, h, kind, { title: false, days: 6, scale: 1 });
      const FPS = 30;
      for (let k = 0; k < FPS * 14.5; k++, n++) {
        await B.js(`(() => {
          const { g, S, view, state } = window.__aryq;
          window.__t += 33;
          if (!g.cur && ${k} % 4 === 0) {
            const o = g.objects.find((x) => x.s < 0.6);
            const p = o && S.planFor(g, o);
            if (p && p.cells.length && p.cells.length <= g.dig) { S.startStroke(g, p.from); window.__dig = p.cells.slice(); }
          }
          if (g.cur && ${k} % 3 === 0) {
            const c = window.__dig.shift();
            const r = c != null ? S.extend(g, c) : { ok: false };
            if (r.ok && !r.back) view.burst(c, 'dirt');
            if (!r.ok || !window.__dig.length) { S.endStroke(g); state.reach = null; } else state.reach = null;
          }
          if (!g.cur) S.advance(g, 0.09);
          for (const o of g.objects) { o.thirst = Math.min(o.thirst, 0.5); if (o.s >= 0.6 && !o.happy) { o.happy = true; view.burst(o.y * g.W + o.x, 'splash'); } }
          view.draw(g, window.__t, state);
        })()`);
        await shot(path.join(frames, `f${String(n).padStart(4, '0')}.png`), w, h, 1);
      }
      const mp4 = path.join(out, `video-${kind}.mp4`);
      execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(frames, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'slow', '-an', '-movflags', '+faststart', mp4]);
      fs.rmSync(frames, { recursive: true, force: true });
      console.log(mp4, (fs.statSync(mp4).size / 1048576).toFixed(1) + ' MB');
    }
  }
} finally {
  B.close();
  S.close();
}
