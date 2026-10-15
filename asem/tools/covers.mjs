// Game portal covers and preview videos, rendered by headless Chrome from the game itself.
//
//   node tools/covers.mjs [--map astana] [--title "Asem Road"] [--ffmpeg path] [--try]
//
// Output in dist/covers/:
//   cover-landscape.png 1920x1080, cover-portrait.png 800x1200, cover-square.png 800x800
//   video-landscape.mp4 1920x1080, video-portrait.mp4 1080x1620 (18 s, 30 fps, no sound,
//   the first half second is the cover, as CrazyGames asks)
// --try renders only landscape covers of every map, to pick the best one.
//
// The game's own loop is stopped (requestAnimationFrame does nothing) and the script steps it
// through window.__asem (?debug), so every frame is exact. The race is driven by g.autoDrive.
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i < 0 ? def : process.argv[i + 1];
};
const MAP = arg('map', 'astana');
const TITLE = arg('title', 'Asem Road');
const FFMPEG = arg('ffmpeg', 'ffmpeg');
const TRY = process.argv.includes('--try');
const out = path.join(root, 'dist', 'covers');
fs.mkdirSync(out, { recursive: true });

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error('Chrome not found');

// ---------- a static server for the repo ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root)) return res.writeHead(403).end();
  fs.readFile(f, (err, data) => (err ? res.writeHead(404).end() : res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }).end(data)));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const site = `http://127.0.0.1:${server.address().port}`;

// ---------- Chrome over the DevTools protocol ----------
const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'asem-covers-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
let pageWs;
for (let k = 0; k < 50 && !pageWs; k++) {
  await new Promise((r) => setTimeout(r, 200));
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    pageWs = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
  } catch {
    /* not up yet */
  }
}
if (!pageWs) throw new Error('Chrome did not start');
const ws = new WebSocket(pageWs);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const waiting = new Map();
const listeners = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) {
    const { ok, fail } = waiting.get(m.id);
    waiting.delete(m.id);
    m.error ? fail(new Error(m.error.message)) : ok(m.result);
  } else if (m.method) listeners.forEach((l) => l(m));
});
const cdp = (method, params = {}) =>
  new Promise((ok, fail) => {
    const id = ++seq;
    waiting.set(id, { ok, fail });
    ws.send(JSON.stringify({ id, method, params }));
  });
const js = async (expression) => {
  const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

await cdp('Page.enable');
await cdp('Runtime.enable');
// the script drives the frames; the counter stays off; English everywhere
await cdp('Page.addScriptToEvaluateOnNewDocument', {
  source: "window.requestAnimationFrame = () => 0; try { localStorage.setItem('pulse.off', '1'); localStorage.setItem('asem.lang', 'en'); } catch {}",
});

async function open(url, width, height) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const loaded = new Promise((r) => {
    const l = (m) => {
      if (m.method === 'Page.loadEventFired') {
        listeners.splice(listeners.indexOf(l), 1);
        r();
      }
    };
    listeners.push(l);
  });
  await cdp('Page.navigate', { url: site + url });
  await loaded;
  await js('document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 300)))');
}

async function shot(file, format = 'png') {
  const r = await cdp('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality: 92 } : {}) });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
}

// the cover: the clean ?og frame with only the game's title on it
// CrazyGames covers its own labels over the top-left ~40% x 20% of a cover, so the title stays out of it
const COVER_CSS = {
  landscape: '.og-title { left: auto; right: 96px; top: 84px; } .og-title b { font-size: 176px; }',
  portrait: '.og-title { left: 0; right: 0; top: 270px; justify-items: center; } .og-title b { font-size: 112px; text-align: center; }',
  square: '.og-title { left: 0; right: 0; top: 180px; justify-items: center; } .og-title b { font-size: 112px; }',
};
async function cover(map, kind, width, height, file) {
  await open(`/?debug&og&lang=en&map=${map}`, width, height);
  await js(`(() => {
    const s = document.createElement('style');
    s.textContent = ${JSON.stringify(COVER_CSS[kind])};
    document.head.append(s);
    const t = document.querySelector('.og-title');
    t.querySelector('span')?.remove();
    t.querySelector('b').textContent = ${JSON.stringify(TITLE)};
    window.__asem.step(40);
  })()`);
  await shot(file);
  console.log(file);
}

const SIZES = { landscape: [1920, 1080], portrait: [800, 1200], square: [800, 800] };

try {
  if (TRY) {
    for (const map of ['city', 'medeu', 'shymbulak', 'kapchagay', 'charyn', 'kolsai', 'astana']) await cover(map, 'landscape', 1920, 1080, path.join(out, `try-${map}.png`));
  } else {
    for (const [kind, [w, h]] of Object.entries(SIZES)) await cover(MAP, kind, w, h, path.join(out, `cover-${kind}.png`));

    // the videos: the cover for half a second, then 17.5 s of the race at full speed
    const VIDEO = { landscape: [1920, 1080], portrait: [1080, 1620] };
    for (const [kind, [w, h]] of Object.entries(VIDEO)) {
      const frames = path.join(out, 'frames-' + kind);
      fs.rmSync(frames, { recursive: true, force: true });
      fs.mkdirSync(frames);
      await cover(MAP, kind === 'portrait' ? 'portrait' : 'landscape', w, h, path.join(frames, 'cover.png'));
      await open(`/?debug&lang=en`, w, h);
      await js(`(() => {
        const A = window.__asem;
        A.start({ kind: 'free', mapId: ${JSON.stringify(MAP)} });
        A.g.autoDrive = true;
        // no oncoming cars in the clip: on a two-lane road they keep the autopilot stuck behind trucks
        const T = A.g.track;
        for (const c of T.cars.filter((c) => c.dir < 0)) {
          T.cars.splice(T.cars.indexOf(c), 1);
          const seg = T.segAt(c.z);
          seg.cars.splice(seg.cars.indexOf(c), 1);
        }
        A.step(60 * 3.4);
        A.g.timeLeft = 99;
      })()`);
      const FPS = 30;
      let n = 0;
      let slowest = Infinity;
      for (; n < 15; n++) fs.copyFileSync(path.join(frames, 'cover.png'), path.join(frames, `f${String(n).padStart(4, '0')}.png`));
      for (let k = 0; k < FPS * 17.5; k++, n++) {
        // nitro now and then, as a player would
        const sec = k / FPS;
        const kmh = await js(`window.__asem.press('nitro', ${(sec > 3 && sec < 6) || (sec > 11 && sec < 14)}); window.__asem.step(2); window.__asem.g.speed`);
        if (sec > 1.5) slowest = Math.min(slowest, kmh);
        await shot(path.join(frames, `f${String(n).padStart(4, '0')}.png`));
      }
      const mp4 = path.join(out, `video-${kind}.mp4`);
      execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-an', '-movflags', '+faststart', mp4]);
      fs.rmSync(frames, { recursive: true, force: true });
      console.log(mp4, (fs.statSync(mp4).size / 1048576).toFixed(1) + ' MB', 'slowest speed after 1.5 s:', Math.round(slowest));
    }
  }
} finally {
  ws.close();
  chrome.kill();
  server.close();
  setTimeout(() => fs.rmSync(profile, { recursive: true, force: true }), 500);
}
