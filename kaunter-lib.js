// =====================================================================
// kaunter-lib.js — operasi kaunter dikongsi oleh Lion Safari V2 & Apps Pekerja (kuasa 💳 Kaunter)
//   status order, bayaran, jualan harian ke Akaun, cop Safari Members,
//   status kenderaan untuk Apps Pelanggan, tempahan dari Apps Pelanggan
// ctx = {store, fs:{collection, doc, query, where, getDoc, getDocs, setDoc, updateDoc, deleteDoc, runTransaction, serverTimestamp},
//        pengguna: () => nama, tanda: () => ({olehId, olehCaw}) }   (tanda: Apps Pekerja sahaja)
// =====================================================================
import { tambahCop, dataStatus, KAD, dataAwam, normPlat, hariOperasi } from './safari-lib.js?v=2026.11.19-3';

const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
const pad = (n, l = 2) => String(n).padStart(l, '0');
const hariIni = () => hariOperasi();   // hari operasi (cut-off 4 pagi)
export const KAEDAH_BAYAR = ['Tunai', 'QR / eWallet', 'Kad', 'Transfer'];
export const STATUS_TEMPAHAN = {baru: '⏳ Menunggu pengesahan', diterima: '✅ Diterima', ditolak: '❌ Ditolak', batal: 'Dibatalkan'};

export function kaunter(ctx){
  const {store, fs} = ctx;
  const T = () => ctx.tanda ? ctx.tanda() : {};
  const col = (c, n) => fs.collection(store, 'lionsafari', c, n);

  // Status kenderaan untuk Apps Pelanggan
  async function cermin(o, c, tambah = {}){
    if(o?.plat && o?.id) fs.setDoc(fs.doc(store, 'lionsafari', c, 'bayar_awam', normPlat(o.plat)), {...dataAwam({...o, ...tambah}, c), ...T()}).catch(e => console.warn('bayar_awam', e));
    if(!o?.ahli?.id) return;
    try{ await fs.setDoc(fs.doc(store, 'ahli', o.ahli.id, 'status', o.id), {...dataStatus(o, c, tambah), ...T()}, {merge: true}); }catch(e){ console.warn('status pelanggan', e); }
  }

  async function tukarStatus(o, c, st){
    const d = {status: st, ['masa' + st]: Date.now(), dikemaskiniOleh: ctx.pengguna(), ...T()};
    await fs.updateDoc(fs.doc(col(c, 'order'), o.id), d);
    cermin({...o, ...d}, c);
  }

  async function tukarBay(o, c, bay){
    await fs.updateDoc(fs.doc(col(c, 'order'), o.id), {bay, dikemaskiniOleh: ctx.pengguna(), ...T()});
  }

  // Jualan harian ke Akaun (akaun/{c}/entri/ls-{tarikh})
  async function akaunHari(c, tarikh){
    try{
      const s = await fs.getDocs(fs.query(col(c, 'order'), fs.where('tarikhBayar', '==', tarikh)));
      const paid = s.docs.map(d => d.data()).filter(o => o.status !== 'Batal' && o.bayar);
      const ref = fs.doc(fs.collection(store, 'akaun', c, 'entri'), 'ls-' + tarikh);
      if(!paid.length) return;
      const by = k => r2(paid.filter(o => o.bayar.kaedah === k).reduce((t, o) => t + (Number(o.jumlah) || 0), 0));
      const tunai = by('Tunai'), qr = by('QR / eWallet'), kad = by('Kad'), lain = by('Transfer');
      await fs.setDoc(ref, {jenis:'jualan', tarikh, bulan: tarikh.slice(0,7), cawangan: c, tunai, qr, kad, ewallet: 0, lain,
        kereta: paid.length, amaun: r2(tunai + qr + kad + lain), catatan: `Auto dari Lion Safari (${paid.length} order${lain ? `, Transfer RM${lain}` : ''})`,
        sumber: 'lionsafari', auto: true, guna_petty: false, hutang: false, oleh: 'Lion Safari', dikemaskini: fs.serverTimestamp(), ...T()});
    }catch(e){ console.error(e); throw new Error('Bayaran disimpan, tetapi jualan gagal dihantar ke Akaun: ' + (e.code || e.message)); }
  }

  // Cop Safari Members selepas bayaran (bukan Free Wash)
  async function beriCop(o, c){
    if(!o?.ahli || o.freeWash || o.pakejId === 'bike-wash') return '';
    const ref = fs.doc(store, 'ahli', o.ahli.id);
    try{
      const h = await fs.runTransaction(store, async tx => {
        const s = await tx.get(ref); if(!s.exists()) throw new Error('Ahli tidak dijumpai');
        const r = tambahCop(s.data(), {orderId: o.id, plat: o.plat, cawangan: c, tarikh: o.tarikhBayar || hariIni(), pakejId: o.pakejId || '', jumlah: o.jumlah || 0});
        if(!r.ok){ if(r.data) tx.update(ref, r.data); return {ok: false, sebab: r.sebab}; }
        tx.update(ref, {...r.data, ...T()});
        return {ok: true, bil: r.data.cop.length, dapat: r.dapatFreeWash, selesai: r.data.cop.length === 0, aktif: r.diaktifkan};
      });
      const info = !h.ok ? `Tiada cop: ${h.sebab}` : h.dapat ? `⭐ Cop diberi — 🎁 DAPAT 1 FREE WASH!${h.selesai ? ' (kad penuh, bermula semula)' : ''}` : `⭐ Cop ${h.bil}/${KAD.saiz} diberi${h.aktif ? ' — kad loyalti kini AKTIF' : ''}`;
      await fs.updateDoc(fs.doc(col(c, 'order'), o.id), {copInfo: info, copGagal: false, cop: !!h.ok, ...T()});
      if(h.ok) fs.setDoc(fs.doc(store, 'ahli', o.ahli.id, 'sejarah', o.id), {tarikh: o.tarikhBayar || hariIni(), cawangan: c, plat: o.plat, pakej: o.pakej, jumlah: o.jumlah, cop: true, masa: Date.now(), ...T()}).catch(console.error);
      return info;
    }catch(e){
      console.error(e);
      fs.updateDoc(fs.doc(col(c, 'order'), o.id), {copGagal: true, ...T()}).catch(() => {});
      return '⚠ Cop gagal diberi — cuba lagi di kaunter';
    }
  }

  // Bayaran biasa (Free Wash & diskaun melebihi had: di kaunter V2 dengan PIN)
  async function bayar(o, c, {kaedah, rujukan = '', bukti = '', diterima = 0, diskaun = 0, diskaunLulus = ''}){
    const t = hariIni(), jumlah = Math.max(0, r2((Number(o.jumlahKasar) || 0) - (Number(diskaun) || 0)));
    const data = {bayar: {kaedah, rujukan, bukti, diterima: kaedah === 'Tunai' ? (diterima || jumlah) : 0, baki: kaedah === 'Tunai' ? Math.max(0, r2((diterima || jumlah) - jumlah)) : 0},
      diskaun: Number(diskaun) || 0, diskaunLulus, jumlah, status: 'Selesai', aktif: false, tarikhBayar: t, bulanBayar: t.slice(0,7),
      dibayarOleh: ctx.pengguna(), masaBayar: Date.now(), ...T()};
    await fs.updateDoc(fs.doc(col(c, 'order'), o.id), data);
    const baru = {...o, ...data};
    cermin(baru, c, {status: 'Selesai', aktif: false});
    let mesej = '';
    try{ await akaunHari(c, t); }catch(e){ mesej = e.message; }
    const cop = await beriCop(baru, c);
    return {data: baru, mesej: [cop, mesej].filter(Boolean).join(' · ')};
  }

  // Tempahan dari Apps Pelanggan → order kaunter
  async function terimaTempahan(tp, c, {no, bay = ''}){
    const t = hariIni(), ref = fs.doc(col(c, 'order'));
    const o = {no, plat: tp.plat, nama: tp.nama, telefon: tp.telefon, kenderaan: tp.kenderaan || '', tambahanKenderaan: 0,
      pakejId: tp.pakejId, pakej: tp.pakej, hargaPakej: Number(tp.hargaPakej) || 0, addon: tp.addon || [],
      jumlahKasar: Number(tp.jumlah) || 0, diskaun: 0, jumlah: Number(tp.jumlah) || 0, bay, catatan: tp.catatan || '', status: 'Menunggu', aktif: true,
      ahli: tp.ahliId ? {id: tp.ahliId, kod: tp.ahliKod || '', nama: tp.nama} : null, freeWash: null, mo: null, komisen: 0,
      tempahanId: tp.id, sumber: 'tempahan', tarikh: t, bulan: t.slice(0,7),
      dibuatOleh: `${ctx.pengguna()} (tempahan)`, dibuat: fs.serverTimestamp(), masaDibuat: Date.now(), ...T()};
    await fs.setDoc(ref, o);
    await fs.updateDoc(fs.doc(col(c, 'tempahan'), tp.id), {status: 'diterima', orderId: ref.id, diterimaOleh: ctx.pengguna(), masaDiterima: Date.now(), ...T()});
    cermin({...o, id: ref.id}, c);
    return {...o, id: ref.id};
  }
  async function tolakTempahan(tp, c, sebab){
    await fs.updateDoc(fs.doc(col(c, 'tempahan'), tp.id), {status: 'ditolak', sebabTolak: sebab || '', ditolakOleh: ctx.pengguna(), masaDitolak: Date.now(), ...T()});
  }

  return {cermin, tukarStatus, tukarBay, akaunHari, beriCop, bayar, terimaTempahan, tolakTempahan};
}
