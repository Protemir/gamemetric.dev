// Cloudflare Pages build: copies the site into _site without the dev-only files
// (tools/, worker/, READMEs, licence, deploy scripts), so they are not served.
// Pages runs `node .cloudflare/build.mjs` with `_site` as the output directory.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '_site');

const skipDirs = new Set(['.git', '.github', '.cloudflare', '.claude', '_site', 'dist', 'node_modules', 'tools', 'worker', 'functions']);
const skipFiles = new Set(['README.md', 'LICENSE', '.gitignore', 'deploy.mjs', 'report.mjs']);
const skipPaths = new Set(['stats/worker.js']); // the play counter's server code

let files = 0;
function copy(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const src = path.join(dir, e.name);
    const r = path.join(rel, e.name);
    if (e.isDirectory()) {
      if (!skipDirs.has(e.name)) copy(src, r);
    } else if (e.isFile() && !skipFiles.has(e.name) && !skipPaths.has(r.split(path.sep).join('/'))) {
      fs.mkdirSync(path.join(out, rel), { recursive: true });
      fs.copyFileSync(src, path.join(out, r));
      files++;
    }
  }
}

fs.rmSync(out, { recursive: true, force: true });
copy(root, '');
console.log(`_site: ${files} files`);
