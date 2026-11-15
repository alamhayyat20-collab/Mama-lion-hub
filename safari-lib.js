// =====================================================================
// safari-lib.js — Safari Members (loyalty card) dikongsi oleh
// Lion Safari V2 (kaunter), Akaun dan Apps Pelanggan.
//
// Peraturan kad (ditetapkan pemilik):
//   • Kad 8 cop. Cop ke-4 → 1 Free Wash, cop ke-8 → 1 Free Wash, kad bermula semula.
//   • 1 cop bagi setiap servis pakej BERBAYAR (bukan Free Wash), maksimum 1 cop / plat / hari.
//   • Cop luput 12 bulan selepas diberi. Free Wash luput 12 bulan selepas diperoleh.
//   • Free Wash hanya untuk pakej Basic (pakej yang dipilih Admin dalam Tetapan).
//
// Data: ahli/{token}  (token rahsia 24 aksara = kunci kad digital pelanggan)
//       ahli_telefon/{60xxxxxxxxx} → {token}  (elak daftar berganda)
//       ahli/{token}/sejarah/{orderId}
// =====================================================================

export const KAD = {saiz: 8, ganjaranPada: [4, 8], tempohCopHari: 365, tempohFreeWashHari: 365};
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
    lagiUntukGanjaran: Math.max(0, seterusnya - cop.length), copLuputSeterusnya: cop.length ? Math.min(...cop.map(c => c.t)) + KAD.tempohCopHari * HARI_MS : null};
}

// Tambah 1 cop. Pulangkan {ok, sebab?, data (medan untuk dikemas kini), dapatFreeWash}
export function tambahCop(a, {orderId, plat, cawangan, tarikh, kini = Date.now()}){
  const p = normPlat(plat);
  if((a.copTerakhir || {})[p] === tarikh) return {ok:false, sebab:`Plat ${plat} sudah dapat cop hari ini`};
  const k = keadaanKad(a, kini);
  let cop = [...k.cop, {t: kini, o: orderId, p, c: cawangan}];
  let ganjaran = k.bil === 0 ? 0 : (a.ganjaran || 0);   // semua cop luput = kad bermula semula
  const freeWash = [...(a.freeWash || [])];
  let dapat = 0, kadSelesai = a.kadSelesai || 0;
  const beri = sebab => { freeWash.push({id: 'fw' + kini.toString(36) + rawak(3), t: kini, tamat: kini + KAD.tempohFreeWashHari * HARI_MS, sebab, dariOrder: orderId, cawangan, guna: null}); dapat++; };
  if(cop.length >= KAD.ganjaranPada[0] && ganjaran < 1){ beri('Cop ke-4'); ganjaran = 1; }
  if(cop.length >= KAD.ganjaranPada[1]){ beri('Cop ke-8'); cop = []; ganjaran = 0; kadSelesai++; }
  return {ok:true, dapatFreeWash: dapat, data: {cop, ganjaran, freeWash, kadSelesai, copTerakhir: {...(a.copTerakhir || {}), [p]: tarikh},
    jumlahServis: (a.jumlahServis || 0) + 1, dikemaskini: kini}};
}

// Batalkan cop dari order (jika masih dalam kad semasa)
export function batalCop(a, orderId){
  const ada = (a.cop || []).some(c => c.o === orderId);
  if(!ada) return null;
  const cop = a.cop.filter(c => c.o !== orderId);
  let ganjaran = a.ganjaran || 0, freeWash = [...(a.freeWash || [])];
  if(cop.length < KAD.ganjaranPada[0] && ganjaran >= 1){
    const i = freeWash.findIndex(f => f.dariOrder && f.sebab === 'Cop ke-4' && !f.guna && (a.cop || []).some(c => c.o === f.dariOrder));
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
