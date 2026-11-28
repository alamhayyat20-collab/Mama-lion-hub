// =====================================================================
// pelanggan-lib.js — 🔍 Carian Pelanggan & profil penuh (Apps Akaun: penuh · Apps Kaunter: terhad)
// Sumber carian: Safari Members (ahli) + rekod pelanggan lama (MONZ)
// ctx = {store, fs:{collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, arrayUnion},
//        mod: 'akaun'|'kaunter', buka(html), tutup(), toast, pengguna(), cawangan(), pautanKad(id),
//        lihatKad?(a), buatOrder?(plat, ahli), tebusFW?(plat, ahli), selepasUbah?()}
// =====================================================================
import { normPlat, paparTelefon, normTelefon, telefonSah, keadaanKad, kadAktif, KAD, buatToken, ahliBaru, kunciMasuk, tambahCop, profilKurang, MEDAN_PROFIL, muatShardLama, muatSemuaLama, peringkatAhli, statLawatan, PERINGKAT, perluSahPeringkat, pindahKadLama, KAD_LAMA_TAMAT } from './safari-lib.js?v=2026.11.29-7';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BLN = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'];
const fT = t => { if(!t) return ''; if(typeof t === 'number') t = new Date(t).toLocaleDateString('en-CA', {timeZone: 'Asia/Kuala_Lumpur'}); return `${+t.slice(8,10)} ${BLN[+t.slice(5,7)-1]} ${t.slice(0,4)}`; };
const RM = n => 'RM' + (Number(n) || 0).toLocaleString('en-MY', {maximumFractionDigits: 0});
const sorok = t => { const d = paparTelefon(t || '').replace(/\D/g, ''); return d.length >= 8 ? `${d.slice(0,3)}-${d.slice(3,4)}xx xx${d.slice(-2)}` : d; };

const CSS = `.cp-hasil{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.cp-kad{display:flex;gap:10px;align-items:center;padding:10px 12px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;cursor:pointer;text-align:left;width:100%;font:inherit;color:inherit}
.cp-kad:hover{border-color:#14532d;background:#f0fdf4}.cp-kad .cp-av{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;flex:none}
.cp-kad b{display:block}.cp-kad small{display:block;color:#64748b;font-size:12.5px;line-height:1.35}.cp-tag{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;margin:2px 4px 0 0}
.cp-ahli{background:#fef3c7;color:#92400e}.pk-bronze{background:#3b2414;color:#f3c494}.pk-silver{background:#1f2328;color:#e3e7eb}.pk-gold{background:#2a2108;color:#f2d77c}.pk-pride{background:#000;color:#f6c623;border:1px solid #f6c623}.cp-lama{background:#e0f2fe;color:#075985}.cp-belum{background:#fee2e2;color:#991b1b}.cp-aktif{background:#dcfce7;color:#166534}
.cp-p{padding:4px 14px 14px}.cp-p h3{margin:0}.cp-sek{border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin:8px 0;background:#fff}.cp-sek h4{margin:0 0 6px;font-size:14px}
.cp-ln{display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px dotted #e2e8f0;font-size:13.5px}.cp-ln span{color:#64748b}
.cp-aksi{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin:8px 0}.cp-aksi button,.cp-aksi a{display:flex;align-items:center;justify-content:center;gap:4px;border:0;border-radius:10px;padding:10px;font-weight:700;font-size:13px;background:#e2e8f0;color:#0f172a;cursor:pointer;text-decoration:none;min-height:42px}
.cp-aksi .pri{background:#14532d;color:#fff}.cp-aksi .wa{background:#16a34a;color:#fff}.cp-aksi .bahaya{background:#fee2e2;color:#991b1b}
.cp-sej{font-size:12.5px;width:100%;border-collapse:collapse}.cp-sej td{padding:3px 4px;border-bottom:1px solid #f1f5f9}`;

export function modulPelanggan(ctx){
  const {store, fs} = ctx, AKAUN = ctx.mod === 'akaun';
  let ahli = null, muat = null, q0 = '';
  if(!document.getElementById('cp-gaya')){ const s = document.createElement('style'); s.id = 'cp-gaya'; s.textContent = CSS; document.head.appendChild(s); }
  const telP = t => AKAUN ? paparTelefon(t) : sorok(t);
  // 📇 Pindah kad lama: kaunter sehingga KAD_LAMA_TAMAT; Akaun (pemilik) bila-bila masa
  const hariMY = () => new Date().toLocaleDateString('en-CA', {timeZone: 'Asia/Kuala_Lumpur'});
  const bolehKadLama = a => !a.kadLama && (AKAUN || hariMY() <= KAD_LAMA_TAMAT);
  const TINDAKAN_KAD = ['Dicop "DIPINDAH" & dipulangkan kepada pelanggan', 'Dikutip oleh kaunter', 'Dikoyak / dimusnahkan'];
  // Jimat kuota: kemas kini SATU ahli dalam senarai (bukan muat semula semua ahli selepas setiap tindakan)
  async function segarSatu(id){
    if(!ahli) return pastikanAhli();
    try{ const s = await fs.getDoc(fs.doc(store, 'ahli', id)); const i = ahli.findIndex(x => x.id === id);
      if(s.exists()){ const v = {id, ...s.data()}; if(i >= 0) ahli[i] = v; else ahli.push(v); } else if(i >= 0) ahli.splice(i, 1);
    }catch(e){ console.warn('segarSatu', e); }
    return ahli;
  }
  async function pastikanAhli(paksa = false){
    if(ahli && !paksa) return ahli;
    if(!muat || paksa) muat = fs.getDocs(fs.collection(store, 'ahli')).then(s => ahli = s.docs.map(d => ({id: d.id, ...d.data()})));
    return muat;
  }
  // 📤 Kad digital dihantar (WhatsApp) — ahli.kadDihantar = {masa, oleh}; untuk senarai "Belum terima kad"
  const tandaKad = a => { const d = {masa: Date.now(), oleh: ctx.pengguna()}; a.kadDihantar = d; const l = (ahli || []).find(x => x.id === a.id); if(l) l.kadDihantar = d;
    return fs.updateDoc(fs.doc(store, 'ahli', a.id), {kadDihantar: d}).catch(e => console.warn('tandaKad', e)); };
  const log = (a, tindakan, butiran = '') => (AKAUN || ctx.log) && fs.setDoc(fs.doc(fs.collection(store, 'ahli_log')), {ahliId: a.id, kod: a.kod || '', tindakan, butiran, oleh: ctx.pengguna(), masa: Date.now()}).catch(() => {});

  // ---------------- CARIAN ----------------
  async function cari(q){
    q = q.trim(); if(q.length < 2) return {A: [], L: []};
    const qs = q.toLowerCase(), qd = q.replace(/\D/g, ''), qn = normPlat(q), teras = qd.replace(/^60/, '').replace(/^0/, '');
    const list = await pastikanAhli();
    const kodQ = qs.replace(/[^a-z0-9]/g, '');
    const A = list.filter(a => (a.nama || '').toLowerCase().includes(qs) || (teras.length >= 4 && /^[\d\s+()-]+$/.test(q) && (a.telefon || '').includes(teras))
      || (qn.length >= 3 && (a.plat || []).some(p => p.includes(qn))) || (kodQ.length >= 4 && (a.kod || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(kodQ)));
    const platAhli = new Set(list.flatMap(a => a.plat || []));
    let L = [];
    try{
      if(/\d/.test(q) && /[a-z]/i.test(q) && qn.length >= 3){
        const m = await muatShardLama(store, fs, qn.slice(0, 2));
        L = Object.entries(m).filter(([p]) => p.startsWith(qn)).map(([p, x]) => ({plat: p, ...x}));
      } else if(!/^[\d\s+()-]+$/.test(q) && qs.length >= 3){
        const m = await muatSemuaLama(store, fs);
        L = Object.entries(m).filter(([, x]) => (x.n || '').toLowerCase().includes(qs) || (x.m || '').toLowerCase() === qs).map(([p, x]) => ({plat: p, ...x}));
      }
    }catch(e){ console.warn('rekod lama', e); }
    L = L.filter(x => !platAhli.has(x.plat)).sort((a, b) => (b.inv || 0) - (a.inv || 0));
    return {A: A.slice(0, 40), L: L.slice(0, 40), lebihA: A.length > 40, lebihL: L.length > 40};
  }
  const warna = s => ['#14532d','#1d4ed8','#9333ea','#b45309','#be123c','#0f766e'][[...String(s)].reduce((t, c) => t + c.charCodeAt(0), 0) % 6];
  const inisial = n => String(n || '?').replace(/^(dato'?|datin|en\.?|encik|puan|cik)\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  function kadAhliHtml(a){
    const k = keadaanKad(a), aktif = kadAktif(a), akhir = a.copTerakhir ? Math.max(0, ...Object.values(a.copTerakhir).map(v => typeof v === 'number' ? v : 0)) : 0;
    return `<button class="cp-kad" data-cp-ahli="${esc(a.id)}"><span class="cp-av" style="background:${warna(a.id)}">${esc(inisial(a.nama))}</span><span style="flex:1;min-width:0">
      <b>${esc(a.nama || '—')} · ${esc(telP(a.telefon))}</b><small>🚗 ${(a.plat || []).map(esc).join(', ') || '—'}</small>
      <span class="cp-tag cp-ahli">⭐ Ahli ${esc(a.kod || '')}</span><span class="cp-tag pk-${peringkatAhli(a).id}">${esc(peringkatAhli(a).nama)}</span><span class="cp-tag ${aktif ? 'cp-aktif' : 'cp-belum'}">${aktif ? `${k.bil}/${KAD.saiz} cop` : '🔓 Kad belum aktif'}</span>${k.freeWash.length ? `<span class="cp-tag cp-aktif">🎁 ${k.freeWash.length} Free Wash</span>` : ''}${a.sumber === 'monz' ? '<span class="cp-tag cp-lama">MONZ</span>' : ''}</span>›</button>`;
  }
  const kadLamaHtml = x => `<button class="cp-kad" data-cp-lama="${esc(x.plat)}"><span class="cp-av" style="background:#64748b">🕘</span><span style="flex:1;min-width:0">
    <b>${esc(x.n || 'Tiada nama')} · ${esc(x.p || x.plat)}</b><small>${x.m ? '🚗 ' + esc(x.m) + ' · ' : ''}sejak ${esc(fT(x.d1))} · belanja ${RM(x.inv)}</small>
    <span class="cp-tag cp-lama">🕘 Pelanggan lama (belum ahli)</span></span>›</button>`;

  function htmlKotak(){
    return `<div class="card noprint"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 style="margin:0">🔍 Carian Pelanggan</h3>${AKAUN ? '<span style="display:flex;gap:6px"><button class="small" data-cp-kadlama>📇 Kad lama</button><button class="small" data-cp-segar title="Muat semula">↻</button></span>' : ''}</div>
      <input data-cp-cari placeholder="Nama, no. telefon, no. plat atau kod ahli" value="${esc(q0)}" autocomplete="off" style="margin-top:8px">
      <div class="cp-hasil" data-cp-hasil><div class="muted" style="font-size:13px">Contoh: <b>Ahmad</b>, <b>012-345 6789</b>, <b>VAB 1234</b> atau <b>SM-1234</b>. Carian merangkumi Safari Members & rekod pelanggan lama.</div></div></div>`;
  }
  function pasang(root = document){
    const inp = root.querySelector('[data-cp-cari]'), out = root.querySelector('[data-cp-hasil]'); if(!inp || !out) return;
    const bkl = root.querySelector('[data-cp-kadlama]'); if(bkl) bkl.onclick = () => bukaSenaraiKadLama();
    let t, giliran = 0;
    const jalan = async () => {
      const q = inp.value; q0 = q; const g = ++giliran;
      if(q.trim().length < 2){ out.innerHTML = '<div class="muted" style="font-size:13px">Taip sekurang-kurangnya 2 huruf / nombor.</div>'; return; }
      out.innerHTML = '<div class="muted">⏳ Mencari…</div>';
      try{
        const r = await cari(q); if(g !== giliran) return;
        out.innerHTML = (r.A.length || r.L.length) ? `${r.A.map(kadAhliHtml).join('')}${r.L.map(kadLamaHtml).join('')}${r.lebihA || r.lebihL ? '<div class="muted" style="font-size:12px">Terlalu banyak hasil — taip lebih spesifik.</div>' : ''}`
          : '<div class="muted">Tiada pelanggan sepadan.</div>';
        out.querySelectorAll('[data-cp-ahli]').forEach(b => b.onclick = () => bukaProfil({ahli: b.dataset.cpAhli}));
        out.querySelectorAll('[data-cp-lama]').forEach(b => b.onclick = () => { const x = r.L.find(y => y.plat === b.dataset.cpLama); if(x) profilLama(x); });
      }catch(e){ out.innerHTML = `<div class="muted">⚠ ${esc(e.code || e.message)}</div>`; }
    };
    inp.oninput = () => { clearTimeout(t); t = setTimeout(jalan, 350); };
    const sg = root.querySelector('[data-cp-segar]'); if(sg) sg.onclick = async () => { await pastikanAhli(true); jalan(); };
    if(q0.trim().length >= 2) jalan();
  }

  // ---------------- PROFIL AHLI ----------------
  async function bukaProfil({ahli: id}){
    const list = await pastikanAhli(); let a = list.find(x => x.id === id);
    try{ const s = await fs.getDoc(fs.doc(store, 'ahli', id)); if(s.exists()){ a = {id, ...s.data()}; const i = list.findIndex(x => x.id === id); if(i >= 0) list[i] = a; } }catch(_){}
    if(!a) return ctx.toast('Ahli tidak dijumpai');
    const k = keadaanKad(a), aktif = kadAktif(a), kurang = profilKurang(a).map(m => MEDAN_PROFIL[m] || m);
    const wa = `https://wa.me/${a.telefon}`, P = peringkatAhli(a), ST = statLawatan(a), CALON = perluSahPeringkat(a);
    ctx.buka(`<div class="cp-p"><div class="section-title between"><h3>⭐ ${esc(a.nama || '—')}</h3><button class="small" data-cp-tutup>✕</button></div>
      <div><span class="cp-tag cp-ahli">${esc(a.kod || '')}</span><span class="cp-tag pk-${P.id}">${P.id === 'pride' ? '👑 ' : ''}${esc(P.nama)}</span><span class="cp-tag ${aktif ? 'cp-aktif' : 'cp-belum'}">${aktif ? '✅ Kad aktif' : '🔓 Kad belum aktif'}</span>${a.sumber === 'monz' ? '<span class="cp-tag cp-lama">Import MONZ</span>' : ''}</div>
      <div class="cp-aksi">${AKAUN ? `<a class="wa" href="${wa}" target="_blank" rel="noopener">💬 WhatsApp</a><a href="tel:+${esc(a.telefon)}">📞 Telefon</a>` : ''}
        ${ctx.buatOrder ? '<button class="pri" data-cp-x="order">➕ Buat order</button>' : ''}${ctx.tebusFW && k.freeWash.length ? `<button class="pri" data-cp-x="tebusfw" style="background:#C9A646;color:#1F3A68;font-weight:800">🎁 Tebus Free Wash (${k.freeWash.length})</button>` : ''}
        ${!AKAUN && ctx.jemput ? '<button class="wa" data-cp-x="wa">💬 WhatsApp</button><button class="pri" data-cp-x="hantar">📤 Hantar kad</button>' : ''}
        ${!AKAUN && ctx.copManual?.() ? '<button data-cp-x="cop">⭐ +1 cop manual 🔒</button>' : ''}${!AKAUN && bolehKadLama(a) ? '<button data-cp-x="kadlama">📇 Pindah kad lama 🔒</button>' : ''}
        ${AKAUN ? `<button class="pri" data-cp-x="hantar">📤 Hantar kad</button><button data-cp-x="lihat">👁 Lihat kad</button><button data-cp-x="ubah">✏️ Ubah maklumat</button>
        <button data-cp-x="cop">⭐ +1 cop manual</button><button data-cp-x="fw">🎁 +1 Free Wash</button>${bolehKadLama(a) ? '<button data-cp-x="kadlama">📇 Pindah kad lama</button>' : ''}${aktif ? '' : '<button data-cp-x="aktif">🔓 Aktifkan kad</button>'}
        <button data-cp-x="gabung">🔗 Gabung rekod</button><button class="bahaya" data-cp-x="padam">🚫 Padam ahli</button>` : ''}</div>
      <div class="cp-sek"><h4>👤 Profil</h4>
        <div class="cp-ln"><span>No. telefon</span><b>${esc(telP(a.telefon))}</b></div>
        ${AKAUN ? `<div class="cp-ln"><span>E-mel</span><b>${esc(a.emel || '—')}</b></div><div class="cp-ln"><span>Tarikh lahir</span><b>${esc(a.tarikhLahir ? fT(a.tarikhLahir) : '—')}</b></div>` : ''}
        <div class="cp-ln"><span>Cawangan utama</span><b>${esc({'mama-lion': 'Mama Lion', 'lion-king': 'Lion King'}[a.cawanganUtama] || a.cawanganUtama || '—')}</b></div>
        <div class="cp-ln"><span>Daftar</span><b>${esc(fT(a.daftarMasa))}${AKAUN && a.daftarOleh ? ' · ' + esc(a.daftarOleh) : ''}</b></div>
        ${a.pelangganSejak ? `<div class="cp-ln"><span>Pelanggan sejak (MONZ)</span><b>${esc(fT(a.pelangganSejak))}</b></div>` : ''}
        ${AKAUN ? `<div class="cp-ln"><span>Promosi WhatsApp</span><b>${a.setujuPromosi ? '✅ Setuju' : '— Tidak'}</b></div>` : ''}
        ${kurang.length ? `<div class="muted" style="font-size:12.5px;margin-top:4px">Profil belum lengkap: ${kurang.map(esc).join(', ')}</div>` : ''}</div>
      <div class="cp-sek"><h4>🚗 Kenderaan (${(a.plat || []).length})</h4>${(a.kenderaan || []).length ? a.kenderaan.map(v => `<div class="cp-ln"><b>${esc(v.plat)}</b><span>${esc([v.model, v.jenis].filter(Boolean).join(' · ') || '—')}</span></div>`).join('') : (a.plat || []).map(p => `<div class="cp-ln"><b>${esc(p)}</b><span>—</span></div>`).join('')}</div>
      <div class="cp-sek"><h4>🏅 Peringkat kad</h4>
        <div class="cp-ln"><span>Peringkat semasa</span><b>${esc(P.nama)}${a.pride ? ' (jemputan)' : a.peringkatSah ? ' (disahkan ' + esc(a.peringkatSah.oleh || '') + ')' : ''}</b></div>
        ${CALON ? `<div class="notice" style="margin:6px 0;background:#fef3c7">⏳ Layak naik ke <b>${esc(CALON.nama)}</b> — menunggu pengesahan Dato' / Datin</div>
          ${AKAUN && ctx.bolehSah?.() ? `<div class="cp-aksi" style="margin:0 0 6px"><button class="pri" data-cp-x="sah">✅ Sahkan naik ke ${esc(CALON.nama)}</button><button data-cp-x="tolak">✖ Tolak</button></div>` : ''}` : ''}
        <div class="cp-ln"><span>12 bulan terakhir</span><b>${ST.cucian} cucian · ${RM(ST.rm)}</b></div>
        ${P.diskaun ? `<div class="cp-ln"><span>Diskaun ahli</span><b>${P.diskaun}% servis tambahan${P.id === 'pride' ? ' & detailing' : ''}</b></div>` : ''}
        ${AKAUN ? `<div class="cp-aksi" style="margin-bottom:0"><button data-cp-x="pride">${a.pride ? '↩ Tarik Lion Pride' : '👑 Jemput Lion Pride'}</button><button data-cp-x="peringkat">🎚 Tetapkan peringkat</button></div>` : ''}</div>
      <div class="cp-sek"><h4>⭐ Kad loyalti</h4>
        <div class="cp-ln"><span>Cop semasa</span><b>${k.bil}/${KAD.saiz}</b></div><div class="cp-ln"><span>Free Wash tersedia</span><b>${k.freeWash.length}</b></div>
        ${k.freeWash.map(f => `<div class="muted" style="font-size:12.5px">🎁 ${esc(f.sebab || '')} · luput ${esc(fT(f.tamat))}</div>`).join('')}
        <div class="cp-ln"><span>Free Wash sudah ditebus</span><b>${k.digunakan.length}</b></div><div class="cp-ln"><span>Kad lengkap (10 cop)</span><b>${a.kadSelesai || 0}</b></div>
        ${a.kadLama ? `<div class="cp-ln"><span>📇 Kad lama dipindah</span><b>${a.kadLama.bilCop} cop → ${a.kadLama.fw} Free Wash</b></div><div class="muted" style="font-size:12.5px">${esc(fT(a.kadLama.t))} · oleh ${esc(a.kadLama.oleh || '')} · ${esc(a.kadLama.tindakan || '')}${AKAUN ? ' · <a href="#" data-cp-x="kadlamafoto">📷 Lihat gambar kad</a>' : ''}</div>` : ''}</div>
      <div class="cp-sek"><h4>🧾 Sejarah cucian & belanja</h4><div data-cp-sej class="muted">⏳ Memuatkan…</div></div>
      ${AKAUN ? `<div class="cp-sek"><h4>📝 Catatan dalaman <small class="muted">(pelanggan tidak nampak)</small></h4><textarea data-cp-nota rows="2" placeholder="cth: VIP, suka fokus rim, bayar bulanan"></textarea><button class="small" data-cp-x="nota" style="margin-top:4px">💾 Simpan catatan</button></div>
      <div class="cp-sek"><h4>📜 Log tindakan</h4><div data-cp-log class="muted">⏳</div></div>` : ''}</div>`);
    const q = s => document.querySelector(s);
    q('[data-cp-tutup]').onclick = ctx.tutup;
    // sejarah
    fs.getDocs(fs.collection(store, 'ahli', id, 'sejarah')).then(s => {
      const l = s.docs.map(d => d.data()).sort((x, y) => (y.masa || 0) - (x.masa || 0)), jum = l.reduce((t, x) => t + (Number(x.jumlah) || 0), 0);
      const el = q('[data-cp-sej]'); if(!el) return;
      el.classList.remove('muted');
      el.innerHTML = `<div class="cp-ln"><span>Cucian direkod dalam apps</span><b>${l.length}</b></div><div class="cp-ln"><span>Belanja dalam apps</span><b>${RM(jum)}</b></div>
        ${a.belanjaLama ? `<div class="cp-ln"><span>Belanja lama (MONZ)</span><b>${RM(a.belanjaLama)}</b></div><div class="cp-ln"><span>Jumlah keseluruhan</span><b>${RM(jum + a.belanjaLama)}</b></div>` : ''}
        ${l.length ? `<table class="cp-sej" style="margin-top:6px">${l.slice(0, 25).map(x => `<tr><td>${esc(fT(x.tarikh))}</td><td>${esc(x.plat || '')}</td><td>${esc(x.pakej || '')}</td><td style="text-align:right">${x.jumlah != null ? RM(x.jumlah) : ''}</td><td>${esc({'mama-lion': 'ML', 'lion-king': 'LK'}[x.cawangan] || '')}</td></tr>`).join('')}</table>` : '<div class="muted" style="font-size:12.5px">Belum ada cucian direkod dalam apps.</div>'}`;
    }).catch(() => { const el = q('[data-cp-sej]'); if(el) el.textContent = 'Tidak dapat memuatkan sejarah.'; });
    if(AKAUN){
      fs.getDoc(fs.doc(store, 'ahli_nota', id)).then(s => { const t = q('[data-cp-nota]'); if(t) t.value = s.exists() ? (s.data().nota || '') : (a.catatanPemilik || ''); }).catch(() => {});
      fs.getDocs(fs.query(fs.collection(store, 'ahli_log'), fs.where('ahliId', '==', id))).then(s => {
        const l = s.docs.map(d => d.data()).sort((x, y) => y.masa - x.masa), m = (a.logManual || []).map(x => ({tindakan: x.apa, butiran: x.sebab, oleh: x.oleh, masa: x.t}));
        const semua = [...l, ...m].sort((x, y) => y.masa - x.masa); const el = q('[data-cp-log]'); if(!el) return;
        el.innerHTML = semua.length ? semua.slice(0, 30).map(x => `<div style="font-size:12.5px">• ${esc(new Date(x.masa).toLocaleString('en-GB', {day:'numeric', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit'}))} — <b>${esc(x.tindakan)}</b>${x.butiran ? ': ' + esc(x.butiran) : ''} <span class="muted">(${esc(x.oleh || '')})</span></div>`).join('') : 'Tiada tindakan direkod.';
      }).catch(() => { const el = q('[data-cp-log]'); if(el) el.textContent = '—'; });
    }
    const x = n => document.querySelector(`[data-cp-x="${n}"]`);
    const segar = async () => { await segarSatu(id); ctx.selepasUbah?.(); bukaProfil({ahli: id}); };
    const kemas = async (d, tindakan, butiran, msg) => { try{ await fs.updateDoc(fs.doc(store, 'ahli', id), {...d, dikemaskini: Date.now()}); log(a, tindakan, butiran); ctx.toast(msg || '✅ Disimpan'); segar(); }catch(e){ ctx.toast('⚠ ' + (e.code || e.message)); } };
    if(x('order')) x('order').onclick = () => { ctx.tutup(); ctx.buatOrder((a.kenderaan?.[0]?.plat) || a.plat?.[0] || '', a); };
    if(x('tebusfw')) x('tebusfw').onclick = () => { ctx.tutup(); ctx.tebusFW((a.kenderaan?.[0]?.plat) || a.plat?.[0] || '', a); };
    if(x('cop')) x('cop').onclick = () => borangCopManual(a);
    if(x('kadlama')) x('kadlama').onclick = () => borangKadLama(a);
    if(x('kadlamafoto')) x('kadlamafoto').onclick = e => { e.preventDefault(); lihatFotoKadLama(a); };
    if(x('sah')) x('sah').onclick = () => { if(!confirm(`Sahkan ${a.nama} naik ke ${CALON.nama}?\nPelanggan akan dimaklumkan dalam Apps Safari Members & kad dikemas kini di semua apps.`)) return;
      kemas({peringkat: CALON.id, peringkatManual: null, peringkatTolak: null, peringkatSah: {oleh: ctx.pengguna(), masa: Date.now()}, notisPeringkat: {id: CALON.id, masa: Date.now()}}, 'Sahkan naik taraf', CALON.nama, `✅ ${a.nama} kini ${CALON.nama}`);
      if(confirm('Maklumkan pelanggan melalui WhatsApp sekarang?')) window.open(`https://wa.me/${a.telefon}?text=${encodeURIComponent(`Tahniah ${a.nama}! 🎉 Kad Safari Members anda (${a.kod}) telah dinaik taraf ke *${CALON.nama}*.\nTerima kasih atas kesetiaan anda bersama Mama Lion & Lion King. Buka kad anda: ${ctx.pautanKad(a.id)}`)}`, '_blank'); };
    if(x('tolak')) x('tolak').onclick = () => { const sebab = prompt(`Sebab tolak naik taraf ke ${CALON.nama}:`); if(sebab === null) return; kemas({peringkatTolak: CALON.id}, 'Tolak naik taraf', `${CALON.nama}${sebab ? ' · ' + sebab : ''}`, 'Naik taraf ditolak'); };
    if(!AKAUN){
      if(ctx.jemput){ x('wa').onclick = () => ctx.jemput({jenis: 'wa', nama: a.nama, telefon: a.telefon, kod: a.kod});
        x('hantar').onclick = () => { ctx.jemput({jenis: 'kad', nama: a.nama, telefon: a.telefon, kod: a.kod, pautan: ctx.pautanKad(a.id)}); tandaKad(a); }; }
      return;
    }
    x('hantar').onclick = () => { const teks = `Salam ${a.nama}, ini kad digital Safari Members anda (${a.kod}) — Mama Lion & Lion King Premium Car Wash.\nBuka & pasang apps: ${ctx.pautanKad(a.id)}\n\nSetiap cucian berbayar = 1 cop. Cop ke-${KAD.ganjaranPada[0]} & ke-${KAD.saiz} = FREE WASH!`;
      window.open(`https://wa.me/${a.telefon}?text=${encodeURIComponent(teks)}`, '_blank'); log(a, 'Hantar kad', 'WhatsApp'); tandaKad(a); };
    x('lihat').onclick = () => { ctx.tutup(); ctx.lihatKad?.(a); };
    x('nota').onclick = async () => { const nota = q('[data-cp-nota]').value.trim(); try{ await fs.setDoc(fs.doc(store, 'ahli_nota', id), {nota, oleh: ctx.pengguna(), masa: Date.now()}); log(a, 'Catatan dalaman dikemas kini'); ctx.toast('✅ Catatan disimpan'); }catch(e){ ctx.toast('⚠ ' + (e.code || e.message)); } };
    x('fw').onclick = () => { const sebab = prompt('Sebab beri Free Wash manual:'); if(!sebab) return; const t = Date.now();
      kemas({freeWash: [...(a.freeWash || []), {id: 'fwm' + t.toString(36), t, tamat: t + KAD.tempohFreeWashHari * 864e5, sebab: 'Manual: ' + sebab, cawangan: ctx.cawangan(), guna: null}],
        logManual: [...(a.logManual || []), {t, oleh: ctx.pengguna(), apa: '+1 Free Wash', sebab}]}, '+1 Free Wash manual', sebab, '✅ Free Wash ditambah'); };
    if(x('aktif')) x('aktif').onclick = () => { if(!confirm(`Aktifkan kad ${a.nama} sekarang tanpa syarat cucian pertama / profil?`)) return; kemas({kadAktif: true, kadAktifMasa: Date.now()}, 'Aktifkan kad', 'Manual oleh pemilik', '✅ Kad diaktifkan'); };
    x('ubah').onclick = () => borangUbah(a);
    x('pride').onclick = () => { if(a.pride){ if(confirm(`Tarik kad Lion Pride daripada ${a.nama}?`)) kemas({pride: false, prideMasa: null}, 'Tarik Lion Pride', '', '✅ Lion Pride ditarik'); }
      else if(confirm(`Jemput ${a.nama} sebagai Lion Pride?\nKad hitam-emas & semua faedah Lion Pride akan aktif serta-merta.`)) kemas({pride: true, prideMasa: Date.now(), prideOleh: ctx.pengguna()}, 'Jemput Lion Pride', '', '👑 Dijemput sebagai Lion Pride'); };
    x('peringkat').onclick = () => { if(!ctx.bolehSah?.()) return ctx.toast('Hanya Dato\' / Datin boleh tetapkan peringkat');
      const v = (prompt('Tetapkan peringkat (taip satu): bronze / silver / gold', P.id === 'pride' ? 'gold' : P.id) || '').trim().toLowerCase();
      if(!v) return; if(!['bronze', 'silver', 'gold'].includes(v)) return ctx.toast('Pilihan tidak sah');
      kemas({peringkat: v, peringkatManual: null, peringkatTolak: null, peringkatSah: {oleh: ctx.pengguna(), masa: Date.now()}, ...(v !== P.id ? {notisPeringkat: {id: v, masa: Date.now()}} : {})}, 'Tetapkan peringkat', PERINGKAT[v].nama, '✅ Peringkat dikemas kini'); };
    x('gabung').onclick = () => gabung(a);
    x('padam').onclick = () => padam(a);
  }

  // ---------------- COP MANUAL: nota "sebab diberi" wajib + PIN (kaunter) ----------------
  function borangCopManual(a, platPilih){
    let pl = (a.kenderaan?.length ? a.kenderaan.map(v => v.plat) : a.plat || []);
    if(platPilih) pl = [platPilih, ...pl.filter(p => p !== platPilih)];
    ctx.buka(`<div class="cp-p"><div class="section-title between"><h3>⭐ Cop manual — ${esc(a.nama || '')}</h3><button class="small" data-cm-tutup>✕</button></div>
      <div class="muted" style="font-size:13px">Cop automatik hanya untuk cucian Luar & Dalam (cop pertama: Promo A ke atas). Guna cop manual untuk pengecualian sahaja — direkod dalam log.</div>
      <label>Kenderaan</label><select data-cm="plat">${pl.map(p => `<option>${esc(p)}</option>`).join('')}<option value="">— Tiada / lain-lain —</option></select>
      <label>Sebab diberi *</label><textarea data-cm="sebab" rows="3" placeholder="cth: Cuci Luar & Dalam semalam, cop tertinggal kerana sistem offline"></textarea>
      ${ctx.mintaPinCop ? '<div class="muted" style="font-size:12.5px;margin-top:4px">🔒 Perlu PIN Supervisor / Manager / Admin selepas tekan butang di bawah.</div>' : ''}
      <button class="primary" data-cm="ok" style="width:100%;padding:13px;margin-top:10px">⭐ BERI 1 COP</button></div>`);
    const q = s => document.querySelector(s);
    q('[data-cm-tutup]').onclick = () => bukaProfil({ahli: a.id});
    q('[data-cm="ok"]').onclick = async () => {
      const sebab = q('[data-cm="sebab"]').value.trim(), plat = q('[data-cm="plat"]').value;
      if(sebab.length < 5) return ctx.toast('Sila tulis sebab cop diberi (sekurang-kurangnya 5 huruf)');
      let pelulus = ctx.pengguna();
      if(ctx.mintaPinCop){ pelulus = await ctx.mintaPinCop(); if(!pelulus) return bukaProfil({ahli: a.id}); }
      try{
        const s0 = await fs.getDoc(fs.doc(store, 'ahli', a.id)); const b = s0.exists() ? {id: a.id, ...s0.data()} : a, t = Date.now();
        const r = tambahCop(b, {orderId: 'manual-' + t, plat: plat || 'MANUAL' + t, cawangan: ctx.cawangan(), tarikh: 'manual-' + t, paksa: true});
        await fs.updateDoc(fs.doc(store, 'ahli', a.id), {...r.data, logManual: [...(b.logManual || []), {t, oleh: pelulus, apa: '+1 cop', sebab, plat}], dikemaskini: t});
        log(a, '+1 cop manual', `${sebab}${plat ? ' · ' + plat : ''} · diluluskan ${pelulus}`); ctx.logLuar?.('Cop manual Safari Members', `${a.nama} · ${a.kod} · ${sebab} · lulus ${pelulus}`);
        ctx.toast(r.dapatFreeWash ? '✅ Cop ditambah — dapat 1 Free Wash' : '✅ Cop ditambah'); await segarSatu(a.id); ctx.selepasUbah?.(); bukaProfil({ahli: a.id});
      }catch(e){ ctx.toast('⚠ ' + (e.code || e.message)); }
    };
  }

  // ---------------- 📇 PINDAH KAD LAMA (kad cop fizikal sebelum apps) ----------------
  const kecilFoto = (f, maks = 1000, q = .6) => new Promise((res, rej) => { const r = new FileReader(); r.onerror = rej; r.onload = () => { const i = new Image(); i.onerror = rej; i.onload = () => {
    const sk = Math.min(1, maks / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = Math.round(i.width * sk); c.height = Math.round(i.height * sk);
    c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', q)); }; i.src = r.result; }; r.readAsDataURL(f); });
  function borangKadLama(a){
    const [g1, g2] = KAD.ganjaranPada.length > 1 ? KAD.ganjaranPada : [KAD.ganjaranPada[0], KAD.ganjaranPada[0]];
    let n = null, foto = '';
    ctx.buka(`<div class="cp-p"><div class="section-title between"><h3>📇 Pindah kad lama — ${esc(a.nama || '')}</h3><button class="small" data-kl-tutup>✕</button></div>
      <div class="muted" style="font-size:13px">Untuk pelanggan yang memegang <b>kad cop fizikal</b> sebelum apps. <b>Sekali sahaja</b> bagi setiap ahli. Kad lama ikut peraturan sama (cop ke-${g1} & ke-${g2} = Free Wash). Cop yang dipindah dikira bermula hari ini.${AKAUN ? '' : ` Kaunter terima kad lama sehingga <b>${esc(fT(KAD_LAMA_TAMAT))}</b>.`}</div>
      <label>1. Bilangan cop pada kad lama *</label>
      <div data-kl-bil style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px">${Array.from({length: KAD.saiz + 1}, (_, i) => `<button type="button" data-kl-n="${i}" style="padding:10px 0;font-weight:700">${i}</button>`).join('')}</div>
      <div data-kl-tuntut></div>
      <label>2. Gambar kad lama * <small class="muted">(bukti — nampak semua cop)</small></label>
      <input type="file" accept="image/*" capture="environment" data-kl-foto><img data-kl-prev style="display:none;max-width:100%;max-height:220px;margin-top:6px;border-radius:10px">
      <label>3. Kad fizikal selepas dipindah *</label>
      <select data-kl-tindakan>${TINDAKAN_KAD.map(t => `<option>${esc(t)}</option>`).join('')}</select>
      <div data-kl-hasil class="cp-sek" style="margin-top:10px"><div class="muted">Pilih bilangan cop.</div></div>
      ${!AKAUN && ctx.mintaPinCop ? '<div class="muted" style="font-size:12.5px;margin-top:4px">🔒 Perlu PIN Supervisor / Manager / Admin selepas tekan butang di bawah.</div>' : ''}
      <button class="primary" data-kl-ok style="width:100%;padding:13px;margin-top:10px">📇 PINDAH KAD LAMA</button></div>`);
    const q = s => document.querySelector(s);
    const kira = () => {
      const t1 = !!q('[data-kl-t1]')?.checked, t2 = !!q('[data-kl-t2]')?.checked;
      if(n == null) return null;
      const r = pindahKadLama(a, {bilCop: n, tuntut1: t1, tuntut2: t2});
      q('[data-kl-hasil]').innerHTML = r.ok ? `<h4 style="margin:0 0 4px">Hasil dalam kad digital</h4>
        <div class="cp-ln"><span>Cop dimasukkan</span><b>${r.copMasuk}</b></div><div class="cp-ln"><span>Cop dalam kad selepas pindah</span><b>${r.copAkhir}/${KAD.saiz}</b></div>
        <div class="cp-ln"><span>🎁 Free Wash baharu</span><b>${r.dapatFreeWash}</b></div>` : `<div class="muted">⚠ ${esc(r.sebab)}</div>`;
      return r;
    };
    const lukisTuntut = () => { q('[data-kl-tuntut]').innerHTML =
      (g1 !== g2 && n >= g1 ? `<label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" data-kl-t1 style="width:20px;height:20px"> Free Wash cop ke-${g1} kad lama <b>sudah dituntut</b></label>` : '')
      + (n >= g2 ? `<label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:6px"><input type="checkbox" data-kl-t2 style="width:20px;height:20px"> Free Wash cop ke-${g2} kad lama <b>sudah dituntut</b></label>` : '');
      document.querySelectorAll('[data-kl-tuntut] input').forEach(i => i.onchange = kira); };
    document.querySelectorAll('[data-kl-n]').forEach(b => b.onclick = () => { n = Number(b.dataset.klN);
      document.querySelectorAll('[data-kl-n]').forEach(x => { const on = x === b; x.style.background = on ? '#1F3A68' : ''; x.style.color = on ? '#fff' : ''; });
      lukisTuntut(); kira(); });
    q('[data-kl-foto]').onchange = async e => { const f = e.target.files[0]; if(!f) return;
      try{ foto = await kecilFoto(f); const im = q('[data-kl-prev]'); im.src = foto; im.style.display = 'block'; }catch(_){ ctx.toast('Gagal baca gambar'); } };
    q('[data-kl-tutup]').onclick = () => bukaProfil({ahli: a.id});
    q('[data-kl-ok]').onclick = async () => {
      if(n == null) return ctx.toast('Pilih bilangan cop pada kad lama');
      if(!foto) return ctx.toast('Ambil gambar kad lama sebagai bukti');
      const t1 = !!q('[data-kl-t1]')?.checked, t2 = !!q('[data-kl-t2]')?.checked, tindakan = q('[data-kl-tindakan]').value;
      const pra = kira(); if(!pra?.ok) return ctx.toast(pra?.sebab || 'Tidak sah');
      if(!confirm(`Pindah kad lama ${a.nama}: ${n} cop → ${pra.copMasuk} cop dalam kad digital + ${pra.dapatFreeWash} Free Wash?\n\nKad fizikal: ${tindakan}`)) return;
      let pelulus = ctx.pengguna();
      if(!AKAUN && ctx.mintaPinCop){ pelulus = await ctx.mintaPinCop(); if(!pelulus) return; }
      const btn = q('[data-kl-ok]'); if(btn){ btn.disabled = true; btn.textContent = 'Menyimpan…'; }
      try{
        const s0 = await fs.getDoc(fs.doc(store, 'ahli', a.id)), b = s0.exists() ? {id: a.id, ...s0.data()} : a, t = Date.now();
        const r = pindahKadLama(b, {bilCop: n, tuntut1: t1, tuntut2: t2, cawangan: ctx.cawangan?.() || '', oleh: pelulus, tindakan, kini: t});
        if(!r.ok){ ctx.toast('⚠ ' + r.sebab); return bukaProfil({ahli: a.id}); }
        const butiran = `${n} cop${t1 ? ' · FW cop ke-' + g1 + ' sudah dituntut' : ''}${t2 ? ' · FW cop ke-' + g2 + ' sudah dituntut' : ''} → ${r.copMasuk} cop + ${r.dapatFreeWash} Free Wash · ${tindakan}`;
        await fs.setDoc(fs.doc(store, 'ahli', a.id, 'kadlama', 'utama'), {gambar: foto, t, oleh: pelulus, cawangan: ctx.cawangan?.() || '', bilCop: n, tuntut1: t1, tuntut2: t2, tindakan, kod: a.kod || '', nama: a.nama || ''});
        await fs.updateDoc(fs.doc(store, 'ahli', a.id), {...r.data, logManual: [...(b.logManual || []), {t, oleh: pelulus, apa: '📇 Pindah kad lama', sebab: butiran}]});
        log(a, '📇 Pindah kad lama', `${butiran} · diluluskan ${pelulus}`); ctx.logLuar?.('Pindah kad lama Safari Members', `${a.nama} · ${a.kod} · ${butiran} · lulus ${pelulus}`);
        ctx.toast(`✅ Kad lama dipindah — ${r.copMasuk} cop${r.dapatFreeWash ? ' + ' + r.dapatFreeWash + ' Free Wash' : ''}`);
        await segarSatu(a.id); ctx.selepasUbah?.(); bukaProfil({ahli: a.id});
      }catch(e){ ctx.toast('⚠ ' + (e.code || e.message)); if(btn){ btn.disabled = false; btn.textContent = '📇 PINDAH KAD LAMA'; } }
    };
  }
  async function lihatFotoKadLama(a){
    ctx.buka('<div class="cp-p"><h3>📷 Gambar kad lama</h3><div class="muted">⏳ Memuat…</div></div>');
    let d = null; try{ const s = await fs.getDoc(fs.doc(store, 'ahli', a.id, 'kadlama', 'utama')); d = s.exists() ? s.data() : null; }catch(e){ ctx.toast('⚠ ' + (e.code || e.message)); }
    ctx.buka(`<div class="cp-p"><div class="section-title between"><h3>📷 Kad lama — ${esc(a.nama || '')}</h3><button class="small" data-kl-tutup>✕</button></div>
      ${d?.gambar ? `<img src="${d.gambar}" style="max-width:100%;border-radius:10px">` : '<div class="muted">Tiada gambar.</div>'}
      ${d ? `<div class="muted" style="font-size:13px;margin-top:6px">${d.bilCop} cop · ${esc(fT(d.t))} · oleh ${esc(d.oleh || '')} · ${esc(d.tindakan || '')}</div>` : ''}</div>`);
    document.querySelector('[data-kl-tutup]').onclick = () => bukaProfil({ahli: a.id});
  }
  // Senarai kad lama yang sudah dipindah (Akaun)
  async function bukaSenaraiKadLama(){
    const L = (await pastikanAhli()).filter(a => a.kadLama).sort((x, y) => y.kadLama.t - x.kadLama.t);
    const jCop = L.reduce((s, a) => s + (a.kadLama.bilCop || 0), 0), jFW = L.reduce((s, a) => s + (a.kadLama.fw || 0), 0);
    ctx.buka(`<div class="cp-p"><div class="section-title between"><h3>📇 Kad lama dipindah (${L.length})</h3><button class="small" data-cp-tutup>✕</button></div>
      <p class="muted" style="font-size:13px;margin:4px 0 8px">Jumlah ${jCop} cop kad lama · ${jFW} Free Wash diberi. Kaunter terima kad lama sehingga <b>${esc(fT(KAD_LAMA_TAMAT))}</b>. Tekan nama untuk profil & gambar kad.</p>
      <div class="cp-hasil">${L.map(a => `<div class="cp-kad" data-kl-ahli="${esc(a.id)}"><span class="cp-av" style="background:${warna(a.id)}">${esc(inisial(a.nama))}</span><span style="flex:1;min-width:0">
        <b>${esc(a.nama || '—')} · ${esc(a.kod || '')}</b><small>${a.kadLama.bilCop} cop → ${a.kadLama.cop} cop + ${a.kadLama.fw} Free Wash · ${esc(fT(a.kadLama.t))} · ${esc({'mama-lion': 'Mama Lion', 'lion-king': 'Lion King'}[a.kadLama.cawangan] || a.kadLama.cawangan || '')} · oleh ${esc(a.kadLama.oleh || '')}</small></span></div>`).join('') || '<div class="muted">Belum ada kad lama dipindah.</div>'}</div></div>`);
    document.querySelector('[data-cp-tutup]').onclick = ctx.tutup;
    document.querySelectorAll('[data-kl-ahli]').forEach(e => e.onclick = () => bukaProfil({ahli: e.dataset.klAhli}));
  }

  // ---------------- UBAH MAKLUMAT ----------------
  function borangUbah(a){
    let kend = (a.kenderaan?.length ? a.kenderaan : (a.plat || []).map(p => ({plat: p}))).map(v => ({...v}));
    const lukisK = () => document.querySelector('[data-ub-k]').innerHTML = kend.map((v, i) => `<div class="row" style="flex-wrap:nowrap;gap:6px;margin:4px 0"><input data-ub-plat="${i}" value="${esc(v.plat || '')}" placeholder="No. plat" style="flex:1;margin:0;text-transform:uppercase"><input data-ub-model="${i}" value="${esc(v.model || '')}" placeholder="Model" style="flex:1;margin:0"><button class="small" data-ub-buang="${i}">✕</button></div>`).join('');
    ctx.buka(`<div class="cp-p"><div class="section-title between"><h3>✏️ Ubah maklumat — ${esc(a.kod)}</h3><button class="small" data-ub-tutup>✕</button></div>
      <label>Nama</label><input data-ub="nama" value="${esc(a.nama || '')}">
      <label>No. telefon</label><input data-ub="telefon" type="tel" inputmode="tel" value="${esc(paparTelefon(a.telefon))}">
      <label>E-mel</label><input data-ub="emel" type="email" value="${esc(a.emel || '')}">
      <label>Tarikh lahir</label><input data-ub="tarikhLahir" type="date" value="${esc(a.tarikhLahir || '')}">
      <label class="row" style="font-weight:400;gap:8px;margin:8px 0"><input type="checkbox" data-ub="setujuPromosi" ${a.setujuPromosi ? 'checked' : ''} style="width:20px;height:20px;margin:0"> Pelanggan setuju terima promosi WhatsApp</label>
      <label>🚗 Kenderaan</label><div data-ub-k></div><button class="small" data-ub-tambah>+ Tambah kenderaan</button>
      <button class="primary" data-ub-simpan style="width:100%;padding:13px;margin-top:10px">💾 SIMPAN PERUBAHAN</button></div>`);
    lukisK();
    const q = s => document.querySelector(s), v = n => (q(`[data-ub="${n}"]`).value || '').trim();
    const baca = () => { kend = kend.map((x, i) => ({...x, plat: (q(`[data-ub-plat="${i}"]`)?.value || '').trim().toUpperCase(), model: (q(`[data-ub-model="${i}"]`)?.value || '').trim()})); };
    q('[data-ub-tutup]').onclick = () => bukaProfil({ahli: a.id});
    q('[data-ub-tambah]').onclick = () => { baca(); kend.push({plat: '', model: ''}); lukisK(); pasangK(); };
    const pasangK = () => document.querySelectorAll('[data-ub-buang]').forEach(b => b.onclick = () => { baca(); kend.splice(+b.dataset.ubBuang, 1); lukisK(); pasangK(); });
    pasangK();
    q('[data-ub-simpan]').onclick = async () => {
      baca(); const tel = normTelefon(v('telefon'));
      if(!telefonSah(tel)) return ctx.toast('No. telefon tidak sah');
      const k2 = kend.filter(x => normPlat(x.plat)).map(x => ({plat: x.plat, ...(x.model ? {model: x.model} : {}), ...(x.jenis ? {jenis: x.jenis} : {})}));
      if(!k2.length) return ctx.toast('Sekurang-kurangnya satu kenderaan');
      const plat = [...new Set(k2.map(x => normPlat(x.plat)))];
      try{
        if(tel !== a.telefon){
          const ada = await fs.getDoc(fs.doc(store, 'ahli_telefon', tel));
          if(ada.exists() && ada.data().token !== a.id) return ctx.toast('No. telefon ini sudah digunakan ahli lain — guna 🔗 Gabung rekod');
        }
        await fs.updateDoc(fs.doc(store, 'ahli', a.id), {nama: v('nama') || a.nama, telefon: tel, emel: v('emel'), tarikhLahir: v('tarikhLahir'), setujuPromosi: q('[data-ub="setujuPromosi"]').checked, kenderaan: k2, plat, dikemaskini: Date.now()});
        // indeks log masuk
        const lamaK = (a.plat || []).map(p => kunciMasuk(a.telefon, p)), baruK = plat.map(p => kunciMasuk(tel, p));
        await Promise.all(lamaK.filter(x => !baruK.includes(x)).map(x => fs.deleteDoc(fs.doc(store, 'ahli_masuk', x)).catch(() => {})));
        await Promise.all(baruK.map(x => fs.setDoc(fs.doc(store, 'ahli_masuk', x), {token: a.id})));
        if(tel !== a.telefon){ await fs.deleteDoc(fs.doc(store, 'ahli_telefon', a.telefon)).catch(() => {}); await fs.setDoc(fs.doc(store, 'ahli_telefon', tel), {token: a.id}); }
        const beza = [v('nama') !== a.nama && 'nama', tel !== a.telefon && 'telefon', plat.join() !== (a.plat || []).join() && 'kenderaan', v('emel') !== (a.emel || '') && 'e-mel'].filter(Boolean);
        log(a, 'Ubah maklumat', beza.join(', ') || 'tiada perubahan utama');
        ctx.toast('✅ Maklumat dikemas kini'); await segarSatu(a.id); ctx.selepasUbah?.(); bukaProfil({ahli: a.id});
      }catch(e){ ctx.toast('⚠ ' + (e.code || e.message)); }
    };
  }

  // ---------------- GABUNG REKOD ----------------
  async function gabung(a){
    const q = prompt('Gabung ahli lain KE DALAM ahli ini.\nTaip kod ahli (cth SMAB12CD) atau no. telefon ahli yang mahu digabung:'); if(!q) return;
    const list = await pastikanAhli(), qd = normTelefon(q), kod = q.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const b = list.find(x => x.id !== a.id && ((x.kod || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === kod || (telefonSah(qd) && x.telefon === qd)));
    if(!b) return ctx.toast('Ahli tidak dijumpai');
    if(!confirm(`Gabung ${b.kod} · ${b.nama} (${paparTelefon(b.telefon)}) KE DALAM ${a.kod} · ${a.nama}?\n\nKenderaan, cop, Free Wash & sejarah ${b.kod} dipindahkan. Rekod ${b.kod} dipadam. Tindakan ini tidak boleh dibatalkan.`)) return;
    try{
      const plat = [...new Set([...(a.plat || []), ...(b.plat || [])])], kend = [...(a.kenderaan || [])];
      (b.kenderaan || []).forEach(v => { if(!kend.some(x => normPlat(x.plat) === normPlat(v.plat))) kend.push(v); });
      const cop = [...(a.cop || []), ...(b.cop || []).filter(c => !(a.cop || []).some(d => d.o === c.o))].sort((x, y) => x.t - y.t);
      await fs.updateDoc(fs.doc(store, 'ahli', a.id), {plat, kenderaan: kend, cop, freeWash: [...(a.freeWash || []), ...(b.freeWash || [])], jumlahServis: (a.jumlahServis || 0) + (b.jumlahServis || 0),
        kadSelesai: (a.kadSelesai || 0) + (b.kadSelesai || 0), belanjaLama: (a.belanjaLama || 0) + (b.belanjaLama || 0), kadAktif: !!(kadAktif(a) || kadAktif(b)),
        emel: a.emel || b.emel || '', tarikhLahir: a.tarikhLahir || b.tarikhLahir || '', setujuPromosi: !!(a.setujuPromosi || b.setujuPromosi), dikemaskini: Date.now()});
      const sej = await fs.getDocs(fs.collection(store, 'ahli', b.id, 'sejarah'));
      await Promise.all(sej.docs.map(d => fs.setDoc(fs.doc(store, 'ahli', a.id, 'sejarah', d.id), d.data())));
      await Promise.all(plat.map(p => fs.setDoc(fs.doc(store, 'ahli_masuk', kunciMasuk(a.telefon, p)), {token: a.id})));
      await Promise.all((b.plat || []).map(p => fs.setDoc(fs.doc(store, 'ahli_masuk', kunciMasuk(b.telefon, p)), {token: a.id})));
      await fs.setDoc(fs.doc(store, 'ahli_telefon', b.telefon), {token: a.id});
      await fs.deleteDoc(fs.doc(store, 'ahli', b.id));
      log(a, 'Gabung rekod', `${b.kod} · ${b.nama} · ${paparTelefon(b.telefon)} digabung`);
      ctx.toast('✅ Rekod digabung'); await pastikanAhli(true); ctx.selepasUbah?.(); bukaProfil({ahli: a.id});
    }catch(e){ ctx.toast('⚠ ' + (e.code || e.message)); }
  }

  // ---------------- PADAM ----------------
  async function padam(a){
    if(!confirm(`Padam ahli ${a.kod} · ${a.nama}?\n\nKad digital, cop & Free Wash pelanggan ini akan hilang dan dia tidak boleh log masuk lagi.`)) return;
    if((prompt(`Taip PADAM untuk sahkan pemadaman ${a.kod}:`) || '').trim().toUpperCase() !== 'PADAM') return ctx.toast('Dibatalkan');
    try{
      await Promise.all((a.plat || []).map(p => fs.deleteDoc(fs.doc(store, 'ahli_masuk', kunciMasuk(a.telefon, p))).catch(() => {})));
      const t = await fs.getDoc(fs.doc(store, 'ahli_telefon', a.telefon)); if(t.exists() && t.data().token === a.id) await fs.deleteDoc(fs.doc(store, 'ahli_telefon', a.telefon));
      await fs.deleteDoc(fs.doc(store, 'ahli', a.id));
      log(a, 'Padam ahli', `${a.nama} · ${paparTelefon(a.telefon)} · ${(a.plat || []).join(', ')}`);
      ctx.toast('🗑 Ahli dipadam'); await segarSatu(a.id); ctx.selepasUbah?.(); ctx.tutup();
    }catch(e){ ctx.toast('⚠ ' + (e.code || e.message)); }
  }

  // ---------------- PROFIL PELANGGAN LAMA ----------------
  function profilLama(x){
    ctx.buka(`<div class="cp-p"><div class="section-title between"><h3>🕘 ${esc(x.n || 'Pelanggan lama')}</h3><button class="small" data-cp-tutup>✕</button></div>
      <div><span class="cp-tag cp-lama">🕘 Pelanggan lama — belum ahli</span>${x.co ? '<span class="cp-tag cp-lama">🏢 Syarikat</span>' : ''}</div>
      <div class="cp-aksi">${ctx.buatOrder ? '<button class="pri" data-cp-x="order">➕ Buat order</button>' : ''}<button class="pri" data-cp-x="daftar">⭐ Daftar sebagai ahli</button>${ctx.jemput ? '<button class="wa" data-cp-x="jemput">💌 Hantar jemputan</button>' : ''}</div>
      ${ctx.jemput ? `<div class="cp-sek" data-cp-jemput hidden><h4>💌 Jemputan Safari Members (WhatsApp)</h4><label>No. telefon pelanggan *</label><input data-jm="tel" type="tel" inputmode="tel" placeholder="01x-xxxxxxx">
        <button class="primary" data-jm="hantar" style="width:100%;padding:12px;margin-top:6px">💬 HANTAR JEMPUTAN</button></div>` : ''}
      <div class="cp-sek"><h4>Maklumat (rekod MONZ)</h4>
        <div class="cp-ln"><span>No. plat</span><b>${esc(x.p || x.plat)}</b></div><div class="cp-ln"><span>Nama</span><b>${esc(x.n || '—')}</b></div>
        <div class="cp-ln"><span>Kenderaan</span><b>${esc(x.m || '—')}</b></div><div class="cp-ln"><span>Pelanggan sejak</span><b>${esc(fT(x.d1))}</b></div>
        ${x.d2 && x.d2 !== x.d1 ? `<div class="cp-ln"><span>Rekod terakhir</span><b>${esc(fT(x.d2))}</b></div>` : ''}
        <div class="cp-ln"><span>Jumlah belanja</span><b>${RM(x.inv)}</b></div>${AKAUN && x.pic ? `<div class="cp-ln"><span>PIC</span><b>${esc(x.pic)}</b></div>` : ''}${x.nota ? `<div class="cp-ln"><span>Nota</span><b>${esc(x.nota)}</b></div>` : ''}</div>
      <div class="cp-sek" data-cp-daftar hidden><h4>⭐ Daftar Safari Members</h4>
        <label>Nama</label><input data-dl="nama" value="${esc(x.n || '')}"><label>No. telefon *</label><input data-dl="tel" type="tel" inputmode="tel" placeholder="01x-xxxxxxx">
        <label>Model kenderaan</label><input data-dl="model" value="${esc(x.m || '')}">
        <label class="row" style="font-weight:400;gap:8px;margin:8px 0"><input type="checkbox" data-dl="promo" style="width:20px;height:20px;margin:0"> Pelanggan setuju terima promosi WhatsApp</label>
        <button class="primary" data-dl="simpan" style="width:100%;padding:12px">⭐ DAFTAR AHLI</button></div></div>`);
    const q = s => document.querySelector(s);
    q('[data-cp-tutup]').onclick = ctx.tutup;
    const o = q('[data-cp-x="order"]'); if(o) o.onclick = () => { ctx.tutup(); ctx.buatOrder(x.p || x.plat, null); };
    q('[data-cp-x="daftar"]').onclick = () => { q('[data-cp-daftar]').hidden = false; q('[data-dl="tel"]').focus(); };
    if(ctx.jemput){ q('[data-cp-x="jemput"]').onclick = () => { q('[data-cp-jemput]').hidden = false; q('[data-jm="tel"]').focus(); };
      q('[data-jm="hantar"]').onclick = () => { const tel = normTelefon(q('[data-jm="tel"]').value); if(!telefonSah(tel)) return ctx.toast('No. telefon tidak sah');
        ctx.jemput({jenis: 'jemput', nama: x.n || '', telefon: tel, plat: x.p || x.plat}); }; }
    q('[data-dl="simpan"]').onclick = async () => {
      const tel = normTelefon(q('[data-dl="tel"]').value), nm = q('[data-dl="nama"]').value.trim();
      if(!telefonSah(tel)) return ctx.toast('No. telefon tidak sah');
      const plat = normPlat(x.plat), kend = {plat: x.p || x.plat, ...(q('[data-dl="model"]').value.trim() ? {model: q('[data-dl="model"]').value.trim()} : {})};
      try{
        const ada = await fs.getDoc(fs.doc(store, 'ahli_telefon', tel)); let token = ada.exists() ? ada.data().token : null, a;
        if(token && (await fs.getDoc(fs.doc(store, 'ahli', token))).exists()){
          await fs.updateDoc(fs.doc(store, 'ahli', token), {plat: fs.arrayUnion(plat), kenderaan: fs.arrayUnion(kend), dikemaskini: Date.now()});
          ctx.toast('✅ Kenderaan ditambah kepada ahli sedia ada');
        } else {
          token = buatToken();
          a = {...ahliBaru({nama: nm || 'Pelanggan', telefon: tel, plat: [plat], kenderaan: [kend], cawanganUtama: ctx.cawangan(), setujuPromosi: q('[data-dl="promo"]').checked, oleh: `${ctx.pengguna()} (rekod lama)`}), sumber: 'monz', belanjaLama: x.inv || 0, pelangganSejak: x.d1 || ''};
          await fs.setDoc(fs.doc(store, 'ahli', token), a); await fs.setDoc(fs.doc(store, 'ahli_telefon', tel), {token});
          ctx.toast('✅ Didaftar sebagai Safari Members');
        }
        await fs.setDoc(fs.doc(store, 'ahli_masuk', kunciMasuk(tel, plat)), {token});
        log({id: token, kod: a?.kod || ''}, 'Daftar dari rekod lama', `${x.p || x.plat}`);
        await segarSatu(token); ctx.selepasUbah?.(); bukaProfil({ahli: token});
      }catch(e){ ctx.toast('⚠ ' + (e.code || e.message)); }
    };
  }

  // ---------------- 📋 BELUM TERIMA KAD ----------------
  // Ahli yang didaftar oleh kaunter / Akaun / import rekod lama (bukan daftar sendiri) & kad digital belum dihantar.
  async function senaraiBelumKad(){
    const list = await pastikanAhli(), c = ctx.cawangan?.();
    return list.filter(a => !a.kadDihantar && a.daftarOleh && a.daftarOleh !== 'pelanggan' && telefonSah(a.telefon) && (!c || !a.cawanganUtama || a.cawanganUtama === c))
      .sort((x, y) => (y.daftarMasa || 0) - (x.daftarMasa || 0));
  }
  async function kiraBelumKad(){ try{ return (await senaraiBelumKad()).length; }catch(_){ return null; } }
  async function bukaBelumKad(){
    ctx.buka('<div class="cp-p"><h3>📋 Belum terima kad</h3><div class="muted">⏳ Memuat senarai…</div></div>');
    let L; try{ L = await senaraiBelumKad(); }catch(e){ return ctx.buka(`<div class="cp-p"><div class="section-title between"><h3>📋 Belum terima kad</h3><button class="small" data-cp-tutup>✕</button></div><div class="muted">⚠ ${esc(e.code || e.message)}</div></div>`); }
    const siap = new Set(); let tapis = '';
    const baris = a => { const ok = siap.has(a.id);
      return `<div class="cp-kad" style="cursor:default${ok ? ';opacity:.55' : ''}"><span class="cp-av" style="background:${warna(a.id)}">${esc(inisial(a.nama))}</span><span style="flex:1;min-width:0">
        <b>${esc(a.nama || '—')} · ${esc(telP(a.telefon))}</b><small>🚗 ${(a.plat || []).map(esc).join(', ') || '—'} · daftar ${esc(fT(a.daftarMasa))}</small>
        <span class="cp-tag cp-ahli">${esc(a.kod || '')}</span>${a.sumber === 'monz' ? '<span class="cp-tag cp-lama">Rekod lama</span>' : '<span class="cp-tag cp-belum">Daftar di kaunter</span>'}</span>
        ${ok ? '<b style="color:#15803d;white-space:nowrap">✅ Dihantar</b>' : `<span style="display:flex;flex-direction:column;gap:4px"><button class="lt-btn" data-bk-hantar="${esc(a.id)}" style="background:#16a34a;color:#fff;border:0;border-radius:10px;padding:10px 12px;font-weight:700;white-space:nowrap;cursor:pointer">📤 Hantar kad</button>
        <button data-bk-sudah="${esc(a.id)}" style="background:#e2e8f0;border:0;border-radius:10px;padding:6px 10px;font-size:12px;cursor:pointer">✓ Sudah dihantar</button></span>`}</div>`; };
    const lukis = () => {
      const t = tapis.trim().toLowerCase(), papar = L.filter(a => !t || (a.nama || '').toLowerCase().includes(t) || (a.plat || []).some(p => p.toLowerCase().includes(t.replace(/\s+/g, ''))));
      const baki = L.filter(a => !siap.has(a.id)).length;
      ctx.buka(`<div class="cp-p"><div class="section-title between"><h3>📋 Belum terima kad (${baki})</h3><button class="small" data-cp-tutup>✕</button></div>
        <p class="muted" style="font-size:13px;margin:4px 0 8px">Ahli yang didaftar di kaunter / dari rekod lama tetapi kad digital Safari Members belum dihantar. Tekan <b>📤 Hantar kad</b> — WhatsApp dibuka dengan pautan kad. Hantar seorang demi seorang.</p>
        <input data-bk-cari placeholder="Tapis nama atau plat" value="${esc(tapis)}" autocomplete="off">
        <div class="cp-hasil">${papar.map(baris).join('') || '<div class="muted">🎉 Semua ahli sudah menerima kad.</div>'}</div></div>`);
      const box = document.querySelector('[data-bk-cari]')?.closest('.cp-p'); if(!box) return;
      box.querySelector('[data-cp-tutup]').onclick = () => { ctx.tutup(); ctx.selepasBelumKad?.(); };
      const inp = box.querySelector('[data-bk-cari]'); inp.oninput = () => { tapis = inp.value; const p = inp.selectionStart; lukis(); const i2 = document.querySelector('[data-bk-cari]'); if(i2){ i2.focus(); i2.setSelectionRange(p, p); } };
      box.querySelectorAll('[data-bk-hantar]').forEach(b => b.onclick = () => { const a = L.find(x => x.id === b.dataset.bkHantar); if(!a) return;
        if(ctx.jemput) ctx.jemput({jenis: 'kad', nama: a.nama, telefon: a.telefon, kod: a.kod, pautan: ctx.pautanKad(a.id)});
        else window.open(`https://wa.me/${a.telefon}?text=${encodeURIComponent(`Salam ${a.nama}, ini kad digital Safari Members anda (${a.kod}) — Mama Lion & Lion King Premium Car Wash.\nBuka & pasang apps: ${ctx.pautanKad(a.id)}\n\nSetiap cucian berbayar = 1 cop. Cop ke-${KAD.ganjaranPada[0]} & ke-${KAD.saiz} = FREE WASH!`)}`, '_blank');
        log(a, 'Hantar kad', 'WhatsApp (senarai belum terima kad)'); tandaKad(a); siap.add(a.id); lukis(); });
      box.querySelectorAll('[data-bk-sudah]').forEach(b => b.onclick = () => { const a = L.find(x => x.id === b.dataset.bkSudah); if(!a || !confirm(`Tanda kad ${a.nama} sudah dihantar (tanpa buka WhatsApp)?`)) return;
        log(a, 'Tanda kad sudah dihantar'); tandaKad(a); siap.add(a.id); lukis(); });
    };
    lukis();
  }

  // Butang ahli dari Queue kaunter: ⭐ cop manual / 📇 kad lama / 👤 profil
  async function aksiAhli(id, jenis, plat){
    let a = null; try{ const s = await fs.getDoc(fs.doc(store, 'ahli', id)); if(s.exists()) a = {id, ...s.data()}; }catch(e){ return ctx.toast('⚠ ' + (e.code || e.message)); }
    if(!a) return ctx.toast('Ahli tidak dijumpai');
    if(jenis === 'cop') return borangCopManual(a, plat);
    if(jenis === 'kadlama'){
      if(a.kadLama) { ctx.toast(`Kad lama ${a.nama || ''} sudah dipindah (${a.kadLama.bilCop} cop). Guna ⭐ +1 Cop untuk cop tertinggal.`); return bukaProfil({ahli: id}); }
      if(!bolehKadLama(a)) { ctx.toast(`Tarikh akhir pindah kad lama (${fT(KAD_LAMA_TAMAT)}) telah lepas — hubungi Dato' / Datin (Akaun)`); return bukaProfil({ahli: id}); }
      return borangKadLama(a);
    }
    return bukaProfil({ahli: id});
  }
  return {htmlKotak, pasang, bukaProfil, profilLama, cari, muatSemula: () => pastikanAhli(true), kiraBelumKad, bukaBelumKad, bukaSenaraiKadLama, aksiAhli};
}
