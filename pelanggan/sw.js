// Safari Members — simpan fail apps (data Firebase diurus berasingan)
const V = 'safari-members-v41';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'syiling.png', 'marmar.jpg', 'logo-mamalion.jpg', 'logo-lionking.jpg', 'sign-emas.png', 'sign-perak.png', '../firebase-config.js', '../safari-lib.js', '../sync-lib.js', '../i18n-lib.js', '../pasang-lib.js', 'kamus-en.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('safari-members-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if(e.request.method !== 'GET') return;
  const lib = (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/')) || u.hostname === 'cdn.jsdelivr.net' || u.hostname.endsWith('googleapis.com') || u.hostname === 'fonts.gstatic.com';
  if(u.origin !== location.origin && !lib) return;
  if(u.hostname === 'firestore.googleapis.com') return;
  e.respondWith(fetch(e.request, u.origin === location.origin ? {cache:'no-cache'} : {}).then(r => { if(r.ok){ const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, {ignoreSearch:true}).then(r => r || caches.match('index.html'))));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(l => l.length ? l[0].focus() : self.clients.openWindow('./')));
});
