// Paparan penuh standard untuk semua apps: gambar / PDF dengan butang ← Kembali & 💾 Simpan.
// Butang "back" telefon (Android) juga menutup paparan & borang (modal).
const CSS = `
.pp-latar{position:fixed;inset:0;z-index:9999;background:rgba(10,15,13,.96);display:flex;flex-direction:column;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.pp-bar{display:flex;align-items:center;gap:8px;padding:10px 12px;padding-top:max(10px,env(safe-area-inset-top));background:#0d2a20;border-bottom:3px solid #d7b25a}
.pp-bar b{flex:1;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
.pp-btn{border:0;border-radius:999px;padding:11px 16px;font-size:15px;font-weight:800;cursor:pointer;min-height:44px;white-space:nowrap}
.pp-kembali{background:#fff;color:#0d2a20}.pp-simpan{background:linear-gradient(#f6e3a1,#d7b25a);color:#0d2a20}
.pp-isi{flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:10px;touch-action:pinch-zoom}
.pp-isi img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;background:#fff}
.pp-isi iframe{width:100%;height:100%;border:0;background:#fff;border-radius:8px}
.pp-nav{display:flex;justify-content:center;gap:14px;align-items:center;padding:10px;padding-bottom:max(10px,env(safe-area-inset-bottom))}
.pp-nav button{background:#ffffff22;color:#fff;border:0;border-radius:999px;width:48px;height:48px;font-size:22px;cursor:pointer}
.pp-nota{padding:6px 14px 0;text-align:center;font-size:13px;color:#e2e8f0}
.pp-sticky-atas{position:sticky;top:-18px;z-index:6;background:inherit;background-color:#fff;padding-top:6px;padding-bottom:6px;margin-top:-6px}
.pp-sticky-bawah{position:sticky;bottom:-18px;z-index:6;background:#fff;padding:10px 0 6px;margin-bottom:-6px;box-shadow:0 -10px 14px -10px rgba(0,0,0,.25)}
.pp-zoom{cursor:zoom-in}
`;
let gaya = false;
function pasangGaya(){ if(gaya) return; gaya = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---- sejarah: butang back telefon menutup lapisan teratas ----
const lapisan = []; let abaikan = 0;
window.addEventListener('popstate', () => { if(abaikan > 0){ abaikan--; return; } const l = lapisan.pop(); if(l) l(true); });
function tolakSejarah(tutup){ lapisan.push(tutup); try{ history.pushState({pp: lapisan.length}, ''); }catch(_){} }
function tarikSejarah(tutup){ const i = lapisan.lastIndexOf(tutup); if(i < 0) return; lapisan.splice(i, 1); try{ if(history.state?.pp){ abaikan++; history.back(); } }catch(_){} }

async function simpanFail(src, nama){
  try{
    const blob = await (await fetch(src)).blob();
    const jenis = blob.type || '';
    const ext = jenis.includes('pdf') ? 'pdf' : jenis.includes('png') ? 'png' : 'jpg';
    const fail = new File([blob], /\.\w{3,4}$/.test(nama || '') ? nama : `${nama || 'Gambar'}.${ext}`, {type: jenis || 'image/jpeg'});
    // Telefon / tablet: menu kongsi → "Simpan imej" / Fail; PC: muat turun terus
    if(navigator.canShare?.({files: [fail]}) && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)){ try{ await navigator.share({files: [fail]}); return; }catch(e){ if(e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(fail); a.download = fail.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }catch(e){ console.error(e); window.open(src, '_blank'); }
}

/** Buka paparan penuh.
 *  item: string src atau [{src, nota}] (beberapa gambar), atau {src, jenis:'pdf'}
 *  opsyen: {tajuk, nama (nama fail simpan), mula (indeks)} */
export function bukaPaparan(item, {tajuk = '', nama = '', mula = 0} = {}){
  pasangGaya();
  const senarai = (Array.isArray(item) ? item : [item]).map(x => typeof x === 'string' ? {src: x} : x).filter(x => x && x.src);
  if(!senarai.length) return;
  let i = Math.min(Math.max(0, mula), senarai.length - 1);
  const w = document.createElement('div'); w.className = 'pp-latar'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true');
  const lukis = () => { const x = senarai[i], pdf = x.jenis === 'pdf' || /^data:application\/pdf|\.pdf($|\?)/i.test(x.src);
    w.innerHTML = `<div class="pp-bar"><button class="pp-btn pp-kembali" data-pp="tutup">← Kembali</button><b>${esc(tajuk)}${senarai.length > 1 ? ` (${i + 1}/${senarai.length})` : ''}</b><button class="pp-btn pp-simpan" data-pp="simpan">💾 Simpan</button></div>
      ${x.nota ? `<div class="pp-nota">${esc(x.nota)}</div>` : ''}
      <div class="pp-isi">${pdf ? `<iframe src="${esc(x.src)}" title="${esc(tajuk || 'Dokumen')}"></iframe>` : `<img src="${esc(x.src)}" alt="${esc(tajuk)}">`}</div>
      ${senarai.length > 1 ? `<div class="pp-nav"><button data-pp="kiri" aria-label="Sebelum">‹</button><button data-pp="kanan" aria-label="Seterusnya">›</button></div>` : ''}`;
    w.querySelector('[data-pp="tutup"]').onclick = () => tutup();
    w.querySelector('[data-pp="simpan"]').onclick = () => simpanFail(x.src, senarai.length > 1 ? `${nama || tajuk || 'Gambar'}-${i + 1}` : (nama || tajuk || (pdf ? 'Dokumen' : 'Gambar')));
    const k = w.querySelector('[data-pp="kiri"]'), n = w.querySelector('[data-pp="kanan"]');
    if(k) k.onclick = () => { i = (i - 1 + senarai.length) % senarai.length; lukis(); };
    if(n) n.onclick = () => { i = (i + 1) % senarai.length; lukis(); };
  };
  const kunci = e => { if(e.key === 'Escape') tutup(); };
  const tutup = (dariBack = false) => { w.remove(); document.removeEventListener('keydown', kunci); if(!dariBack) tarikSejarah(tutup); };
  lukis(); document.body.appendChild(w); document.addEventListener('keydown', kunci);
  tolakSejarah(tutup);
}

/** Kemaskan modal borang: tajuk + "← Kembali" melekat di atas, butang simpan terakhir melekat di bawah, butang back telefon menutup. */
export function kemasModal(box, tutupFn){
  pasangGaya();
  const t = box.querySelector('#mTutup');
  if(t){ t.textContent = '← Kembali'; t.setAttribute('aria-label', 'Kembali'); const atas = t.parentElement; if(atas && atas !== box) atas.classList.add('pp-sticky-atas'); }
  const akhir = box.lastElementChild;
  if(akhir && akhir !== t?.parentElement && (akhir.tagName === 'BUTTON' || (akhir.querySelector?.('button') && akhir.children.length <= 3 && !akhir.querySelector('input,select,textarea'))))
    akhir.classList.add('pp-sticky-bawah');
  const tutup = () => tutupFn();   // tutupFn (closeModal) memanggil lepasModal
  if(box._ppTutup) tarikSejarah(box._ppTutup);
  box._ppTutup = tutup;
  tolakSejarah(tutup);
}
export function lepasModal(box){ const t = box?._ppTutup; if(t){ box._ppTutup = null; tarikSejarah(t); } }

/** Bar "← Kembali" untuk tetingkap cetakan (poster / laporan) */
export const BAR_KEMBALI_CETAK = `<div class="tiada-cetak" style="position:sticky;top:0;display:flex;gap:8px;justify-content:space-between;padding:10px;background:#0d2a20;z-index:9;font-family:system-ui,sans-serif">
  <button onclick="window.close();history.back()" style="border:0;border-radius:999px;padding:10px 16px;font-weight:800;background:#fff;color:#0d2a20">← Kembali</button>
  <button onclick="window.print()" style="border:0;border-radius:999px;padding:10px 16px;font-weight:800;background:#d7b25a;color:#0d2a20">🖨 Cetak / Simpan PDF</button></div>
  <style>@media print{.tiada-cetak{display:none!important}}</style>`;

// Mana-mana <img data-zoom="Tajuk"> boleh ditekan untuk paparan penuh (← Kembali / 💾 Simpan)
document.addEventListener('click', e => {
  const im = e.target.closest?.('img[data-zoom]'); if(!im || !im.src) return;
  e.preventDefault(); bukaPaparan(im.src, {tajuk: im.dataset.zoom || '', nama: (im.dataset.zoom || 'Gambar').replace(/[^\w-]+/g, '-')});
});
