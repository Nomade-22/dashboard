'use strict';
(()=>{
  const API='https://multprest-route-gateway-jhonatan23.vercel.app';
  const SESSION='multprest_platform_session_key_v1';
  const script=document.currentScript;
  const scope=script?.dataset?.scope||'';
  const PREFIXES={orcamentos:['multprest_orc_'],'calc-hh':['multprest_calc_hh_'],precos:['multprest_prices_'],adequacoes:['adq_civis_']};
  const key=()=>sessionStorage.getItem(SESSION)||'';
  function rootPath(){const marker='/dashboard/';const i=location.pathname.indexOf(marker);return i>=0?location.pathname.slice(0,i+marker.length):'/';}
  function goLogin(){const next=location.href;location.replace(`${rootPath()}login/?next=${encodeURIComponent(next)}`);}
  async function api(path,init={}){const k=key();const r=await fetch(`${API}${path}`,{...init,headers:{Accept:'application/json',...(init.headers||{}),...(k?{Authorization:`Bearer ${k}`}:{})},cache:'no-store'});let data=null;try{data=await r.json()}catch{}if(!r.ok)throw new Error(data?.error||`HTTP ${r.status}`);return data;}
  function collect(){const ps=PREFIXES[scope]||[];const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(ps.some(p=>k.startsWith(p)))out[k]=localStorage.getItem(k)}return out;}
  function apply(data){const ps=PREFIXES[scope]||[];const remove=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(ps.some(p=>k.startsWith(p)))remove.push(k)}remove.forEach(k=>localStorage.removeItem(k));Object.entries(data||{}).forEach(([k,v])=>{if(ps.some(p=>k.startsWith(p)))localStorage.setItem(k,String(v))});}
  function inject(){
    const host=document.querySelector('header')||document.body.firstElementChild||document.body;
    const bar=document.createElement('div');bar.id='mpSecureBar';
    bar.innerHTML=`<div><span class="mp-dot"></span><b>Plataforma protegida</b><small id="mpSyncStatus">Sessão administrativa ativa</small></div><div class="mp-actions">${scope?'<button id="mpSaveRemote">Salvar no banco</button><button id="mpLoadRemote">Carregar do banco</button>':''}<button id="mpLogout">Sair</button></div>`;
    const st=document.createElement('style');st.textContent=`#mpSecureBar{position:relative;z-index:60;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 16px;border-bottom:1px solid rgba(16,185,129,.22);background:rgba(6,18,27,.96);color:#d1fae5;font:600 11px Inter,system-ui,sans-serif}#mpSecureBar>div{display:flex;align-items:center;gap:8px}#mpSecureBar small{color:#94a3b8;font-size:9px;font-weight:500}.mp-dot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.13)}.mp-actions button{border:1px solid #315069;background:#112235;color:#dbeafe;border-radius:7px;padding:6px 9px;font:700 9px Inter,system-ui;cursor:pointer}.mp-actions button:first-child{background:#047857;border-color:#059669;color:white}@media(max-width:650px){#mpSecureBar{align-items:flex-start;flex-direction:column}.mp-actions{width:100%;flex-wrap:wrap}}`;document.head.appendChild(st);
    host.insertAdjacentElement('afterend',bar);
    bar.querySelector('#mpLogout').onclick=()=>{sessionStorage.removeItem(SESSION);goLogin()};
    if(scope){
      bar.querySelector('#mpSaveRemote').onclick=async()=>{const s=bar.querySelector('#mpSyncStatus');try{s.textContent='Salvando cópia criptografada...';await api(`/api/state?scope=${encodeURIComponent(scope)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:collect()})});s.textContent=`Salvo no banco • ${new Date().toLocaleTimeString('pt-BR')}`}catch(e){s.textContent=`Erro ao salvar: ${e.message}`}};
      bar.querySelector('#mpLoadRemote').onclick=async()=>{const s=bar.querySelector('#mpSyncStatus');try{s.textContent='Buscando cópia criptografada...';const r=await api(`/api/state?scope=${encodeURIComponent(scope)}`);if(!r?.data){s.textContent='Ainda não existe cópia remota deste módulo';return}if(!confirm('Carregar a cópia do banco? Os dados locais deste módulo serão substituídos.')){s.textContent='Carregamento cancelado';return}apply(r.data);s.textContent='Cópia carregada. Reabrindo módulo...';location.reload()}catch(e){s.textContent=`Erro ao carregar: ${e.message}`}};
    }
  }
  async function init(){if(!key()){goLogin();return}try{await api('/api/auth-check',{method:'POST'});inject()}catch{sessionStorage.removeItem(SESSION);goLogin()}}
  init();
})();
