// Motion Mornings offline support: the page always tries the network first so updates arrive,
// and falls back to the saved copy when there's no reception. Music, icons and fonts are kept once fetched.
const CACHE = 'mm-v1';
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon.svg', '/music/morning-mood.mp3'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (r.mode === 'navigate') {
    // network first with a short wait, so a slow morning connection still opens straight away
    e.respondWith(new Promise(res => {
      let done = false; const fallback = () => caches.match('/index.html').then(m => { if (!done && m) { done = true; res(m); } });
      const t = setTimeout(fallback, 3500);
      fetch(r).then(n => { clearTimeout(t); const c = n.clone(); caches.open(CACHE).then(ca => ca.put('/index.html', c)); if (!done) { done = true; res(n); } })
        .catch(() => { clearTimeout(t); caches.match('/index.html').then(m => { if (!done) { done = true; res(m || Response.error()); } }); });
    }));
    return;
  }
  const keep = u.origin === location.origin ? /\.(mp3|png|svg|webmanifest)$/.test(u.pathname) : /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!keep) return;
  // music files are big and never change, so keep a copy once fetched (range requests go to the network)
  if (r.headers.get('range')) return;
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(n => { if (n.ok || n.type === 'opaque') { const c = n.clone(); caches.open(CACHE).then(ca => ca.put(r, c)); } return n; })));
});
