// Portal covers and preview videos for Асық, shot by headless Chrome from the game itself.
//
//   node asyk/tools/covers.mjs [--ffmpeg path] [--title Asyk] [--no-video]
//
// Output in dist/asyk-covers/: cover-landscape.png 1920x1080, cover-portrait.png 800x1200,
// cover-square.png 800x800, video-landscape.mp4 1920x1080 and video-portrait.mp4 1080x1620
// (about 18 s, no sound; the first half second is the cover, as CrazyGames asks).
// The title stays out of the top-left corner: CrazyGames puts its labels there.
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
const TITLE = arg('title', 'Asyk');
const FFMPEG = arg('ffmpeg', 'C:/Users/prote/Downloads/TEMIRLAB-посты/сборка/ffmpeg.exe');
const out = path.join(repo, 'dist', 'asyk-covers');
fs.mkdirSync(out, { recursive: true });

const S = await serve(repo);
const B = await chrome();
await B.init(`try { localStorage.clear(); localStorage.setItem('asyk.taught', '3'); localStorage.setItem('asyk.ruleSides', '1'); } catch {}`);

const TITLE_CSS = {
  landscape: 'right: 6%; top: 8%; font-size: 200px;',
  portrait: 'left: 0; right: 0; text-align: center; top: 5%; font-size: 150px;',
  square: 'right: 5%; top: 6%; font-size: 120px;',
};

// the yard with the kon laid out, the kids cheering, the saka in hand
async function scene(w, h, kind, title = true) {
  await B.open(`${S.url}/asyk/?lang=en&nopulse`, w, h);
  await B.js(`new Promise((r) => { const t = setInterval(() => { if (window.__asyk && window.__asyk.state !== 'load') { clearInterval(t); r(); } }, 100); })`);
  await B.js(`(async () => {
    const A = window.__asyk;
    document.querySelector('#ui').innerHTML = '';
    A.playStory(0, 0);
    await new Promise((r) => setTimeout(r, 900));
    for (let i = 0; i < 6 && A.state === 'talk'; i++) { A.talkNext(); A.talkNext(); await new Promise((r) => setTimeout(r, 60)); }
    const s = document.createElement('style');
    s.textContent = '#hud, #hint, #turn, #talk, #ui { display: none !important; } .cover-title { position: fixed; z-index: 50; margin: 0; font-family: Georgia, "Times New Roman", serif; font-weight: 700; line-height: 1; color: #fff1d6; -webkit-text-stroke: 0.035em #8f2f2a; paint-order: stroke fill; text-shadow: 0 0.05em 0 #8f2f2a, 0 0.08em 0.3em rgba(40,15,5,0.55); ${TITLE_CSS[kind]} }';
    document.head.append(s);
    ${title ? `const t = document.createElement('p'); t.className = 'cover-title'; t.textContent = ${JSON.stringify(TITLE)}; document.body.append(t);` : ''}
    A.kids.forEach((k, i) => Object.assign(k, { pose: i % 2 === 0 ? 'cheer' : 'watch', jump: 0, next: null, until: 1e12 }));
    await new Promise((r) => setTimeout(r, 700));
  })()`);
}

const SIZES = { landscape: [1920, 1080], portrait: [800, 1200], square: [800, 800] };
try {
  for (const [kind, [w, h]] of Object.entries(SIZES)) {
    await scene(w, h, kind);
    await B.shot(path.join(out, `cover-${kind}.png`));
    console.log('cover', kind);
  }

  if (!process.argv.includes('--no-video')) {
    // a short game: a few throws with the guide, the bones flying, the kids shouting
    for (const [kind, w, h, ow, oh] of [
      ['landscape', 1024, 576, 1920, 1080],
      ['portrait', 720, 1080, 1080, 1620],
    ]) {
      const frames = path.join(out, `frames-${kind}`);
      fs.rmSync(frames, { recursive: true, force: true });
      fs.mkdirSync(frames);
      await scene(w, h, kind);
      let n = 0;
      const t0 = Date.now();
      const snap = async () => {
        const r = await B.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
        fs.writeFileSync(path.join(frames, `f${String(n++).padStart(5, '0')}.jpg`), Buffer.from(r.data, 'base64'));
      };
      // half a second of the cover with the title
      while (Date.now() - t0 < 500) await snap();
      await B.js(`document.querySelector('.cover-title').remove(); window.__asyk.kids.forEach((k) => (k.until = 0)); true`);
      // then play: pull, hold a moment so the guide shows, let go
      const plan = [0.05, -0.08, 0.02, 0.1, -0.03];
      let i = 0;
      while (Date.now() - t0 < 18500) {
        const st = await B.js('window.__asyk.state');
        if (st === 'aim' && !(await B.js('!!window.__pulling'))) {
          const dx = plan[i++ % plan.length];
          B.js(`(async () => {
            window.__pulling = true;
            const cv = document.getElementById('game'), W = innerWidth, H = innerHeight;
            const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, pointerId: 2, bubbles: true, isPrimary: true }));
            ev('pointerdown', W / 2, H * 0.35);
            for (let k = 1; k <= 12; k++) { ev('pointermove', W / 2 - W * ${dx} * k / 12, H * 0.35 + k * H * 0.022); await new Promise((r) => setTimeout(r, 45)); }
            await new Promise((r) => setTimeout(r, 450));
            ev('pointerup', W / 2 - W * ${dx}, H * 0.61);
            window.__pulling = false;
          })()`);
        }
        if (st === 'talk') await B.js('window.__asyk.talkNext()');
        await snap();
      }
      const secs = (Date.now() - t0) / 1000;
      const fps = (n / secs).toFixed(2);
      const file = path.join(out, `video-${kind}.mp4`);
      execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', fps, '-i', path.join(frames, 'f%05d.jpg'), '-vf', `hqdn3d=5:4:8:6,scale=${ow}:${oh}:flags=lanczos,fps=30,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-movflags', '+faststart', '-an', file]);
      fs.rmSync(frames, { recursive: true, force: true });
      console.log('video', kind, `${n} frames at ${fps} fps, ${(fs.statSync(file).size / 1024 / 1024).toFixed(1)} MB`);
    }
  }
} finally {
  B.close();
  S.close();
}
