/* MetroSync service worker: lets the app install and open offline.
   Bump V when you want every phone to drop its old cache. */
const V = 'metrosync-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const CDN = ['cdn.tailwindcss.com', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    // Our own files: network first (so updates arrive), cache as the offline fallback
    e.respondWith(
      fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
        .catch(() => caches.match(r).then(m => m || caches.match('index.html')))
    );
  } else if (CDN.includes(u.hostname)) {
    // Tailwind / Firebase SDK / fonts: cache first, refresh in background
    e.respondWith(caches.match(r).then(m => {
      const net = fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; }).catch(() => m);
      return m || net;
    }));
  }
  // everything else (Firebase database traffic) goes straight to the network
});
