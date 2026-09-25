// Serves dist/ locally WITH the production security headers from
// public/_headers, to check that the CSP does not break the app.
// Usage: npm run build:web && node scripts/serve-web.mjs  → http://localhost:8082
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = new URL('../dist', import.meta.url).pathname;
const headers = Object.fromEntries(
  readFileSync(new URL('../public/_headers', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => /^\s+[A-Za-z-]+:/.test(l))
    .map((l) => [l.trim().split(':')[0], l.trim().slice(l.trim().indexOf(':') + 1).trim()]),
);
delete headers['Strict-Transport-Security'];
headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace('; upgrade-insecure-requests', '');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ttf': 'font/ttf' };

// Read the first candidate that exists (no check-then-read: avoids TOCTOU races).
function readFirst(paths) {
  for (const path of paths) {
    try {
      return { path, body: readFileSync(path) };
    } catch {
      // EISDIR / ENOENT: try the next candidate.
    }
  }
  return null;
}

createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = normalize(join(root, url));
  if (file !== root && !file.startsWith(root + '/')) return res.writeHead(403).end();
  const found = readFirst([file, join(file, 'index.html'), `${file}.html`, join(root, '+not-found.html')]);
  if (!found) return res.writeHead(404).end();
  res.writeHead(200, { ...headers, 'Content-Type': types[extname(found.path)] ?? 'application/octet-stream' });
  res.end(found.body);
}).listen(8082, () => console.log('http://localhost:8082'));
