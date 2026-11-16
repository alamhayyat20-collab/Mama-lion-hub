// =====================================================================
// i18n-lib.js — pilihan bahasa Melayu / English untuk semua apps
// Teks asal dalam Bahasa Melayu; dalam mod EN, teks antara muka diterjemah ikut kamus (padanan tepat + pola).
// Kandungan pengguna (nama, plat, promosi, nama pakej) tidak diterjemah kerana tiada dalam kamus.
// =====================================================================
const RUANG = /^(\s*)([\s\S]*?)(\s*)$/;
const AWALAN = /^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N})]*)$/u;   // emoji / simbol di hadapan & tanda baca di hujung

export function pasangBahasa({kamus = {}, pola = [], kunci = 'bahasa', tempat = null, kelas = '', ringkas = false} = {}){
  let bahasa = (() => { try{ return localStorage.getItem(kunci) || 'ms'; }catch(_){ return 'ms'; } })();
  const K = new Map(); pola = [...pola];
  const kunciN = k => k.replace(/\s+/g, ' ').trim();
  const escRe = s => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  (Array.isArray(kamus) ? kamus : [kamus]).forEach(km => Object.entries(km).forEach(([k0, v]) => {
    const k = kunciN(k0);
    if(!k.includes('{}')){ K.set(k, v); return; }
    // kunci berpola: {} = nilai dinamik; terjemahan guna {} ikut turutan atau {1},{2}…
    const re = new RegExp('^' + escRe(k).replace(/\\\{\\\}|\{\}/g, '([\\s\\S]+?)') + '$');
    let n = 0; const g = v.replace(/\{(\d*)\}/g, (m, d) => '\u0000' + (d ? +d : ++n) + '\u0000');
    pola.push([re, (...m) => g.replace(/\u0000(\d+)\u0000/g, (x, i) => { const c = m[+i] ?? ''; return c.trim() ? tr(c) : c; })]);
    const kp = kunciN(k.replace(/^\{\}\s*|\s*\{\}$/g, '')), vp = v.replace(/^\{1?\}\s*|\s*\{\d*\}$/g, '').trim();
    if(kp && !kp.includes('{}') && !K.has(kp) && /\p{L}{2}/u.test(kp)) K.set(kp, vp);
  }));
  const asal = new WeakMap();
  const HARI_EN = {Ahd:'Sun', Isn:'Mon', Sel:'Tue', Rab:'Wed', Kha:'Thu', Jum:'Fri', Sab:'Sat'}, BLN_EN = {Mac:'Mar', Mei:'May', Ogo:'Aug', Ogos:'Aug', Okt:'Oct', Dis:'Dec'};
  const INLINE = [[/\b(Ahd|Isn|Sel|Rab|Kha|Jum|Sab)(?= \d{1,2}\b)/g, m => HARI_EN[m]], [/(\b\d{1,2} |^)(Mac|Mei|Ogos?|Okt|Dis)(?=\b)/g, (m, a, b) => a + BLN_EN[b]],
    [/\b(\d+) minit\b/g, '$1 min'], [/\b(\d+)j (\d+)m\b/g, '$1h $2m']];
  const inline = t => INLINE.reduce((r, [re, g]) => r.replace(re, g), t);
  function tr(s){
    if(bahasa !== 'en' || s == null) return s;
    return inline(tr0(String(s)));
  }
  function tr0(str){
    const [, a, inti, b] = str.match(RUANG);
    if(!inti) return str;
    const n = inti.replace(/\s+/g, ' ');
    if(K.has(n)) return a + K.get(n) + b;
    for(const [re, ganti] of pola){ if(re.test(n)) return a + n.replace(re, ganti) + b; }
    const m = n.match(AWALAN);
    if(m && (m[1] || m[3]) && m[2]){
      const t = K.get(m[2]) ?? pola.reduce((r, [re, g]) => r ?? (re.test(m[2]) ? m[2].replace(re, g) : null), null);
      if(t != null) return a + m[1] + t + m[3] + b;
    }
    for(const pem of [' · ', ' — ', ': ']){
      if(n.includes(pem)){ const bh = n.split(pem), tb = bh.map(x => tr(x)); if(tb.some((x, i) => x !== bh[i])) return a + tb.join(pem) + b; }
    }
    return str;
  }
  const ATR = ['placeholder', 'title', 'aria-label', 'alt'];
  function terjemahNod(root){
    if(bahasa !== 'en' || !root) return;
    if(root.nodeType === 3){ const p = root.parentElement; if(p && !['SCRIPT','STYLE','TEXTAREA'].includes(p.tagName) && !p.closest('[data-tiada-terjemah]')){ const v = root.nodeValue, t = tr(v); if(t !== v){ asal.set(root, v); root.nodeValue = t; } } return; }
    if(root.nodeType !== 1 || root.closest?.('[data-tiada-terjemah]')) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    const nod = []; while((n = w.nextNode())) nod.push(n); nod.forEach(terjemahNod);
    [root, ...root.querySelectorAll('[placeholder],[title],[aria-label],[alt],input[type=button],input[type=submit]')].forEach(e => {
      ATR.forEach(at => { const v = e.getAttribute?.(at); if(v){ const t = tr(v); if(t !== v) e.setAttribute(at, t); } });
      if(e.tagName === 'INPUT' && /^(button|submit)$/.test(e.type) && e.value){ const t = tr(e.value); if(t !== e.value) e.value = t; }
    });
  }
  let sibuk = false;
  const pemerhati = new MutationObserver(senarai => {
    if(bahasa !== 'en' || sibuk) return; sibuk = true;
    try{ for(const m of senarai){ if(m.type === 'characterData') terjemahNod(m.target); else m.addedNodes.forEach(terjemahNod); } } finally { sibuk = false; }
  });
  // dialog & tarikh
  const _confirm = window.confirm.bind(window), _alert = window.alert.bind(window), _prompt = window.prompt.bind(window);
  window.confirm = m => _confirm(tr(m)); window.alert = m => _alert(tr(m)); window.prompt = (m, d) => _prompt(tr(m), d);
  if(bahasa === 'en'){ document.documentElement.lang = 'en'; const mula = () => { terjemahNod(document.body); pemerhati.observe(document.body, {childList: true, subtree: true, characterData: true}); }; document.body ? mula() : addEventListener('DOMContentLoaded', mula); }
  function tukar(b){ try{ localStorage.setItem(kunci, b); }catch(_){} location.reload(); }
  function butang(){
    if(ringkas) return `<button type="button" class="pilih-bahasa ${kelas}" data-tiada-terjemah data-bahasa="${bahasa === 'en' ? 'ms' : 'en'}" title="Bahasa / Language" style="border:1.5px solid currentColor;background:transparent;color:inherit;border-radius:999px;padding:5px 9px;min-height:32px;font-weight:800;font-size:12px;cursor:pointer">🌐 ${bahasa === 'en' ? 'EN' : 'BM'}</button>`;
    return `<span class="pilih-bahasa ${kelas}" data-tiada-terjemah role="group" aria-label="Bahasa / Language" style="display:inline-flex;border-radius:999px;overflow:hidden;border:1.5px solid currentColor;font-weight:800;font-size:12px;vertical-align:middle">
      ${['ms', 'en'].map(b => `<button type="button" data-bahasa="${b}" aria-pressed="${b === bahasa}" style="border:0;padding:6px 10px;min-height:32px;cursor:pointer;font:inherit;${b === bahasa ? 'background:#d7b25a;color:#0d2a20;' : 'background:transparent;color:inherit;'}">${b === 'ms' ? 'BM' : 'EN'}</button>`).join('')}</span>`;
  }
  function pasangButang(sel = tempat){
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel; if(!el) return;
    if(!el.querySelector('.pilih-bahasa')) el.insertAdjacentHTML('beforeend', butang());
    el.querySelectorAll('[data-bahasa]').forEach(x => x.onclick = () => { if(x.dataset.bahasa !== bahasa) tukar(x.dataset.bahasa); });
  }
  if(tempat){ const p = () => pasangButang(tempat); document.body ? p() : addEventListener('DOMContentLoaded', p); }
  window.tr = tr;
  return {tr, bahasa: () => bahasa, tukar, butang, pasangButang, terjemah: terjemahNod};
}
