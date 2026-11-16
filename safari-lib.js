// =====================================================================
// safari-lib.js — Safari Members (loyalty card) dikongsi oleh
// Lion Safari V2 (kaunter), Akaun dan Apps Pelanggan.
//
// Peraturan kad (ditetapkan pemilik):
//   • Kad 10 cop (lalai; tetapan_ahli/kad). Cop ke-5 → 1 Free Wash, cop ke-10 → 1 Free Wash, kad bermula semula.
//   • 1 cop bagi setiap servis pakej BERBAYAR (bukan Free Wash), maksimum 1 cop / plat / hari.
//   • Cop luput 12 bulan selepas diberi. Free Wash luput 12 bulan selepas diperoleh.
//   • Free Wash hanya untuk pakej Basic (pakej yang dipilih Admin dalam Tetapan).
//
// Data: ahli/{token}  (token rahsia 24 aksara = kunci kad digital pelanggan)
//       ahli_telefon/{60xxxxxxxxx} → {token}  (elak daftar berganda)
//       ahli/{token}/sejarah/{orderId}
// =====================================================================

// Tetapan kad loyalti (lalai). Nilai sebenar dari tetapan_ahli/kad (diedit di Apps Akaun → Tetapan Apps → Safari Members).
export const KAD = {saiz: 10, ganjaranPada: [5, 10], tempohCopHari: 365, tempohFreeWashHari: 365,
  pakejAktif: ['p-promo-a'], wajibProfil: true, medanProfil: ['nama', 'emel', 'tarikhLahir'], pakejFreeWash: 'p-ld-silicone'};
export const MEDAN_PROFIL = {nama: 'Nama penuh', emel: 'E-mel', tarikhLahir: 'Tarikh lahir', cawanganUtama: 'Cawangan utama'};
export function terapTetapanKad(d){
  if(!d) return KAD;
  const saiz = Math.max(2, Math.min(20, parseInt(d.saiz) || KAD.saiz));
  const g = (Array.isArray(d.ganjaranPada) ? d.ganjaranPada : []).map(n => parseInt(n)).filter(n => n > 0 && n <= saiz).sort((a,b) => a - b);
  Object.assign(KAD, {saiz, ganjaranPada: g.length ? [...new Set([...g.slice(0, 2), saiz])].slice(-2) : KAD.ganjaranPada,
    pakejAktif: Array.isArray(d.pakejAktif) ? d.pakejAktif : KAD.pakejAktif, wajibProfil: d.wajibProfil !== false,
    medanProfil: Array.isArray(d.medanProfil) ? d.medanProfil.filter(m => MEDAN_PROFIL[m]) : KAD.medanProfil,
    pakejFreeWash: d.pakejFreeWash || KAD.pakejFreeWash});
  return KAD;
}
// Kad aktif: ahli lama yang sudah ada servis/cop dianggap aktif; ahli baru perlu profil lengkap + cucian pertama pakej Promo
export const profilKurang = a => KAD.wajibProfil ? KAD.medanProfil.filter(m => !String(a?.[m] ?? '').trim()) : [];
export const kadAktif = a => a?.kadAktif === true || (a?.kadAktif === undefined && ((a?.jumlahServis || 0) > 0 || (a?.cop || []).length > 0 || (a?.freeWash || []).length > 0));
const HARI_MS = 864e5;

export const normPlat = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const paparPlat = s => String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();
export function normTelefon(s){
  let d = String(s || '').replace(/\D/g, '');
  if(d.startsWith('0')) d = '6' + d;
  else if(d.startsWith('1')) d = '60' + d;
  return d;
}
export const telefonSah = t => /^601\d{8,9}$/.test(t);
export const paparTelefon = t => { t = String(t || ''); return t.startsWith('60') ? '0' + t.slice(2) : t; };

const ABJAD = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function rawak(n, abjad = ABJAD){
  const b = crypto.getRandomValues(new Uint8Array(n));
  return [...b].map(x => abjad[x % abjad.length]).join('');
}
export const buatToken = () => rawak(24, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789');
export const buatKod = () => 'SM' + rawak(6);

export function ahliBaru({nama, telefon, plat = [], kenderaan = [], emel = '', tarikhLahir = '', cawanganUtama = '', setujuPromosi = false, oleh = 'pelanggan'}){
  return {kod: buatKod(), nama, telefon, emel, tarikhLahir, plat, kenderaan, cawanganUtama, setujuPromosi, setujuPDPA: true,
    cop: [], ganjaran: 0, freeWash: [], copTerakhir: {}, kadSelesai: 0, jumlahServis: 0,
    daftarOleh: oleh, daftarMasa: Date.now(), dikemaskini: Date.now()};
}

// Keadaan kad pada masa ini (selepas buang cop luput)
export function keadaanKad(a, kini = Date.now()){
  const had = kini - KAD.tempohCopHari * HARI_MS;
  const cop = (a?.cop || []).filter(c => c.t >= had);
  const fw = (a?.freeWash || []);
  const sedia = fw.filter(f => !f.guna && f.tamat > kini);
  const luput = fw.filter(f => !f.guna && f.tamat <= kini);
  const seterusnya = KAD.ganjaranPada.find(n => n > cop.length) || KAD.saiz;
  return {cop, bil: cop.length, ganjaran: a?.ganjaran || 0, freeWash: sedia, freeWashLuput: luput, digunakan: fw.filter(f => f.guna),
    aktif: kadAktif(a), profilKurang: profilKurang(a),
    lagiUntukGanjaran: Math.max(0, seterusnya - cop.length), copLuputSeterusnya: cop.length ? Math.min(...cop.map(c => c.t)) + KAD.tempohCopHari * HARI_MS : null};
}

// Tambah 1 cop. Pulangkan {ok, sebab?, data (medan untuk dikemas kini), dapatFreeWash}
export function tambahCop(a, {orderId, plat, cawangan, tarikh, pakejId = '', paksa = false, kini = Date.now()}){
  const p = normPlat(plat);
  if((a.copTerakhir || {})[p] === tarikh) return {ok:false, sebab:`Plat ${plat} sudah dapat cop hari ini`};
  const aktifkan = !kadAktif(a);
  if(aktifkan && !paksa){
    const kurang = profilKurang(a);
    if(kurang.length) return {ok:false, sebab:`Kad belum aktif — pelanggan perlu lengkapkan profil (${kurang.map(m => MEDAN_PROFIL[m]).join(', ')}) dalam Apps Pelanggan`};
    if(KAD.pakejAktif.length && !KAD.pakejAktif.includes(pakejId)) return {ok:false, sebab:'Kad belum aktif — cop pertama mesti pakej Promo'};
  }
  const k = keadaanKad(a, kini);
  let cop = [...k.cop, {t: kini, o: orderId, p, c: cawangan}];
  let ganjaran = k.bil === 0 ? 0 : (a.ganjaran || 0);   // semua cop luput = kad bermula semula
  const freeWash = [...(a.freeWash || [])];
  let dapat = 0, kadSelesai = a.kadSelesai || 0;
  const beri = sebab => { freeWash.push({id: 'fw' + kini.toString(36) + rawak(3), t: kini, tamat: kini + KAD.tempohFreeWashHari * HARI_MS, sebab, dariOrder: orderId, cawangan, guna: null}); dapat++; };
  const [g1, g2] = KAD.ganjaranPada.length > 1 ? KAD.ganjaranPada : [KAD.ganjaranPada[0], KAD.ganjaranPada[0]];
  if(g1 !== g2 && cop.length >= g1 && ganjaran < 1){ beri(`Cop ke-${g1}`); ganjaran = 1; }
  if(cop.length >= g2){ beri(`Cop ke-${g2}`); cop = []; ganjaran = 0; kadSelesai++; }
  return {ok:true, dapatFreeWash: dapat, diaktifkan: aktifkan, data: {cop, ganjaran, freeWash, kadSelesai, copTerakhir: {...(a.copTerakhir || {}), [p]: tarikh},
    ...(aktifkan ? {kadAktif: true, kadAktifMasa: kini} : {}),
    jumlahServis: (a.jumlahServis || 0) + 1, dikemaskini: kini}};
}

// Batalkan cop dari order (jika masih dalam kad semasa)
export function batalCop(a, orderId){
  const ada = (a.cop || []).some(c => c.o === orderId);
  if(!ada) return null;
  const cop = a.cop.filter(c => c.o !== orderId);
  let ganjaran = a.ganjaran || 0, freeWash = [...(a.freeWash || [])];
  if(cop.length < KAD.ganjaranPada[0] && ganjaran >= 1){
    const i = freeWash.findIndex(f => f.dariOrder && /^Cop ke-\d+$/.test(f.sebab || '') && f.sebab !== `Cop ke-${KAD.saiz}` && !f.guna && (a.cop || []).some(c => c.o === f.dariOrder));
    if(i >= 0){ freeWash.splice(i, 1); ganjaran = 0; }
  }
  return {cop, ganjaran, freeWash, jumlahServis: Math.max(0, (a.jumlahServis || 1) - 1), dikemaskini: Date.now()};
}

// Guna / pulangkan Free Wash
export function gunaFreeWash(a, fwId, {orderId, cawangan, oleh, kini = Date.now()}){
  const freeWash = (a.freeWash || []).map(f => ({...f}));
  const f = freeWash.find(x => x.id === fwId);
  if(!f) return {ok:false, sebab:'Free Wash tidak dijumpai'};
  if(f.guna) return {ok:false, sebab:'Free Wash sudah digunakan'};
  if(f.tamat <= kini) return {ok:false, sebab:'Free Wash sudah luput'};
  f.guna = {t: kini, o: orderId, c: cawangan, oleh};
  return {ok:true, data: {freeWash, dikemaskini: kini}};
}
export function pulangFreeWash(a, orderId){
  const freeWash = (a.freeWash || []).map(f => f.guna?.o === orderId ? {...f, guna: null} : f);
  return {freeWash, dikemaskini: Date.now()};
}

// =====================================================================
// HARGA IKUT KENDERAAN
// Item (pakej / add-on) boleh ada  hargaIkut: {sedan, suv, mpv, '4x4', dxl}
//   - nilai nombor = harga bagi kenderaan itu
//   - null         = tidak ditawarkan / harga ikut permintaan bagi kenderaan itu
// Tanpa hargaIkut: pakej = harga + tambahan kenderaan, add-on = harga
// =====================================================================
const ada = (o, k) => o && k != null && Object.prototype.hasOwnProperty.call(o, k);
export function hargaPakejK(p, k){
  if(!p) return 0;
  if(ada(p.hargaIkut, k?.id)) return p.hargaIkut[k.id] == null ? null : Number(p.hargaIkut[k.id]) || 0;
  return Math.max(0, (Number(p.harga) || 0) + (Number(k?.harga) || 0));
}
export function hargaAddonK(a, k){
  if(!a) return 0;
  if(ada(a.hargaIkut, k?.id)) return a.hargaIkut[k.id] == null ? null : Number(a.hargaIkut[k.id]) || 0;
  return Number(a.harga) || 0;
}
export const adaMatriks = l => (l || []).some(x => x.hargaIkut);

// Senarai harga rasmi Mama Lion × Lion King (Price List)
const H = (sedan, suv, mpv, x4, dxl) => ({sedan, suv, mpv, '4x4': x4, dxl});
const PROMO_A = 'Luar & dalam (wax shampoo), glass cleaner, water wax, interior wax, spray essential/sanitizes, vacuum & silicone wax tyre';
const PROMO_B = 'Luar & dalam (wax shampoo), glass cleaner, water coating, interior wax, spray essential/sanitizes, vacuum & silicone wax tyre';
const it = (id, nama, kategori, h, extra = {}) => ({id, nama, kategori, harga: h.sedan ?? 0, hargaIkut: h, aktif: true, ...extra});
export const HARGA_RASMI = {
  kenderaan: [{id:'sedan', nama:'Sedan', harga:0, aktif:true}, {id:'suv', nama:'SUV', harga:0, aktif:true}, {id:'mpv', nama:'MPV', harga:0, aktif:true},
    {id:'4x4', nama:'4x4', harga:0, aktif:true}, {id:'dxl', nama:'DXL', harga:0, aktif:true}],
  pakej: [
    it('p-cuci-luar', 'Cuci Luar', 'Cucian', H(20, 25, 35, 35, 45), {minit: 20}),
    it('p-ld-silicone', 'Luar & Dalam + Silicone Tyre', 'Cucian', H(30, 35, 45, 45, 55), {minit: 30}),
    it('p-ld-waterwax', 'Luar & Dalam + Water Wax', 'Cucian', H(50, 60, 75, 75, 85), {minit: 40}),
    it('p-ld-fogging', 'Luar & Dalam + Fogging', 'Cucian', H(90, 95, 105, 105, 130), {minit: 45}),
    it('p-ld-ww-fog', 'Luar & Dalam + Waterwax + Fogging', 'Cucian', H(110, 115, 135, 135, 160), {minit: 50}),
    it('p-ld-vacuum', 'Luar & Dalam + Details Vacuum', 'Cucian', H(70, 95, 105, 105, 130), {minit: 60}),
    it('p-promo-a', 'Promo A (MPC)', 'Promo MPC & Premium', H(50, 70, 90, 90, 110), {ket: PROMO_A}),
    it('p-promo-b', 'Promo B (MPC)', 'Promo MPC & Premium', H(120, 150, 170, 170, 200), {ket: PROMO_B}),
    it('p-premium', 'Premium Wash', 'Promo MPC & Premium', H(95, 130, 140, 140, 160)),
    it('p-water-coating', 'Water Coating', 'Servis', H(100, 120, 140, 140, 160)),
    it('p-interior-wax', 'Interior Wax', 'Servis', H(25, 30, 35, 35, 40)),
    it('p-fogging', 'Fogging', 'Servis', H(60, 60, 60, 60, 80)),
    it('p-vacuum', 'Details Vacuum', 'Servis', H(40, 60, 60, 60, 80)),
    it('p-enjin', 'Cuci Enjin (Biasa)', 'Servis', H(15, 20, 25, 25, 30)),
    it('p-enjin-detail', 'Cuci Enjin (Detail)', 'Servis', H(25, 30, 35, 35, 40)),
    it('p-polish', 'Polish (Company Price)', 'Detailing', H(350, 450, 550, 550, null), {ket: 'DXL: harga seperti permintaan'}),
    it('p-seat-1', 'Seat / Deep Cleaning (Asas)', 'Detailing', H(150, 180, 200, 150, 250)),
    it('p-seat-2', 'Seat / Deep Cleaning (Penuh)', 'Detailing', H(350, 450, 650, 350, 800))
  ],
  addon: [
    it('a-fogging-promo', 'Tambahan Fogging (Promo A / B)', 'Tambahan', H(20, 20, 20, 20, 20)),
    it('a-wax-tyre', 'Wax Tyre (Biasa)', 'Tambahan', H(5, 5, 10, 10, 10)),
    it('a-silicone', 'Silicone Tyre', 'Tambahan', H(10, 10, 15, 15, 15)),
    it('a-waterwax', 'Waterwax', 'Tambahan', H(20, 25, 30, 30, 40)),
    it('a-interior-wax', 'Interior Wax', 'Tambahan', H(25, 30, 35, 35, 40)),
    it('a-water-coating', 'Water Coating', 'Tambahan', H(100, 120, 140, 140, 160)),
    it('a-vacuum', 'Details Vacuum', 'Tambahan', H(40, 60, 60, 60, 80)),
    it('a-enjin', 'Cuci Enjin (Biasa)', 'Tambahan', H(15, 20, 25, 25, 30)),
    it('a-enjin-detail', 'Cuci Enjin (Detail)', 'Tambahan', H(25, 30, 35, 35, 40)),
    it('a-glass-depan', 'Watermark Glass — cermin depan / belakang', 'Watermark Glass Remover', H(60, 60, 60, 60, 60)),
    it('a-glass-sisi', 'Watermark Glass — cermin sisi 1 set', 'Watermark Glass Remover', H(50, 50, 50, 50, 50)),
    it('a-glass-full', 'Watermark Glass — full', 'Watermark Glass Remover', H(200, 200, 200, 200, 200)),
    it('a-lampu-1d', 'Polish Lampu — 1 biji hadapan', 'Polish Lampu', H(60, 60, 60, 60, 60)),
    it('a-lampu-2d', 'Polish Lampu — sepasang hadapan', 'Polish Lampu', H(100, 100, 100, 100, 100)),
    it('a-lampu-1b', 'Polish Lampu — 1 biji belakang', 'Polish Lampu', H(80, 80, 80, 80, 80)),
    it('a-lampu-2b', 'Polish Lampu — sepasang belakang', 'Polish Lampu', H(150, 150, 150, 150, 150))
  ],
  pakejFreeWash: 'p-ld-silicone',
  waktuOperasi: 'Setiap hari 9.00 pagi – 12.00 malam',
  telefon: '011-2141 9604',
  alamat: 'Lot 3 Seksyen 20 (GRN 8392), Jalan Gambut / Tun Ismail 8 / Tun Ismail 10, 25000 Kuantan, Pahang'
};

// =====================================================================
// STATUS KENDERAAN UNTUK APPS PELANGGAN
// ahli/{token}/status/{orderId}: {no, plat, cawangan, pakej, status, jumlah, aktif, masa}
// Ditulis oleh kaunter / Apps Pekerja setiap kali order dibuat, status berubah atau dibayar.
// =====================================================================
export const STATUS_ORDER = ['Menunggu', 'Cuci', 'Kering', 'QC', 'Siap'];
export function dataStatus(o, c, tambah = {}){
  return {no: o.no || '', plat: o.plat || '', cawangan: c, pakej: o.pakej || '', addon: (o.addon || []).map(a => a.nama), status: o.status || 'Menunggu',
    jumlah: Number(o.jumlah) || 0, aktif: o.aktif !== false, bay: o.bay || '', masa: Date.now(), ...tambah};
}

// Gambar asal servis (ilustrasi Mama Lion) — digunakan jika kaunter belum muat naik gambar sendiri
const GAMBAR_ADA = new Set(['a-enjin', 'a-enjin-detail', 'a-fogging-promo', 'a-glass-depan', 'a-glass-full', 'a-glass-sisi', 'a-interior-wax', 'a-lampu-1b', 'a-lampu-1d', 'a-lampu-2b', 'a-lampu-2d', 'a-silicone', 'a-vacuum', 'a-water-coating', 'a-waterwax', 'a-wax-tyre', 'p-cuci-luar', 'p-enjin', 'p-enjin-detail', 'p-fogging', 'p-interior-wax', 'p-ld-fogging', 'p-ld-silicone', 'p-ld-vacuum', 'p-ld-waterwax', 'p-ld-ww-fog', 'p-polish', 'p-premium', 'p-promo-a', 'p-promo-b', 'p-seat-1', 'p-seat-2', 'p-vacuum', 'p-water-coating']);
export const gambarAsal = id => GAMBAR_ADA.has(id) ? new URL(`./gambar-servis/${id}.jpg?f=3`, import.meta.url).href : '';

// ---------- Akaun penerima bayaran (QR DuitNow & bank) ----------
// lionsafari/{cawangan}/tetapan/umum.terimaBayaran = {bank, noAkaun, namaAkaun, qr (dataURL), labelQr, nota, tunjukPelanggan}
// Ditetapkan di Apps Akaun → Tetapan Apps → Kaunter. Dipapar di kaunter (QR / Transfer) & Apps Pelanggan.
export const BANK_MY = ['Maybank', 'CIMB Bank', 'Public Bank', 'RHB Bank', 'Hong Leong Bank', 'AmBank', 'Bank Islam', 'Bank Rakyat', 'BSN', 'Affin Bank', 'Alliance Bank', 'Bank Muamalat', 'OCBC Bank', 'UOB', 'HSBC', 'Standard Chartered', 'Agrobank', 'MBSB Bank'];
const esc_ = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const adaTerimaBayar = B => !!(B && (B.qr || B.noAkaun));
// mod: 'qr' | 'transfer' | 'semua'; jumlah: papar amaun perlu dibayar (pilihan)
export function htmlTerimaBayar(B, {mod = 'semua', jumlah = null, namaKedai = '', fail = 'QR-bayaran'} = {}){
  if(!adaTerimaBayar(B)) return mod === 'semua' ? '' : `<div style="padding:10px;border-radius:12px;background:#fef3c7;color:#92400e;font-size:13px;margin-top:8px">Akaun penerima belum ditetapkan — Admin: Apps Akaun → Tetapan Apps → Kaunter → 💳 Akaun penerima bayaran.</div>`;
  const qr = (mod !== 'transfer') && B.qr, bank = (mod !== 'qr' || !B.qr) && B.noAkaun;
  const noBersih = String(B.noAkaun || '').replace(/\D/g, '');
  return `<div class="terimabayar" style="border:2px solid #14532d;border-radius:16px;padding:12px;margin-top:10px;background:#fff;text-align:center;color:#0f172a">
    ${namaKedai ? `<div style="font-weight:800;color:#14532d">${esc_(namaKedai)}</div>` : ''}
    ${jumlah != null ? `<div style="font-size:13px;color:#64748b">Jumlah perlu dibayar</div><div style="font-size:26px;font-weight:800;color:#14532d">RM ${(+jumlah).toFixed(2)}</div>` : ''}
    ${qr ? `<div style="font-size:13px;font-weight:700;margin-top:4px">${esc_(B.labelQr || 'Imbas DuitNow QR')}</div>
      <img src="${B.qr}" alt="QR bayaran" style="width:100%;max-width:280px;border-radius:10px;margin:6px auto;display:block;background:#fff">
      <a href="${B.qr}" download="${esc_(fail)}.jpg" style="display:inline-block;font-size:13px;padding:6px 12px;border-radius:999px;background:#e2e8f0;color:#0f172a;text-decoration:none">⬇ Simpan QR</a>` : ''}
    ${bank ? `<div style="margin-top:${qr ? 10 : 2}px;padding-top:${qr ? 10 : 0}px;${qr ? 'border-top:1px dashed #cbd5e1' : ''}">
      <div style="font-size:13px;color:#64748b">🏦 ${esc_(B.bank || 'Bank')}</div>
      <div style="font-size:22px;font-weight:800;letter-spacing:1px">${esc_(B.noAkaun)}</div>
      <div style="font-size:13px">${esc_(B.namaAkaun || '')}</div>
      <button type="button" data-salinakaun="${esc_(noBersih)}" style="margin-top:6px;font-size:13px;padding:6px 12px;border-radius:999px;border:0;background:#14532d;color:#fff;cursor:pointer">📋 Salin no. akaun</button></div>` : ''}
    ${B.nota ? `<div style="font-size:12px;color:#64748b;margin-top:8px">${esc_(B.nota)}</div>` : ''}</div>`;
}
export function pasangTerimaBayar(root = document, toast = null){
  root.querySelectorAll('[data-salinakaun]').forEach(b => b.onclick = async () => {
    try{ await navigator.clipboard.writeText(b.dataset.salinakaun); b.textContent = '✅ Disalin'; }
    catch(_){ prompt('Salin no. akaun:', b.dataset.salinakaun); }
    if(toast) toast('No. akaun disalin');
  });
}

// ---------- Diskaun berkuasa & bayaran sendiri oleh pelanggan ----------
// order.diskaunBeri = {amaun, sebab, oleh, olehId, sumber:'akaun'|'pekerja', masa}  (diluluskan; kaunter tidak boleh ubah)
// order.diskaunMinta = {amaun, sebab, oleh, masa}  (permintaan dari kaunter, menunggu kelulusan)
export const DISKAUN_KUASA = [5, 10, 20];   // pekerja kuasa 🎟 boleh lulus terus; jumlah lain: Dato' / Datin di Apps Akaun
const r2_ = n => Math.round((Number(n) || 0) * 100) / 100;
export const itemOrder = o => [[o.pakej, o.hargaPakej], ...(o.tambahanKenderaan ? [[`Kenderaan: ${o.kenderaan}`, o.tambahanKenderaan]] : []), ...(o.addon || []).map(a => [a.nama, a.harga]), ...(o.itemManual || []).map(a => [a.nama, a.harga])];
// lionsafari/{c}/bayar_awam/{normPlat} — cermin order untuk Apps Pelanggan (tanpa nama & telefon), dibaca dengan no. plat
export function dataAwam(o, c){
  const aktif = o.aktif !== false && o.status !== 'Selesai' && o.status !== 'Batal';
  const diskaun = aktif ? (Number(o.diskaunBeri?.amaun) || 0) : (Number(o.diskaun) || 0);
  return {orderId: o.id, no: o.no || '', plat: o.plat || '', kenderaan: o.kenderaan || '', cawangan: c,
    item: itemOrder(o).map(([n, h]) => ({n: String(n || ''), h: Number(h) || 0})), freeWash: !!o.freeWash,
    jumlahKasar: Number(o.jumlahKasar) || 0, diskaun, jumlah: aktif ? Math.max(0, r2_((Number(o.jumlahKasar) || 0) - diskaun)) : (Number(o.jumlah) || 0),
    status: o.status || '', aktif, masa: Date.now()};
}

// ---------- Log masuk ahli: no. telefon + no. kenderaan → token kad ----------
// ahli_masuk/{tel_plat} = {token}. Ditulis semasa daftar / order kaunter / kemas kini profil / segerak harian kaunter.
export const kunciMasuk = (tel, plat) => `${normTelefon(tel)}_${normPlat(plat)}`;
export function dokMasukAhli(a){   // senarai [kunci, {token}] bagi semua kenderaan ahli
  if(!a?.telefon) return [];
  const plat = [...new Set([...(a.plat || []), ...(a.kenderaan || []).map(k => k.plat)].map(normPlat).filter(Boolean))];
  return plat.map(p => [kunciMasuk(a.telefon, p), {token: a.id}]);
}
