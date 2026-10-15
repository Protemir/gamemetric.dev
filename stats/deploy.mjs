// Deploys the play counter (stats/worker.js) as the "gm-pulse" Worker with a SQLite Durable Object.
// Same token as worker/deploy.mjs ("Edit Cloudflare Workers" template).
//
//   node stats/deploy.mjs <token file> <report key file>
//
// The report key file is created with a random key if it does not exist.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [tokenFile, keyFile] = process.argv.slice(2);
if (!tokenFile || !keyFile) {
  console.error('usage: node stats/deploy.mjs <token file> <report key file>');
  process.exit(1);
}
const token = fs.readFileSync(tokenFile, 'utf8').trim();
if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(18).toString('base64url') + '\n');
const key = fs.readFileSync(keyFile, 'utf8').trim();
const NAME = 'gm-pulse';
const API = 'https://api.cloudflare.com/client/v4';

async function cf(method, url, body) {
  const res = await fetch(API + url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}) },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!data.success) throw new Error(`${method} ${url}: ${JSON.stringify(data.errors || data)}`);
  return data.result;
}

const account = (await cf('GET', '/accounts'))[0].id;
const scripts = await cf('GET', `/accounts/${account}/workers/scripts`);
const exists = scripts.some((s) => s.id === NAME);

const meta = {
  main_module: 'worker.js',
  compatibility_date: '2026-10-01',
  bindings: [
    { type: 'durable_object_namespace', name: 'STATS', class_name: 'Stats' },
    { type: 'secret_text', name: 'KEY', text: key },
  ],
};
// the Durable Object class is registered once; later uploads keep it
if (!exists) meta.migrations = { new_tag: 'v1', new_sqlite_classes: ['Stats'] };

const form = new FormData();
form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
form.append('worker.js', new Blob([fs.readFileSync(path.join(here, 'worker.js'), 'utf8')], { type: 'application/javascript+module' }), 'worker.js');
await cf('PUT', `/accounts/${account}/workers/scripts/${NAME}`, form);
console.log('worker uploaded', exists ? '(update)' : '(new)');

const sub = (await cf('GET', `/accounts/${account}/workers/subdomain`)).subdomain;
await cf('POST', `/accounts/${account}/workers/scripts/${NAME}/subdomain`, { enabled: true, previews_enabled: false });
console.log(`https://${NAME}.${sub}.workers.dev`);
