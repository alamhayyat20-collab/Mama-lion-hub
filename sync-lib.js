// =====================================================================
// sync-lib.js — butang 🔄 Sync dikongsi oleh semua apps Mama Lion
//   (Lion Safari V2, Apps Pekerja, Akaun, Apps Pelanggan)
//
// Tekan Sync:
//   1. hantar semua data yang belum sampai ke server (rekod offline)
//   2. sambung semula ke Firebase → tarik data terkini dari server
//   3. semak versi apps di GitHub Pages; jika ada versi baru,
//      buang cache lama & muat semula supaya semua telefon selari
// Versi apps dibaca dari <meta name="app-versi" content="..."> setiap index.html.
// Semakan versi juga dibuat sendiri setiap 5 minit & bila apps dibuka semula.
// =====================================================================
import { waitForPendingWrites, disableNetwork, enableNetwork } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

export const versiApps = () => document.querySelector('meta[name="app-versi"]')?.content || '';

const CSS = `
.sync-btn{display:inline-flex;align-items:center;gap:5px;border:0;border-radius:999px;padding:6px 11px;font-size:12px;font-weight:700;cursor:pointer;
  background:#1e293b;color:#e2e8f0;font-family:inherit;white-space:nowrap;line-height:1.2}
.sync-btn .ik{display:inline-block}
.sync-btn.jalan .ik{animation:syncPusing 1s linear infinite}
.sync-btn.baru{background:#f59e0b;color:#111;animation:syncDenyut 1.6s ease-in-out infinite}
.sync-btn.ok{background:#14532d;color:#bbf7d0}
.sync-btn.gagal{background:#7f1d1d;color:#fecaca}
@keyframes syncPusing{to{transform:rotate(360deg)}}
@keyframes syncDenyut{50%{box-shadow:0 0 0 6px #f59e0b44}}
#syncToast{position:fixed;left:50%;top:14px;transform:translateX(-50%);background:#0f172a;color:#fff;padding:11px 15px;border-radius:12px;
  font-size:14px;z-index:200;max-width:92%;text-align:center;box-shadow:0 6px 24px #0005;display:none;font-family:system-ui,Arial}
`;

const tidur = ms => new Promise(r => setTimeout(r, ms));
const hadMasa = (p, ms) => Promise.race([p, tidur(ms).then(() => 'tamat')]);
const jam = () => new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});

function papar(m, ms = 3200){
  let t = document.getElementById('syncToast');
  if(!t){ t = document.createElement('div'); t.id = 'syncToast'; document.body.appendChild(t); }
  t.textContent = m; t.style.display = 'block';
  clearTimeout(t._h); t._h = setTimeout(() => t.style.display = 'none', ms);
}

// Baca versi apps terkini dari pelayan (bukan dari cache telefon)
async function versiPelayan(){
  const url = location.pathname.endsWith('/') ? location.pathname + 'index.html' : location.pathname;
  const r = await fetch(url + '?semak=' + Date.now(), {cache:'no-store'});
  if(!r.ok) throw new Error('HTTP ' + r.status);
  const m = (await r.text()).match(/<meta\s+name="app-versi"\s+content="([^"]*)"/i);
  return m ? m[1] : '';
}

// Buang cache apps ini & muat turun semula semua fail (HTML, JS, gambar) terus dari pelayan
async function segarkanFail(awalan){
  try{
    if('caches' in window){
      const ks = await caches.keys();
      await Promise.all(ks.filter(k => !awalan || k.startsWith(awalan)).map(k => caches.delete(k)));
    }
  }catch(_){}
  const fail = new Set([location.pathname]);
  try{ performance.getEntriesByType('resource').forEach(e => { const u = new URL(e.name); if(u.origin === location.origin) fail.add(u.pathname); }); }catch(_){}
  document.querySelectorAll('script[src],link[rel="manifest"],link[rel="stylesheet"]').forEach(x => { try{ const u = new URL(x.src || x.href, location.href); if(u.origin === location.origin) fail.add(u.pathname); }catch(_){} });
  await Promise.allSettled([...fail].map(p => fetch(p, {cache:'reload'})));
  try{ const reg = await navigator.serviceWorker?.getRegistration(); await reg?.update(); }catch(_){}
}

/**
 * Pasang butang Sync.
 * @param {object} o
 *   store    — instance Firestore apps (boleh null jika apps tiada Firestore)
 *   tempat   — elemen / selector tempat butang diletak (butang ditambah di hujung)
 *   awalan   — awalan nama cache service worker apps (cth 'lionsafari-')
 *   sebelum  — fungsi pilihan; pulangkan teks amaran jika muat semula perlu disahkan (cth borang separuh diisi)
 */
export function pasangSync({store = null, tempat, awalan = '', sebelum = null} = {}){
  if(!document.getElementById('syncCss')) document.head.insertAdjacentHTML('beforeend', `<style id="syncCss">${CSS}</style>`);
  const versi = versiApps();
  let btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'sync-btn'; btn.title = `Sync data & apps (versi ${versi || '-'})`;
  btn.innerHTML = '<span class="ik">🔄</span><span class="tx">Sync</span>';
  let adaBaru = false, sibuk = false, terakhir = '';
  const set = (kelas, teks) => { btn.className = 'sync-btn ' + (kelas || ''); btn.querySelector('.tx').textContent = teks; };
  const asal = () => adaBaru ? set('baru', 'Kemas kini') : set('', terakhir ? `Sync · ${terakhir}` : 'Sync');

  function letak(){
    const el = typeof tempat === 'string' ? document.querySelector(tempat) : tempat;
    if(el && !el.contains(btn)) el.appendChild(btn);
  }
  letak();

  async function semakVersi(diam = true){
    if(!navigator.onLine || !versi) return false;
    try{
      const v = await versiPelayan();
      adaBaru = !!v && v !== versi;
      if(!sibuk) asal();
      if(adaBaru && !diam) papar(`⬆ Versi baru apps tersedia (${v}). Tekan "Kemas kini".`);
      return adaBaru;
    }catch(_){ return false; }
  }

  async function sync(){
    if(sibuk) return;
    if(!navigator.onLine){ set('gagal', 'Offline'); papar('📴 Tiada internet. Data yang dimasukkan disimpan dalam telefon dan akan dihantar sendiri bila online.', 4500); setTimeout(asal, 3000); return; }
    sibuk = true; set('jalan', 'Menyegerak…');
    try{
      // 1. hantar rekod yang belum sampai ke server
      if(store){
        const r = await hadMasa(waitForPendingWrites(store), 20000);
        if(r === 'tamat') papar('⏳ Sebahagian data masih dihantar — rangkaian perlahan. Cuba Sync sekali lagi sebentar.', 4500);
      }
      // 2. semak versi apps
      const baru = await semakVersi(true);
      // 3. sambung semula Firestore supaya semua senarai ditarik semula dari server
      if(store){ await disableNetwork(store); await tidur(300); await enableNetwork(store); }
      if(baru){
        const amaran = sebelum ? sebelum() : '';
        if(amaran && !confirm(`${amaran}\n\nMuat semula apps sekarang untuk versi baru?`)){ terakhir = jam(); sibuk = false; asal(); return; }
        set('jalan', 'Memuat versi baru…');
        await segarkanFail(awalan);
        location.reload();
        return;
      }
      terakhir = jam();
      set('ok', `Selari · ${terakhir}`);
      papar(`✅ Data & apps selari (versi ${versi || '-'})`);
      setTimeout(() => { if(!sibuk) asal(); }, 4000);
    }catch(e){
      console.error(e);
      set('gagal', 'Gagal'); papar('⚠ Sync gagal: ' + (e.code || e.message || e), 4500);
      setTimeout(asal, 4000);
    }finally{ sibuk = false; }
  }

  btn.onclick = sync;
  // semakan automatik: bila dibuka, setiap 5 minit & bila apps kembali ke depan
  setTimeout(() => semakVersi(false), 4000);
  setInterval(() => semakVersi(true), 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') semakVersi(true); });
  addEventListener('online', () => semakVersi(true));
  return {btn, letak, sync, semakVersi};
}
