import { firebaseConfig, BRANCH_ID } from './firebase-config.js';

const $=s=>document.querySelector(s);
const FLOW=['Waiting','Washing','Drying','QC','Ready','Completed'];
const DEFAULT_DB={
  orders:[
    {id:1,plate:'CDE1234',phone:'',pkg:'Premium',addon:0,bay:'Washing 1',status:'Washing',total:35,time:new Date().toLocaleString()},
    {id:2,plate:'VAA8899',phone:'',pkg:'Basic',addon:0,bay:'Drying',status:'Drying',total:18,time:new Date().toLocaleString()}
  ],
  stock:[
    {item:'Car Shampoo',qty:12,min:5,unit:'L',area:'Washing'},
    {item:'Wax',qty:4,min:5,unit:'L',area:'Drying'},
    {item:'Glass Cleaner',qty:8,min:3,unit:'L',area:'Drying'},
    {item:'Microfiber Cloth',qty:24,min:10,unit:'pcs',area:'Drying'},
    {item:'Nozzle',qty:4,min:2,unit:'pcs',area:'Washing'}
  ],
  petty:[],
  shift:{cashOpen:100,staff:'Cashier 1',openedAt:new Date().toLocaleString()},
  music:{playing:false,vol:35},
  nextId:3
};

// ---------- Role-based access ----------
// Management can see everything. Others are limited to what their job needs.
const ALL_TABS=['Dashboard','New Order','Queue','Payment','Petty Cash','Inventory','Shift','Music'];
const ROLE_TABS={
  Management:  ALL_TABS,
  Cashier:     ['Dashboard','New Order','Queue','Payment','Music'],
  Storekeeper: ['Dashboard','Inventory','Shift']
};
function visibleTabs(){
  if(!CLOUD_ENABLED) return ALL_TABS; // local-only demo mode: no login required
  return ROLE_TABS[currentRole] || ['Dashboard'];
}

// ---------- Cloud sync + auth layer ----------
// If firebase-config.js still has placeholder values, run in local-only mode
// (same behaviour as before: no login, data stays on this device/browser only).
const CLOUD_ENABLED = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'PASTE_API_KEY_HERE';
let db = JSON.parse(localStorage.getItem('lsv1')||'null') || structuredClone(DEFAULT_DB);
let firestoreDoc=null, firestoreSetDoc=null, firestoreOnSnapshot=null, syncing=false;
let authInstance=null, currentUser=null, currentRole=null, currentStaffName='';
let loginError='';

async function initCloud(){
  if(!CLOUD_ENABLED){ render(); return; }

  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js');
  const { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } =
    await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
  const { getFirestore, doc, setDoc, onSnapshot, enableIndexedDbPersistence, collection, query, where, getDocs } =
    await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

  const app=initializeApp(firebaseConfig);
  const store=getFirestore(app);
  try{ await enableIndexedDbPersistence(store); }catch(e){ /* multi-tab or unsupported, ignore */ }
  authInstance=getAuth(app);

  window.doLogin=async function(){
    const email=$('#loginEmail').value.trim();
    const pass=$('#loginPass').value;
    loginError='';
    if(!email||!pass){ loginError='Sila isi email dan kata laluan.'; render(); return; }
    try{
      await signInWithEmailAndPassword(authInstance,email,pass);
    }catch(e){
      loginError = e.code==='auth/invalid-credential' ? 'Email atau kata laluan salah.' : ('Ralat log masuk: '+e.message);
      render();
    }
  };
  window.doLogout=function(){ signOut(authInstance); };

  onAuthStateChanged(authInstance, async user=>{
    if(user){
      currentUser=user;
      try{
        const q=query(collection(store,'staff'), where('email','==',user.email.toLowerCase()));
        const snap=await getDocs(q);
        if(snap.empty){
          loginError='Akaun ini belum didaftarkan sebagai staff. Hubungi Management untuk ditambah dalam senarai "staff" di Firestore.';
          currentUser=null; currentRole=null;
          signOut(authInstance);
          render();
          return;
        }
        const staff=snap.docs[0].data();
        currentRole=staff.role;
        currentStaffName=staff.name||user.email;
        if(!visibleTabs().includes(tab)) tab=visibleTabs()[0];
        setupDataSync(store,doc,setDoc,onSnapshot);
      }catch(e){
        loginError='Ralat menyemak peranan staff: '+e.message;
        render();
      }
    } else {
      currentUser=null; currentRole=null; currentStaffName='';
      render();
    }
  });
}

function setupDataSync(store,doc,setDoc,onSnapshot){
  firestoreDoc=doc(store,'branches',BRANCH_ID);
  firestoreSetDoc=setDoc;
  firestoreOnSnapshot=onSnapshot;
  firestoreOnSnapshot(firestoreDoc, snap=>{
    if(snap.exists()){
      syncing=true;
      db=snap.data();
      localStorage.setItem('lsv1',JSON.stringify(db));
      render();
      syncing=false;
    } else {
      firestoreSetDoc(firestoreDoc, db);
    }
    setStatus('☁ Cloud sync aktif','ok');
    render();
  }, err=>{
    console.error('Firestore sync error:', err);
    setStatus('⚠ Sync error — semak internet','warn');
  });
}

function setStatus(msg,cls){
  const el=$('#syncStatus');
  if(el){ el.textContent=msg; el.className='synctag '+(cls||''); }
}

function save(){
  localStorage.setItem('lsv1',JSON.stringify(db));
  if(CLOUD_ENABLED && firestoreDoc && !syncing){
    firestoreSetDoc(firestoreDoc, db).catch(e=>{
      console.error('Save to cloud failed:', e);
      setStatus('⚠ Gagal sync ke cloud (semak internet)','warn');
    });
  }
}

const rm=n=>'RM '+(+n||0).toFixed(2);

let tab='Dashboard', q='';

function nav(){
  const navEl=$('#nav');
  if(!navEl)return;
  const low=db.stock.filter(s=>s.qty<=s.min).length;
  const unpaid=db.orders.filter(o=>!o.paid).length;
  navEl.innerHTML=visibleTabs().map(x=>{
    let badge='';
    if(x==='Inventory'&&low) badge=`<span class='badge'>${low}</span>`;
    if(x==='Payment'&&unpaid) badge=`<span class='badge'>${unpaid}</span>`;
    return `<button class='${x==tab?'active':''}' onclick="tab='${x}';render()">${x}${badge}</button>`;
  }).join('');
}

function staffBox(){
  const el=$('#staffBox');
  if(!el)return;
  if(CLOUD_ENABLED && currentUser){
    el.innerHTML=`👤 ${currentStaffName} <span class='muted'>(${currentRole})</span> <button style='padding:3px 8px;margin-left:6px' onclick='doLogout()'>Log Keluar</button>`;
  } else {
    el.innerHTML='';
  }
}

function render(){
  // Gate: cloud mode requires login before showing any operational screen
  if(CLOUD_ENABLED && !currentUser){
    $('#nav').innerHTML='';
    $('#staffBox').innerHTML='';
    $('#app').innerHTML=loginScreen();
    return;
  }
  nav();
  staffBox();
  const f={Dashboard:dash,'New Order':newOrder,Queue:queue,Payment:payment,'Petty Cash':petty,Inventory:inventory,Shift:shift,Music:music}[tab] || dash;
  $('#app').innerHTML=f();
}
window.render=render; // exposed for onclick handlers

function loginScreen(){
  return `<div class='card' style='max-width:380px;margin:40px auto'>
    <h2>🦁 Log Masuk Staff</h2>
    <label>Email</label><input id='loginEmail' type='email' placeholder='nama@mamalion.com'>
    <label>Kata Laluan</label><input id='loginPass' type='password'>
    <button class='primary bigbtn' onclick='doLogin()' style='width:100%'>Log Masuk</button>
    <div class='err'>${loginError||''}</div>
    <p class='muted' style='font-size:12px;margin-top:12px'>Akaun staff didaftarkan oleh Management melalui Firebase Console (Authentication + koleksi "staff").</p>
  </div>`;
}

function dash(){
  const sales=db.orders.filter(o=>o.paid).reduce((a,b)=>a+b.total,0);
  const pettyNet=db.petty.reduce((a,p)=>a+(p.type==='Top-up'?p.amt:-p.amt),0);
  const low=db.stock.filter(s=>s.qty<=s.min).length;
  const active=db.orders.filter(o=>o.status!='Completed').length;
  const cashOnHand=db.shift.cashOpen + db.orders.filter(o=>o.paid==='Cash').reduce((a,b)=>a+b.total,0) + pettyNet;
  return `<div class='grid'>
    <div class='card'><div class='muted'>Queue aktif</div><div class='metric'>${active}</div></div>
    <div class='card'><div class='muted'>Jualan (paid)</div><div class='metric'>${rm(sales)}</div></div>
    <div class='card ${low?'warn':''}'><div class='muted'>Low stock</div><div class='metric'>${low}</div></div>
    <div class='card'><div class='muted'>Cash on hand (est.)</div><div class='metric'>${rm(cashOnHand)}</div></div>
  </div>
  <h3>Operasi semasa</h3>
  ${db.orders.length?orderTable(db.orders):`<div class='card empty'>Tiada order lagi. Pergi tab <b>New Order</b> untuk mula.</div>`}`;
}

function newOrder(){
  return `<div class='card'><h2>New Order</h2>
  <div class='two'>
    <div>
      <label>No. Plat</label><input id='plate' placeholder='ABC1234' style='text-transform:uppercase'>
      <label>No. Telefon</label><input id='phone' placeholder='01x-xxxxxxx'>
      <label>Pakej</label>
      <select id='pkg'>
        <option value='18'>Basic — RM18</option>
        <option value='25'>Standard — RM25</option>
        <option value='35'>Premium — RM35</option>
      </select>
    </div>
    <div>
      <label>Bay / Reception</label>
      <select id='bay'><option>Reception</option><option>Washing 1</option><option>Washing 2</option><option>Washing 3</option></select>
      <label>Add-on</label>
      <select id='addon'>
        <option value='0'>Tiada</option>
        <option value='8'>Wax + RM8</option>
        <option value='5'>Glass Treatment + RM5</option>
        <option value='10'>Extra Vacuum + RM10</option>
      </select>
      <button class='primary bigbtn' onclick='addOrder()'>Confirm Order</button>
      <div id='orderMsg' class='err'></div>
    </div>
  </div></div>`;
}

function addOrder(){
  const plate=$('#plate').value.trim().toUpperCase();
  const msg=$('#orderMsg');
  if(!plate){msg.textContent='Sila masukkan nombor plat.';return}
  if(db.orders.some(o=>o.plate===plate && o.status!=='Completed')){
    msg.textContent=`Kereta ${plate} sudah dalam queue (belum Completed).`;return;
  }
  const p=$('#pkg'), a=$('#addon');
  db.orders.push({
    id:db.nextId++,
    plate,
    phone:$('#phone').value.trim(),
    pkg:p.options[p.selectedIndex].text.split(' —')[0],
    addon:+a.value,
    bay:$('#bay').value,
    status:'Waiting',
    total:+p.value + +a.value,
    time:new Date().toLocaleString(),
    takenBy:currentStaffName||''
  });
  save(); tab='Queue'; render();
}

function orderTable(arr){
  return `<div class='card' style='overflow:auto'><table><tr><th>Plate</th><th>Pakej</th><th>Bay</th><th>Status</th><th>Total</th><th>Masa</th></tr>
  ${arr.map(o=>`<tr><td><b>${o.plate}</b></td><td>${o.pkg}</td><td>${o.bay}</td><td><span class='tag ${o.status==='Completed'?'ok':''}'>${o.status}</span></td><td>${rm(o.total)}</td><td class='muted' style='font-size:12px'>${o.time||''}</td></tr>`).join('')}
  </table></div>`;
}

function queue(){
  const list=db.orders.filter(o=>!q || o.plate.toLowerCase().includes(q.toLowerCase()));
  return `<div class='section-title'><h2>Queue & Bay Ops</h2><span class='tag'>Reception → Washing → Drying → QC → Ready → Payment</span></div>
  <input placeholder='Cari plat...' value='${q}' oninput='q=this.value;render()' style='max-width:260px'>
  ${list.length?list.map(o=>{
    const idx=db.orders.indexOf(o);
    const cur=FLOW.indexOf(o.status);
    return `<div class='card' style='margin-bottom:10px'>
      <div class='row' style='justify-content:space-between'>
        <div><b>${o.plate}</b> <span class='muted'>${o.pkg} · ${o.bay}</span></div>
        <span class='tag ${o.status==='Completed'?'ok':''}'>${o.status}</span>
      </div>
      <div class='row' style='margin-top:10px'>
        ${FLOW.map((s,i)=>`<button class='${i===cur?'active':''}' ${i<cur?'disabled':''} onclick="status(${idx},'${s}')">${s}</button>`).join('')}
      </div>
    </div>`;
  }).join(''):`<div class='card empty'>Tiada order sepadan.</div>`}`;
}

function status(i,s){db.orders[i].status=s;save();render()}

function payment(){
  const unpaid=db.orders.filter(o=>!o.paid && o.status!=='Waiting');
  return `<h2>Payment</h2>${unpaid.length?unpaid.map(o=>`
    <div class='card' style='margin-bottom:10px'>
      <div class='row' style='justify-content:space-between'><b>${o.plate}</b><b>${rm(o.total)}</b></div>
      <div class='muted' style='margin:4px 0'>${o.pkg}${o.addon?` + add-on RM${o.addon}`:''} · ${o.status}</div>
      <div class='row' style='margin-top:6px'>
        <button class='primary' onclick="pay('${o.plate}','Cash')">Cash</button>
        <button onclick="pay('${o.plate}','QR')">QR</button>
      </div>
    </div>`).join(''):`<div class='card empty'>Tiada bayaran tertunggak.</div>`}`;
}

function pay(p,m){
  const o=db.orders.find(x=>x.plate===p && !x.paid);
  if(!o)return;
  o.paid=m; o.status='Completed'; o.paidAt=new Date().toLocaleString(); o.paidBy=currentStaffName||'';
  save(); render();
  alert(`Payment recorded: ${m} — ${rm(o.total)}`);
}

function petty(){
  const net=db.petty.reduce((a,p)=>a+(p.type==='Top-up'?p.amt:-p.amt),0);
  return `<div class='two'>
    <div class='card'><h2>Petty Cash</h2>
      <label>Jenis</label><select id='ptype'><option>Expense</option><option>Top-up</option></select>
      <label>Jumlah (RM)</label><input id='pamt' type='number' min='0' step='0.01'>
      <label>Tujuan / Sebab</label><input id='preason'>
      <button class='primary' onclick='addPetty()'>Submit</button>
    </div>
    <div class='card'>
      <div class='row' style='justify-content:space-between'><h3 style='margin:0'>Rekod</h3><span class='tag'>Net: ${rm(net)}</span></div>
      ${db.petty.length?db.petty.map(p=>`<p><b>${p.type}</b> ${rm(p.amt)} — ${p.reason||'-'}<br><small class='muted'>${p.time}${p.by?` · ${p.by}`:''}</small></p>`).join(''):`<span class='muted'>Belum ada rekod</span>`}
    </div>
  </div>`;
}

function addPetty(){
  const amt=+$('#pamt').value;
  if(!amt||amt<=0)return alert('Masukkan jumlah yang sah.');
  db.petty.unshift({type:$('#ptype').value,amt,reason:$('#preason').value.trim(),time:new Date().toLocaleString(),by:currentStaffName||''});
  save(); render();
}

function inventory(){
  return `<div class='section-title'><h2>Central Inventory</h2><span class='tag'>Opening/Closing audit-ready</span></div>
  <div class='card' style='overflow:auto'><table><tr><th>Item</th><th>Area</th><th>Baki</th><th>Status</th><th>Action</th></tr>
  ${db.stock.map((s,i)=>`<tr class='${s.qty<=s.min?'warn':''}'>
    <td>${s.item}</td><td>${s.area}</td><td>${s.qty} ${s.unit}</td>
    <td>${s.qty<=s.min?'LOW STOCK':'OK'}</td>
    <td><button onclick='stock(${i},-1)'>Stock Out</button><button onclick='stock(${i},1)'>Stock In</button><button onclick='reportItem(${i})'>Rosak/Hilang</button></td>
  </tr>`).join('')}
  </table></div>
  <div class='card'><h3>Tambah Item Baru</h3>
    <div class='two'>
      <div><label>Nama Item</label><input id='nItem'></div>
      <div><label>Kawasan</label><select id='nArea'><option>Washing</option><option>Drying</option><option>QC</option><option>General</option></select></div>
      <div><label>Kuantiti Awal</label><input id='nQty' type='number' min='0'></div>
      <div><label>Unit</label><input id='nUnit' placeholder='L / pcs / kg'></div>
      <div><label>Min (amaran)</label><input id='nMin' type='number' min='0'></div>
    </div>
    <button class='primary' onclick='addStockItem()'>Tambah</button>
  </div>
  <p class='muted'>Setiap perubahan stok disimpan dalam data cawangan (sync ke semua peranti). Bukti gambar & approval belum tersedia dalam versi ini.</p>`;
}

function stock(i,n){db.stock[i].qty=Math.max(0,db.stock[i].qty+n);save();render()}
function reportItem(i){alert('Incident recorded for '+db.stock[i].item+' (demo)')}
function addStockItem(){
  const item=$('#nItem').value.trim();
  if(!item)return alert('Masukkan nama item.');
  db.stock.push({item,area:$('#nArea').value,qty:+$('#nQty').value||0,min:+$('#nMin').value||1,unit:$('#nUnit').value.trim()||'pcs'});
  save(); render();
}

function shift(){
  return `<div class='card'><h2>Shift Opening / Closing</h2>
    <label>Petugas</label><input id='staff' value='${db.shift.staff}'>
    <label>Opening Cash (RM)</label><input id='cash' type='number' value='${db.shift.cashOpen}'>
    <button class='primary' onclick='saveShift()'>Confirm Opening</button>
    <p class='muted' style='margin-top:8px'>Dibuka: ${db.shift.openedAt||'-'}</p>
    <hr>
    <p>Closing nanti akan reconcile: Cash sales + QR + Petty Cash + variance.</p>
    ${currentRole==='Management'||!CLOUD_ENABLED?`<div class='card warn'><b>Reset Demo Data</b><p class='muted'>Padam semua order/petty/stok dan mula semula (semua peranti — data cloud turut disentuh).</p>
      <button onclick='resetData()'>Reset</button>
    </div>`:''}
  </div>`;
}

function saveShift(){
  db.shift={staff:$('#staff').value.trim()||'Cashier',cashOpen:+$('#cash').value||0,openedAt:new Date().toLocaleString()};
  save(); render();
}

function resetData(){
  if(!confirm('Padam semua data dan mula semula?'))return;
  db=structuredClone(DEFAULT_DB);
  save(); render();
}

function music(){
  return `<div class='card'><h2>Music Control</h2>
    <p>Playlist ditetapkan oleh Management. Cashier hanya kawalan asas.</p>
    <div class='row'><button class='primary bigbtn' onclick='toggleMusic()'>${db.music.playing?'Pause':'Play'}</button></div>
    <label>Volume (maksimum 60%)</label>
    <input type='range' min='0' max='60' value='${db.music.vol}' oninput='setVol(this.value)'>
    <p>Volume: <b>${db.music.vol}%</b></p>
    <div class='card warn'>Production rule: Auto-pause mengikut jadual waktu azan / quiet period yang ditetapkan pengurusan.</div>
  </div>`;
}
function toggleMusic(){db.music.playing=!db.music.playing;save();render()}
function setVol(v){db.music.vol=+v;save();render()}

// expose functions used by inline onclick= handlers (needed because this file is a module)
Object.assign(window,{addOrder,status,pay,addPetty,stock,reportItem,addStockItem,saveShift,resetData,toggleMusic,setVol});

setInterval(()=>$('#clock')&&($('#clock').textContent=new Date().toLocaleTimeString()),1000);
setStatus(CLOUD_ENABLED?'☁ Menyambung...':'💾 Mod offline (local sahaja)', CLOUD_ENABLED?'':'warn');
render();
initCloud();
