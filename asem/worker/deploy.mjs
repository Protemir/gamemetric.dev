// Deploys worker.js to Cloudflare Workers with a KV namespace for the scores.
// Needs a Cloudflare API token made from the "Edit Cloudflare Workers" template.
//
//   node worker/deploy.mjs <path to a file with the token>
//
// Prints the workers.dev address to put into js/scores.js (PROD).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tokenFile = process.argv[2];
const token = (process.env.CF_API_TOKEN || (tokenFile && fs.readFileSync(tokenFile, 'utf8')) || '').trim();
if (!token) {
  console.error('No token: pass a file with it or set CF_API_TOKEN');
  process.exit(1);
}
const NAME = 'asem-scores';
const API = 'https://api.cloudflare.com/client/v4';

async function cf(method, url, body, headers = {}) {
  const res = await fetch(API + url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!data.success) throw new Error(`${method} ${url}: ${JSON.stringify(data.errors || data)}`);
  return data.result;
}

const accounts = await cf('GET', '/accounts');
if (!accounts.length) throw new Error('The token sees no accounts');
const account = accounts[0].id;
console.log('account', accounts[0].name);

const spaces = await cf('GET', `/accounts/${account}/storage/kv/namespaces?per_page=100`);
let ns = spaces.find((s) => s.title === NAME);
if (!ns) ns = await cf('POST', `/accounts/${account}/storage/kv/namespaces`, { title: NAME });
console.log('kv namespace', ns.id);

const form = new FormData();
form.append('metadata', new Blob([JSON.stringify({
  main_module: 'worker.js',
  compatibility_date: '2026-10-01',
  bindings: [{ type: 'kv_namespace', name: 'SCORES', namespace_id: ns.id }],
})], { type: 'application/json' }));
form.append('worker.js', new Blob([fs.readFileSync(path.join(here, 'worker.js'), 'utf8')], { type: 'application/javascript+module' }), 'worker.js');
await cf('PUT', `/accounts/${account}/workers/scripts/${NAME}`, form);
console.log('worker uploaded');

let sub;
try {
  sub = (await cf('GET', `/accounts/${account}/workers/subdomain`)).subdomain;
} catch {
  sub = null;
}
if (!sub) {
  sub = (await cf('PUT', `/accounts/${account}/workers/subdomain`, { subdomain: 'asemface' })).subdomain;
}
await cf('POST', `/accounts/${account}/workers/scripts/${NAME}/subdomain`, { enabled: true, previews_enabled: false });
console.log(`https://${NAME}.${sub}.workers.dev`);
