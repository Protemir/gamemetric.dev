// Preview videos for the portals, recorded from the real game in headless Chrome:
//   node xo/tools/video.mjs --ffmpeg <path to ffmpeg>
// dist/xo-art/video-1920x1080.mp4 and video-1080x1620.mp4, 30 fps, no sound. The first 1.5 s
// are the cover (CrazyGames asks the video to start with it), then the menu and a round in which
// X sets up a fork and wins. Covers first: node xo/tools/art.mjs --portal
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const i = process.argv.indexOf('--ffmpeg');
const FFMPEG = i < 0 ? 'ffmpeg' : process.argv[i + 1];
const art = path.join(repo, 'dist', 'xo-art');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Headless Chrome hands out only 10–20 frames a second. The page is slowed down ten times instead
// (CSS animations, timers, requestAnimationFrame and performance.now), recorded, and the frame
// times divided back: a smooth 30 fps of the game at its real speed.
const SLOW = 10;
const play = (ms) => sleep(ms * SLOW);

// [css width, css height, scale, cover file]
const SHOTS = [
  ['1920x1080', 1280, 720, 1.5, 'cover-1920x1080.png'],
  ['1080x1620', 720, 1080, 1.5, 'cover-800x1200.png'],
];

const S = await serve(repo);
const B = await chrome();
try {
  await B.init(`try { localStorage.clear(); localStorage.setItem('xo.sound', '0'); } catch {}
    if (location.protocol.startsWith('http')) {
      // as in the portal build: no "All games" link and no footer
      document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#home, #foot { display: none !important; }'; document.head.append(s); });
      const SLOW = ${SLOW};
      const now = performance.now.bind(performance);
      const t0 = now();
      const slowNow = () => t0 + (now() - t0) / SLOW;
      performance.now = slowNow;
      const st = window.setTimeout;
      window.setTimeout = (f, ms, ...a) => st(f, (ms || 0) * SLOW, ...a);
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (f) => raf(() => f(slowNow()));
    }`);
  for (const [name, w, h, scale, cover] of SHOTS) {
    const frames = path.join(art, 'frames-' + name);
    fs.rmSync(frames, { recursive: true, force: true });
    fs.mkdirSync(frames, { recursive: true });
    await B.open('about:blank', w, h);
    await B.cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: false });
    await B.cdp('Page.navigate', { url: `${S.url}/xo/?lang=en` });
    await sleep(400);
    await B.cdp('Animation.enable');
    await B.cdp('Animation.setPlaybackRate', { playbackRate: 1 / SLOW });

    const got = [];
    let recording = true;
    B.on((m) => {
      if (m.method !== 'Page.screencastFrame' || !recording) return;
      const file = path.join(frames, String(got.length).padStart(5, '0') + '.jpg');
      fs.writeFileSync(file, Buffer.from(m.params.data, 'base64'));
      got.push({ file, t: m.params.metadata.timestamp });
      B.cdp('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
    });
    await B.cdp('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: w * scale, maxHeight: h * scale, everyNthFrame: 1 });
    // something moving on every frame keeps the screencast going at full speed
    await B.js(`(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none'; document.body.append(d); let k = 0; (function f() { d.style.transform = 'translateX(' + (k++ % 2) + 'px)'; requestAnimationFrame(f); })(); })()`);

    // the menu, its little board drawing itself
    await play(2200);
    await B.js(`document.querySelector('[data-start="duo"]').click()`);
    await play(700);
    // X takes the center and a corner, then forks: two lines at once, O can block only one
    for (const c of [4, 1, 0, 8, 6, 2, 3]) {
      await B.js(`document.querySelectorAll('.cell')[${c}].click()`);
      await play(620);
    }
    await play(1900);
    recording = false;
    await B.cdp('Page.stopScreencast');
    await sleep(200);

    // the game: each frame lasts until the next one
    const list = [];
    got.forEach((f, k) => {
      list.push(`file '${f.file.replace(/\\/g, '/')}'`);
      list.push(`duration ${k + 1 < got.length ? Math.max(0.001, (got[k + 1].t - f.t) / SLOW).toFixed(4) : 0.1}`);
    });
    list.push(`file '${got[got.length - 1].file.replace(/\\/g, '/')}'`);
    const listFile = path.join(frames, 'list.txt');
    fs.writeFileSync(listFile, list.join('\n') + '\n');
    const [W, H] = name.split('x').map(Number);
    const fit = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0e0a19,setsar=1,fps=30,format=yuv420p`;
    const out = path.join(art, `video-${name}.mp4`);
    // the cover for 1.5 s, then the game
    execFileSync(
      FFMPEG,
      ['-y', '-loglevel', 'error', '-loop', '1', '-t', '1.5', '-i', path.join(art, cover), '-f', 'concat', '-safe', '0', '-i', listFile,
        '-filter_complex', `[0:v]${fit}[a];[1:v]setpts=PTS-STARTPTS,${fit}[b];[a][b]concat=n=2:v=1:a=0[v]`, '-map', '[v]',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', '-an', out],
      { stdio: 'inherit' },
    );
    const span = got.length > 1 ? (got[got.length - 1].t - got[0].t) / SLOW : 0;
    console.log(`${out}: ${got.length} frames in ${span.toFixed(1)} s (${(got.length / span).toFixed(0)} fps captured), ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
    fs.rmSync(frames, { recursive: true, force: true });
  }
} finally {
  B.close();
  S.close();
}
