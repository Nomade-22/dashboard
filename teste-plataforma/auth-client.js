'use strict';
(()=>{
  const SESSION='multprest_platform_session_key_v1';
  const VERIFIER='4FrQi3xwRPHmNvkD7VKwR19WrRyE3LJtyYj7JwtkNB4';
  const script=document.currentScript;
  const b64u=buf=>{let s='';new Uint8Array(buf).forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
  const from64=s=>{s=String(s||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a};
  async function validKey(v){try{const raw=from64(v);if(raw.length!==32)return false;const k=await crypto.subtle.importKey('raw',raw,{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode('multprest-auth-v1'));return b64u(sig)===VERIFIER}catch{return false}}
  function rootPath(){try{return new URL('./',script.src).pathname}catch{return '/dashboard/teste-plataforma/'}}
  function goLogin(){location.replace(`${rootPath()}login/?next=${encodeURIComponent(location.href)}`)}
  function inject(){
    const host=document.querySelector('header')||document.body.firstElementChild||document.body;
    const bar=document.createElement('div');bar.id='mpSecureBar';
    bar.innerHTML='<div><span class="mp-dot"></span><b>Plataforma protegida</b><small>Versão de teste • dados deste navegador</small></div><div class="mp-actions"><button id="mpLogout">Sair</button></div>';
    const st=document.createElement('style');st.textContent='#mpSecureBar{position:relative;z-index:60;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 16px;border-bottom:1px solid rgba(16,185,129,.22);background:rgba(6,18,27,.96);color:#d1fae5;font:600 11px Inter,system-ui,sans-serif}#mpSecureBar>div{display:flex;align-items:center;gap:8px}#mpSecureBar small{color:#94a3b8;font-size:9px;font-weight:500}.mp-dot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.13)}.mp-actions button{border:1px solid #315069;background:#112235;color:#dbeafe;border-radius:7px;padding:6px 9px;font:700 9px Inter,system-ui;cursor:pointer}@media(max-width:650px){#mpSecureBar{align-items:flex-start;flex-direction:column}.mp-actions{width:100%;flex-wrap:wrap}}';document.head.appendChild(st);
    host.insertAdjacentElement('afterend',bar);
    bar.querySelector('#mpLogout').onclick=()=>{sessionStorage.removeItem(SESSION);goLogin()};
  }
  async function init(){const k=sessionStorage.getItem(SESSION)||'';if(!k||!(await validKey(k))){sessionStorage.removeItem(SESSION);goLogin();return}inject()}
  init();
})();
