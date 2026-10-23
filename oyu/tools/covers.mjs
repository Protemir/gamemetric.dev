// Portal covers and preview videos for Ою, rendered by headless Chrome from the game itself.
//
//   node oyu/tools/covers.mjs [--level 13] [--video-level 12] [--title Oyu] [--ffmpeg path] [--try]
//
// Output in dist/oyu-covers/: cover-landscape.png 1920x1080, cover-portrait.png 800x1200,
// cover-square.png 800x800, video-landscape.mp4 1920x1080, video-portrait.mp4 1080x1620
// (18 s, 30 fps, no sound; the first half second is the cover, as CrazyGames asks).
// --try renders landscape covers of several levels to pick from.
// --playgama: dist/oyu-playgama-art/ with the three covers Playgama takes (800x800, 1080x1920,
// 1920x1080) and four screenshots of real play 1920x1080, no video.
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
  tall: 'left: 0; right: 0; text-align: center; bottom: 8%; font-size: 250px;',
};

// a level in the middle of play: shooters on the belt, blocks flying
async function scene(level, w, h, kind, title = true) {
  await B.open(`${S.url}/oyu/?debug&nopulse&lang=en&level=${level}`, w, h);
  await B.js(`(async () => {
    const s = document.createElement('style');
    s.textContent = '#hud, #hint { display: none !important; } .cover-title { position: fixed; z-index: 50; margin: 0; font-family: "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif; font-weight: 900; letter-spacing: -0.03em; line-height: 1; color: #ffcf45; -webkit-text-stroke: 0.06em #8e1f2c; paint-order: stroke fill; text-shadow: 0 0.06em 0 #8e1f2c, 0 0.1em 0.25em rgba(80,20,60,0.45); ${TITLE_CSS[kind]} }';
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
  if (process.argv.includes('--playgama')) {
    const art = path.join(repo, 'dist', 'oyu-playgama-art');
    fs.rmSync(art, { recursive: true, force: true });
    fs.mkdirSync(art, { recursive: true });
    for (const [name, w, h, kind] of [['cover-square-800x800', 800, 800, 'square'], ['cover-portrait-1080x1920', 1080, 1920, 'tall'], ['cover-landscape-1920x1080', 1920, 1080, 'landscape']]) {
      await scene(LEVEL, w, h, kind);
      await B.shot(path.join(art, name + '.png'));
      console.log(name);
    }
    // real play with the HUD: a bot taps for a while
    const play = async (level, taps, file) => {
      await B.open(`${S.url}/oyu/?debug&nopulse&lang=en&level=${level}`, 1920, 1080);
      await B.js(`(async () => { window.__bot = await import('/oyu/tools/bot.js'); const O = window.__oyu; O.step(20, false); for (let k = 0; k < ${taps}; k++) { if (O.game.state === 'play') window.__bot.act(O.game, 'smart', Math.random); O.step(27, false); } O.step(1, true); })()`);
      await B.shot(path.join(art, file));
      console.log(file);
    };
    await play(1, 0, 'shot-1-first-level.png');
    await play(13, 7, 'shot-2-pattern.png');
    // a finished picture and its stars
    await B.open(`${S.url}/oyu/?debug&nopulse&lang=en&level=9`, 1920, 1080);
    await B.js(`(async () => { window.__bot = await import('/oyu/tools/bot.js'); const O = window.__oyu; O.step(20, false); for (let k = 0; k < 4000 && O.mode !== 'won'; k++) { if (O.game.state === 'play' && k % 20 === 0) window.__bot.act(O.game, 'smart', Math.random); O.step(1, false); } O.step(90, false); O.step(1, true); })()`);
    await new Promise((r) => setTimeout(r, 2000)); // the stars and the panel animate in real time
    await B.shot(path.join(art, 'shot-3-done.png'));
    console.log('shot-3-done.png');
    // the carpet of a player who has come a long way
    const done = Array.from({ length: 24 }, (_, i) => i);
    const stars = Object.fromEntries(done.map((i) => [i, 1 + ((i * 7) % 3)]));
    await B.init(`window.requestAnimationFrame = () => 0; try { localStorage.clear(); localStorage.setItem('oyu.progress', ${JSON.stringify(JSON.stringify({ done, level: 24, stars }))}); } catch {}`);
    await B.open(`${S.url}/oyu/?debug&nopulse&lang=en`, 1920, 1080);
    await B.js(`(() => { [...document.querySelectorAll('#ui .btn')].find((b) => /Carpet/.test(b.textContent)).click(); window.__oyu.step(30, false); window.__oyu.step(1, true); })()`);
    await new Promise((r) => setTimeout(r, 1500));
    await B.shot(path.join(art, 'shot-4-carpet.png'));
    console.log('shot-4-carpet.png');
  } else if (process.argv.includes('--try')) {
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
        // a tap about twice a second, like a person who has got the hang of it
        const tap = sec >= next;
        if (tap) next = sec + 0.45;
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
