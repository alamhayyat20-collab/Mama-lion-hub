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
.pf-btns{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 8px}
.pf-btns label{flex:1;min-width:96px;display:flex;align-items:center;justify-content:center;gap:6px;padding:11px 12px;border-radius:12px;background:#0d2a20;color:#fff;font-weight:700;font-size:14px;cursor:pointer;min-height:44px;text-align:center}
.pf-btns label.pf-2{background:#475569}.pf-btns label.pf-3{background:#e2e8f0;color:#0d2a20}
.pf-btns input{display:none}
.pf-nama{font-size:12px;color:#64748b;margin:-4px 0 8px;word-break:break-all}
.lp-senarai{display:flex;flex-direction:column;gap:6px;margin:6px 0}
.lp-item{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;color:#0f172a}
.lp-item img{width:44px;height:44px;object-fit:cover;border-radius:8px;cursor:pointer}
.lp-item .lp-ikon{width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:24px;background:#f1f5f9;border-radius:8px;cursor:pointer}
.lp-item .lp-n{flex:1;min-width:0;font-size:13px}.lp-item .lp-n b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lp-item .lp-n small{color:#64748b}
.lp-item button{border:0;border-radius:9px;padding:9px 10px;background:#e2e8f0;color:#0d2a20;font-weight:700;cursor:pointer;min-height:40px}

`;
let gaya = false;
function pasangGaya(){ if(gaya) return; gaya = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---- sejarah: butang back telefon menutup lapisan teratas ----
const lapisan = []; let abaikan = 0;
window.addEventListener('popstate', () => { if(abaikan > 0){ abaikan--; return; } const l = lapisan.pop(); if(l) l(true); });
function tolakSejarah(tutup){ lapisan.push(tutup); try{ history.pushState({pp: lapisan.length}, ''); }catch(_){} }
function tarikSejarah(tutup){ const i = lapisan.lastIndexOf(tutup); if(i < 0) return; lapisan.splice(i, 1); try{ if(history.state?.pp){ abaikan++; history.back(); } }catch(_){} }

const MUDAH_ALIH = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
async function bukaBlob(src){ try{ const b = await (await fetch(src)).blob(); window.open(URL.createObjectURL(b), '_blank'); }catch(_){ window.open(src, '_blank'); } }
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
      <div class="pp-isi">${pdf ? (MUDAH_ALIH ? `<div style="text-align:center"><div style="font-size:64px">📄</div><p>${esc(x.nama || tajuk || 'Dokumen PDF')}</p><button class="pp-btn pp-simpan" data-pp="bukapdf">📖 Buka dokumen</button></div>` : `<iframe src="${esc(x.src)}" title="${esc(tajuk || 'Dokumen')}"></iframe>`) : `<img src="${esc(x.src)}" alt="${esc(tajuk)}">`}</div>
      ${senarai.length > 1 ? `<div class="pp-nav"><button data-pp="kiri" aria-label="Sebelum">‹</button><button data-pp="kanan" aria-label="Seterusnya">›</button></div>` : ''}`;
    w.querySelector('[data-pp="tutup"]').onclick = () => tutup();
    w.querySelector('[data-pp="simpan"]').onclick = () => simpanFail(x.src, senarai.length > 1 ? `${nama || tajuk || 'Gambar'}-${i + 1}` : (nama || tajuk || (pdf ? 'Dokumen' : 'Gambar')));
    const bp = w.querySelector('[data-pp="bukapdf"]'); if(bp) bp.onclick = () => bukaBlob(x.src);
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
  let akhir = box.lastElementChild;
  if(akhir && akhir !== t?.parentElement && (akhir.tagName === 'BUTTON' || (akhir.querySelector?.('button') && akhir.children.length <= 3 && !akhir.querySelector('input,select,textarea')))){
    if(akhir.tagName === 'BUTTON'){ const w = document.createElement('div'); akhir.replaceWith(w); w.appendChild(akhir); akhir = w; }   // jangan ubah gaya butang
    akhir.classList.add('pp-sticky-bawah');
  }
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

// =====================================================================
// MUAT NAIK FAIL — ganti "Choose file" dengan butang 📷 Kamera / 🖼 Galeri / 📄 Dokumen.
// Input asal kekal (disorok); fail dipilih dipindah ke input asal & event 'change' dihantar,
// jadi kod sedia ada yang membaca input.files tidak perlu diubah.
// =====================================================================
const DOK_TERIMA = '.pdf,application/pdf,image/*,.doc,.docx,.xls,.xlsx';
function naikTarafInput(inp){
  if(inp._pf || inp.dataset.pfAbai !== undefined || inp.type !== 'file') return;
  if(inp.style.display === 'none' || inp.classList.contains('hidden') || inp.closest('label')) { inp._pf = 1; return; }
  inp._pf = 1; pasangGaya();
  const acc = inp.getAttribute('accept') || '', gambar = !acc || /image/.test(acc), dok = !acc || /pdf|\.doc|\.xls|\*\/\*/.test(acc), banyak = inp.multiple;
  const w = document.createElement('div'); w.className = 'pf-btns';
  const btn = (teks, kls, a, cap) => `<label class="${kls}">${teks}<input type="file" ${a ? `accept="${a}"` : ''} ${cap ? 'capture="environment"' : ''} ${banyak ? 'multiple' : ''} data-pf-abai></label>`;
  w.innerHTML = (gambar ? btn('📷 Kamera', 'pf-1', 'image/*', true) + btn('🖼 Galeri', 'pf-2', 'image/*') : '') + (dok ? btn(gambar ? '📄 Dokumen' : '📄 Pilih fail', 'pf-3', acc || DOK_TERIMA) : (!gambar ? btn('📂 Pilih fail', 'pf-3', acc) : ''));
  const nama = document.createElement('div'); nama.className = 'pf-nama';
  inp.style.display = 'none'; inp.after(w); w.after(nama);
  w.querySelectorAll('input').forEach(x => x.addEventListener('change', () => {
    if(!x.files.length) return;
    try{ const dt = new DataTransfer(); [...x.files].forEach(f => dt.items.add(f)); inp.files = dt.files; }catch(_){ return; }
    nama.textContent = '✓ ' + [...x.files].map(f => f.name).join(', ');
    inp.dispatchEvent(new Event('change', {bubbles: true})); x.value = '';
  }));
}
function imbasFail(root){ (root.querySelectorAll ? root.querySelectorAll('input[type=file]') : []).forEach(naikTarafInput); if(root.matches?.('input[type=file]')) naikTarafInput(root); }
const mulaPF = () => { imbasFail(document.body); new MutationObserver(l => l.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && imbasFail(n)))).observe(document.body, {childList: true, subtree: true}); };
document.body ? mulaPF() : addEventListener('DOMContentLoaded', mulaPF);

/** HTML butang muat naik (Kamera / Galeri / Dokumen) untuk lampiran. id = nilai data-lp-naik */
export function htmlNaikLampiran(id, {gambar = true, dokumen = true} = {}){
  pasangGaya();
  return `<div class="pf-btns">${gambar ? `<label class="pf-1">📷 Kamera<input type="file" accept="image/*" capture="environment" data-lp-naik="${esc(id)}" data-pf-abai></label><label class="pf-2">🖼 Galeri<input type="file" accept="image/*" multiple data-lp-naik="${esc(id)}" data-pf-abai></label>` : ''}${dokumen ? `<label class="pf-3">📄 Dokumen<input type="file" accept="${DOK_TERIMA}" multiple data-lp-naik="${esc(id)}" data-pf-abai></label>` : ''}</div>`;
}
const saizMB = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const ikonJenis = j => /pdf/.test(j) ? '📄' : /sheet|excel|xls/.test(j) ? '📊' : /word|doc/.test(j) ? '📝' : '📎';
/** Senarai lampiran: [{id, nama, jenis, data, saiz, oleh, masa}] dengan 👁 Lihat, ⬇ Muat turun, ✕ Padam */
export function htmlSenaraiLampiran(senarai, {padam = false, kosong = 'Tiada lampiran.'} = {}){
  pasangGaya();
  if(!senarai?.length) return `<div class="pf-nama" style="margin:4px 0">${esc(kosong)}</div>`;
  return `<div class="lp-senarai">${senarai.map(x => { const gbr = /^image\//.test(x.jenis || '') || /^data:image/.test(x.data || '');
    return `<div class="lp-item">${gbr ? `<img src="${esc(x.data)}" data-lp-lihat="${esc(x.id)}" alt="">` : `<span class="lp-ikon" data-lp-lihat="${esc(x.id)}">${ikonJenis(x.jenis || '')}</span>`}
      <div class="lp-n"><b>${esc(x.nama || 'Lampiran')}</b><small>${x.saiz ? saizMB(x.saiz) + ' · ' : ''}${esc(x.oleh || '')}${x.masa ? ' · ' + new Date(x.masa).toLocaleString('en-GB', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : ''}</small></div>
      <button type="button" data-lp-turun="${esc(x.id)}" title="Muat turun">⬇</button>${padam ? `<button type="button" data-lp-padam="${esc(x.id)}" title="Padam">✕</button>` : ''}</div>`; }).join('')}</div>`;
}
/** Pasang tindakan senarai lampiran dalam root. */
export function pasangSenaraiLampiran(root, senarai, {onPadam, tajuk = 'Lampiran'} = {}){
  const cari = id => senarai.find(x => x.id === id);
  root.querySelectorAll('[data-lp-lihat]').forEach(b => b.onclick = () => { const x = cari(b.dataset.lpLihat); if(!x) return;
    if(/^image\/|pdf/.test(x.jenis || '') || /^data:(image|application\/pdf)/.test(x.data)) bukaPaparan({src: x.data, jenis: /pdf/.test(x.jenis || x.data.slice(0, 30)) ? 'pdf' : '', nama: x.nama}, {tajuk: x.nama || tajuk, nama: x.nama});
    else simpanFail(x.data, x.nama); });
  root.querySelectorAll('[data-lp-turun]').forEach(b => b.onclick = () => { const x = cari(b.dataset.lpTurun); if(x) simpanFail(x.data, x.nama); });
  root.querySelectorAll('[data-lp-padam]').forEach(b => b.onclick = () => { const x = cari(b.dataset.lpPadam); if(x && onPadam && confirm(`Padam "${x.nama}"?`)) onPadam(x); });
}
/** Baca fail → {nama, jenis, data (data URL), saiz}. Gambar dimampatkan (maks 1400px). Dokumen maks ~700 KB. */
export async function bacaLampiran(f, {maks = 1400, kualiti = 0.72, hadDok = 700 * 1024} = {}){
  if(/^image\//.test(f.type) && !/gif|svg/.test(f.type)){
    const url = URL.createObjectURL(f);
    try{
      const img = await new Promise((ok, x) => { const i = new Image(); i.onload = () => ok(i); i.onerror = x; i.src = url; });
      const k = Math.min(1, maks / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL('image/jpeg', kualiti);
      return {nama: f.name.replace(/\.\w+$/, '') + '.jpg', jenis: 'image/jpeg', data, saiz: Math.round(data.length * 0.75)};
    } finally { URL.revokeObjectURL(url); }
  }
  if(f.size > hadDok) throw new Error(`Fail "${f.name}" terlalu besar (${saizMB(f.size)}). Had ${saizMB(hadDok)} — mampatkan PDF atau ambil gambar.`);
  const data = await new Promise((ok, x) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = x; r.readAsDataURL(f); });
  return {nama: f.name, jenis: f.type || 'application/octet-stream', data, saiz: f.size};
}
export { simpanFail };
