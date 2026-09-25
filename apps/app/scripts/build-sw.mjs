// Generates dist/sw.js from public/sw.template.js after `expo export`:
// injects the list of every built file (to precache for offline use) and a
// version hash derived from their contents. Run by `npm run build:web`.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const dist = new URL('../dist', import.meta.url).pathname;
// Server-only / non-app files that must not be precached.
const EXCLUDE = new Set(['sw.js', 'sw.template.js', '_headers', '_redirects', '_sitemap.html']);

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile()) files.push(path);
  }
};
walk(dist);

const hash = createHash('sha256');
const precache = [];
for (const path of files.sort()) {
  const rel = relative(dist, path).split(sep).join('/');
  if (EXCLUDE.has(rel) || rel.endsWith('.map')) continue;
  precache.push(`/${rel}`);
  hash.update(rel).update(readFileSync(path));
}
const version = hash.digest('hex').slice(0, 16);

const template = readFileSync(join(dist, 'sw.template.js'), 'utf8');
writeFileSync(
  join(dist, 'sw.js'),
  template.replace("'__ITERA_VERSION__'", JSON.stringify(version)).replace('__ITERA_PRECACHE__', JSON.stringify(precache)),
);
rmSync(join(dist, 'sw.template.js'));
console.log(`sw.js: ${precache.length} files precached, version ${version}`);
