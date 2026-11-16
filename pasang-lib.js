// =====================================================================
// pasang-lib.js — bantuan memasang apps ke skrin utama telefon
//  • Kesan pelayar dalam WhatsApp / Facebook / Instagram / TikTok → butang "Buka dalam Chrome"
//  • Panduan pasang ikut jenama telefon (Samsung, Xiaomi, Oppo/Realme, Vivo, Huawei/Honor, iPhone)
// =====================================================================
const UA = navigator.userAgent || '';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const ANDROID = /Android/i.test(UA), IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function pelayarDalaman(){
  if(/WhatsApp/i.test(UA)) return 'WhatsApp';
  if(/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(UA)) return 'Facebook';
  if(/Instagram/i.test(UA)) return 'Instagram';
  if(/musical_ly|Bytedance|TikTok|trill/i.test(UA)) return 'TikTok';
  if(/\bLine\//i.test(UA)) return 'LINE';
  if(/Telegram/i.test(UA)) return 'Telegram';
  if(ANDROID && /; wv\)/.test(UA)) return 'aplikasi lain';
  return '';
}
export function jenama(){
  if(IOS) return 'iphone';
  if(/SM-|Samsung|SAMSUNG/i.test(UA)) return 'samsung';
  if(/Redmi|POCO|\bMi \w|Xiaomi|MIX|M2\d{3}|22\d{3}|23\d{3}|24\d{3}/i.test(UA)) return 'xiaomi';
  if(/OPPO|CPH\d|RMX\d|realme|OnePlus/i.test(UA)) return 'oppo';
  if(/vivo|V2\d{3}|iQOO/i.test(UA)) return 'vivo';
  if(/HUAWEI|HONOR|HMA-|ELE-|VOG-|ANE-|JNY-/i.test(UA)) return 'huawei';
  return ANDROID ? 'android' : 'pc';
}
export function pelayar(){
  if(/SamsungBrowser/i.test(UA)) return 'Samsung Internet';
  if(/MiuiBrowser|XiaoMi\/MiuiBrowser/i.test(UA)) return 'Mi Browser';
  if(/HeyTapBrowser|OppoBrowser/i.test(UA)) return 'Oppo Browser';
  if(/VivoBrowser/i.test(UA)) return 'Vivo Browser';
  if(/HuaweiBrowser/i.test(UA)) return 'Huawei Browser';
  if(/UCBrowser/i.test(UA)) return 'UC Browser';
  if(/OPR\/|Opera/i.test(UA)) return 'Opera';
  if(/EdgA|Edg\//i.test(UA)) return 'Edge';
  if(/Firefox|FxiOS/i.test(UA)) return 'Firefox';
  if(/CriOS|Chrome\//i.test(UA)) return 'Chrome';
  if(IOS && /Safari/i.test(UA)) return 'Safari';
  return 'pelayar';
}
// Pautan intent Android: buka halaman semasa terus dalam Chrome
export function pautanChrome(url = location.href){
  const u = new URL(url);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(u.href)};end`;
}
export function bukaDalamChrome(){ location.href = pautanChrome(); }

const LANGKAH_CHROME = ['Buka apps ini dalam <b>Google Chrome</b>.', 'Tekan menu <b>⋮</b> (atas kanan).', 'Pilih <b>Install and create shortcut</b> (Chrome baharu) — atau <b>Install app</b> / <b>Add to Home screen</b> (Chrome lama).', 'Tekan <b>Install</b> / <b>Add</b>. Ikon muncul di skrin utama.', 'Jika pilihan itu <b>tiada langsung</b> dalam menu ⋮ — kebenaran pintasan untuk Chrome disekat. Lihat nota di bawah.'];
const PANDUAN = {
  samsung: {nama: 'Samsung', langkah: LANGKAH_CHROME, lagi: ['Guna <b>Samsung Internet</b>? Tekan menu <b>☰</b> (bawah kanan) → <b>Tambah halaman ke</b> → <b>Skrin utama</b>.', 'Jika ikon tidak muncul: Tetapan → Skrin utama → hidupkan <b>Tambah ikon apps baharu ke skrin utama</b>.']},
  xiaomi: {nama: 'Xiaomi / Redmi / POCO', langkah: LANGKAH_CHROME, lagi: ['<b>Penting (Xiaomi / Redmi / POCO, HyperOS & MIUI):</b> pilihan pasang tidak muncul jika disekat. Tekan lama ikon <b>Chrome</b> → <b>ⓘ Maklumat apps</b> → <b>Kebenaran lain</b> (Other permissions) → <b>Pintasan skrin utama</b> (Home screen shortcuts) → <b>Benarkan</b>. Tutup Chrome sepenuhnya, buka semula link apps, kemudian ulang langkah pasang.', 'Jangan guna <b>Mi Browser</b> — ia tidak boleh memasang apps. Guna Chrome.']},
  oppo: {nama: 'Oppo / Realme / OnePlus', langkah: LANGKAH_CHROME, lagi: ['Jika ikon tidak muncul: <b>Tetapan → Apps → Pengurusan apps → Chrome → Kebenaran</b> → hidupkan <b>Cipta pintasan skrin utama</b> (Create desktop shortcuts).', 'Jangan guna Oppo Browser / HeyTap — guna Chrome.']},
  vivo: {nama: 'Vivo / iQOO', langkah: LANGKAH_CHROME, lagi: ['Jika ikon tidak muncul: <b>i Manager / Tetapan → Apps → Kebenaran → Pintasan skrin utama</b> → benarkan untuk <b>Chrome</b>.', 'Jangan guna Vivo Browser — guna Chrome.']},
  huawei: {nama: 'Huawei / Honor', langkah: ['Buka apps ini dalam <b>Huawei Browser</b> (atau Chrome jika ada).', 'Tekan menu <b>⋮</b> / <b>☰</b>.', 'Pilih <b>Tambah ke skrin utama</b> / <b>Add to home screen</b>.', 'Tekan <b>Tambah</b>.'], lagi: ['Telefon Huawei baharu tiada Google Chrome — Huawei Browser boleh digunakan. Jika menu tiada, buka apps terus melalui link / penanda buku (bookmark).']},
  android: {nama: 'Android', langkah: LANGKAH_CHROME, lagi: ['Jika ikon tidak muncul, semak Tetapan → Apps → Chrome → Kebenaran → <b>Pintasan skrin utama</b>.', 'Kemas kini <b>Chrome</b> & <b>Android System WebView</b> di Play Store jika masih tidak berjaya.']},
  iphone: {nama: 'iPhone / iPad', langkah: ['Buka apps ini dalam <b>Safari</b> (bukan dalam WhatsApp / Facebook).', 'Tekan butang <b>Kongsi ⬆</b> di bawah skrin.', 'Skrol & pilih <b>Add to Home Screen</b> / <b>Tambah ke Skrin Utama</b>.', 'Tekan <b>Add</b> / <b>Tambah</b>.'], lagi: ['Dalam WhatsApp: tekan <b>⋯</b> atau ikon kompas → <b>Buka dalam Safari</b> dahulu.']},
  pc: {nama: 'Komputer', langkah: ['Buka dalam <b>Chrome</b> atau <b>Edge</b>.', 'Tekan ikon <b>Pasang ⊕</b> di hujung bar alamat, atau menu ⋮ → <b>Install</b>.'], lagi: []}
};

const EN = () => document.documentElement.lang === 'en';
const CHROME_EN = ['Open this app in <b>Google Chrome</b>.', 'Tap the <b>⋮</b> menu (top right).', 'Choose <b>Install and create shortcut</b> (new Chrome) — or <b>Install app</b> / <b>Add to Home screen</b> (older Chrome).', 'Tap <b>Install</b> / <b>Add</b>. The icon appears on the home screen.', 'If that option is <b>missing</b> from the ⋮ menu — shortcuts are blocked for Chrome. See the note below.'];
const PANDUAN_EN = {
  samsung: {langkah: CHROME_EN, lagi: ['Using <b>Samsung Internet</b>? Tap <b>☰</b> (bottom right) → <b>Add page to</b> → <b>Home screen</b>.', 'If the icon does not appear: Settings → Home screen → turn on <b>Add new apps to Home screen</b>.']},
  xiaomi: {langkah: CHROME_EN, lagi: ['<b>Important (Xiaomi / Redmi / POCO, HyperOS & MIUI):</b> the install option is hidden when blocked. Long-press the <b>Chrome</b> icon → <b>ⓘ App info</b> → <b>Other permissions</b> → <b>Home screen shortcuts</b> → <b>Allow</b>. Close Chrome fully, open the app link again, then repeat the install steps.', 'Do not use <b>Mi Browser</b> — it cannot install apps. Use Chrome.']},
  oppo: {langkah: CHROME_EN, lagi: ['If the icon does not appear: <b>Settings → Apps → App management → Chrome → Permissions</b> → turn on <b>Create desktop shortcuts</b>.', 'Do not use Oppo Browser / HeyTap — use Chrome.']},
  vivo: {langkah: CHROME_EN, lagi: ['If the icon does not appear: <b>i Manager / Settings → Apps → Permissions → Home screen shortcuts</b> → allow for <b>Chrome</b>.', 'Do not use Vivo Browser — use Chrome.']},
  huawei: {langkah: ['Open this app in <b>Huawei Browser</b> (or Chrome if available).', 'Tap the <b>⋮</b> / <b>☰</b> menu.', 'Choose <b>Add to home screen</b>.', 'Tap <b>Add</b>.'], lagi: ['Newer Huawei phones have no Google Chrome — Huawei Browser works. If the menu is missing, open the app via its link / bookmark.']},
  android: {langkah: CHROME_EN, lagi: ['If the icon does not appear, check Settings → Apps → Chrome → Permissions → <b>Home screen shortcuts</b>.', 'Update <b>Chrome</b> & <b>Android System WebView</b> in the Play Store if it still fails.']},
  iphone: {langkah: ['Open this app in <b>Safari</b> (not inside WhatsApp / Facebook).', 'Tap the <b>Share ⬆</b> button at the bottom.', 'Scroll & choose <b>Add to Home Screen</b>.', 'Tap <b>Add</b>.'], lagi: ['In WhatsApp: tap <b>⋯</b> or the compass icon → <b>Open in Safari</b> first.']},
  pc: {langkah: ['Open in <b>Chrome</b> or <b>Edge</b>.', 'Tap the <b>Install ⊕</b> icon at the end of the address bar, or menu ⋮ → <b>Install</b>.'], lagi: []}
};
const T = (ms, en) => EN() ? en : ms;
let gaya = false;
function pasangGaya(){
  if(gaya) return; gaya = true;
  const s = document.createElement('style');
  s.textContent = `.pl-latar{position:fixed;inset:0;z-index:9998;background:rgba(10,15,13,.6);display:flex;align-items:flex-end;justify-content:center}
  .pl-kotak{background:#fff;color:#0f172a;width:100%;max-width:520px;max-height:88vh;overflow:auto;border-radius:20px 20px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5}
  .pl-kotak h3{margin:0 0 6px;font-size:18px}.pl-kotak ol{padding-left:22px;margin:8px 0}.pl-kotak li{margin:6px 0}.pl-nota{background:#fef3c7;border-radius:12px;padding:10px 12px;margin:8px 0;font-size:14px}
  .pl-btn{display:block;width:100%;border:0;border-radius:999px;padding:13px 16px;font-size:16px;font-weight:800;margin-top:8px;cursor:pointer}
  .pl-pri{background:linear-gradient(#f6e3a1,#d7b25a);color:#0d2a20}.pl-hijau{background:#14532d;color:#fff}.pl-kelabu{background:#e2e8f0;color:#0d2a20}
  .pl-jenama{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.pl-jenama button{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:6px 10px;font-size:13px;cursor:pointer}.pl-jenama button.on{background:#14532d;color:#fff;border-color:#14532d}
  .pl-banner{position:sticky;top:0;z-index:9997;background:#fef3c7;color:#78350f;border-bottom:2px solid #f59e0b;padding:10px 12px;font:600 14px/1.35 system-ui,sans-serif;display:flex;gap:10px;align-items:center}
  .pl-banner button{border:0;border-radius:999px;padding:9px 12px;font-weight:800;background:#14532d;color:#fff;white-space:nowrap;cursor:pointer}.pl-banner .pl-x{background:transparent;color:#78350f;padding:6px}`;
  document.head.appendChild(s);
}

/** Panduan pasang (lembaran bawah). opsyen: {nama, prompt: () => Promise|null} */
export function panduanPasang({nama = 'apps ini', prompt = null} = {}){
  pasangGaya();
  let j = jenama();
  const dalam = pelayarDalaman(), pl = pelayar();
  const w = document.createElement('div'); w.className = 'pl-latar';
  const lukis = () => { const P = EN() ? {...PANDUAN[j], ...PANDUAN_EN[j]} : PANDUAN[j];
    w.innerHTML = `<div class="pl-kotak" role="dialog" aria-modal="true" data-tiada-terjemah><h3>📲 ${T('Cara pasang', 'How to install')} ${esc(nama)}</h3>
      <div style="font-size:13px;color:#64748b">${T('Telefon', 'Phone')}: <b>${esc(P.nama)}</b> · ${T('Pelayar', 'Browser')}: <b>${esc(dalam ? T('dalam ', 'inside ') + dalam : pl)}</b></div>
      ${dalam ? `<div class="pl-nota">⚠ ${T(`Link ini dibuka <b>dalam ${esc(dalam)}</b> — apps tidak boleh dipasang dari sini.`, `This link is open <b>inside ${esc(dalam)}</b> — the app cannot be installed from here.`)} ${ANDROID ? T('Tekan butang di bawah untuk buka dalam Chrome.', 'Tap the button below to open in Chrome.') : T('Tekan ⋯ / ikon kompas → <b>Buka dalam Safari</b>.', 'Tap ⋯ / the compass icon → <b>Open in Safari</b>.')}</div>${ANDROID ? `<button class="pl-btn pl-hijau" data-pl="chrome">🌐 ${T('Buka dalam Chrome', 'Open in Chrome')}</button>` : ''}` : ''}
      ${!dalam && ANDROID && !/Chrome|Samsung Internet|Edge/.test(pl) ? `<div class="pl-nota">⚠ ${T(`<b>${esc(pl)}</b> mungkin tidak boleh memasang apps. Guna <b>Google Chrome</b>.`, `<b>${esc(pl)}</b> may not be able to install apps. Use <b>Google Chrome</b>.`)}</div><button class="pl-btn pl-hijau" data-pl="chrome">🌐 ${T('Buka dalam Chrome', 'Open in Chrome')}</button>` : ''}
      ${prompt && !dalam ? `<button class="pl-btn pl-pri" data-pl="pasang">📲 ${T('Pasang sekarang', 'Install now')}</button>` : ''}
      <ol>${P.langkah.map(x => `<li>${x}</li>`).join('')}</ol>
      ${P.lagi.map(x => `<div class="pl-nota">${x}</div>`).join('')}
      <div style="font-size:13px;color:#64748b;margin-top:10px">${T('Telefon lain?', 'Other phone?')}</div>
      <div class="pl-jenama">${Object.entries(PANDUAN).map(([k, v]) => `<button data-plj="${k}" class="${k === j ? 'on' : ''}">${esc(v.nama)}</button>`).join('')}</div>
      <div class="pl-nota" style="background:#ecfdf5">✅ ${T('Tidak dapat memasang? Apps tetap <b>boleh digunakan sepenuhnya dalam Chrome</b>. Simpan link sebagai penanda buku (☆) supaya mudah dibuka semula.', "Can't install? The app still <b>works fully in Chrome</b>. Save the link as a bookmark (☆) so it is easy to open again.")}</div>
      <button class="pl-btn pl-kelabu" data-pl="salin">🔗 ${T('Salin link apps', 'Copy app link')}</button>
      <button class="pl-btn pl-kelabu" data-pl="tutup">${T('Tutup', 'Close')}</button></div>`;
    w.querySelectorAll('[data-plj]').forEach(b => b.onclick = () => { j = b.dataset.plj; lukis(); });
    w.querySelectorAll('[data-pl="chrome"]').forEach(b => b.onclick = bukaDalamChrome);
    const bp = w.querySelector('[data-pl="pasang"]'); if(bp) bp.onclick = async () => { try{ await prompt(); }catch(_){} w.remove(); };
    w.querySelector('[data-pl="salin"]').onclick = async () => { try{ await navigator.clipboard.writeText(location.href.split('#')[0]); w.querySelector('[data-pl="salin"]').textContent = T('✅ Link disalin', '✅ Link copied'); }catch(_){ window.prompt('Salin link ini:', location.href.split('#')[0]); } };
    w.querySelector('[data-pl="tutup"]').onclick = () => w.remove();
  };
  w.onclick = e => { if(e.target === w) w.remove(); };
  lukis(); document.body.appendChild(w);
}

/** Banner automatik bila dibuka dalam WhatsApp / Facebook dsb. */
export function bannerPelayarDalaman({nama = 'apps ini'} = {}){
  const dalam = pelayarDalaman(); if(!dalam || standalone()) return;
  try{ if(sessionStorage.getItem('pl_tutup')) return; }catch(_){}
  const mula = () => {
    pasangGaya();
    const b = document.createElement('div'); b.className = 'pl-banner';
    b.setAttribute('data-tiada-terjemah', '');
    b.innerHTML = `<span style="flex:1">📲 ${T(`Dibuka dalam ${esc(dalam)}.`, `Opened inside ${esc(dalam)}.`)} ${ANDROID ? T('Buka dalam Chrome untuk pasang & guna sepenuhnya.', 'Open in Chrome to install & use fully.') : T('Buka dalam Safari untuk pasang.', 'Open in Safari to install.')}</span>${ANDROID ? `<button data-pl="chrome">${T('Buka dalam Chrome', 'Open in Chrome')}</button>` : `<button data-pl="cara">${T('Cara', 'How')}</button>`}<button class="pl-x" data-pl="x" aria-label="Tutup">✕</button>`;
    document.body.prepend(b);
    const c = b.querySelector('[data-pl="chrome"]'); if(c) c.onclick = bukaDalamChrome;
    const k = b.querySelector('[data-pl="cara"]'); if(k) k.onclick = () => panduanPasang({nama});
    b.querySelector('[data-pl="x"]').onclick = () => { b.remove(); try{ sessionStorage.setItem('pl_tutup', '1'); }catch(_){} };
  };
  document.body ? mula() : addEventListener('DOMContentLoaded', mula);
}
