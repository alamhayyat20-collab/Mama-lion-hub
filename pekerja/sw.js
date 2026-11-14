// Apps Pekerja — simpan fail apps (data Firebase diurus berasingan)
const V = 'pekerja-ml-v2';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'logo-mamalion.jpg', 'logo-lionking.jpg', '../firebase-config.js', '../pekerja-lib.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('pekerja-ml-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if(e.request.method !== 'GET') return;
  const firebaseLib = u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/');
  if(u.origin !== location.origin && !firebaseLib) return;
  e.respondWith(fetch(e.request).then(r => { if(r.ok){ const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, {ignoreSearch:true}).then(r => r || caches.match('index.html'))));
});
