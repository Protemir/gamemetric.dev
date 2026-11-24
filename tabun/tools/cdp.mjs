// Minimal Chrome DevTools Protocol client + static server, shared by the test and cover tools.
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const CHROME = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && fs.existsSync(p));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

export async function serve(root) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root)) return res.writeHead(403).end();
    fs.readFile(f, (err, data) => (err ? res.writeHead(404).end() : res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(data)));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

export async function launch({ headless = true, width = 1280, height = 720, extra = [] } = {}) {
  if (!CHROME) throw new Error('Chrome not found (set CHROME=path)');
  const port = 9300 + Math.floor(Math.random() * 600);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-chrome-'));
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    '--autoplay-policy=no-user-gesture-required',
    `--window-size=${width},${height}`,
    ...(headless ? ['--headless=new', '--hide-scrollbars'] : []),
    ...extra,
    'about:blank',
  ];
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  let pageWs;
  for (let k = 0; k < 75 && !pageWs; k++) {
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
  const send = (method, params = {}) =>
    new Promise((ok, fail) => {
      const id = ++seq;
      waiting.set(id, { ok, fail });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const on = (fn) => listeners.push(fn);
  // evaluate an expression (async allowed) and return its JSON value
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: `(async () => (${expr}))()`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  const close = () => {
    try {
      ws.close();
    } catch {
      /* gone */
    }
    proc.kill();
    setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome ещё держит файлы — не страшно */ } }, 1500);
  };
  return { send, on, evaluate, close };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
