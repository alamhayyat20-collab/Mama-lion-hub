import { bukaPaparan } from './paparan-lib.js?v=2026.11.29-3';
// =====================================================================
// pekerja-lib.js — modul kongsi untuk Apps Pekerja, Lion Safari V2 & Akaun
// Data: kakitangan/{cawangan}/kehadiran        (punch in/out, tanpa gambar)
//       kakitangan/{cawangan}/kehadiran_gambar (gambar selfie bercap masa, id sama)
//       kakitangan/{cawangan}/permohonan       (advance / claim / OT)
//       kakitangan/{cawangan}/roster/{YYYY-MM-DD}
//       kakitangan/{cawangan}/tetapan/umum     (lokasi kedai & syif)
// Staf (ID, peranan, PIN): lionsafari/{cawangan}/staf
// =====================================================================

// Pekerja dikongsi kedua-dua cawangan: senarai staf & data kakitangan / gaji disimpan di cawangan PUSAT.
// Kaunter (order, bayaran, stok, petty cash) kekal ikut cawangan masing-masing.
export const PUSAT = 'mama-lion';
export const CAW = [{id:'mama-lion', nama:'Mama Lion', kod:'ML'}, {id:'lion-king', nama:'Lion King', kod:'LK'}];
export const namaCaw = c => CAW.find(x => x.id === c)?.nama || c || '';
// Tempat bertugas dalam roster: roster/{tarikh}.tempat[stafId] = {c: cawangan, s: id stesen}
// Stesen punch card ditetapkan pengurusan: kakitangan/PUSAT/tetapan/umum.stesen = [{id, nama, c, kunci}]
export const tempatStaf = (rosterHari, id) => rosterHari?.tempat?.[id] || null;
export function labelTempat(tetapan, t){
  if(!t?.c) return '';
  const st = (tetapan?.stesen || []).find(x => x.id === t.s);
  return `${CAW.find(x => x.id === t.c)?.kod || ''}${st ? ' · ' + st.nama : ''}${t.c2 ? ' → ' + (CAW.find(x => x.id === t.c2)?.kod || '') + ' (petang)' : ''}`;
}
// Duty roster mingguan Nov 2026 (TIMETABLE CREW, HR & Admin, berkuat kuasa 31/10/2026)
// Setiap baris: [Isnin..Ahad] bagi Mama Lion (ml) & Lion King (lk). '' = tidak bertugas di cawangan itu.
// Dua syif sehari (9-6 di satu cawangan + 3-12 di cawangan lain) = syif 9-12 (9 pagi – 12 malam), pagi di cawangan 9-6.
export const SYIF_ROSTER = [
  {kod:'9-6', nama:'Pagi 9-6', mula:'09:00', tamat:'18:00'},
  {kod:'3-12', nama:'Petang 3-12', mula:'15:00', tamat:'24:00'},
  {kod:'9-12', nama:'Penuh 9-12', mula:'09:00', tamat:'24:00'},
  {kod:'SPLIT', nama:'Split 11-3 & 7-12', mula:'11:00', tamat:'24:00'}
];
export const ROSTER_NOV2026 = {
  tajuk: 'Duty Roster Nov 2026', dari: '2026-11-01', hingga: '2026-11-30',
  pengurus: {'mama-lion': 'HAIRUL (ANGAH)', 'lion-king': 'AWIN'},
  jadual: {
    WADI:    {ml:['OFF','9-6','3-12','9-6','','',''],        lk:['','','9-6','3-12','9-6','3-12','9-6']},
    NAZARUL: {ml:['','','OFF','3-12','','9-6','3-12'],       lk:['3-12','3-12','','9-6','3-12','','9-6']},
    HABIB:   {ml:['3-12','3-12','3-12','OFF','','','9-6'],   lk:['9-6','9-6','9-6','','9-6','9-12','3-12']},
    AMIR:    {ml:['9-6','9-6','','9-6','3-12','9-12','3-12'],lk:['','3-12','OFF','3-12','','','9-6']},
    FIZI:    {ml:['9-6','OFF','3-12','3-12','3-12','9-6','9-6'],lk:['3-12','','9-6','9-6','','3-12','3-12']},
    HELMI:   {ml:['3-12','','9-6','3-12','9-6','3-12','3-12'],lk:['9-6','OFF','3-12','9-6','3-12','9-6','']},
    KAZA:    {ml:['','3-12','9-6','9-6','9-6','3-12','9-6'], lk:['OFF','9-6','3-12','3-12','','9-6','3-12']}
  }
};
// Gabung syif sehari seorang pekerja → {kod, tempat:{c, s:'', c2?}}
export function syifRosterHari(baris, i){
  const a = baris.ml[i] || '', b = baris.lk[i] || '';
  const kerja = [[a,'mama-lion'],[b,'lion-king']].filter(([k]) => k && k !== 'OFF');
  if(!kerja.length) return {kod: (a === 'OFF' || b === 'OFF') ? 'OFF' : '', tempat: null};
  if(kerja.length === 1) return {kod: kerja[0][0], tempat: {c: kerja[0][1], s: ''}};
  const pagi = kerja.find(([k]) => k === '9-6') || kerja[0], ptg = kerja.find(x => x !== pagi);
  return {kod: '9-12', tempat: {c: pagi[1], s: '', c2: ptg[1]}};
}
export const kodQRStesen = st => `MLPUNCH:${st.id}:${st.kunci}`;
export const bacaQRStesen = teks => { const m = String(teks || '').match(/MLPUNCH:([A-Za-z0-9_-]+):([A-Za-z0-9]+)/); return m ? {id: m[1], kunci: m[2]} : null; };
// Gaji ikut jam: kadar sejam = gaji pokok bulanan ÷ 30 ÷ 8
export const kadarSejam = pokok => Math.round((Number(pokok) || 0) / 30 / 8 * 100) / 100;
export const JAM_BIASA_SEHARI = 8;
// Jenis pekerja (Akaun → Pekerja → Urus):
//  tetap     — gaji pokok bulanan; dibayar ikut jam bekerja (pokok ÷ 30 ÷ 8 sejam), OT diluluskan
//  pengurusan— gaji bulanan tetap + elaun; tiada OT; boleh "punch bebas"
//  parttime  — kadar sejam terus; dibayar ikut jam bekerja
export const JENIS_PEKERJA = {
  tetap:      {label:'Tetap (gaji ikut jam)', ikon:'👷'},
  pengurusan: {label:'Pengurusan (bulanan + elaun)', ikon:'🧑‍💼'},
  parttime:   {label:'Part-time (kadar sejam)', ikon:'⏱'}
};

export const SYIF_ASAL = [
  {kod:'P', nama:'Pagi', mula:'08:00', tamat:'16:00'},
  {kod:'M', nama:'Petang', mula:'14:00', tamat:'22:00'},
  {kod:'F', nama:'Penuh', mula:'09:00', tamat:'21:00'},
  {kod:'OFF', nama:'Rehat'},
  {kod:'CUTI', nama:'Cuti'}
];
export const JENIS_MOHON = {
  advance: {label:'Advance', ikon:'💸', ket:'Pendahuluan gaji'},
  claim:   {label:'Claim', ikon:'🧾', ket:'Tuntutan perbelanjaan (sertakan resit)'},
  ot:      {label:'Overtime', ikon:'⏱', ket:'Kerja lebih masa'},
  cuti:    {label:'Cuti', ikon:'🌴', ket:'Mohon cuti (tarikh mula hingga tamat)'},
  tukar:   {label:'Tukar syif', ikon:'🔁', ket:'Tukar syif dengan rakan sekerja yang sudah setuju'}
};
// 🧳 Pendahuluan perjalanan / urusan luar — rekod di akaun/syarikat/pendahuluan/{id} (aset semasa, BUKAN gaji).
// Pekerja hantar permohonan jenis pjMohon (minta pendahuluan) & pjTuntut (tuntutan + resit) — diluluskan Dato' / Datin di Apps Akaun.
export const KAT_PJ = 'Perjalanan & Urusan Luar';
export const SUB_PJ = ['Penginapan', 'Petrol & Tol', 'Makan & Minum'];
export const UNIT_PJ = [{id:'mama-lion', nama:'Mama Lion'}, {id:'lion-king', nama:'Lion King'}, {id:'pejabat', nama:'Pejabat / HQ'}, {id:'media', nama:'Pengiklanan & Media'}];
export const JENIS_PJ = {pjMohon: {label:'Pendahuluan perjalanan', ikon:'🧳'}, pjTuntut: {label:'Tuntutan perjalanan', ikon:'🧾'}};
export const STATUS_PJ = {terbuka:'🟢 Terbuka', tuntut:'🟡 Menunggu tuntutan', selesai:'✅ Selesai'};
const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
// Baki = diberi − tuntutan diluluskan − lebihan dipulangkan + bayaran tambahan syarikat
export function kiraPJ(p){
  const t = p?.tuntutan || [], g = p?.selesai || [];
  const jum = l => r2(l.reduce((s, x) => s + (Number(x.amaun) || 0), 0));
  const lulus = t.filter(x => x.status === 'lulus'), tunggu = t.filter(x => x.status === 'menunggu');
  const diberi = r2(p?.amaun), dituntut = jum(lulus), pulang = jum(g.filter(x => x.arah === 'pulang')), bayar = jum(g.filter(x => x.arah === 'bayar'));
  const baki = r2(diberi - dituntut - pulang + bayar);
  const status = p?.ditutup ? 'selesai' : (t.length || g.length) ? 'tuntut' : 'terbuka';
  const umur = p?.tarikh ? Math.max(0, Math.floor((Date.now() - new Date(p.tarikh + 'T00:00:00').getTime()) / 864e5)) : 0;
  return {diberi, dituntut, menunggu: jum(tunggu), bilTunggu: tunggu.length, pulang, bayar, baki, status, umur, lewat: status !== 'selesai' && umur > 30};
}
// Permohonan yang tidak melibatkan wang — boleh diluluskan oleh pengelola (kuasa ✅ / 📅)
export const MOHON_BUKAN_WANG = ['ot', 'cuti', 'tukar'];
// Kuasa pengelola yang ditanda oleh pemilik di Akaun → Pekerja → Urus  (lionsafari/{c}/staf/{id}.kuasa)
export const KUASA = [
  {k:'kaunter', ikon:'💳', label:'Kaunter: queue & bayaran', ket:'Terima tempahan, kemas kini progress servis & terima bayaran dalam Apps Pekerja'},
  {k:'progress', ikon:'🔧', label:'Kemas kini progress servis & gambar kenderaan', ket:'Tukar status (Cuci → Kering → QC → Siap), bay, dan ambil gambar keadaan asal kenderaan dalam Queue'},
  {k:'edit', ikon:'✏️', label:'Edit kenderaan dalam Queue', ket:'Betulkan no. plat, jenis kenderaan, pakej, add-on, item & harga tambahan manual dan catatan sebelum bayaran'},
  {k:'freewash', ikon:'🎁', label:'Tebus Free Wash Safari Members', ket:'Selesaikan order Free Wash ahli dalam Queue Apps Pekerja (sahkan dengan PIN sendiri). Di kaunter, PIN pekerja ini juga diterima untuk tebus Free Wash'},
  {k:'diskaun', ikon:'🎟', label:'Lulus diskaun RM5 / RM10 / RM20', ket:'Beri diskaun terus kepada kenderaan dalam queue (sahkan dengan PIN). Jumlah lain: Dato\' / Datin di Apps Akaun'},
  {k:'tutup',   ikon:'🔐', label:'Tutup kaunter (gambar tunai)', ket:'Ambil gambar wang tunai & kira tunai dalam laci semasa tutup kaunter'},
  {k:'semak',   ikon:'🧮', label:'Semak laporan kewangan', ket:'Semak & sahkan laporan tutup kaunter harian (Daily Sales Report)'},
  {k:'urus',    ikon:'👥', label:'Urus pekerja', ket:'Daftar pekerja baru, ubah maklumat asas, PIN & status (bukan gaji, IC, bank atau kuasa)'},
  {k:'harga',   ikon:'🏷', label:'Harga, pakej & servis', ket:'Buka tab Tetapan di kaunter Lion Safari V2'},
  {k:'roster',  ikon:'📅', label:'Roster & tukar syif', ket:'Susun roster, luluskan tukar syif'},
  {k:'lulus',   ikon:'✅', label:'Lulus OT & cuti', ket:'Luluskan OT dan cuti (bukan advance / claim)'},
  {k:'advance', ikon:'💰', label:'Lulus pendahuluan gaji (advance)', ket:'Had RM200 sebulan bagi setiap pekerja. Lebih had → Dato\' / Datin. Tidak boleh lulus permohonan sendiri. Sahkan dengan PIN'},
  {k:'pindaJam', ikon:'⏱', label:'Pinda jam kerja (cut / tambah jam)', ket:'Pinda jam kerja pekerja untuk 7 hari terakhir dengan sebab wajib. Punch asal kekal. Tidak boleh pinda jam sendiri. Sahkan dengan PIN'},
  {k:'hadir',   ikon:'👀', label:'Lihat kehadiran', ket:'Lihat punch in / out semua pekerja'},
  {k:'info',    ikon:'📢', label:'Memo, peraturan & SOP', ket:'Tulis memo, Buku Peraturan Kerja dan SOP'},
  {k:'promosi', ikon:'🎁', label:'Promosi Apps Pelanggan', ket:'Urus promosi & iklan dalam Apps Pelanggan'},
  {k:'chat',    ikon:'💬', label:'Chat & arahan pemilik', ket:'Terima tugasan & chat terus dengan Dato\' / Datin'},
  {k:'ahli',    ikon:'⭐', label:'Safari Members di kaunter', ket:'Buka tab Safari Members dengan PIN: lihat rekod pelanggan & hantar jemputan keahlian'},
  {k:'buka',    ikon:'🔓', label:'Buka kunci kaunter', ket:'Buka skrin kaunter yang dikunci automatik (ID latihan cth OFFICE) dengan PIN sendiri'}
];
export const adaKuasa = (st, k) => !!st?.kuasa?.[k];
// 👔 Manager: satu butang di Akaun → tanda kuasa ini sekali gus (staf.manager = true)
export const KUASA_MANAGER = ['hadir', 'lulus', 'roster', 'advance', 'pindaJam', 'chat'];
export const HAD_ADVANCE_BULAN = 200;   // RM sebulan bagi setiap pekerja (kelulusan manager)
export const HARI_PINDA = 7;            // manager boleh pinda jam kerja untuk 7 hari terakhir
// ⏱ Pindaan jam kerja: kakitangan/{c}/pinda_jam/{tarikh}__{stafId} = {stafId, tarikh, bulan, minitAsal, minit, sebab, oleh, olehId, masa}
export const idPinda = (tarikh, stafId) => `${tarikh}__${stafId}`;
export const ikonKuasa = st => [st?.mo ? '🧾' : '', ...KUASA.filter(x => st?.kuasa?.[x.k]).map(x => x.ikon)].join('');
export const pengelola = st => ['roster','lulus','hadir','info','promosi','advance','pindaJam'].some(k => st?.kuasa?.[k]);
export const STATUS_MOHON = {menunggu:'⏳ Menunggu', lulus:'✅ Lulus', tolak:'❌ Ditolak'};
const HARI = ['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];
const BLN = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'];

const pad = n => String(n).padStart(2,'0');
export const isoTarikh = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const hariIni = () => isoTarikh(new Date());
export const tambahHari = (t, n) => { const d = new Date(t + 'T12:00:00'); d.setDate(d.getDate() + n); return isoTarikh(d); };
export const isninMinggu = t => { const d = new Date(t + 'T12:00:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return isoTarikh(d); };
export const fTarikhPendek = t => { const d = new Date(t + 'T12:00:00'); return `${['Ahd','Isn','Sel','Rab','Kha','Jum','Sab'][d.getDay()]} ${d.getDate()} ${BLN[d.getMonth()]}`; };
export const fJam = ms => ms ? new Date(ms).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) : '';
export const fMinit = m => { m = Math.max(0, Math.round(m||0)); return `${Math.floor(m/60)}j ${pad(m%60)}m`; };
export const masaMs = r => r?.masa?.toMillis ? r.masa.toMillis() : (r?.masa?.seconds ? r.masa.seconds*1000 : (r?.masaPeranti || 0));
export const syifDari = (tetapan, kod) => (tetapan?.syif?.length ? tetapan.syif : SYIF_ASAL).find(s => s.kod === kod);
export const senaraiSyif = tetapan => tetapan?.syif?.length ? tetapan.syif : SYIF_ASAL;

// Jarak dua titik GPS (meter)
export function jarakMeter(a, b){
  if(!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371000, r = x => x * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat/2)**2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng/2)**2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// Jam kerja sehari: pasangkan masuk → keluar ikut masa
export function jamKerja(rekod){
  const l = [...rekod].sort((a,b) => masaMs(a) - masaMs(b));
  let minit = 0, buka = null; const pasangan = [];
  for(const r of l){
    if(r.jenis === 'masuk'){ if(!buka) buka = r; }
    else if(r.jenis === 'keluar' && buka){ const m = (masaMs(r) - masaMs(buka)) / 60000; minit += m; pasangan.push([buka, r, m]); buka = null; }
  }
  const berjalan = buka ? Math.max(0, (Date.now() - masaMs(buka)) / 60000) : 0;   // minit sesi yang masih dibuka
  return {minit, berjalan, pasangan, masihMasuk: !!buka, masuk: l.find(r => r.jenis === 'masuk'), keluar: [...l].reverse().find(r => r.jenis === 'keluar'), rekod: l};
}

// Minit lewat berbanding masa mula syif
export function minitLewat(masuk, tarikh, syif){
  if(!masuk || !syif?.mula) return 0;
  const [h, m] = syif.mula.split(':').map(Number);
  const mula = new Date(tarikh + 'T00:00:00'); mula.setHours(h, m, 0, 0);
  return Math.max(0, Math.round((masaMs(masuk) - mula.getTime()) / 60000));
}

// Kecilkan gambar & cetak cap masa / ID / GPS pada gambar
export async function capGambar(fail, baris, maks = 640, kualiti = 0.62){
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(fail); });
  const s = Math.min(1, maks / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width*s); c.height = Math.round(img.height*s);
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
  if(baris?.length){
    const fs = Math.max(13, Math.round(c.width / 30)), lh = Math.round(fs * 1.3), h = lh * baris.length + 12;
    x.fillStyle = 'rgba(0,0,0,.62)'; x.fillRect(0, c.height - h, c.width, h);
    x.fillStyle = '#fff'; x.font = `bold ${fs}px system-ui, Arial`; x.textBaseline = 'top';
    baris.forEach((t, i) => x.fillText(t, 8, c.height - h + 6 + i*lh, c.width - 16));
  }
  return c.toDataURL('image/jpeg', kualiti);
}

// =====================================================================
// MODUL PENGURUSAN (dipakai dalam Lion Safari V2 & Akaun)
// ctx = {store, fs, cawangan(), pengguna(), esc, RM, toast, refresh(), bolehTetapan, kehadiranBulan}
// =====================================================================
export function modulPengurusan(ctx){
  const {store, fs, esc, RM} = ctx;
  const C = n => fs.collection(store, 'kakitangan', ctx.cawangan(), n);
  let unsub = [], unsubTarikh = null, unsubMinggu = null, unsubBulan = [];
  const st = {staf:[], tetapan:{}, menunggu:[], mohonBulan:[], hadir:[], hadirBulan:[], roster:{}, pinda:{}, pindaBulan:{}, pindaBuka:null, tarikh: hariIni(), minggu: isninMinggu(hariIni()), bulan: hariIni().slice(0,7), ralat:''};
  const gambar = {};
  const err = e => { console.error(e); st.ralat = e.code === 'permission-denied' ? 'Firebase menolak akses data kakitangan — Firestore Rules perlu dikemas kini (blok "kakitangan").' : 'Ralat: ' + (e.message || e); ctx.refresh(); };
  const stop = () => { [...unsub, unsubTarikh, unsubMinggu, ...unsubBulan].forEach(f => f && f()); unsub = []; unsubTarikh = unsubMinggu = null; unsubBulan = []; };
  const LAMA = {Pengurus:'Admin', Juruwang:'Cashier'};

  function mula(bulan){
    stop(); st.ralat = ''; st.staf = []; st.menunggu = []; st.roster = {}; st.hadir = []; st.mohonBulan = []; st.hadirBulan = [];
    if(bulan) st.bulan = bulan;
    unsub.push(fs.onSnapshot(fs.collection(store, 'lionsafari', ctx.cawangan(), 'staf'), s => {
      st.staf = s.docs.map(d => { const x = {id:d.id, ...d.data()}; x.peranan = LAMA[x.peranan] || x.peranan; return x; })
        .sort((a,b) => String(a.idStaf||'zz').localeCompare(String(b.idStaf||'zz'))); ctx.refresh(); }, err));
    unsub.push(fs.onSnapshot(fs.doc(C('tetapan'), 'umum'), s => { st.tetapan = s.exists() ? s.data() : {}; ctx.refresh(); }, err));
    unsub.push(fs.onSnapshot(fs.query(C('permohonan'), fs.where('status','==','menunggu')), s => { st.menunggu = s.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b) => masaMs(a) - masaMs(b)); ctx.refresh(); }, err));
    langganTarikh(); langganMinggu(); langganBulan();
  }
  function langganTarikh(){
    if(unsubTarikh) unsubTarikh();
    const u1 = fs.onSnapshot(fs.query(C('kehadiran'), fs.where('tarikh','==',st.tarikh)), s => { st.hadir = s.docs.map(d => ({id:d.id, ...d.data()})); ctx.refresh(); }, err);
    const u2 = fs.onSnapshot(fs.query(C('pinda_jam'), fs.where('tarikh','==',st.tarikh)), s => { st.pinda = Object.fromEntries(s.docs.map(d => [d.data().stafId, d.data()])); ctx.refresh(); }, e => console.warn('pinda_jam', e));
    unsubTarikh = () => { u1(); u2(); };
  }
  function langganMinggu(){
    if(unsubMinggu) unsubMinggu();
    unsubMinggu = fs.onSnapshot(fs.query(C('roster'), fs.where('tarikh','>=',tambahHari(st.minggu,-7)), fs.where('tarikh','<=',tambahHari(st.minggu,13))), s => {
      st.roster = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); ctx.refresh(); }, err);
  }
  function langganBulan(){
    unsubBulan.forEach(f => f && f()); unsubBulan = [];
    unsubBulan.push(fs.onSnapshot(fs.query(C('permohonan'), fs.where('bulan','==',st.bulan)), s => { st.mohonBulan = s.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b) => masaMs(b) - masaMs(a)); ctx.refresh(); }, err));
    if(ctx.kehadiranBulan){ unsubBulan.push(fs.onSnapshot(fs.query(C('kehadiran'), fs.where('bulan','==',st.bulan)), s => { st.hadirBulan = s.docs.map(d => ({id:d.id, ...d.data()})); ctx.refresh(); }, err));
      unsubBulan.push(fs.onSnapshot(fs.query(C('pinda_jam'), fs.where('bulan','==',st.bulan)), s => { st.pindaBulan = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); ctx.refresh(); }, e => console.warn('pinda_jam', e))); }
  }
  function setBulan(b){ if(b && b !== st.bulan){ st.bulan = b; langganBulan(); } }

  const namaStaf = id => { const s = st.staf.find(x => x.id === id); return s ? `${s.idStaf ? s.idStaf + ' ' : ''}${s.nama}` : '(tiada)'; };
  const syifStaf = (tarikh, id) => st.roster[tarikh]?.syif?.[id] || '';
  const stesenCaw = c => (st.tetapan.stesen || []).filter(x => x.c === c);

  // Ringkasan bulan seorang staf (untuk gaji di Akaun)
  function ringkasStaf(id){
    const lulus = st.mohonBulan.filter(m => m.stafId === id && m.status === 'lulus');
    const j = k => lulus.filter(m => m.jenis === k);
    const hari = {}; st.hadirBulan.filter(r => r.stafId === id).forEach(r => (hari[r.tarikh] ||= []).push(r));
    let minit = 0, lewatKali = 0, lewatMinit = 0, minitBayar = 0; const ikutCaw = {};
    for(const [t, l] of Object.entries(hari)){
      const k = jamKerja(l), pd = st.pindaBulan[idPinda(t, id)], mHari = pd ? Number(pd.minit) || 0 : k.minit;   // ⏱ pindaan manager / pemilik
      minit += mHari; minitBayar += Math.min(mHari, JAM_BIASA_SEHARI * 60);
      for(const [m, kl, mm] of k.pasangan){ const c = m.cawangan || PUSAT; ikutCaw[c] = (ikutCaw[c] || 0) + mm; }
      const lw = minitLewat(k.masuk, t, syifDari(st.tetapan, syifStaf(t, id))); if(lw > 5){ lewatKali++; lewatMinit += lw; }
    }
    const pindaan = Object.values(st.pindaBulan).filter(p => p.stafId === id);
    return {pindaan, advance: j('advance').reduce((t,m) => t + (Number(m.amaunLulus ?? m.amaun)||0), 0), claim: j('claim').reduce((t,m) => t + (Number(m.amaunLulus ?? m.amaun)||0), 0),
      otJam: j('ot').reduce((t,m) => t + (Number(m.jamLulus ?? m.jam)||0), 0), hariHadir: Object.keys(hari).length, minit, minitBayar, ikutCaw, lewatKali, lewatMinit, permohonan: lulus};
  }

  // ---------------- Paparan ----------------
  const tabMod = (mod, mods) => `<div class="km-sub">${mods.map(m => `<button class="${m===mod?'km-on':''}" data-km-mod="${m}">${m}${m==='Permohonan' && st.menunggu.length ? ` <span class="km-badge">${st.menunggu.length}</span>` : ''}</button>`).join('')}</div>`;
  const ralatHtml = () => st.ralat ? `<div class="km-notice km-bad">⚠ ${esc(st.ralat)}</div>` : '';

  function viewKehadiran(){
    const aktif = st.staf.filter(s => s.aktif !== false);
    const ikut = {}; st.hadir.forEach(r => (ikut[r.stafId] ||= []).push(r));
    const ids = [...new Set([...aktif.map(s => s.id), ...Object.keys(ikut)])];
    const kedai = st.tetapan.lokasi;
    const baris = ids.map(id => {
      const s = st.staf.find(x => x.id === id) || {nama:'(staf dipadam)'}, l = ikut[id] || [], k = jamKerja(l);
      const kod = syifStaf(st.tarikh, id), sy = syifDari(st.tetapan, kod);
      const lw = minitLewat(k.masuk, st.tarikh, sy), pd = st.pinda[id], bolehP = !!ctx.bolehPinda?.(id, st.tarikh) && (l.length || pd) && !(k.masihMasuk && st.tarikh === hariIni());
      if(!l.length && !pd && (!kod || ['OFF','CUTI'].includes(kod))) return null;
      return `<div class="km-row"><div class="km-nm"><b>${esc(s.idStaf||'')} ${esc(s.nama)}</b>
        <small>${sy ? `${esc(sy.nama)}${sy.mula ? ` ${sy.mula}–${sy.tamat}` : ''}` : 'Tiada syif'}${tempatStaf(st.roster[st.tarikh], id) ? ' @ ' + esc(labelTempat(st.tetapan, tempatStaf(st.roster[st.tarikh], id))) : ''}</small>
        ${l.length ? '' : (sy?.mula ? '<span class="km-tag km-bad">Belum / tidak hadir</span>' : '')}
        ${lw > 5 ? `<span class="km-tag km-warn">Lewat ${lw} min</span>` : ''}
        ${k.masihMasuk && st.tarikh === hariIni() ? '<span class="km-tag km-ok">Sedang bekerja</span>' : ''}
        ${l.length && !pd ? `<small>Jam kerja: <b>${fMinit(k.minit + (st.tarikh === hariIni() ? k.berjalan : 0))}</b>${k.masihMasuk && st.tarikh === hariIni() ? ' (termasuk sesi sedang berjalan)' : ''}</small>` : ''}
        ${pd ? `<small>Jam kerja: <b>${fMinit(pd.minit)}</b> <span class="km-tag km-warn">⏱ dipinda</span> asal ${fMinit(pd.minitAsal)} · oleh ${esc(pd.oleh || '')}<br>Sebab: ${esc(pd.sebab || '')}</small>` : ''}
        ${bolehP ? (st.pindaBuka?.id === id ? borangPinda(id, k, pd) : `<button class="km-btn" data-km-pinda="${id}" style="margin-top:4px">⏱ Pinda jam</button>`) : ''}</div>
        <div class="km-pics">${k.rekod.map(r => { const jr = r.jarak ?? jarakMeter(r.gps, kedai); const luar = kedai && jr != null && jr > (Number(st.tetapan.radius)||200);
          return `<div class="km-pic"><img data-km-img="${r.id}" alt=""><span class="km-tag ${r.jenis==='masuk'?'km-ok':''}">${r.jenis==='masuk'?'MASUK':'KELUAR'} ${fJam(masaMs(r))}</span>
          <small>${r.stesenNama ? `${esc((CAW.find(c => c.id === r.cawangan)?.kod || '') + ' · ' + r.stesenNama)}${r.bukanJadual ? ' <b class="km-merah">bukan jadual</b>' : ''}<br>` : r.bebas ? 'Punch bebas<br>' : ''}${r.gps ? `📍${jr != null ? jr + 'm' : 'GPS'}${luar && !r.stesenNama ? ' <b class="km-merah">LUAR</b>' : ''}` : '📍 tiada GPS'}</small></div>`; }).join('')}</div></div>`;
    }).filter(Boolean);
    return `<div class="km-card"><div class="km-between"><h3>🕘 Kehadiran</h3><input type="date" data-km-tarikh value="${st.tarikh}"></div>
      ${!kedai ? '<div class="km-notice">Lokasi kedai belum ditetapkan — jarak GPS tidak dapat disemak (Akaun → Pekerja → Tetapan Pekerja).</div>' : ''}
      ${baris.join('') || '<p class="km-muted">Tiada rekod / roster untuk tarikh ini.</p>'}</div>`;
  }

  function borangPinda(id, k, pd){
    const b = st.pindaBuka, asal = pd ? pd.minitAsal : Math.round(k.minit), kini = b.minit ?? (pd ? pd.minit : asal);
    return `<div class="km-card" style="margin-top:6px;border:2px solid #d7b25a"><b>⏱ Pinda jam kerja — ${esc(namaStaf(id))} · ${fTarikhPendek(st.tarikh)}</b>
      <div class="km-muted">Jam asal (punch): <b>${fMinit(asal)}</b>. Punch asal tidak dipadam.</div>
      <div class="km-two"><div><label>Jam</label><input data-kp-jam data-kekal="1" type="number" inputmode="numeric" min="0" max="16" value="${Math.floor(kini / 60)}"></div>
        <div><label>Minit</label><input data-kp-min data-kekal="1" type="number" inputmode="numeric" min="0" max="59" step="5" value="${Math.round(kini % 60)}"></div></div>
      <label>Sebab pindaan *</label><textarea data-kp-sebab rows="2" placeholder="cth: lupa punch out, keluar 6:00 petang / balik awal tanpa kebenaran">${esc(b.sebab || '')}</textarea>
      <div class="km-rowbtn" style="margin-top:6px"><button class="km-btn km-primary" data-kp-simpan="${id}">💾 Simpan pindaan</button><button class="km-btn" data-kp-batal>Batal</button></div></div>`;
  }
  async function simpanPinda(id){
    const b = st.pindaBuka; if(!b || b.id !== id) return;
    const jam = parseInt(document.querySelector('[data-kp-jam]')?.value) || 0, mn = parseInt(document.querySelector('[data-kp-min]')?.value) || 0;
    const minit = jam * 60 + mn, sebab = (document.querySelector('[data-kp-sebab]')?.value || '').trim();
    if(jam < 0 || jam > 16 || mn < 0 || mn > 59) return ctx.toast('Jam / minit tidak sah');
    if(sebab.length < 5) return ctx.toast('Sila tulis sebab pindaan');
    if(!ctx.bolehPinda?.(id, st.tarikh)) return ctx.toast('Anda tiada kuasa meminda jam ini');
    const l = st.hadir.filter(r => r.stafId === id), pd = st.pinda[id], asal = pd ? pd.minitAsal : Math.round(jamKerja(l).minit);
    if(minit === (pd ? pd.minit : asal)) return ctx.toast('Tiada perubahan');
    if(ctx.sahkanPin && !(await ctx.sahkanPin(`Pinda jam ${namaStaf(id)}: ${fMinit(asal)} → ${fMinit(minit)}`))) return;
    try{
      await fs.setDoc(fs.doc(C('pinda_jam'), idPinda(st.tarikh, id)), {stafId: id, tarikh: st.tarikh, bulan: st.tarikh.slice(0,7), minitAsal: asal, minit, sebab,
        arah: minit < asal ? 'kurang' : 'tambah', oleh: ctx.pengguna(), masa: fs.serverTimestamp(), ...(ctx.tanda ? ctx.tanda() : {olehId: 'akaun'})});
      if(ctx.log) ctx.log('Pinda jam kerja', `${namaStaf(id)} · ${st.tarikh} · ${fMinit(asal)} → ${fMinit(minit)} · ${sebab}`);
      st.pindaBuka = null; ctx.toast('✅ Jam kerja dipinda & direkod'); ctx.refresh();
    }catch(e){ err(e); }
  }

  function kadMohon(m, bolehLulus){
    const J = JENIS_MOHON[m.jenis] || JENIS_PJ[m.jenis] || {label:m.jenis, ikon:''};
    const pj = !!JENIS_PJ[m.jenis];
    const nilai = m.jenis === 'ot' ? `${m.jamLulus ?? m.jam} jam${m.jamLulus != null && m.jamLulus != m.jam ? ` (mohon ${m.jam})` : ''}`
      : m.jenis === 'cuti' ? `${fTarikhPendek(m.tarikh)}${m.hingga && m.hingga !== m.tarikh ? ' – ' + fTarikhPendek(m.hingga) : ''}`
      : m.jenis === 'tukar' ? `dengan ${esc(m.denganNama || namaStaf(m.denganId))}`
      : `${RM(m.amaunLulus ?? m.amaun)}${m.amaunLulus != null && m.amaunLulus != m.amaun ? ` (mohon ${RM(m.amaun)})` : ''}`;
    bolehLulus = bolehLulus && !pj && (ctx.bolehLulus ? ctx.bolehLulus(m) : true);
    return `<div class="km-row"><div class="km-nm"><b>${J.ikon} ${J.label} — ${esc(namaStaf(m.stafId))}</b>
      <small>${m.tarikh ? fTarikhPendek(m.tarikh) + ' · ' : ''}${esc(m.sebab||'')}${m.kategori ? ' · ' + esc(m.kategori) : ''}${m.sub ? ' · ' + esc(m.sub) : ''}</small>
      ${pj && m.status === 'menunggu' ? '<small><b>Diluluskan di Apps Akaun → 🧳 Pendahuluan perjalanan</b></small>' : ''}
      <small>Dihantar ${new Date(masaMs(m)).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}${m.diprosesOleh ? ` · ${m.status==='lulus'?'Diluluskan':'Ditolak'} oleh ${esc(m.diprosesOleh)}` : ''}${m.catatanLulus ? ' · ' + esc(m.catatanLulus) : ''}</small>
      ${m.resit ? `<img class="km-resit" src="${m.resit}" alt="resit">` : ''}</div>
      <div class="km-aksi"><b>${nilai}</b><span class="km-tag">${STATUS_MOHON[m.status] || m.status}</span>
      ${bolehLulus && m.status === 'menunggu' ? `<button class="km-btn km-ok" data-km-lulus="${m.id}">Lulus</button><button class="km-btn km-bad" data-km-tolak="${m.id}">Tolak</button>` : ''}</div></div>`;
  }
  function viewPermohonan(){
    const lain = st.mohonBulan.filter(m => m.status !== 'menunggu');
    return `<div class="km-card"><h3>⏳ Menunggu kelulusan (${st.menunggu.length})</h3>${st.menunggu.map(m => kadMohon(m, true)).join('') || '<p class="km-muted">Tiada permohonan baru.</p>'}</div>
      <div class="km-card"><h3>Diproses — ${BLN[+st.bulan.slice(5,7)-1]} ${st.bulan.slice(0,4)}</h3>${lain.map(m => kadMohon(m, false)).join('') || '<p class="km-muted">Tiada.</p>'}</div>`;
  }

  function viewRoster(){
    const hari = Array.from({length:7}, (_,i) => tambahHari(st.minggu, i));
    const aktif = st.staf.filter(s => s.aktif !== false), SY = senaraiSyif(st.tetapan);
    return `<div class="km-card"><div class="km-between"><h3>📅 Duty Roster</h3>
      <div class="km-rowbtn"><button class="km-btn" data-km-minggu="-7">◀</button><b>${fTarikhPendek(hari[0])} – ${fTarikhPendek(hari[6])}</b><button class="km-btn" data-km-minggu="7">▶</button></div></div>
      <div class="km-muted">${SY.map(s => `<b>${esc(s.kod)}</b> ${esc(s.nama)}${s.mula ? ` ${s.mula}–${s.tamat}` : ''}`).join(' · ')}</div>
      <div class="km-scroll"><table class="km-roster"><tr><th>Staf</th>${hari.map(t => `<th class="${t===hariIni()?'km-today':''}">${fTarikhPendek(t).replace(' ','<br>')}</th>`).join('')}</tr>
      ${aktif.map(s => `<tr><td><b>${esc(s.idStaf||'')}</b><br><small>${esc(s.nama)}</small></td>${hari.map(t => { const k = syifStaf(t, s.id);
        const tp = tempatStaf(st.roster[t], s.id), tv = tp?.c ? `${tp.c}|${tp.s || ''}` : '', rehat = ['OFF','CUTI'].includes(k);
        return `<td class="${t===hariIni()?'km-today':''}"><select data-km-syif="${t}|${s.id}" class="km-s-${esc(k||'kosong')}"><option value="">–</option>${SY.map(x => `<option ${x.kod===k?'selected':''} value="${esc(x.kod)}">${esc(x.kod)}</option>`).join('')}</select>
          ${k && !rehat ? `<select data-km-tempat="${t}|${s.id}" class="km-tempat"><option value="">tempat?</option>${CAW.map(c => `<option value="${c.id}|" ${tv === c.id + '|' ? 'selected' : ''}>${c.kod}</option>${stesenCaw(c.id).map(x => `<option value="${c.id}|${esc(x.id)}" ${tv === c.id + '|' + x.id ? 'selected' : ''}>${c.kod} · ${esc(x.nama)}</option>`).join('')}`).join('')}</select>${tp?.c2 ? `<small style="display:block">→ ${CAW.find(c => c.id === tp.c2)?.kod || ''} petang</small>` : ''}` : ''}</td>`; }).join('')}</tr>`).join('')}</table></div>
      <div class="km-muted">Setiap sel: <b>syif</b> dan <b>tempat bertugas</b> (cawangan · stesen). Pekerja punch dengan mengimbas QR stesen itu.</div>
      <div class="km-rowbtn" style="margin-top:8px"><button class="km-btn" data-km-salin>📋 Salin roster minggu lepas</button><button class="km-btn km-primary" data-km-imbuka>📥 Masukkan ${esc(ROSTER_NOV2026.tajuk)}</button></div>
      ${st.importBuka ? viewImport() : ''}
      <div class="km-muted">Perubahan disimpan serta-merta dan terus dilihat pekerja dalam Apps Pekerja.</div></div>`;
  }

  function tekaStaf(nama){
    const n = nama.toLowerCase(), aktif = st.staf.filter(s => s.aktif !== false);
    return (aktif.find(s => String(s.nama||'').toLowerCase().split(/[\s()]+/).includes(n)) || aktif.find(s => String(s.nama||'').toLowerCase().includes(n)))?.id || '';
  }
  function viewImport(){
    if(!st.peta) st.peta = Object.fromEntries(Object.keys(ROSTER_NOV2026.jadual).map(n => [n, tekaStaf(n)]));
    const aktif = st.staf.filter(s => s.aktif !== false), H = ['Isn','Sel','Rab','Kha','Jum','Sab','Aha'];
    return `<div class="km-card" style="border:2px solid #d7b25a;margin-top:10px"><h3>📥 ${esc(ROSTER_NOV2026.tajuk)} (${fTarikhPendek(ROSTER_NOV2026.dari)} – ${fTarikhPendek(ROSTER_NOV2026.hingga)})</h3>
      <div class="km-muted">Padankan nama dalam jadual dengan pekerja dalam apps. Jadual mingguan diulang setiap minggu. Dua syif sehari di dua cawangan = <b>9-12</b> (pagi di cawangan 9-6, petang di cawangan lain).</div>
      <div class="km-scroll"><table class="km-roster"><tr><th>Nama jadual</th><th>Pekerja dalam apps</th>${H.map(h => `<th>${h}</th>`).join('')}</tr>
      ${Object.entries(ROSTER_NOV2026.jadual).map(([n, b]) => `<tr><td><b>${n}</b></td><td><select data-km-peta="${n}"><option value="">— tidak dimasukkan —</option>${aktif.map(s => `<option value="${s.id}" ${st.peta[n] === s.id ? 'selected' : ''}>${esc(s.idStaf||'')} ${esc(s.nama)}</option>`).join('')}</select></td>
        ${H.map((_, i) => { const r = syifRosterHari(b, i); return `<td class="km-s-${esc(r.kod||'kosong')}"><b>${esc(r.kod || '–')}</b>${r.tempat ? `<br><small>${labelTempat(st.tetapan, r.tempat).replace(' (petang)','')}</small>` : ''}</td>`; }).join('')}</tr>`).join('')}</table></div>
      <div class="km-muted">Pengurus operasi: ML ${esc(ROSTER_NOV2026.pengurus['mama-lion'])} · LK ${esc(ROSTER_NOV2026.pengurus['lion-king'])} (tiada syif dalam jadual — guna punch bebas).</div>
      <div class="km-rowbtn" style="margin-top:8px"><button class="km-btn km-primary" data-km-imlaksana>✅ Masukkan ke roster</button><button class="km-btn" data-km-imtutup>Tutup</button></div></div>`;
  }
  async function laksanaImport(){
    const peta = Object.entries(st.peta || {}).filter(([, id]) => id);
    if(!peta.length) return ctx.toast('Padankan sekurang-kurangnya seorang pekerja');
    if(new Set(peta.map(x => x[1])).size !== peta.length) return ctx.toast('Seorang pekerja dipadankan kepada dua nama');
    if(!confirm(`Masukkan roster untuk ${peta.length} pekerja dari ${ROSTER_NOV2026.dari} hingga ${ROSTER_NOV2026.hingga}? Syif sedia ada pekerja ini dalam tempoh itu akan ditimpa.`)) return;
    try{
      const ada = senaraiSyif(st.tetapan), baru = SYIF_ROSTER.filter(x => !ada.some(y => y.kod === x.kod));
      if(baru.length) await fs.setDoc(fs.doc(C('tetapan'), 'umum'), {syif: [...ada, ...baru], dikemaskiniOleh: ctx.pengguna()}, {merge:true}).catch(e => console.warn('syif', e));
      let t = ROSTER_NOV2026.dari, n = 0;
      while(t <= ROSTER_NOV2026.hingga){
        const i = (new Date(t + 'T00:00:00').getDay() + 6) % 7, syif = {}, tempat = {};
        for(const [nm, id] of peta){ const r = syifRosterHari(ROSTER_NOV2026.jadual[nm], i); syif[id] = r.kod; tempat[id] = r.tempat; }
        await fs.setDoc(fs.doc(C('roster'), t), {tarikh: t, bulan: t.slice(0,7), syif, tempat, dikemaskiniOleh: ctx.pengguna(), ...(ctx.tanda ? ctx.tanda() : {})}, {merge:true});
        t = tambahHari(t, 1); n++;
      }
      if(ctx.log) ctx.log('Masukkan roster', `${ROSTER_NOV2026.tajuk} · ${peta.length} pekerja · ${n} hari`);
      st.importBuka = false; ctx.toast(`✅ Roster ${n} hari dimasukkan untuk ${peta.length} pekerja`); ctx.refresh();
    }catch(e){ err(e); }
  }

  function viewTetapan(){
    const t = st.tetapan, l = t.lokasi || {};
    return `<div class="km-card"><h3>📍 Lokasi kedai (semakan GPS)</h3>
      <div class="km-two"><div><label>Latitud</label><input id="kmLat" value="${l.lat ?? ''}" inputmode="decimal"></div><div><label>Longitud</label><input id="kmLng" value="${l.lng ?? ''}" inputmode="decimal"></div>
      <div><label>Radius dibenarkan (meter)</label><input id="kmRad" value="${t.radius ?? 200}" inputmode="numeric"></div></div>
      <button class="km-btn" data-km-lokasisaya>📍 Guna lokasi saya sekarang (buat di kedai)</button></div>
      <div class="km-card"><h3>🕘 Syif kerja</h3><div class="km-muted">Satu baris setiap syif: <b>Kod | Nama | Mula | Tamat</b> (masa kosong untuk rehat/cuti)</div>
      <textarea id="kmSyif" rows="6">${esc(senaraiSyif(t).map(s => [s.kod, s.nama, s.mula||'', s.tamat||''].join(' | ')).join('\n'))}</textarea></div>
      <div class="km-card"><h3>🔐 Tutup kaunter & bayaran staf</h3><div class="km-two"><div><label>Modal float laci</label><div class="km-muted">Kini ditetapkan di Apps Akaun → Laporan Harian → kad 💵 Float laci (ikut cawangan, dengan sebab pembetulan).</div></div>
        <div><label>Hari bayaran mingguan (komisen & part-time)</label><select id="kmHariBayar">${['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'].map((h,i) => `<option value="${i}" ${i === Number(t.hariBayarMingguan ?? 0) ? 'selected' : ''}>${h}</option>`).join('')}</select></div></div>
        <div class="km-muted">Cara bayaran setiap pekerja (Bulanan / Mingguan / Harian) ditetapkan dalam borang pekerja. Bayaran harian & mingguan diambil dari laci semasa tutup kaunter dan ditolak daripada gaji bulanan.</div></div>
      <button class="km-btn km-primary km-big" data-km-simpantetapan>SIMPAN TETAPAN PEKERJA</button>`;
  }

  function html(mod, mods){
    const v = ({'Kehadiran':viewKehadiran, 'Permohonan':viewPermohonan, 'Roster':viewRoster, 'Tetapan Pekerja':viewTetapan})[mod] || viewKehadiran;
    return tabMod(mod, mods) + ralatHtml() + v();
  }

  // ---------------- Tindakan ----------------
  async function proses(id, lulus){
    const m = st.menunggu.find(x => x.id === id); if(!m) return;
    if(JENIS_PJ[m.jenis]) return ctx.toast('Lulus di Akaun → 🧳 Pendahuluan perjalanan');
    if(ctx.bolehLulus && !ctx.bolehLulus(m)) return ctx.toast('Anda tiada kuasa meluluskan permohonan ini');
    const d = {status: lulus ? 'lulus' : 'tolak', diprosesOleh: ctx.pengguna(), diproses: fs.serverTimestamp(), ...(ctx.tanda ? ctx.tanda() : {})};
    const pinOk = async () => !ctx.sahkanPin || await ctx.sahkanPin(`${lulus ? 'Lulus' : 'Tolak'} ${JENIS_MOHON[m.jenis]?.label || m.jenis} — ${namaStaf(m.stafId)}${d.amaunLulus ? ' · RM' + d.amaunLulus : ''}`);
    if(lulus && (m.jenis === 'cuti' || m.jenis === 'tukar')){
      if(!(await pinOk())) return;
      try{
        if(m.jenis === 'cuti'){
          let t = m.tarikh, n = 0;
          while(t <= (m.hingga || m.tarikh) && n < 31){ await fs.setDoc(fs.doc(C('roster'), t), {tarikh:t, bulan:t.slice(0,7), syif:{[m.stafId]:'CUTI'}, dikemaskiniOleh: ctx.pengguna(), ...(ctx.tanda ? ctx.tanda() : {})}, {merge:true}); t = tambahHari(t, 1); n++; }
        } else {
          const r = await fs.getDoc(fs.doc(C('roster'), m.tarikh)), sy = r.exists() ? (r.data().syif || {}) : {};
          const tp = r.exists() ? (r.data().tempat || {}) : {};
          await fs.setDoc(fs.doc(C('roster'), m.tarikh), {tarikh:m.tarikh, bulan:m.tarikh.slice(0,7), syif:{[m.stafId]: sy[m.denganId] || '', [m.denganId]: sy[m.stafId] || ''}, tempat:{[m.stafId]: tp[m.denganId] || null, [m.denganId]: tp[m.stafId] || null}, dikemaskiniOleh: ctx.pengguna(), ...(ctx.tanda ? ctx.tanda() : {})}, {merge:true});
        }
        await fs.updateDoc(fs.doc(C('permohonan'), id), d);
        if(ctx.log) ctx.log(`Lulus ${JENIS_MOHON[m.jenis].label}`, `${namaStaf(m.stafId)} · ${m.tarikh}${m.hingga ? ' – ' + m.hingga : ''}`);
        ctx.toast('✅ Diluluskan — roster dikemas kini');
      }catch(e){ err(e); }
      return;
    }
    if(lulus){
      if(m.jenis === 'ot'){ const j = prompt(`Jam OT diluluskan untuk ${namaStaf(m.stafId)}:`, m.jam); if(j === null) return; const n = parseFloat(j); if(!(n > 0)) return ctx.toast('Jam tidak sah'); d.jamLulus = n; }
      else {
        let had = Infinity, sudah = 0;
        if(m.jenis === 'advance' && ctx.hadAdvance){   // 💰 manager: had sebulan bagi setiap pekerja
          try{ const q = await fs.getDocs(fs.query(C('permohonan'), fs.where('stafId','==',m.stafId), fs.where('bulan','==',m.bulan || (m.tarikh || hariIni()).slice(0,7))));
            sudah = Math.round(q.docs.map(x => x.data()).filter(x => x.jenis === 'advance' && x.status === 'lulus').reduce((t,x) => t + (Number(x.amaunLulus ?? x.amaun)||0), 0) * 100) / 100; }
          catch(e){ return err(e); }
          had = Math.round((ctx.hadAdvance - sudah) * 100) / 100;
          if(had <= 0) return ctx.toast(`Had advance RM${ctx.hadAdvance} sebulan untuk ${namaStaf(m.stafId)} sudah dicapai — perlu kelulusan Dato' / Datin`);
        }
        const a = prompt(`Amaun ${JENIS_MOHON[m.jenis]?.label} diluluskan (RM):${had < Infinity ? `\nSudah diluluskan bulan ini: RM${sudah} · baki had: RM${had}` : ''}`, Math.min(Number(m.amaun) || 0, had)); if(a === null) return;
        const n = parseFloat(a); if(!(n > 0)) return ctx.toast('Amaun tidak sah');
        if(n > had) return ctx.toast(`Melebihi had — maksimum RM${had}. Lebih dari itu perlu Dato' / Datin`);
        d.amaunLulus = Math.round(n*100)/100; }
    } else { const c = prompt('Sebab ditolak (pilihan):', ''); if(c === null) return; if(c) d.catatanLulus = c; }
    if(!(await pinOk())) return;
    try{ await fs.updateDoc(fs.doc(C('permohonan'), id), d); if(ctx.log) ctx.log(`${lulus ? 'Lulus' : 'Tolak'} ${JENIS_MOHON[m.jenis]?.label || m.jenis}`, namaStaf(m.stafId)); ctx.toast(lulus ? '✅ Diluluskan' : 'Permohonan ditolak'); }catch(e){ err(e); }
  }
  async function muatGambar(){
    for(const im of document.querySelectorAll('[data-km-img]')){
      const id = im.dataset.kmImg;
      if(gambar[id] === undefined){ gambar[id] = null; fs.getDoc(fs.doc(C('kehadiran_gambar'), id)).then(s => { gambar[id] = s.exists() ? s.data().data : ''; document.querySelectorAll(`[data-km-img="${id}"]`).forEach(x => { if(gambar[id]) x.src = gambar[id]; }); }).catch(() => {}); }
      else if(gambar[id]) im.src = gambar[id];
      im.onclick = () => { if(gambar[id]) bukaPaparan(gambar[id], {tajuk: 'Gambar kehadiran', nama: 'Kehadiran-' + id}); };
    }
  }
  function pasang(onMod){
    document.querySelectorAll('[data-km-mod]').forEach(b => b.onclick = () => onMod(b.dataset.kmMod));
    const t = document.querySelector('[data-km-tarikh]'); if(t) t.onchange = e => { if(e.target.value){ st.tarikh = e.target.value; st.pindaBuka = null; st.pinda = {}; langganTarikh(); } };
    document.querySelectorAll('[data-km-lulus]').forEach(b => b.onclick = () => proses(b.dataset.kmLulus, true));
    document.querySelectorAll('[data-km-tolak]').forEach(b => b.onclick = () => proses(b.dataset.kmTolak, false));
    document.querySelectorAll('[data-km-pinda]').forEach(b => b.onclick = () => { st.pindaBuka = {id: b.dataset.kmPinda}; ctx.refresh(); });
    const kpS = document.querySelector('[data-kp-sebab]'); if(kpS){ kpS.oninput = () => { if(st.pindaBuka) st.pindaBuka.sebab = kpS.value; };
      const sm = () => { if(st.pindaBuka) st.pindaBuka.minit = (parseInt(document.querySelector('[data-kp-jam]').value) || 0) * 60 + (parseInt(document.querySelector('[data-kp-min]').value) || 0); };
      document.querySelector('[data-kp-jam]').oninput = sm; document.querySelector('[data-kp-min]').oninput = sm; }
    document.querySelectorAll('[data-kp-simpan]').forEach(b => b.onclick = () => simpanPinda(b.dataset.kpSimpan));
    document.querySelectorAll('[data-kp-batal]').forEach(b => b.onclick = () => { st.pindaBuka = null; ctx.refresh(); });
    document.querySelectorAll('[data-km-minggu]').forEach(b => b.onclick = () => { st.minggu = tambahHari(st.minggu, +b.dataset.kmMinggu); langganMinggu(); ctx.refresh(); });
    document.querySelectorAll('[data-km-syif]').forEach(s => s.onchange = async () => {
      const [t, id] = s.dataset.kmSyif.split('|');
      try{ await fs.setDoc(fs.doc(C('roster'), t), {tarikh:t, bulan:t.slice(0,7), syif:{[id]: s.value}, dikemaskiniOleh: ctx.pengguna(), ...(ctx.tanda ? ctx.tanda() : {})}, {merge:true}); if(ctx.log) ctx.log('Ubah roster', `${namaStaf(id)} · ${t} → ${s.value || '–'}`); }catch(e){ err(e); }
    });
    document.querySelectorAll('[data-km-tempat]').forEach(s => s.onchange = async () => {
      const [t, id] = s.dataset.kmTempat.split('|'), [c, sid] = s.value.split('|');
      try{ await fs.setDoc(fs.doc(C('roster'), t), {tarikh:t, bulan:t.slice(0,7), tempat:{[id]: c ? {c, s: sid || ''} : null}, dikemaskiniOleh: ctx.pengguna(), ...(ctx.tanda ? ctx.tanda() : {})}, {merge:true}); if(ctx.log) ctx.log('Ubah tempat bertugas', `${namaStaf(id)} · ${t} → ${s.options[s.selectedIndex].text}`); }catch(e){ err(e); }
    });
    const imb = document.querySelector('[data-km-imbuka]'); if(imb) imb.onclick = () => { st.importBuka = !st.importBuka; ctx.refresh(); };
    const imt = document.querySelector('[data-km-imtutup]'); if(imt) imt.onclick = () => { st.importBuka = false; ctx.refresh(); };
    const iml = document.querySelector('[data-km-imlaksana]'); if(iml) iml.onclick = laksanaImport;
    document.querySelectorAll('[data-km-peta]').forEach(s => s.onchange = () => { st.peta[s.dataset.kmPeta] = s.value; });
    const salin = document.querySelector('[data-km-salin]');
    if(salin) salin.onclick = async () => {
      if(!confirm('Salin roster minggu lepas ke minggu ini? Syif sedia ada minggu ini akan ditimpa.')) return;
      try{ for(let i = 0; i < 7; i++){ const dari = tambahHari(st.minggu, i - 7), ke = tambahHari(st.minggu, i); const sy = st.roster[dari]?.syif || {}, tp = st.roster[dari]?.tempat || {};
          await fs.setDoc(fs.doc(C('roster'), ke), {tarikh:ke, bulan:ke.slice(0,7), syif:sy, tempat:tp, dikemaskiniOleh: ctx.pengguna(), ...(ctx.tanda ? ctx.tanda() : {})}); }
        if(ctx.log) ctx.log('Salin roster', `minggu ${st.minggu}`);
        ctx.toast('✅ Roster disalin'); }catch(e){ err(e); }
    };
    const lok = document.querySelector('[data-km-lokasisaya]');
    if(lok) lok.onclick = () => { if(!navigator.geolocation) return ctx.toast('GPS tidak disokong'); lok.textContent = 'Mendapatkan lokasi…';
      navigator.geolocation.getCurrentPosition(p => { document.querySelector('#kmLat').value = p.coords.latitude.toFixed(6); document.querySelector('#kmLng').value = p.coords.longitude.toFixed(6); lok.textContent = `📍 Ketepatan ±${Math.round(p.coords.accuracy)}m — tekan Simpan`; },
        e => { lok.textContent = '📍 Guna lokasi saya sekarang'; ctx.toast('Gagal dapat lokasi: ' + e.message); }, {enableHighAccuracy:true, timeout:15000}); };
    const simpan = document.querySelector('[data-km-simpantetapan]');
    if(simpan) simpan.onclick = async () => {
      const lat = parseFloat(document.querySelector('#kmLat').value), lng = parseFloat(document.querySelector('#kmLng').value), radius = parseInt(document.querySelector('#kmRad').value) || 200;
      const syif = document.querySelector('#kmSyif').value.split('\n').map(x => x.split('|').map(y => y.trim())).filter(x => x[0]).map(([kod, nama, mula, tamat]) => {
        const o = {kod: kod.toUpperCase(), nama: nama || kod}; if(/^\d{1,2}:\d{2}$/.test(mula||'')) o.mula = mula.padStart(5,'0'); if(/^\d{1,2}:\d{2}$/.test(tamat||'')) o.tamat = tamat.padStart(5,'0'); return o; });
      const d = {radius, syif: syif.length ? syif : SYIF_ASAL, dikemaskiniOleh: ctx.pengguna()};
      const hb = document.querySelector('#kmHariBayar'); if(hb) d.hariBayarMingguan = +hb.value;
      if(isFinite(lat) && isFinite(lng)) d.lokasi = {lat, lng};
      try{ await fs.setDoc(fs.doc(C('tetapan'), 'umum'), d, {merge:true}); ctx.toast('✅ Tetapan pekerja disimpan'); }catch(e){ err(e); }
    };
    muatGambar();
  }

  return {mula, henti: stop, html, pasang, setBulan, ringkasStaf, st};
}

// CSS kongsi untuk modul pengurusan
export const CSS_MODUL = `
.km-tempat{display:block;margin-top:3px;font-size:11px;padding:3px;max-width:110px}
.km-sub{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.km-sub button,.km-btn{border:0;border-radius:9px;padding:8px 11px;cursor:pointer;background:#e5e7eb;font-size:13px;font-family:inherit}
.km-sub button.km-on{background:#0f172a;color:#fff}
.km-badge{background:#dc2626;color:#fff;border-radius:999px;padding:1px 6px;font-size:11px}
.km-card{background:#fff;border-radius:14px;padding:14px;box-shadow:0 2px 10px #0000000d;margin-bottom:12px}
.km-card h3{margin:0 0 8px;font-size:16px}
.km-between{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.km-between input[type=date]{width:auto;margin:0}
.km-row{display:flex;gap:10px;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid #e5e7eb;flex-wrap:wrap}
.km-nm{flex:1;min-width:180px}.km-nm b{display:block}.km-nm small{display:block;color:#64748b;font-size:12px;margin-top:2px}
.km-aksi{display:flex;flex-direction:column;align-items:flex-end;gap:5px}
.km-tag{display:inline-block;padding:3px 8px;border-radius:999px;background:#f1f5f9;font-size:11px;margin:3px 3px 0 0;white-space:nowrap}
.km-tag.km-ok,.km-btn.km-ok{background:#dcfce7;color:#14532d}.km-tag.km-warn{background:#fef3c7}.km-tag.km-bad,.km-btn.km-bad{background:#fee2e2;color:#991b1b}
.km-btn.km-primary{background:#14532d;color:#fff}.km-big{width:100%;padding:14px;font-size:15px;font-weight:700}
.km-merah{color:#b91c1c}
.km-pics{display:flex;gap:8px;flex-wrap:wrap}
.km-pic{width:92px;text-align:center}.km-pic img{width:92px;height:92px;object-fit:cover;border-radius:10px;background:#f1f5f9;display:block;cursor:pointer}
.km-pic small{display:block;font-size:11px;color:#64748b}
.km-resit{max-width:160px;max-height:160px;border-radius:8px;margin-top:6px;display:block}
.km-notice{background:#fef3c7;border-radius:10px;padding:10px;font-size:13px;margin-bottom:10px}.km-notice.km-bad{background:#fee2e2}
.km-muted{color:#64748b;font-size:12px;margin:4px 0}
.km-rowbtn{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.km-scroll{overflow-x:auto;margin-top:8px}
.km-roster{border-collapse:collapse;width:100%}
.km-roster th,.km-roster td{padding:4px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;vertical-align:middle}
.km-roster td:first-child,.km-roster th:first-child{text-align:left;white-space:nowrap}
.km-roster select{width:auto;min-width:56px;padding:6px 2px;margin:0;font-size:13px;border-radius:8px}
.km-roster .km-today{background:#fef9c3}
.km-s-9-6{background:#bbf7d0}.km-s-3-12{background:#fef08a}.km-s-9-12{background:#ddd6fe}.km-s-SPLIT{background:#fed7aa}.km-s-OFF{background:#fecaca!important;color:#991b1b!important}.km-s-P{background:#dbeafe}.km-s-M{background:#ede9fe}.km-s-F{background:#dcfce7}.km-s-OFF,.km-s-CUTI{background:#f1f5f9;color:#64748b}
.km-two{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}
@media(max-width:600px){.km-two{grid-template-columns:1fr}}
`;

// =====================================================================
// GAMBAR PROFIL STAF (untuk ID staf di Lion Safari V2, Apps Pekerja & Akaun)
// Disimpan berasingan supaya senarai staf kekal ringan:
//   lionsafari/{cawangan}/staf_foto/{id dokumen staf} = {data: JPEG data URL, oleh, dikemaskini}
// =====================================================================
export const fotoCol = (store, fs, cawangan) => fs.collection(store, 'lionsafari', cawangan, 'staf_foto');

// Potong segi empat di tengah & kecilkan (≈20–35 KB)
export async function fotoProfil(fail, saiz = 360, kualiti = 0.78){
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(fail); });
  const sisi = Math.min(img.width, img.height), sx = (img.width - sisi) / 2, sy = (img.height - sisi) / 2.6;   // sedikit ke atas: muka
  const c = document.createElement('canvas'); c.width = c.height = Math.min(saiz, sisi);
  c.getContext('2d').drawImage(img, sx, Math.max(0, sy), sisi, sisi, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', kualiti);
}

const _esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const inisial = nama => String(nama || '?').replace(/^(dato'?|datin|en\.?|encik|puan|cik|tuan)\s+/i, '').split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase() || '?';
// Avatar bulat: gambar jika ada, jika tiada huruf awal nama
export function avatar(foto, nama, px = 40, kelas = ''){
  const st = `width:${px}px;height:${px}px;font-size:${Math.round(px*0.4)}px`;
  return foto
    ? `<img class="av ${kelas}" src="${foto}" alt="${_esc(nama)}" style="${st}">`
    : `<span class="av av-kosong ${kelas}" style="${st}">${_esc(inisial(nama))}</span>`;
}

// Kad ID staf digital
export function kadID({foto, nama, idStaf, peranan, cawangan, logo, warna = '#0f172a'}){
  return `<div class="kad-id" style="--kid:${warna}">
    <div class="kid-atas">${logo ? `<img src="${logo}" alt="">` : ''}<div><b>${_esc(cawangan || '')}</b><small>KAD ID STAF</small></div></div>
    <div class="kid-foto">${avatar(foto, nama, 128)}</div>
    <div class="kid-nama">${_esc(nama)}</div>
    <div class="kid-id">${_esc(idStaf || '—')}</div>
    <div class="kid-peranan">${_esc(peranan || '')}</div>
  </div>`;
}

export const CSS_AVATAR = `
.av{border-radius:50%;object-fit:cover;flex:none;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;background:#e2e8f0;border:2px solid #fff;box-shadow:0 1px 4px #0002}
.av-kosong{background:linear-gradient(135deg,#1e293b,#334155);color:#f59e0b;font-weight:800;letter-spacing:.5px}
.kad-id{max-width:320px;margin:0 auto;border-radius:20px;overflow:hidden;background:#fff;box-shadow:0 8px 28px #0f172a33;text-align:center;padding-bottom:18px;border:1px solid #e2e8f0}
.kid-atas{background:var(--kid);color:#fff;display:flex;align-items:center;gap:10px;padding:14px 16px 46px;text-align:left}
.kid-atas img{width:42px;height:42px;border-radius:10px;object-fit:contain;background:#fff;padding:3px}
.kid-atas b{display:block;font-size:15px}.kid-atas small{color:#f59e0b;font-size:11px;letter-spacing:2px;font-weight:700}
.kid-foto{margin-top:-40px}.kid-foto .av{border:4px solid #fff;box-shadow:0 4px 14px #0003}
.kid-nama{font-size:20px;font-weight:800;margin-top:8px;padding:0 12px}
.kid-id{display:inline-block;margin-top:8px;font-size:22px;font-weight:900;letter-spacing:3px;background:#fef3c7;color:#92400e;padding:5px 16px;border-radius:10px;font-family:ui-monospace,Menlo,monospace}
.kid-peranan{margin-top:8px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:1px;font-size:12px}
.foto-edit{display:flex;align-items:center;gap:12px;margin:4px 0 12px}
.foto-edit label.foto-btn{display:inline-block;padding:9px 12px;border-radius:10px;background:#0f172a;color:#fff;cursor:pointer;font-size:13px;font-weight:400}
`;

// =====================================================================
// INFO PEKERJA — Buku Peraturan Kerja, Memo & Dokumen (SOP)
// kakitangan/{cawangan}/info/{id}  {jenis, tajuk, isi, tarikh, penting, susunan, aktif, gambar?}
// kakitangan/{cawangan}/info_baca/{infoId}__{stafId}  {infoId, stafId, idStaf, nama, masa}
// Diurus di Akaun → Pekerja → Info Pekerja; dibaca di Apps Pekerja → Info
// =====================================================================
export const JENIS_INFO = {
  memo:      {label:'Memo', ikon:'📢', ket:'Pengumuman & arahan terkini. Pekerja tekan "Saya sudah baca".'},
  peraturan: {label:'Buku Peraturan Kerja', ikon:'📘', ket:'Undang-undang kerja, disiplin, cuti, pakaian, keselamatan.'},
  dokumen:   {label:'Dokumen & SOP', ikon:'📄', ket:'Cara kerja (SOP), panduan servis, polisi syarikat.'}
};
export const idBaca = (infoId, stafId) => `${infoId}__${stafId}`;
// Teks ringkas → HTML selamat:  "# Tajuk"  ·  "- senarai"  ·  **tebal**
export function teksKeHtml(t){
  const tebal = s => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const out = []; let ul = false;
  for(const baris of String(t || '').split('\n')){
    const s = baris.trim();
    if(/^[-*•]\s+/.test(s)){ if(!ul){ out.push('<ul>'); ul = true; } out.push(`<li>${tebal(_esc(s.replace(/^[-*•]\s+/, '')))}</li>`); continue; }
    if(ul){ out.push('</ul>'); ul = false; }
    if(!s) continue;
    out.push(s.startsWith('# ') ? `<h4>${_esc(s.slice(2))}</h4>` : `<p>${tebal(_esc(s))}</p>`);
  }
  if(ul) out.push('</ul>');
  return out.join('');
}
export const CSS_DOK = `.dok h4{margin:14px 0 4px;font-size:15px}.dok p{margin:6px 0;line-height:1.55}.dok ul{margin:6px 0;padding-left:20px;line-height:1.55}`;

// ================================================================
// 🧾 PENYATA / SLIP GAJI (akaun/mama-lion/gaji/{bulan}__{stafId})
// Disediakan Admin Gaji / pemilik di Akaun → diluluskan Dato' / Datin → dibayar.
// baris: [{k, label, amaun, jenis:'+'|'-', kos:'kurang'|'' , auto, diubah:{dari, sebab, oleh, masa}}]
// ================================================================
export const STATUS_GAJI = {
  draf:     {label:'Draf', warna:'#64748b', bg:'#f1f5f9'},
  dihantar: {label:'Menunggu kelulusan', warna:'#92400e', bg:'#fef3c7'},
  lulus:    {label:'Diluluskan', warna:'#1e40af', bg:'#dbeafe'},
  dibayar:  {label:'Dibayar', warna:'#166534', bg:'#dcfce7'}
};
const r2g = n => Math.round((Number(n) || 0) * 100) / 100;
const RMg = n => 'RM ' + r2g(n).toLocaleString('en-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const escg = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BULAN_G = ['Januari','Februari','Mac','April','Mei','Jun','Julai','Ogos','September','Oktober','November','Disember'];
export const fBulanGaji = b => b ? `${BULAN_G[+b.slice(5,7) - 1]} ${b.slice(0,4)}` : '';
export function jumlahGaji(baris = []){
  const kasar = r2g(baris.filter(x => x.jenis === '+').reduce((s, x) => s + (Number(x.amaun) || 0), 0));
  const potong = r2g(baris.filter(x => x.jenis === '-').reduce((s, x) => s + (Number(x.amaun) || 0), 0));
  const kurangKos = r2g(baris.filter(x => x.jenis === '-' && x.kos === 'kurang').reduce((s, x) => s + (Number(x.amaun) || 0), 0));
  return {kasar, potong, bersih: r2g(kasar - potong), kos: r2g(kasar - kurangKos)};
}
export function htmlSlipGaji(s, {syarikat = 'Petunjuk Pictures Sdn. Bhd.', noSyarikat = '202101007513 (1407812-P)', unit = 'Mama Lion · Lion King'} = {}){
  const t = jumlahGaji(s.baris), st = STATUS_GAJI[s.status] || STATUS_GAJI.draf;
  const baris = j => (s.baris || []).filter(x => x.jenis === j && Number(x.amaun)).map(x => `<tr><td>${escg(x.label)}${x.ket ? `<br><small style="color:#64748b">${escg(x.ket)}</small>` : ''}</td><td style="text-align:right">${RMg(x.amaun)}</td></tr>`).join('') || '<tr><td colspan="2" style="color:#94a3b8">—</td></tr>';
  return `<div class="slip-gaji" style="max-width:640px;margin:0 auto;font-family:system-ui,sans-serif;color:#0f172a;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;background:#fff">
    <div style="background:#1F3A68;color:#fff;padding:12px 16px;border-bottom:3px solid #C9A646"><div style="font-size:17px;font-weight:800">${escg(syarikat)}</div>
      <div style="font-size:12px;color:#E5C97A">${escg(noSyarikat)} · ${escg(unit)}</div><div style="margin-top:6px;font-size:15px;font-weight:700">SLIP GAJI — ${escg(fBulanGaji(s.bulan))}</div></div>
    <div style="padding:12px 16px;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:13px;border-bottom:1px solid #e2e8f0">
      <div><b>Nama:</b> ${escg(s.nama)}</div><div><b>ID staf:</b> ${escg(s.idStaf || '')}</div>
      <div><b>Jawatan:</b> ${escg(s.jawatan || '-')}</div><div><b>Jenis:</b> ${escg(s.jenisLabel || '')}</div>
      ${s.ringkas ? `<div style="grid-column:1/-1;color:#475569">${escg(s.ringkas)}</div>` : ''}
      <div style="grid-column:1/-1"><span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:12px;font-weight:700;color:${st.warna};background:${st.bg}">${st.label}</span></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
      <div style="padding:10px 16px;border-right:1px solid #e2e8f0"><b style="color:#166534">Pendapatan</b><table style="width:100%;font-size:13px;border-collapse:collapse">${baris('+')}<tr style="border-top:1px solid #cbd5e1;font-weight:700"><td>Jumlah kasar</td><td style="text-align:right">${RMg(t.kasar)}</td></tr></table></div>
      <div style="padding:10px 16px"><b style="color:#b91c1c">Potongan</b><table style="width:100%;font-size:13px;border-collapse:collapse">${baris('-')}<tr style="border-top:1px solid #cbd5e1;font-weight:700"><td>Jumlah potongan</td><td style="text-align:right">${RMg(t.potong)}</td></tr></table></div></div>
    <div style="background:#f8fafc;border-top:2px solid #1F3A68;padding:12px 16px;display:flex;justify-content:space-between;font-size:17px;font-weight:800"><span>GAJI BERSIH</span><span>${RMg(t.bersih)}</span></div>
    ${s.perkesoMajikan ? `<div style="padding:6px 16px;font-size:12px;color:#475569">Caruman PERKESO majikan: ${RMg(s.perkesoMajikan)} (dibayar syarikat)</div>` : ''}
    <div style="padding:8px 16px 12px;font-size:12px;color:#475569">${s.lulus ? `Diluluskan oleh ${escg(s.lulus.oleh)} · ` : ''}${s.bayar ? `Dibayar ${escg(s.bayar.tarikh || '')} melalui ${escg(s.bayar.kaedah || '')}${s.bayar.rujukan ? ' (' + escg(s.bayar.rujukan) + ')' : ''}` : 'Belum dibayar'}${s.nota ? `<br>Nota: ${escg(s.nota)}` : ''}</div></div>`;
}
export function teksSlipGaji(s){
  const t = jumlahGaji(s.baris), l = j => (s.baris || []).filter(x => x.jenis === j && Number(x.amaun)).map(x => `  • ${x.label}: ${RMg(x.amaun)}`).join('\n');
  return `🧾 *SLIP GAJI — ${fBulanGaji(s.bulan)}*\nPetunjuk Pictures Sdn. Bhd. (Mama Lion · Lion King)\n\nNama: ${s.nama} (${s.idStaf || ''})\n\n*Pendapatan*\n${l('+') || '  -'}\nJumlah kasar: ${RMg(t.kasar)}\n\n*Potongan*\n${l('-') || '  -'}\nJumlah potongan: ${RMg(t.potong)}\n\n*GAJI BERSIH: ${RMg(t.bersih)}*\n${s.bayar ? `Dibayar ${s.bayar.tarikh || ''} (${s.bayar.kaedah || ''})` : 'Status: ' + (STATUS_GAJI[s.status]?.label || '')}\n\nSlip penuh juga boleh dilihat dalam Apps Pekerja → 📊 Rekod → Slip gaji.`;
}
