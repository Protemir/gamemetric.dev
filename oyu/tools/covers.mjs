// Portal covers and preview videos for Ою, rendered by headless Chrome from the game itself.
//
//   node oyu/tools/covers.mjs [--level 13] [--video-level 12] [--title Oyu] [--ffmpeg path] [--try]
//
// Output in dist/oyu-covers/: cover-landscape.png 1920x1080, cover-portrait.png 800x1200,
// cover-square.png 800x800, video-landscape.mp4 1920x1080, video-portrait.mp4 1080x1620
// (18 s, 30 fps, no sound; the first half second is the cover, as CrazyGames asks).
// --try renders landscape covers of several levels to pick from.
// The title stays out of the top-left corner: CrazyGames puts its labels there.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from './cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i < 0 ? def : process.argv[i + 1];
};
const LEVEL = +arg('level', 16);
const VLEVEL = +arg('video-level', 12);
const TITLE = arg('title', 'Oyu');
const FFMPEG = arg('ffmpeg', 'ffmpeg');
const out = path.join(repo, 'dist', 'oyu-covers');
fs.mkdirSync(out, { recursive: true });

const S = await serve(repo);
const B = await chrome();
await B.init("window.requestAnimationFrame = () => 0; try { localStorage.clear(); } catch {}");

const TITLE_CSS = {
  landscape: 'right: 7%; top: 40%; font-size: 230px;',
  portrait: 'left: 0; right: 0; text-align: center; bottom: 9%; font-size: 170px;',
  square: 'right: 3%; top: 43%; font-size: 112px;',
};

// a level in the middle of play: shooters on the belt, blocks flying
async function scene(level, w, h, kind, title = true) {
  await B.open(`${S.url}/oyu/?debug&nopulse&lang=en&level=${level}`, w, h);
  await B.js(`(async () => {
    const s = document.createElement('style');
    s.textContent = '#hud, #hint { display: none !important; } .cover-title { position: fixed; z-index: 50; margin: 0; font-family: "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif; font-weight: 900; letter-spacing: -0.03em; line-height: 1; background: linear-gradient(180deg, #ffe08a, #f4b93a 55%, #e0802e); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 8px 24px rgba(0,0,0,0.6)); ${TITLE_CSS[kind]} }';
    document.head.append(s);
    ${title ? `const t = document.createElement('p'); t.className = 'cover-title'; t.textContent = ${JSON.stringify(TITLE)}; document.body.append(t);` : ''}
    const O = window.__oyu;
    O.R.cover = ${title};
    const g = O.game;
    for (let k = 0; k < 3; k++) { g.launchFromQueue(k % g.queues.length); O.step(14, false); }
    O.step(30, false);
    O.step(1, true);
  })()`);
}

const SIZES = { landscape: [1920, 1080], portrait: [800, 1200], square: [800, 800] };

try {
  if (process.argv.includes('--try')) {
    for (const lv of [5, 9, 11, 13, 16, 22, 28, 30, 31, 41]) {
      await scene(lv, 1920, 1080, 'landscape');
      await B.shot(path.join(out, `try-${lv}.png`));
      console.log('try', lv);
    }
  } else {
    for (const [kind, [w, h]] of Object.entries(SIZES)) {
      await scene(LEVEL, w, h, kind);
      await B.shot(path.join(out, `cover-${kind}.png`));
      console.log('cover', kind);
    }
    const VIDEO = { landscape: [1920, 1080], portrait: [1080, 1620] };
    for (const [kind, [w, h]] of Object.entries(VIDEO)) {
      const frames = path.join(out, 'frames-' + kind);
      fs.rmSync(frames, { recursive: true, force: true });
      fs.mkdirSync(frames);
      await scene(LEVEL, w, h, kind === 'portrait' ? 'portrait' : 'landscape');
      await B.shot(path.join(frames, 'cover.png'));
      // the clip: a fresh level played at a calm human pace, ending on the picture coming together
      await B.open(`${S.url}/oyu/?debug&nopulse&lang=en&level=${VLEVEL}`, w, h);
      await B.js(`(async () => { const s = document.createElement('style'); s.textContent = '#hint { display: none !important; }'; document.head.append(s); window.__bot = await import('/oyu/tools/bot.js'); window.__oyu.step(20, false); })()`);
      const FPS = 30;
      let n = 0;
      for (; n < 15; n++) fs.copyFileSync(path.join(frames, 'cover.png'), path.join(frames, `f${String(n).padStart(4, '0')}.png`));
      let next = 0;
      for (let k = 0; k < FPS * 17.5; k++, n++) {
        const sec = k / FPS;
        // a tap every 0.7 s or so, like a person thinking a little
        const tap = sec >= next;
        if (tap) next = sec + 0.7;
        await B.js(`(() => { const O = window.__oyu; if (${tap} && O.game.state === 'play') window.__bot.act(O.game, 'smart', Math.random); O.step(2, true); })()`);
        await B.shot(path.join(frames, `f${String(n).padStart(4, '0')}.png`));
      }
      const mp4 = path.join(out, `video-${kind}.mp4`);
      execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-an', '-movflags', '+faststart', mp4]);
      fs.rmSync(frames, { recursive: true, force: true });
      const state = await B.js('window.__oyu.game.state');
      console.log(mp4, (fs.statSync(mp4).size / 1048576).toFixed(1) + ' MB', 'level ended as', state);
    }
  }
} finally {
  B.close();
  S.close();
}
