'use strict';
(()=>{
 const API='https://multprest-route-gateway-jhonatan23.vercel.app',SESSION='multprest_platform_session_key_v1';
 const $=s=>document.querySelector(s),status=$('#status'),btn=$('#loginBtn');
 const b64u=buf=>{let s='';new Uint8Array(buf).forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
 const from64=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a};
 async function derive(password,salt,iterations){const enc=new TextEncoder(),base=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:from64(salt),iterations,hash:'SHA-256'},base,256);return b64u(bits)}
 function rootPath(){const marker='/dashboard/';const i=location.pathname.indexOf(marker);return i>=0?location.pathname.slice(0,i+marker.length):'/';}
 function nextUrl(){const raw=new URLSearchParams(location.search).get('next');if(!raw)return `${location.origin}${rootPath()}`;try{const u=new URL(raw);return u.origin===location.origin?u.href:`${location.origin}${rootPath()}`}catch{return `${location.origin}${rootPath()}`}}
 async function check(key){const r=await fetch(`${API}/api/auth-check`,{method:'POST',headers:{Authorization:`Bearer ${key}`,Accept:'application/json'},cache:'no-store'});if(!r.ok){let j={};try{j=await r.json()}catch{}throw new Error(j.error||'Senha inválida')}return r.json()}
 async function existing(){const k=sessionStorage.getItem(SESSION);if(!k)return;try{await check(k);location.replace(nextUrl())}catch{sessionStorage.removeItem(SESSION)}}
 $('#loginForm').onsubmit=async e=>{e.preventDefault();status.textContent='';btn.disabled=true;btn.textContent='Entrando...';try{const sr=await fetch(`${API}/api/auth-salt`,{headers:{Accept:'application/json'},cache:'no-store'});if(!sr.ok)throw new Error('Não foi possível iniciar o login');const cfg=await sr.json(),key=await derive($('#password').value,cfg.salt,Number(cfg.iterations)||310000);await check(key);sessionStorage.setItem(SESSION,key);status.className='status ok';status.textContent='Acesso autorizado.';location.replace(nextUrl())}catch(err){status.className='status';status.textContent=err.message||'Senha inválida';$('#password').select()}finally{btn.disabled=false;btn.textContent='Entrar'}};
 existing();
})();
