// Serves dist/ locally WITH the production security headers from
// public/_headers, to check that the CSP does not break the app.
// Usage: npm run build:web && node scripts/serve-web.mjs  → http://localhost:8082
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
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
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.ttf': 'font/ttf' };

createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(root, url));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (!existsSync(file)) {
    // Dynamic routes: /deck/<uuid> → deck/[id].html
    const parts = url.split('/').filter(Boolean);
    const candidates = [parts.map((p, i) => (i % 2 ? '[id]' : p)).join('/') + '.html', parts.map((p, i) => (i === 1 ? '[id]' : p)).join('/') + '.html'];
    file = candidates.map((c) => join(root, c)).find(existsSync) ?? join(root, '+not-found.html');
  }
  res.writeHead(200, { ...headers, 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(8082, () => console.log('http://localhost:8082'));
