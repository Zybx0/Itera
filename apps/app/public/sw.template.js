/*
 * Itera service worker — makes the web app work offline.
 *
 * scripts/build-sw.mjs copies this file to dist/sw.js after `expo export`,
 * replacing the two placeholders with the list of every built file and a
 * version hash. Any change to the build changes the hash → the browser
 * installs the new worker, which downloads the new files and deletes the
 * old cache.
 *
 * Strategy: everything is precached at install ("app shell"); requests are
 * served cache-first. Page navigations are mapped to the matching static
 * HTML file (e.g. /deck?id=… → /deck.html). The worker never talks to any
 * other origin and never caches user data (that lives in IndexedDB).
 */
const VERSION = '__ITERA_VERSION__';
const PRECACHE = __ITERA_PRECACHE__;
const CACHE = `itera-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((path) => new Request(path, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('itera-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function htmlFor(pathname) {
  if (pathname === '/' || pathname === '/index.html') return '/index.html';
  const clean = pathname.replace(/\/+$/, '');
  if (PRECACHE.includes(`${clean}.html`)) return `${clean}.html`;
  if (PRECACHE.includes(`${clean}/index.html`)) return `${clean}/index.html`;
  return '/index.html';
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => (await cache.match(htmlFor(url.pathname))) ?? fetch(request)),
    );
    return;
  }
  event.respondWith(
    caches.open(CACHE).then(async (cache) => (await cache.match(url.pathname)) ?? fetch(request)),
  );
});
