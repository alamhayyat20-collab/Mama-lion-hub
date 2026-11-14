// =====================================================================
// pekerja-lib.js — modul kongsi untuk Apps Pekerja, Lion Safari V2 & Akaun
// Data: kakitangan/{cawangan}/kehadiran        (punch in/out, tanpa gambar)
//       kakitangan/{cawangan}/kehadiran_gambar (gambar selfie bercap masa, id sama)
//       kakitangan/{cawangan}/permohonan       (advance / claim / OT)
//       kakitangan/{cawangan}/roster/{YYYY-MM-DD}
//       kakitangan/{cawangan}/tetapan/umum     (lokasi kedai & syif)
// Staf (ID, peranan, PIN): lionsafari/{cawangan}/staf
// =====================================================================

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
  ot:      {label:'Overtime', ikon:'⏱', ket:'Kerja lebih masa'}
};
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
  return {minit, pasangan, masihMasuk: !!buka, masuk: l.find(r => r.jenis === 'masuk'), keluar: [...l].reverse().find(r => r.jenis === 'keluar'), rekod: l};
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
  const st = {staf:[], tetapan:{}, menunggu:[], mohonBulan:[], hadir:[], hadirBulan:[], roster:{}, tarikh: hariIni(), minggu: isninMinggu(hariIni()), bulan: hariIni().slice(0,7), ralat:''};
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
    unsubTarikh = fs.onSnapshot(fs.query(C('kehadiran'), fs.where('tarikh','==',st.tarikh)), s => { st.hadir = s.docs.map(d => ({id:d.id, ...d.data()})); ctx.refresh(); }, err);
  }
  function langganMinggu(){
    if(unsubMinggu) unsubMinggu();
    unsubMinggu = fs.onSnapshot(fs.query(C('roster'), fs.where('tarikh','>=',tambahHari(st.minggu,-7)), fs.where('tarikh','<=',tambahHari(st.minggu,13))), s => {
      st.roster = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); ctx.refresh(); }, err);
  }
  function langganBulan(){
    unsubBulan.forEach(f => f && f()); unsubBulan = [];
    unsubBulan.push(fs.onSnapshot(fs.query(C('permohonan'), fs.where('bulan','==',st.bulan)), s => { st.mohonBulan = s.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b) => masaMs(b) - masaMs(a)); ctx.refresh(); }, err));
    if(ctx.kehadiranBulan) unsubBulan.push(fs.onSnapshot(fs.query(C('kehadiran'), fs.where('bulan','==',st.bulan)), s => { st.hadirBulan = s.docs.map(d => ({id:d.id, ...d.data()})); ctx.refresh(); }, err));
  }
  function setBulan(b){ if(b && b !== st.bulan){ st.bulan = b; langganBulan(); } }

  const namaStaf = id => { const s = st.staf.find(x => x.id === id); return s ? `${s.idStaf ? s.idStaf + ' ' : ''}${s.nama}` : '(tiada)'; };
  const syifStaf = (tarikh, id) => st.roster[tarikh]?.syif?.[id] || '';

  // Ringkasan bulan seorang staf (untuk gaji di Akaun)
  function ringkasStaf(id){
    const lulus = st.mohonBulan.filter(m => m.stafId === id && m.status === 'lulus');
    const j = k => lulus.filter(m => m.jenis === k);
    const hari = {}; st.hadirBulan.filter(r => r.stafId === id).forEach(r => (hari[r.tarikh] ||= []).push(r));
    let minit = 0, lewatKali = 0, lewatMinit = 0;
    for(const [t, l] of Object.entries(hari)){
      const k = jamKerja(l); minit += k.minit;
      const lw = minitLewat(k.masuk, t, syifDari(st.tetapan, syifStaf(t, id))); if(lw > 5){ lewatKali++; lewatMinit += lw; }
    }
    return {advance: j('advance').reduce((t,m) => t + (Number(m.amaunLulus ?? m.amaun)||0), 0), claim: j('claim').reduce((t,m) => t + (Number(m.amaunLulus ?? m.amaun)||0), 0),
      otJam: j('ot').reduce((t,m) => t + (Number(m.jamLulus ?? m.jam)||0), 0), hariHadir: Object.keys(hari).length, minit, lewatKali, lewatMinit, permohonan: lulus};
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
      const lw = minitLewat(k.masuk, st.tarikh, sy);
      if(!l.length && (!kod || ['OFF','CUTI'].includes(kod))) return null;
      return `<div class="km-row"><div class="km-nm"><b>${esc(s.idStaf||'')} ${esc(s.nama)}</b>
        <small>${sy ? `${esc(sy.nama)}${sy.mula ? ` ${sy.mula}–${sy.tamat}` : ''}` : 'Tiada syif'}</small>
        ${l.length ? '' : (sy?.mula ? '<span class="km-tag km-bad">Belum / tidak hadir</span>' : '')}
        ${lw > 5 ? `<span class="km-tag km-warn">Lewat ${lw} min</span>` : ''}
        ${k.masihMasuk && st.tarikh === hariIni() ? '<span class="km-tag km-ok">Sedang bekerja</span>' : ''}
        ${l.length ? `<small>Jam kerja: <b>${fMinit(k.minit)}</b>${k.masihMasuk ? ' (+ sedang berjalan)' : ''}</small>` : ''}</div>
        <div class="km-pics">${k.rekod.map(r => { const jr = r.jarak ?? jarakMeter(r.gps, kedai); const luar = kedai && jr != null && jr > (Number(st.tetapan.radius)||200);
          return `<div class="km-pic"><img data-km-img="${r.id}" alt=""><span class="km-tag ${r.jenis==='masuk'?'km-ok':''}">${r.jenis==='masuk'?'MASUK':'KELUAR'} ${fJam(masaMs(r))}</span>
          <small>${r.gps ? `📍${jr != null ? jr + 'm' : 'GPS'}${luar ? ' <b class="km-merah">LUAR</b>' : ''}` : '📍 tiada GPS'}</small></div>`; }).join('')}</div></div>`;
    }).filter(Boolean);
    return `<div class="km-card"><div class="km-between"><h3>🕘 Kehadiran</h3><input type="date" data-km-tarikh value="${st.tarikh}"></div>
      ${!kedai ? '<div class="km-notice">Lokasi kedai belum ditetapkan — jarak GPS tidak dapat disemak (Akaun → Pekerja → Tetapan Pekerja).</div>' : ''}
      ${baris.join('') || '<p class="km-muted">Tiada rekod / roster untuk tarikh ini.</p>'}</div>`;
  }

  function kadMohon(m, bolehLulus){
    const J = JENIS_MOHON[m.jenis] || {label:m.jenis, ikon:''};
    const nilai = m.jenis === 'ot' ? `${m.jamLulus ?? m.jam} jam${m.jamLulus != null && m.jamLulus != m.jam ? ` (mohon ${m.jam})` : ''}` : `${RM(m.amaunLulus ?? m.amaun)}${m.amaunLulus != null && m.amaunLulus != m.amaun ? ` (mohon ${RM(m.amaun)})` : ''}`;
    return `<div class="km-row"><div class="km-nm"><b>${J.ikon} ${J.label} — ${esc(namaStaf(m.stafId))}</b>
      <small>${m.tarikh ? fTarikhPendek(m.tarikh) + ' · ' : ''}${esc(m.sebab||'')}${m.kategori ? ' · ' + esc(m.kategori) : ''}</small>
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
        return `<td class="${t===hariIni()?'km-today':''}"><select data-km-syif="${t}|${s.id}" class="km-s-${esc(k||'kosong')}"><option value="">–</option>${SY.map(x => `<option ${x.kod===k?'selected':''} value="${esc(x.kod)}">${esc(x.kod)}</option>`).join('')}</select></td>`; }).join('')}</tr>`).join('')}</table></div>
      <div class="km-rowbtn" style="margin-top:8px"><button class="km-btn" data-km-salin>📋 Salin roster minggu lepas</button></div>
      <div class="km-muted">Perubahan disimpan serta-merta dan terus dilihat pekerja dalam Apps Pekerja.</div></div>`;
  }

  function viewTetapan(){
    const t = st.tetapan, l = t.lokasi || {};
    return `<div class="km-card"><h3>📍 Lokasi kedai (semakan GPS)</h3>
      <div class="km-two"><div><label>Latitud</label><input id="kmLat" value="${l.lat ?? ''}" inputmode="decimal"></div><div><label>Longitud</label><input id="kmLng" value="${l.lng ?? ''}" inputmode="decimal"></div>
      <div><label>Radius dibenarkan (meter)</label><input id="kmRad" value="${t.radius ?? 200}" inputmode="numeric"></div></div>
      <button class="km-btn" data-km-lokasisaya>📍 Guna lokasi saya sekarang (buat di kedai)</button></div>
      <div class="km-card"><h3>🕘 Syif kerja</h3><div class="km-muted">Satu baris setiap syif: <b>Kod | Nama | Mula | Tamat</b> (masa kosong untuk rehat/cuti)</div>
      <textarea id="kmSyif" rows="6">${esc(senaraiSyif(t).map(s => [s.kod, s.nama, s.mula||'', s.tamat||''].join(' | ')).join('\n'))}</textarea></div>
      <button class="km-btn km-primary km-big" data-km-simpantetapan>SIMPAN TETAPAN PEKERJA</button>`;
  }

  function html(mod, mods){
    const v = ({'Kehadiran':viewKehadiran, 'Permohonan':viewPermohonan, 'Roster':viewRoster, 'Tetapan Pekerja':viewTetapan})[mod] || viewKehadiran;
    return tabMod(mod, mods) + ralatHtml() + v();
  }

  // ---------------- Tindakan ----------------
  async function proses(id, lulus){
    const m = st.menunggu.find(x => x.id === id); if(!m) return;
    const d = {status: lulus ? 'lulus' : 'tolak', diprosesOleh: ctx.pengguna(), diproses: fs.serverTimestamp()};
    if(lulus){
      if(m.jenis === 'ot'){ const j = prompt(`Jam OT diluluskan untuk ${namaStaf(m.stafId)}:`, m.jam); if(j === null) return; const n = parseFloat(j); if(!(n > 0)) return ctx.toast('Jam tidak sah'); d.jamLulus = n; }
      else { const a = prompt(`Amaun ${JENIS_MOHON[m.jenis]?.label} diluluskan (RM):`, m.amaun); if(a === null) return; const n = parseFloat(a); if(!(n > 0)) return ctx.toast('Amaun tidak sah'); d.amaunLulus = Math.round(n*100)/100; }
    } else { const c = prompt('Sebab ditolak (pilihan):', ''); if(c === null) return; if(c) d.catatanLulus = c; }
    try{ await fs.updateDoc(fs.doc(C('permohonan'), id), d); ctx.toast(lulus ? '✅ Diluluskan' : 'Permohonan ditolak'); }catch(e){ err(e); }
  }
  async function muatGambar(){
    for(const im of document.querySelectorAll('[data-km-img]')){
      const id = im.dataset.kmImg;
      if(gambar[id] === undefined){ gambar[id] = null; fs.getDoc(fs.doc(C('kehadiran_gambar'), id)).then(s => { gambar[id] = s.exists() ? s.data().data : ''; document.querySelectorAll(`[data-km-img="${id}"]`).forEach(x => { if(gambar[id]) x.src = gambar[id]; }); }).catch(() => {}); }
      else if(gambar[id]) im.src = gambar[id];
      im.onclick = () => { if(gambar[id]) { const w = window.open(); if(w) w.document.write(`<img src="${gambar[id]}" style="max-width:100%">`); } };
    }
  }
  function pasang(onMod){
    document.querySelectorAll('[data-km-mod]').forEach(b => b.onclick = () => onMod(b.dataset.kmMod));
    const t = document.querySelector('[data-km-tarikh]'); if(t) t.onchange = e => { if(e.target.value){ st.tarikh = e.target.value; langganTarikh(); } };
    document.querySelectorAll('[data-km-lulus]').forEach(b => b.onclick = () => proses(b.dataset.kmLulus, true));
    document.querySelectorAll('[data-km-tolak]').forEach(b => b.onclick = () => proses(b.dataset.kmTolak, false));
    document.querySelectorAll('[data-km-minggu]').forEach(b => b.onclick = () => { st.minggu = tambahHari(st.minggu, +b.dataset.kmMinggu); langganMinggu(); ctx.refresh(); });
    document.querySelectorAll('[data-km-syif]').forEach(s => s.onchange = async () => {
      const [t, id] = s.dataset.kmSyif.split('|');
      try{ await fs.setDoc(fs.doc(C('roster'), t), {tarikh:t, bulan:t.slice(0,7), syif:{[id]: s.value}, dikemaskiniOleh: ctx.pengguna()}, {merge:true}); }catch(e){ err(e); }
    });
    const salin = document.querySelector('[data-km-salin]');
    if(salin) salin.onclick = async () => {
      if(!confirm('Salin roster minggu lepas ke minggu ini? Syif sedia ada minggu ini akan ditimpa.')) return;
      try{ for(let i = 0; i < 7; i++){ const dari = tambahHari(st.minggu, i - 7), ke = tambahHari(st.minggu, i); const sy = st.roster[dari]?.syif || {};
          await fs.setDoc(fs.doc(C('roster'), ke), {tarikh:ke, bulan:ke.slice(0,7), syif:sy, dikemaskiniOleh: ctx.pengguna()}); }
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
      if(isFinite(lat) && isFinite(lng)) d.lokasi = {lat, lng};
      try{ await fs.setDoc(fs.doc(C('tetapan'), 'umum'), d, {merge:true}); ctx.toast('✅ Tetapan pekerja disimpan'); }catch(e){ err(e); }
    };
    muatGambar();
  }

  return {mula, henti: stop, html, pasang, setBulan, ringkasStaf, st};
}

// CSS kongsi untuk modul pengurusan
export const CSS_MODUL = `
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
.km-s-P{background:#dbeafe}.km-s-M{background:#ede9fe}.km-s-F{background:#dcfce7}.km-s-OFF,.km-s-CUTI{background:#f1f5f9;color:#64748b}
.km-two{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}
@media(max-width:600px){.km-two{grid-template-columns:1fr}}
`;
