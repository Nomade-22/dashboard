'use strict';
(()=>{
  const API='https://multprest-sync-gateway-jhonatan23.vercel.app';
  const SESSION='multprest_platform_session_key_v1';
  const VERIFIER='O0y9vs6ydPjZzK5LvD6-WL-m-Z-AfZYy2Xq1FDi1t_A';
  const script=document.currentScript;
  const scope=script?.dataset?.scope||'';
  const PREFIXES={orcamentos:['multprest_orc_'], 'calc-hh':['multprest_calc_hh_'], precos:['multprest_prices_'], adequacoes:['adq_civis_']};
  const b64u=buf=>{let s='';new Uint8Array(buf).forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
  const from64=s=>{s=String(s||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a};
  const sessionKey=()=>sessionStorage.getItem(SESSION)||'';
  async function validKey(v){try{const raw=from64(v);if(raw.length!==32)return false;const k=await crypto.subtle.importKey('raw',raw,{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode('multprest-auth-v1'));return b64u(sig)===VERIFIER}catch{return false}}
  function rootPath(){try{return new URL('./',script.src).pathname}catch{return '/dashboard/teste-plataforma/'}}
  function goLogin(){location.replace(`${rootPath()}login/?next=${encodeURIComponent(location.href)}`)}
  function collect(){const ps=PREFIXES[scope]||[];const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(ps.some(p=>k.startsWith(p)))out[k]=localStorage.getItem(k)}return out}
  function apply(data){const ps=PREFIXES[scope]||[];const remove=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(ps.some(p=>k.startsWith(p)))remove.push(k)}remove.forEach(k=>localStorage.removeItem(k));Object.entries(data||{}).forEach(([k,v])=>{if(ps.some(p=>k.startsWith(p)))localStorage.setItem(k,String(v))})}
  async function api(path,init={}){const k=sessionKey();const r=await fetch(`${API}${path}`,{...init,headers:{Accept:'application/json',...(init.headers||{}),...(k?{Authorization:`Bearer ${k}`}:{})},cache:'no-store'});let data=null;try{data=await r.json()}catch{}if(!r.ok)throw new Error(data?.error||`HTTP ${r.status}`);return data}
  function inject(){
    const host=document.querySelector('header')||document.body.firstElementChild||document.body;
    const bar=document.createElement('div');bar.id='mpSecureBar';
    bar.innerHTML=`<div><span class="mp-dot"></span><b>Plataforma protegida</b><small id="mpSyncStatus">Verificando sincronização remota...</small></div><div class="mp-actions"><span id="mpRemoteActions"></span><button id="mpLogout">Sair</button></div>`;
    const st=document.createElement('style');st.textContent='#mpSecureBar{position:relative;z-index:60;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 16px;border-bottom:1px solid rgba(16,185,129,.22);background:rgba(6,18,27,.96);color:#d1fae5;font:600 11px Inter,system-ui,sans-serif}#mpSecureBar>div{display:flex;align-items:center;gap:8px}#mpSecureBar small{color:#94a3b8;font-size:9px;font-weight:500}.mp-dot{width:8px;height:8px;border-radius:50%;background:#f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,.14)}.mp-dot.ok{background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.13)}.mp-dot.bad{background:#ef4444;box-shadow:0 0 0 4px rgba(239,68,68,.13)}.mp-actions button{border:1px solid #315069;background:#112235;color:#dbeafe;border-radius:7px;padding:6px 9px;font:700 9px Inter,system-ui;cursor:pointer}.mp-actions .primary{background:#047857;border-color:#059669;color:white}@media(max-width:650px){#mpSecureBar{align-items:flex-start;flex-direction:column}.mp-actions{width:100%;flex-wrap:wrap}}';document.head.appendChild(st);
    host.insertAdjacentElement('afterend',bar);
    bar.querySelector('#mpLogout').onclick=()=>{sessionStorage.removeItem(SESSION);goLogin()};
    return bar;
  }
  async function setupRemote(bar){
    const status=bar.querySelector('#mpSyncStatus'),dot=bar.querySelector('.mp-dot'),actions=bar.querySelector('#mpRemoteActions');
    try{
      const health=await api('/api/health');
      if(!health?.ok||!health?.storage)throw new Error('armazenamento indisponível');
      await api('/api/auth-check',{method:'POST'});
      dot.classList.add('ok');status.textContent='Sincronização remota online';
      if(scope){
        actions.innerHTML='<button class="primary" id="mpSaveRemote">Salvar no banco</button><button id="mpLoadRemote">Carregar do banco</button>';
        actions.querySelector('#mpSaveRemote').onclick=async()=>{try{status.textContent='Salvando cópia criptografada...';await api(`/api/state?scope=${encodeURIComponent(scope)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:collect()})});status.textContent=`Salvo no banco • ${new Date().toLocaleTimeString('pt-BR')}`}catch(e){status.textContent=`Erro ao salvar: ${e.message}`}};
        actions.querySelector('#mpLoadRemote').onclick=async()=>{try{status.textContent='Buscando cópia remota...';const r=await api(`/api/state?scope=${encodeURIComponent(scope)}`);if(!r?.data){status.textContent='Ainda não existe cópia remota deste módulo';return}if(!confirm('Carregar a cópia do banco? Os dados locais deste módulo serão substituídos.')){status.textContent='Carregamento cancelado';return}apply(r.data);status.textContent='Cópia carregada. Reabrindo módulo...';location.reload()}catch(e){status.textContent=`Erro ao carregar: ${e.message}`}};
      }
    }catch(e){dot.classList.add('bad');status.textContent='Remoto offline • sistema continua local';actions.innerHTML='';console.warn('Sincronização remota indisponível:',e)}
  }
  async function init(){const k=sessionKey();if(!k||!(await validKey(k))){sessionStorage.removeItem(SESSION);goLogin();return}const bar=inject();setupRemote(bar)}
  init();
})();
