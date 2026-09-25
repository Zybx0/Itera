// Prints the CSP sha256 of every inline <script> in the web build (dist/).
// Usage: npm run build:web && node scripts/csp-hash.mjs
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const hashes = new Set();
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith('.html')) {
      for (const m of readFileSync(path, 'utf8').matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
        hashes.add(`'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
      }
    }
  }
};
walk(new URL('../dist', import.meta.url).pathname);
console.log([...hashes].join(' ') || '(no inline scripts)');
