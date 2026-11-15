// =====================================================================
// laporan-lib.js — Tutup Kaunter / Daily Sales Report (format borang manual Mama Lion & Lion King)
// Data: lionsafari/{c}/tutup/{YYYY-MM-DD}      (rekod tutup kaunter + snapshot laporan)
//       lionsafari/{c}/tutup_foto/{YYYY-MM-DD} (gambar wang tunai — diambil dalam Apps Pekerja, kuasa 🔐 Tutup)
// Aliran: Apps Pekerja (kuasa Tutup) ambil gambar tunai & kiraan → Apps Kaunter semak & "Tutup & Hantar"
//         → Apps Pekerja (kuasa Semak) / Akaun sahkan. Cetak A4 & salin ke WhatsApp di mana-mana.
// =====================================================================
const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
const pad = n => String(n).padStart(2, '0');
const tarikhLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const hariIniT = () => tarikhLocal(new Date());
export const tambahHariT = (t, n) => { const d = new Date(t + 'T00:00:00'); d.setDate(d.getDate() + n); return tarikhLocal(d); };
const HARI = ['AHAD','ISNIN','SELASA','RABU','KHAMIS','JUMAAT','SABTU'];
export const namaHari = t => HARI[new Date(t + 'T00:00:00').getDay()];
const fT = t => { const [y,m,d] = t.split('-'); return `${d}/${m}/${y}`; };
const RMx = n => (Number(n) || 0).toLocaleString('en-MY', {minimumFractionDigits:2, maximumFractionDigits:2});
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const masaJ = ms => ms ? new Date(ms).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) : '';
const masaMs = x => x?.masa?.toMillis ? x.masa.toMillis() : (x?.masa?.seconds ? x.masa.seconds * 1000 : (x?.masaPeranti || 0));

export const NAMA_CAW = {'mama-lion': 'MAMA LION PREMIUM CAR WASH', 'lion-king': 'LION KING PREMIUM CAR WASH'};
export const MODAL_FLOAT = 150;
export const KAEDAH_BAYAR_STAF = {bulanan: 'Bulanan (bersama gaji)', mingguan: 'Mingguan (tunai dari laci)', harian: 'Harian (tunai dari laci)'};
export const STATUS_TUTUP = {draf: 'Belum ditutup', dihantar: 'Menunggu semakan', disahkan: 'Disahkan'};
export const LAJUR = [['luar','LUAR'],['ld','LUAR & DALAM'],['promo','PROMO'],['polish','POLISH'],['lain','LAIN-LAIN SERVICES']];
const JAM_MAKS_MINIT = 8 * 60;

// Lajur borang: Luar = Cuci Luar; Luar & Dalam = pakej L&D; Promo = Promo A/B & Premium; Polish = Polish, Seat & Enjin Detail; Lain-lain = selebihnya & add-on
export function lajurPakej(o){
  const id = String(o.pakejId || ''), n = String(o.pakej || '').toLowerCase();
  if(id === 'p-cuci-luar') return 'luar';
  if(id.startsWith('p-ld-') || /luar\s*&\s*dalam|luar dan dalam/.test(n)) return 'ld';
  if(/^p-(promo|premium)/.test(id) || /promo|premium/.test(n)) return 'promo';
  if(/^p-(polish|seat|enjin-detail)/.test(id) || /polish|seat|deep clean|enjin.*detail/.test(n)) return 'polish';
  if(/^cuci luar$|^luar$/.test(n.trim())) return 'luar';
  return 'lain';
}
const kaedahPendek = k => ({'Tunai':'CASH', 'QR / eWallet':'QR', 'Kad':'CARD', 'Transfer':'TRANSFER'})[k] || (k || '');

// ---------------------------------------------------------------------
// Kira laporan harian daripada data mentah
// d = {tarikh, c, orders, ordersMinggu, petty, staf, tetapanPK, kehadiran, kehadiranMinggu, advance, rekod}
// ---------------------------------------------------------------------
export function kiraLaporan(d){
  const rekod = d.rekod || {}, float = Number(d.tetapanPK?.modalFloat ?? MODAL_FLOAT);
  const hariBayar = Number(d.tetapanPK?.hariBayarMingguan ?? 0), hariIni = new Date(d.tarikh + 'T00:00:00').getDay() === hariBayar;
  const sah = (d.orders || []).filter(o => o.status !== 'Batal' && (o.bayar || o.freeWash)).sort((a,b) => (a.masaBayar||a.masaDibuat||0) - (b.masaBayar||b.masaDibuat||0));
  const baris = sah.map((o, i) => {
    const addon = r2((o.addon || []).reduce((t,a) => t + (Number(a.harga)||0), 0)), jumlah = r2(o.jumlah);
    const lj = lajurPakej(o), nilai = {luar:0, ld:0, promo:0, polish:0, lain:0};
    const pakejAmt = o.freeWash ? 0 : r2(Math.max(0, jumlah - addon));
    nilai[lj] = r2(nilai[lj] + pakejAmt); nilai.lain = r2(nilai.lain + (o.freeWash ? Math.min(addon, jumlah) : Math.min(addon, jumlah)));
    return {bil: i + 1, masa: masaJ(o.masaBayar || o.masaDibuat), kend: `${o.kenderaan || ''} ${o.plat || ''}`.trim(), pakej: o.pakej || '', rm: jumlah, nilai, lajur: lj,
      kaedah: o.freeWash ? (jumlah ? kaedahPendek(o.bayar?.kaedah) + ' + FOC' : 'FOC / LC') : kaedahPendek(o.bayar?.kaedah), tf: o.bayar?.rujukan || '',
      serve: o.mo?.nama || String(o.dibuatOleh || '').replace(/\s*\(.*\)\s*$/, ''), foc: o.freeWash ? r2(o.freeWash.nilai) : 0, ahli: o.ahli?.kod || ''};
  });
  const ikutK = k => r2(sah.filter(o => o.bayar?.kaedah === k).reduce((t,o) => t + (Number(o.jumlah)||0), 0));
  const tunai = ikutK('Tunai'), qr = ikutK('QR / eWallet'), kad = ikutK('Kad'), tf = ikutK('Transfer');
  const jumLajur = Object.fromEntries(LAJUR.map(([k]) => [k, r2(baris.reduce((t,b) => t + b.nilai[k], 0))]));
  const foc = baris.filter(b => b.foc).map(b => ({plat: b.kend, rm: b.foc, ahli: b.ahli}));

  // Bayaran staf dari laci (ikut tetapan setiap pekerja)
  const staf = d.staf || [], bayaran = [];
  const kaedahStaf = s => s.kaedahBayar || 'bulanan';
  const dari7 = tambahHariT(d.tarikh, -6);
  for(const s of staf){
    const k = kaedahStaf(s); if(k === 'bulanan') continue;
    if(k === 'mingguan' && !hariIni) continue;
    const oList = k === 'harian' ? sah : (d.ordersMinggu || []).filter(o => o.status !== 'Batal' && o.bayar && o.tarikhBayar >= dari7 && o.tarikhBayar <= d.tarikh);
    const kom = r2(oList.filter(o => o.mo?.id === s.id).reduce((t,o) => t + (Number(o.komisen)||0), 0));
    const ket = k === 'harian' ? 'harian' : `mingguan ${fT(dari7).slice(0,5)}–${fT(d.tarikh).slice(0,5)}`;
    if(kom > 0) bayaran.push({k: `kom-${s.id}`, stafId: s.id, nama: s.nama, idStaf: s.idStaf || '', jenis: 'Komisen', amaun: kom, ket});
    if(s.jenisPekerja === 'parttime' && Number(s.kadarJamPT) > 0){
      const hadir = (k === 'harian' ? d.kehadiran : d.kehadiranMinggu) || [];
      const ikutHari = {};
      hadir.filter(h => h.stafId === s.id && (h.cawangan || 'mama-lion') === d.c && h.tarikh >= (k === 'harian' ? d.tarikh : dari7) && h.tarikh <= d.tarikh)
        .forEach(h => (ikutHari[h.tarikh] = ikutHari[h.tarikh] || []).push(h));
      let minit = 0;
      for(const l of Object.values(ikutHari)){ const x = [...l].sort((a,b) => masaMs(a) - masaMs(b)); let buka = null, m = 0;
        for(const r of x){ if(r.jenis === 'masuk'){ if(!buka) buka = r; } else if(r.jenis === 'keluar' && buka){ m += (masaMs(r) - masaMs(buka)) / 60000; buka = null; } }
        minit += Math.min(m, JAM_MAKS_MINIT); }
      const jam = r2(minit / 60), amaun = r2(jam * Number(s.kadarJamPT));
      if(amaun > 0) bayaran.push({k: `pt-${s.id}`, stafId: s.id, nama: s.nama, idStaf: s.idStaf || '', jenis: 'Part-time', amaun, ket: `${ket} · ${jam} jam × RM${RMx(s.kadarJamPT)}`});
    }
  }
  const pilih = rekod.bayar || {};
  bayaran.forEach(b => b.dibayar = pilih[b.k] !== undefined ? !!pilih[b.k] : true);
  const advance = (d.advance || []).map(a => ({k: `adv-${a.id}`, id: a.id, stafId: a.stafId, nama: a.nama || '', amaun: r2(a.amaunLulus || a.amaun), tarikh: a.tarikh || ''}));
  advance.forEach(a => a.dibayar = !!pilih[a.k]);
  const belanjaLaci = (rekod.belanjaLaci || []).map(x => ({...x, amaun: r2(x.amaun)}));
  const petty = (d.petty || []).filter(p => p.jenis === 'Belanja');

  const jumBayaranStaf = r2(bayaran.filter(b => b.dibayar).reduce((t,b) => t + b.amaun, 0));
  const jumKomisen = r2(bayaran.filter(b => b.dibayar && b.jenis === 'Komisen').reduce((t,b) => t + b.amaun, 0));
  const jumPT = r2(bayaran.filter(b => b.dibayar && b.jenis !== 'Komisen').reduce((t,b) => t + b.amaun, 0));
  const jumAdvance = r2(advance.filter(a => a.dibayar).reduce((t,a) => t + a.amaun, 0));
  const jumBelanja = r2(belanjaLaci.reduce((t,x) => t + x.amaun, 0));
  const keluar = r2(jumBayaranStaf + jumAdvance + jumBelanja);
  const bop = r2(float + tunai - keluar);
  const dikira = rekod.tunaiDikira != null && rekod.tunaiDikira !== '' ? r2(rekod.tunaiDikira) : null;
  return {tarikh: d.tarikh, hari: namaHari(d.tarikh), c: d.c, namaKedai: NAMA_CAW[d.c] || d.c, baris, jumLajur, jumlah: r2(tunai + qr + kad + tf), kereta: baris.length,
    tunai, qr, kad, tf, foc, jumFoc: r2(foc.reduce((t,x) => t + x.rm, 0)), bayaran, advance, belanjaLaci, petty, jumPetty: r2(petty.reduce((t,p) => t + (Number(p.amaun)||0), 0)),
    jumKomisen, jumPT, jumAdvance, jumBelanja, keluar, float, bop, dikira, beza: dikira == null ? null : r2(dikira - bop), bersih: dikira == null ? null : r2(dikira - float),
    hariBayarMingguan: hariIni};
}

// ---------------------------------------------------------------------
// Teks WhatsApp
// ---------------------------------------------------------------------
export function teksWhatsApp(L, rekod = {}){
  const b = [];
  b.push(`*${L.namaKedai}*`, `*DAILY SALES REPORT* — ${L.hari}, ${fT(L.tarikh)}`, '');
  b.push(`🚗 Kenderaan: ${L.kereta}`);
  LAJUR.forEach(([k, n]) => { if(L.jumLajur[k]) b.push(`• ${n}: RM ${RMx(L.jumLajur[k])}`); });
  b.push('', `💰 *TOTAL SALES: RM ${RMx(L.jumlah)}*`, `• Cash: RM ${RMx(L.tunai)}`, `• QR / E-Wallet: RM ${RMx(L.qr)}`, `• Transfer: RM ${RMx(L.tf)}`, `• Card: RM ${RMx(L.kad)}`);
  if(L.foc.length){ b.push('', `🎁 FOC / Loyalty Card: ${L.foc.length} (RM ${RMx(L.jumFoc)})`); L.foc.forEach((f,i) => b.push(`${i+1}) ${f.plat} — RM ${RMx(f.rm)}`)); }
  const kom = L.bayaran.filter(x => x.dibayar && x.jenis === 'Komisen'), pt = L.bayaran.filter(x => x.dibayar && x.jenis !== 'Komisen');
  if(kom.length){ b.push('', '👷 Commission staff:'); kom.forEach((x,i) => b.push(`${i+1}) ${x.nama} — RM ${RMx(x.amaun)} (${x.ket})`)); }
  if(pt.length){ b.push('', '⏱ Part-time / OT:'); pt.forEach((x,i) => b.push(`${i+1}) ${x.nama} — RM ${RMx(x.amaun)}`)); }
  const adv = L.advance.filter(a => a.dibayar);
  if(adv.length){ b.push('', '💸 Advance staff:'); adv.forEach((x,i) => b.push(`${i+1}) ${x.nama} — RM ${RMx(x.amaun)}`)); }
  if(L.belanjaLaci.length){ b.push('', '🧾 Consumables / supplier (dari laci):'); L.belanjaLaci.forEach((x,i) => b.push(`${i+1}) ${x.perkara} — RM ${RMx(x.amaun)}`)); }
  b.push('', `📤 Cash paid out: RM ${RMx(L.keluar)}`, `🏦 Float: RM ${RMx(L.float)}`, `📊 Balance of payment (BOP): RM ${RMx(L.bop)}`);
  if(L.dikira != null){ b.push(`💵 Cash counted: RM ${RMx(L.dikira)}`, `${L.beza >= 0 ? '➕ Surplus' : '➖ Shortage'}: RM ${RMx(Math.abs(L.beza))}`, `*NET CASH BALANCE: RM ${RMx(L.bersih)}*`); }
  else b.push('💵 Cash counted: (belum)');
  b.push('', `Closed by: ${rekod.ditutupOleh || '-'}`, `Checked by: ${rekod.disemakOleh || '-'}`, `Status: ${STATUS_TUTUP[rekod.status || 'draf']}`);
  if(rekod.catatan) b.push('', `📝 ${rekod.catatan}`);
  return b.join('\n');
}

// ---------------------------------------------------------------------
// Cetakan A4 (format borang Daily Sales)
// ---------------------------------------------------------------------
export function htmlCetak(L, rekod = {}, foto = ''){
  const sel = (v, kosong = '') => v ? RMx(v) : kosong;
  const senarai = (l, f, min = 3) => { const a = l.map(f); while(a.length < min) a.push('_____________________________'); return a.map((x,i) => `<div>${i+1}) ${x}</div>`).join(''); };
  const kom = L.bayaran.filter(x => x.dibayar && x.jenis === 'Komisen'), pt = L.bayaran.filter(x => x.dibayar && x.jenis !== 'Komisen');
  const baris = [...L.baris]; while(baris.length < 12) baris.push(null);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Daily Sales ${L.tarikh} ${esc(L.namaKedai)}</title><style>
  @page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:10.5px;color:#111;margin:0}
  h1{font-size:17px;text-align:center;margin:0 0 4px;letter-spacing:.04em}.top{display:flex;justify-content:center;gap:40px;font-weight:700;font-size:12px;margin-bottom:6px}
  table{border-collapse:collapse;width:100%}th,td{border:1px solid #222;padding:3px 4px;vertical-align:middle}th{background:#f4dc8c;font-size:9.5px}td.r{text-align:right}td.c{text-align:center}
  .tot td{font-weight:700;background:#fff7d6}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:8px;page-break-inside:avoid}
  .box{border:1px solid #222;padding:6px 8px}.box b{display:inline-block;min-width:170px}.ln{display:flex;justify-content:space-between;border-bottom:1px dotted #999;padding:2px 0}
  .big{font-size:12.5px;font-weight:700}.sig{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:14px;text-align:center;font-size:9.5px;page-break-inside:avoid}
  .sig div{margin-top:38px;padding-top:4px;border-top:1px solid #222}.foto img{max-width:100%;max-height:200px;display:block;margin:4px auto 0;border:1px solid #999}
  .pos{color:#166534}.neg{color:#b91c1c}.small{font-size:9px;color:#444}@media screen{body{padding:14px;max-width:1150px;margin:auto}}
  </style></head><body>
  <h1>${esc(L.namaKedai)}</h1><div class="top"><span>TARIKH : ${fT(L.tarikh)}</span><span>HARI : ${L.hari}</span><span>DAILY SALES REPORT</span></div>
  <table><tr><th style="width:30px">BIL.</th><th style="width:44px">MASA</th><th>JENIS KENDERAAN &amp; NO. PLAT</th><th style="width:60px">RM</th>${LAJUR.map(([,n]) => `<th style="width:62px">${n}</th>`).join('')}<th style="width:70px">CASH/QR/<br>TRANSFER</th><th style="width:80px">TF. NO</th><th style="width:90px">NAME SERVE</th></tr>
  ${baris.map((b, i) => b ? `<tr><td class="c">${b.bil}</td><td class="c">${b.masa}</td><td>${esc(b.kend)}<br><span class="small">${esc(b.pakej)}</span></td><td class="r">${RMx(b.rm)}</td>${LAJUR.map(([k]) => `<td class="r">${sel(b.nilai[k])}</td>`).join('')}<td class="c">${esc(b.kaedah)}</td><td>${esc(b.tf)}</td><td>${esc(b.serve)}</td></tr>`
    : `<tr><td class="c">${i+1}</td><td></td><td>&nbsp;</td><td></td>${LAJUR.map(() => '<td></td>').join('')}<td></td><td></td><td></td></tr>`).join('')}
  <tr class="tot"><td colspan="3" class="r">JUMLAH :</td><td class="r">${RMx(L.jumlah + L.jumFoc * 0)}</td>${LAJUR.map(([k]) => `<td class="r">${sel(L.jumLajur[k], '-')}</td>`).join('')}<td colspan="3">${L.kereta} kenderaan</td></tr></table>
  <div class="grid">
    <div class="box"><div class="ln big"><span>TOTAL SALES (RM)</span><span>${RMx(L.jumlah)}</span></div>
      <div class="ln"><span>QR / E-WALLET (RM)</span><span>${RMx(L.qr)}</span></div><div class="ln"><span>TRANSFER (RM)</span><span>${RMx(L.tf)}</span></div>
      <div class="ln"><span>CARD DEBIT/CREDIT (RM)</span><span>${RMx(L.kad)}</span></div><div class="ln"><span>CASH (RM)</span><span>${RMx(L.tunai)}</span></div>
      <p style="margin:8px 0 2px"><b>FREE OF CHARGE (FOC) / LOYALTY CARD (LC): (PLAT NO &amp; RM)</b></p>${senarai(L.foc, f => `${esc(f.plat)} — RM ${RMx(f.rm)}`)}</div>
    <div class="box"><p style="margin:0 0 2px"><b>COMMISSIONS STAFF: (NAME &amp; RM)</b></p>${senarai(kom, x => `${esc(x.nama)} — RM ${RMx(x.amaun)} <span class="small">(${esc(x.ket)})</span>`)}
      <p style="margin:8px 0 2px"><b>PARTIME / OVERTIME: (NAME &amp; RM)</b></p>${senarai(pt, x => `${esc(x.nama)} — RM ${RMx(x.amaun)} <span class="small">(${esc(x.ket)})</span>`)}
      <p style="margin:8px 0 2px"><b>ADVANCE STAFF: (NAME &amp; RM)</b></p>${senarai(L.advance.filter(a => a.dibayar), x => `${esc(x.nama)} — RM ${RMx(x.amaun)}`, 2)}</div>
    <div class="box"><p style="margin:0 0 2px"><b>CONSUMABLES / SUPPLIER PRODUCT</b> <span class="small">*attach with receipt*</span></p>${senarai(L.belanjaLaci, x => `${esc(x.perkara)} — RM ${RMx(x.amaun)}`, 2)}
      <div class="ln" style="margin-top:6px"><span>CASH PAID OUT (RM)</span><span>${RMx(L.keluar)}</span></div><div class="ln"><span>FLOAT / MODAL (RM)</span><span>${RMx(L.float)}</span></div>
      <div class="ln"><span>BALANCE OF PAYMENT (BOP) (RM)</span><span>${RMx(L.bop)}</span></div><div class="ln"><span>CASH COUNTED (RM)</span><span>${L.dikira == null ? '________' : RMx(L.dikira)}</span></div>
      <div class="ln"><span>SURPLUS (+) / SHORTAGE (−) (RM)</span><span class="${L.beza >= 0 ? 'pos' : 'neg'}">${L.beza == null ? '________' : (L.beza >= 0 ? '+' : '−') + RMx(Math.abs(L.beza))}</span></div>
      <div class="ln big"><span>NET CASH BALANCE (RM)</span><span>${L.bersih == null ? '________' : RMx(L.bersih)}</span></div>
      ${L.petty.length ? `<div class="small" style="margin-top:4px">Petty cash hari ini (dana berasingan): RM ${RMx(L.jumPetty)}</div>` : ''}</div>
  </div>
  ${foto ? `<div class="box foto" style="margin-top:8px;page-break-inside:avoid"><b>GAMBAR WANG TUNAI SEMASA TUTUP KAUNTER</b> <span class="small">— diambil oleh ${esc(rekod.fotoOleh || '')} ${rekod.fotoMasa ? new Date(rekod.fotoMasa).toLocaleString('en-GB') : ''}</span><img src="${foto}"></div>` : ''}
  ${rekod.catatan ? `<div class="box" style="margin-top:8px"><b>NOTE / REMARKS:</b> ${esc(rekod.catatan)}</div>` : ''}
  ${rekod.catatanSemak ? `<div class="box" style="margin-top:8px"><b>CATATAN SEMAKAN:</b> ${esc(rekod.catatanSemak)}</div>` : ''}
  <div class="sig"><div>CLOSED BY / CASHIER STAFF<br><b>${esc(rekod.ditutupOleh || '')}</b><br>${rekod.masaTutup ? new Date(rekod.masaTutup).toLocaleString('en-GB') : ''}</div>
    <div>CHECKED BY / ADMIN FINANCIAL<br><b>${esc(rekod.disemakOleh || '')}</b><br>${rekod.masaSemak ? new Date(rekod.masaSemak).toLocaleString('en-GB') : ''}</div>
    <div>APPROVED BY<br><b>DATIN NUR SAFARINI</b><br>DIRECTOR</div><div>APPROVED BY<br><b>DATO' MUHAMMAD ARIS</b><br>CHAIRMAN</div></div>
  <div class="small" style="margin-top:6px;text-align:right">Dijana oleh apps Mama Lion · Status: ${STATUS_TUTUP[rekod.status || 'draf']}</div>
  <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`;
}
export function cetak(html){
  const w = window.open('', '_blank');
  if(!w) return alert('Benarkan pop-up untuk mencetak.');
  w.document.open(); w.document.write(html); w.document.close();
}
export async function kongsiWhatsApp(teks){
  try{ if(navigator.share){ await navigator.share({text: teks}); return; } }catch(e){ if(e.name === 'AbortError') return; }
  try{ await navigator.clipboard.writeText(teks); }catch(_){}
  window.open('https://wa.me/?text=' + encodeURIComponent(teks), '_blank');
}

// ---------------------------------------------------------------------
// Modul UI kongsi: mod 'kaunter' (Apps Kaunter: tutup & hantar), 'foto' (Apps Pekerja: gambar tunai),
// 'semak' (sahkan), 'lihat' (baca sahaja). ctx = {store, fs, cawangan(), pengguna(), tanda?(), toast, refresh, capGambar, mod, bolehSemak?}
// ---------------------------------------------------------------------
export function modulTutup(ctx){
  const {store, fs} = ctx;
  const st = {tarikh: hariIniT(), data: null, rekod: null, foto: '', muat: false, ralat: '', unsub: [], c: null};
  const T = () => ctx.tanda ? ctx.tanda() : {};
  const col = (c, n) => fs.collection(store, 'lionsafari', c, n);
  const K = n => fs.collection(store, 'kakitangan', 'mama-lion', n);
  const stop = () => { st.unsub.forEach(f => f && f()); st.unsub = []; };

  function mula(tarikh){
    stop(); if(tarikh) st.tarikh = tarikh; st.c = ctx.cawangan(); st.rekod = null; st.foto = ''; st.data = null; st.ralat = '';
    st.unsub.push(fs.onSnapshot(fs.doc(col(st.c, 'tutup'), st.tarikh), s => { st.rekod = s.exists() ? s.data() : null; ctx.refresh(); }, e => { st.ralat = e.code || e.message; ctx.refresh(); }));
    st.unsub.push(fs.onSnapshot(fs.doc(col(st.c, 'tutup_foto'), st.tarikh), s => { st.foto = s.exists() ? s.data().data : ''; ctx.refresh(); }, () => {}));
    if(ctx.mod === 'kaunter') muatData();
  }
  async function muatData(){
    st.muat = true; ctx.refresh();
    try{
      const t = st.tarikh, c = st.c, dari7 = tambahHariT(t, -6);
      const g = async q => (await fs.getDocs(q)).docs.map(x => ({id: x.id, ...x.data()}));
      const [orders, petty, staf, tp, kehadiran, adv] = await Promise.all([
        g(fs.query(col(c, 'order'), fs.where('tarikhBayar', '==', t))),
        g(fs.query(col(c, 'petty'), fs.where('tarikh', '==', t))).catch(() => []),
        g(col('mama-lion', 'staf')),
        fs.getDoc(fs.doc(K('tetapan'), 'umum')).then(s => s.exists() ? s.data() : {}).catch(() => ({})),
        g(fs.query(K('kehadiran'), fs.where('tarikh', '==', t))).catch(() => []),
        g(fs.query(K('permohonan'), fs.where('jenis', '==', 'advance'))).catch(() => [])
      ]);
      const mingguan = new Date(t + 'T00:00:00').getDay() === Number(tp.hariBayarMingguan ?? 0) && staf.some(s => s.kaedahBayar === 'mingguan');
      const [ordersMinggu, kehadiranMinggu] = mingguan ? await Promise.all([
        g(fs.query(col(c, 'order'), fs.where('tarikhBayar', '>=', dari7), fs.where('tarikhBayar', '<=', t))),
        g(fs.query(K('kehadiran'), fs.where('tarikh', '>=', dari7), fs.where('tarikh', '<=', t))).catch(() => [])]) : [[], []];
      const namaStaf = id => staf.find(s => s.id === id)?.nama || '';
      const advance = adv.filter(a => a.status === 'lulus' && (!a.dibayar || (a.dibayar.tarikh === t && a.dibayar.cawangan === c))).map(a => ({...a, nama: a.nama || namaStaf(a.stafId)}));
      st.data = {tarikh: t, c, orders, ordersMinggu, petty, staf: staf.filter(s => s.aktif !== false), tetapanPK: tp, kehadiran, kehadiranMinggu, advance};
    }catch(e){ console.error(e); st.ralat = 'Gagal memuat data: ' + (e.code || e.message); }
    st.muat = false; ctx.refresh();
  }
  const laporan = () => st.rekod?.laporan && st.rekod.status !== 'draf' ? st.rekod.laporan : (st.data ? kiraLaporan({...st.data, rekod: st.rekod || {}}) : null);
  const kunci = () => ['dihantar', 'disahkan'].includes(st.rekod?.status);
  const simpanRekod = async d => fs.setDoc(fs.doc(col(st.c, 'tutup'), st.tarikh), {tarikh: st.tarikh, bulan: st.tarikh.slice(0,7), cawangan: st.c, ...d, dikemaskini: Date.now(), ...T()}, {merge: true});

  function html(){
    const r = st.rekod || {}, L = laporan(), status = r.status || 'draf', e = esc;
    const kepala = `<div class="lt-card"><div class="lt-between"><h3 style="margin:0">🔐 Tutup Kaunter — ${e(NAMA_CAW[st.c] || st.c)}</h3><span class="lt-tag lt-${status}">${STATUS_TUTUP[status]}</span></div>
      <div class="lt-row" style="margin-top:8px"><label style="margin:0">Tarikh</label><input type="date" data-lt-tarikh value="${st.tarikh}" max="${hariIniT()}" style="width:auto;margin:0"><b>${namaHari(st.tarikh)}</b></div>
      ${st.ralat ? `<div class="lt-notice">⚠ ${e(st.ralat)}</div>` : ''}${r.catatanSemak && status === 'draf' ? `<div class="lt-notice">↩ Dipulangkan oleh ${e(r.disemakOleh || '')}: ${e(r.catatanSemak)}</div>` : ''}</div>`;
    const fotoBox = `<div class="lt-card"><h3>📸 Gambar wang tunai</h3>${st.foto ? `<img src="${st.foto}" class="lt-foto" data-lt-besar>` : '<p class="lt-muted">Belum ada gambar. Gambar diambil oleh pekerja yang diberi kuasa 🔐 Tutup dalam Apps Pekerja.</p>'}
      ${r.fotoOleh ? `<div class="lt-muted">Oleh ${e(r.fotoOleh)} · ${r.fotoMasa ? new Date(r.fotoMasa).toLocaleString('en-GB') : ''}</div>` : ''}
      ${r.tunaiDikira != null ? `<div class="lt-big">Tunai dikira: RM ${RMx(r.tunaiDikira)}</div>` : ''}
      ${ctx.mod === 'foto' && !kunci() ? `<label>Jumlah tunai dalam laci (RM) — termasuk modal float</label><input type="number" inputmode="decimal" step="0.01" data-lt-dikira value="${r.tunaiDikira ?? ''}" placeholder="cth 1,250.00">
        <label class="lt-btn lt-pri" style="display:block;text-align:center;margin-top:8px">📷 ${st.foto ? 'Ambil semula gambar' : 'Ambil gambar wang tunai'}<input type="file" accept="image/*" capture="environment" data-lt-ambil style="display:none"></label>
        <button class="lt-btn" data-lt-simpandikira style="width:100%;margin-top:6px">💾 Simpan jumlah tunai</button>` : ''}</div>`;
    if(ctx.mod === 'foto') return kepala + fotoBox + (L ? ringkasHtml(L, r) : '') + butangKongsi(L);
    if(!L) return kepala + (st.muat ? '<div class="lt-card lt-muted">Memuatkan data jualan…</div>' : '<div class="lt-card lt-muted">Laporan belum ditutup oleh kaunter.</div>') + fotoBox;
    const ed = ctx.mod === 'kaunter' && !kunci();
    const jadual = `<div class="lt-card lt-scroll"><h3>🚗 Senarai kenderaan (${L.kereta})</h3><table class="lt-t"><tr><th>#</th><th>Masa</th><th>Kenderaan & plat</th><th>RM</th>${LAJUR.map(([,n]) => `<th>${n}</th>`).join('')}<th>Bayar</th><th>TF No</th><th>Serve</th></tr>
      ${L.baris.map(b => `<tr><td>${b.bil}</td><td>${b.masa}</td><td>${e(b.kend)}<br><small>${e(b.pakej)}</small></td><td class="r">${RMx(b.rm)}</td>${LAJUR.map(([k]) => `<td class="r">${b.nilai[k] ? RMx(b.nilai[k]) : ''}</td>`).join('')}<td>${e(b.kaedah)}</td><td>${e(b.tf)}</td><td>${e(b.serve)}</td></tr>`).join('') || `<tr><td colspan="13" class="lt-muted">Tiada jualan.</td></tr>`}
      <tr class="lt-tot"><td colspan="3">JUMLAH</td><td class="r">${RMx(L.jumlah)}</td>${LAJUR.map(([k]) => `<td class="r">${L.jumLajur[k] ? RMx(L.jumLajur[k]) : '-'}</td>`).join('')}<td colspan="3"></td></tr></table></div>`;
    const bayaranHtml = `<div class="lt-card"><h3>👷 Bayaran staf dari laci</h3>${L.hariBayarMingguan ? '<div class="lt-muted">Hari bayaran mingguan — termasuk komisen & part-time 7 hari.</div>' : ''}
      ${L.bayaran.map(b => `<label class="lt-chk"><input type="checkbox" data-lt-bayar="${b.k}" ${b.dibayar ? 'checked' : ''} ${ed ? '' : 'disabled'}> <span><b>${e(b.nama)}</b> · ${b.jenis} <small>(${e(b.ket)})</small></span><b>RM ${RMx(b.amaun)}</b></label>`).join('') || '<p class="lt-muted">Tiada bayaran harian/mingguan hari ini. (Pekerja "Bulanan" dibayar bersama gaji.)</p>'}
      ${L.advance.length ? `<h4>💸 Advance diluluskan</h4>${L.advance.map(a => `<label class="lt-chk"><input type="checkbox" data-lt-bayar="${a.k}" ${a.dibayar ? 'checked' : ''} ${ed ? '' : 'disabled'}> <span><b>${e(a.nama)}</b> <small>dibayar dari laci hari ini?</small></span><b>RM ${RMx(a.amaun)}</b></label>`).join('')}` : ''}
      <h4>🧾 Consumables / supplier (dibayar dari laci)</h4>${L.belanjaLaci.map((x,i) => `<div class="lt-chk"><span>${e(x.perkara)}${x.resit ? ' 🧾' : ''}</span><b>RM ${RMx(x.amaun)}</b>${ed ? `<button class="lt-btn lt-x" data-lt-buang="${i}">✕</button>` : ''}</div>`).join('') || '<p class="lt-muted">Tiada.</p>'}
      ${ed ? `<div class="lt-row"><input data-lt-bperkara placeholder="Perkara (cth Sabun 20L)" style="flex:2;margin:0"><input data-lt-bamaun type="number" inputmode="decimal" step="0.01" placeholder="RM" style="flex:1;margin:0"></div>
        <div class="lt-row"><label class="lt-btn" style="flex:1;text-align:center">📷 Resit<input type="file" accept="image/*" capture="environment" data-lt-bresit style="display:none"></label><button class="lt-btn" data-lt-btambah style="flex:1">+ Tambah</button></div>` : ''}
      ${L.petty.length ? `<div class="lt-muted" style="margin-top:6px">Petty cash hari ini (dana berasingan, sudah direkod): RM ${RMx(L.jumPetty)}</div>` : ''}</div>`;
    return kepala + jadual + ringkasHtml(L, r) + bayaranHtml + fotoBox +
      `<div class="lt-card"><label>Nota / catatan</label><textarea data-lt-catatan rows="2" ${ed ? '' : 'disabled'}>${e(r.catatan || '')}</textarea>
      ${ed ? `<button class="lt-btn lt-pri lt-bigbtn" data-lt-hantar ${st.foto && r.tunaiDikira != null ? '' : 'disabled'}>✅ TUTUP KAUNTER & HANTAR</button>${st.foto && r.tunaiDikira != null ? '' : '<div class="lt-muted" style="text-align:center">Perlu gambar & jumlah tunai dari Apps Pekerja (kuasa 🔐 Tutup) dahulu.</div>'}` : ''}
      ${ctx.mod === 'kaunter' && status === 'dihantar' ? '<div class="lt-muted">Sudah dihantar — menunggu semakan.</div>' : ''}</div>` + butangKongsi(L);
  }
  function ringkasHtml(L, r){
    return `<div class="lt-card"><h3>💰 Ringkasan</h3><div class="lt-grid">
      <div><div class="lt-ln lt-big"><span>TOTAL SALES</span><b>RM ${RMx(L.jumlah)}</b></div><div class="lt-ln"><span>Cash</span><b>${RMx(L.tunai)}</b></div><div class="lt-ln"><span>QR / E-Wallet</span><b>${RMx(L.qr)}</b></div><div class="lt-ln"><span>Transfer</span><b>${RMx(L.tf)}</b></div><div class="lt-ln"><span>Card</span><b>${RMx(L.kad)}</b></div><div class="lt-ln"><span>FOC / LC (${L.foc.length})</span><b>${RMx(L.jumFoc)}</b></div></div>
      <div><div class="lt-ln"><span>Float / modal</span><b>${RMx(L.float)}</b></div><div class="lt-ln"><span>+ Jualan tunai</span><b>${RMx(L.tunai)}</b></div><div class="lt-ln"><span>− Cash paid out</span><b>${RMx(L.keluar)}</b></div>
      <div class="lt-ln lt-big"><span>BOP (patut ada)</span><b>RM ${RMx(L.bop)}</b></div><div class="lt-ln"><span>Tunai dikira</span><b>${L.dikira == null ? '—' : RMx(L.dikira)}</b></div>
      <div class="lt-ln"><span>Surplus / Shortage</span><b class="${L.beza == null ? '' : L.beza >= 0 ? 'lt-pos' : 'lt-neg'}">${L.beza == null ? '—' : (L.beza >= 0 ? '+' : '−') + RMx(Math.abs(L.beza))}</b></div>
      <div class="lt-ln lt-big"><span>NET CASH BALANCE</span><b>${L.bersih == null ? '—' : 'RM ' + RMx(L.bersih)}</b></div></div></div>
      ${r.ditutupOleh ? `<div class="lt-muted" style="margin-top:6px">Ditutup oleh ${esc(r.ditutupOleh)}${r.disemakOleh ? ` · Disemak ${esc(r.disemakOleh)}` : ''}</div>` : ''}
      ${ctx.bolehSemak && r.status === 'dihantar' ? `<label>Catatan semakan</label><input data-lt-csemak placeholder="pilihan"><div class="lt-row"><button class="lt-btn lt-pri" data-lt-sahkan style="flex:1">✅ Sahkan</button><button class="lt-btn" data-lt-pulang style="flex:1">↩ Pulangkan</button></div>` : ''}</div>`;
  }
  const butangKongsi = L => L ? `<div class="lt-row" style="margin:10px 0 20px"><button class="lt-btn" data-lt-cetak style="flex:1">🖨 Cetak / PDF</button><button class="lt-btn lt-wa" data-lt-wa style="flex:1">📤 WhatsApp</button></div>` : '';

  let resitBaru = '';
  function pasang(){
    const q = s => document.querySelector(s), qa = s => document.querySelectorAll(s);
    const t = q('[data-lt-tarikh]'); if(t) t.onchange = e => { if(e.target.value) mula(e.target.value); };
    qa('[data-lt-bayar]').forEach(x => x.onchange = async () => { try{ await simpanRekod({bayar: {...(st.rekod?.bayar || {}), [x.dataset.ltBayar]: x.checked}, status: st.rekod?.status || 'draf'}); }catch(e){ ctx.toast('⚠ ' + (e.code || e.message)); } });
    const cat = q('[data-lt-catatan]'); if(cat && !cat.disabled) cat.onchange = () => simpanRekod({catatan: cat.value, status: st.rekod?.status || 'draf'}).catch(e => ctx.toast('⚠ ' + (e.code || e.message)));
    const res = q('[data-lt-bresit]'); if(res) res.onchange = async e => { const f = e.target.files[0]; if(f){ resitBaru = await ctx.capGambar(f, null, 900, 0.6); ctx.toast('🧾 Resit dilampirkan'); } };
    const bt = q('[data-lt-btambah]'); if(bt) bt.onclick = async () => {
      const perkara = q('[data-lt-bperkara]').value.trim(), amaun = parseFloat(q('[data-lt-bamaun]').value);
      if(!perkara || !(amaun > 0)) return ctx.toast('Isi perkara & amaun');
      try{ await simpanRekod({belanjaLaci: [...(st.rekod?.belanjaLaci || []), {perkara, amaun: r2(amaun), resit: resitBaru, oleh: ctx.pengguna(), masa: Date.now()}], status: st.rekod?.status || 'draf'}); resitBaru = ''; }catch(e){ ctx.toast('⚠ ' + (e.code || e.message)); }
    };
    qa('[data-lt-buang]').forEach(b => b.onclick = async () => { const l = [...(st.rekod?.belanjaLaci || [])]; l.splice(+b.dataset.ltBuang, 1); await simpanRekod({belanjaLaci: l}).catch(e => ctx.toast('⚠ ' + e.message)); });
    const amb = q('[data-lt-ambil]'); if(amb) amb.onchange = async e => {
      const f = e.target.files[0]; if(!f) return;
      try{
        const g = await ctx.capGambar(f, [`TUTUP KAUNTER ${NAMA_CAW[st.c] || st.c}`, `${namaHari(st.tarikh)} ${fT(st.tarikh)} ${new Date().toLocaleTimeString('en-GB')}`, `Oleh: ${ctx.pengguna()}`], 1100, 0.66);
        await fs.setDoc(fs.doc(col(st.c, 'tutup_foto'), st.tarikh), {data: g, tarikh: st.tarikh, masa: Date.now(), ...T()});
        const v = parseFloat(q('[data-lt-dikira]')?.value);
        await simpanRekod({fotoOleh: ctx.pengguna(), fotoMasa: Date.now(), ...(isFinite(v) ? {tunaiDikira: r2(v)} : {}), status: st.rekod?.status || 'draf'});
        ctx.toast('✅ Gambar tunai disimpan');
      }catch(err){ console.error(err); ctx.toast('⚠ Gagal simpan gambar: ' + (err.code || err.message)); }
    };
    const sd = q('[data-lt-simpandikira]'); if(sd) sd.onclick = async () => { const v = parseFloat(q('[data-lt-dikira]').value); if(!isFinite(v) || v < 0) return ctx.toast('Isi jumlah tunai');
      try{ await simpanRekod({tunaiDikira: r2(v), fotoOleh: st.rekod?.fotoOleh || ctx.pengguna(), status: st.rekod?.status || 'draf'}); ctx.toast('✅ Jumlah tunai disimpan'); }catch(e){ ctx.toast('⚠ ' + (e.code || e.message)); } };
    const hn = q('[data-lt-hantar]'); if(hn) hn.onclick = hantar;
    const sh = q('[data-lt-sahkan]'); if(sh) sh.onclick = () => semak(true);
    const pl = q('[data-lt-pulang]'); if(pl) pl.onclick = () => semak(false);
    const ct = q('[data-lt-cetak]'); if(ct) ct.onclick = () => { const L = laporan(); if(L) cetak(htmlCetak(L, st.rekod || {}, st.foto)); };
    const wa = q('[data-lt-wa]'); if(wa) wa.onclick = () => { const L = laporan(); if(L) kongsiWhatsApp(teksWhatsApp(L, st.rekod || {})); };
    const bs = q('[data-lt-besar]'); if(bs) bs.onclick = () => { const w = window.open(); if(w) w.document.write(`<img src="${st.foto}" style="max-width:100%">`); };
  }
  async function hantar(){
    const L = laporan(); if(!L) return;
    if(!st.foto || L.dikira == null) return ctx.toast('Perlu gambar & jumlah tunai dahulu');
    if(!confirm(`Tutup kaunter ${fT(st.tarikh)}?\n\nTotal sales: RM ${RMx(L.jumlah)}\nBOP: RM ${RMx(L.bop)}\nTunai dikira: RM ${RMx(L.dikira)}\n${L.beza >= 0 ? 'Surplus' : 'Shortage'}: RM ${RMx(Math.abs(L.beza))}\n\nSelepas dihantar, laporan dikunci untuk semakan.`)) return;
    try{
      await simpanRekod({status: 'dihantar', laporan: L, ditutupOleh: ctx.pengguna(), masaTutup: Date.now(), catatanSemak: ''});
      // Consumables / supplier → Belanja di Apps Akaun
      const ref = fs.doc(fs.collection(store, 'akaun', st.c, 'entri'), 'tk-' + st.tarikh);
      if(L.jumBelanja > 0) await fs.setDoc(ref, {jenis: 'belanja', tarikh: st.tarikh, bulan: st.tarikh.slice(0,7), cawangan: st.c, kategori: 'Barang Guna Habis (Laci)',
        perkara: `Tutup kaunter ${fT(st.tarikh)}: ` + L.belanjaLaci.map(x => `${x.perkara} RM${RMx(x.amaun)}`).join(', '), amaun: L.jumBelanja, bayar: 'Tunai', guna_petty: false, hutang: false,
        sumber: 'lionsafari', auto: true, oleh: ctx.pengguna(), dikemaskini: fs.serverTimestamp(), ...T()}).catch(e => console.warn('belanja akaun', e));
      // Advance dibayar dari laci
      for(const a of L.advance.filter(x => x.dibayar)) await fs.updateDoc(fs.doc(K('permohonan'), a.id), {dibayar: {tarikh: st.tarikh, cawangan: st.c, oleh: ctx.pengguna()}}).catch(e => console.warn('advance', e));
      ctx.toast('✅ Kaunter ditutup — laporan dihantar untuk semakan');
    }catch(e){ console.error(e); ctx.toast('⚠ Gagal: ' + (e.code || e.message)); }
  }
  async function semak(ok){
    const c = document.querySelector('[data-lt-csemak]')?.value || '';
    if(!ok && !c) return ctx.toast('Nyatakan sebab dipulangkan');
    try{ await simpanRekod({status: ok ? 'disahkan' : 'draf', disemakOleh: ctx.pengguna(), masaSemak: Date.now(), catatanSemak: c}); ctx.toast(ok ? '✅ Laporan disahkan' : '↩ Laporan dipulangkan ke kaunter'); }
    catch(e){ ctx.toast('⚠ ' + (e.code || e.message)); }
  }
  return {mula, henti: stop, html, pasang, st, muatData};
}

// Senarai laporan (Akaun / Semak): lionsafari/{c}/tutup ikut bulan
export async function senaraiTutup(fs, store, c, bulan){
  const s = await fs.getDocs(fs.query(fs.collection(store, 'lionsafari', c, 'tutup'), fs.where('bulan', '==', bulan)));
  return s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => b.tarikh.localeCompare(a.tarikh));
}
// Jumlah bayaran staf yang sudah dibayar dari laci dalam sebulan (ditolak daripada gaji bulanan)
export function dibayarAwal(senarai){
  const m = {};
  for(const r of senarai) if(['dihantar','disahkan'].includes(r.status)) for(const b of (r.laporan?.bayaran || [])) if(b.dibayar){
    m[b.stafId] = m[b.stafId] || {komisen: 0, pt: 0, butiran: []};
    if(b.jenis === 'Komisen') m[b.stafId].komisen = r2(m[b.stafId].komisen + b.amaun); else m[b.stafId].pt = r2(m[b.stafId].pt + b.amaun);
    m[b.stafId].butiran.push(`${r.tarikh} ${r.cawangan === 'lion-king' ? 'LK' : 'ML'} ${b.jenis} RM${RMx(b.amaun)}`);
  }
  return m;
}

export const CSS_TUTUP = `
.lt-card{background:#fff;border-radius:14px;padding:14px;margin-bottom:12px;box-shadow:0 2px 8px rgba(15,23,42,.08)}
.lt-card h3{margin:0 0 8px;font-size:16px}.lt-card h4{margin:12px 0 6px;font-size:14px}
.lt-between{display:flex;justify-content:space-between;align-items:center;gap:8px}.lt-row{display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap}
.lt-muted{color:#64748b;font-size:13px}.lt-notice{background:#fef3c7;color:#92400e;border-radius:10px;padding:8px 10px;margin-top:8px;font-size:13px}
.lt-tag{padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;background:#e2e8f0}.lt-dihantar{background:#fef3c7;color:#92400e}.lt-disahkan{background:#dcfce7;color:#166534}
.lt-scroll{overflow-x:auto}.lt-t{border-collapse:collapse;width:100%;font-size:12px;min-width:820px}.lt-t th,.lt-t td{border-bottom:1px solid #e2e8f0;padding:5px 4px;text-align:left;vertical-align:top}
.lt-t th{background:#fff7d6;font-size:11px}.lt-t td.r{text-align:right;white-space:nowrap}.lt-tot td{font-weight:800;background:#fffbea}
.lt-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:640px){.lt-grid{grid-template-columns:1fr}}
.lt-ln{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dotted #cbd5e1;font-size:14px}.lt-big{font-size:16px;font-weight:800}
.lt-pos{color:#166534}.lt-neg{color:#b91c1c}.lt-chk{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
.lt-chk span{flex:1}.lt-chk input{width:20px;height:20px;margin:0}.lt-foto{width:100%;max-height:340px;object-fit:contain;border-radius:10px;background:#0f172a;cursor:zoom-in}
.lt-btn{border:0;border-radius:10px;padding:11px 12px;font-weight:700;background:#e2e8f0;cursor:pointer;font-size:14px}.lt-pri{background:#14532d;color:#fff}.lt-wa{background:#16a34a;color:#fff}
.lt-x{padding:4px 9px;background:#fee2e2;color:#b91c1c}.lt-bigbtn{width:100%;padding:15px;font-size:16px;margin-top:10px}.lt-btn:disabled{opacity:.45}
`;
