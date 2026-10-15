// Headless Chrome over the DevTools protocol, with a static server for a folder.
// Used by tools/test.mjs and tools/covers.mjs; no npm packages needed.
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

export async function serve(root) {
  root = path.resolve(root);
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

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => fs.existsSync(p));

export async function chrome() {
  if (!CHROME) throw new Error('Chrome not found');
  const port = 9300 + Math.floor(Math.random() * 600);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'oyu-cdp-'));
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  let wsUrl;
  for (let k = 0; k < 60 && !wsUrl; k++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
  }
  if (!wsUrl) throw new Error('Chrome did not start');
  const ws = new WebSocket(wsUrl);
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
  const errors = [];
  listeners.push((m) => {
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  const js = async (expression) => {
    const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  let initScript = null;
  return {
    cdp,
    js,
    errors,
    // a script that runs before the page's own code on every load
    async init(source) {
      if (initScript) await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: initScript });
      initScript = (await cdp('Page.addScriptToEvaluateOnNewDocument', { source })).identifier;
    },
    async open(url, width = 1280, height = 720) {
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
      await cdp('Page.navigate', { url });
      await loaded;
      await js('new Promise((r) => setTimeout(r, 250))');
    },
    async size(width, height) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await js('new Promise((r) => setTimeout(r, 120))');
    },
    async shot(file, format = 'png') {
      const r = await cdp('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality: 92 } : {}) });
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    },
    close() {
      ws.close();
      proc.kill();
      setTimeout(() => fs.rmSync(profile, { recursive: true, force: true }), 500);
    },
  };
}
