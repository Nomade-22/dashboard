'use strict';
(()=>{
 const SESSION='multprest_platform_session_key_v1';
 const SALT='R0mmRGIQZsAnYM4nmjON0Q';
 const ITERATIONS=310000;
 const VERIFIER='4FrQi3xwRPHmNvkD7VKwR19WrRyE3LJtyYj7JwtkNB4';
 const $=s=>document.querySelector(s),status=$('#status'),btn=$('#loginBtn');
 const b64u=buf=>{let s='';new Uint8Array(buf).forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
 const from64=s=>{s=String(s||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a};
 async function derive(password){const enc=new TextEncoder(),base=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:from64(SALT),iterations:ITERATIONS,hash:'SHA-256'},base,256);return b64u(bits)}
 async function validKey(key){try{const raw=from64(key);if(raw.length!==32)return false;const k=await crypto.subtle.importKey('raw',raw,{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode('multprest-auth-v1'));return b64u(sig)===VERIFIER}catch{return false}}
 function platformRoot(){const p=location.pathname;const i=p.lastIndexOf('/login/');return i>=0?p.slice(0,i+1):new URL('../',location.href).pathname}
 function nextUrl(){const root=`${location.origin}${platformRoot()}`;const raw=new URLSearchParams(location.search).get('next');if(!raw)return root;try{const u=new URL(raw);return u.origin===location.origin&&u.pathname.startsWith(platformRoot())?u.href:root}catch{return root}}
 async function existing(){const k=sessionStorage.getItem(SESSION);if(!k)return;if(await validKey(k))location.replace(nextUrl());else sessionStorage.removeItem(SESSION)}
 $('#loginForm').onsubmit=async e=>{e.preventDefault();status.textContent='';btn.disabled=true;btn.textContent='Entrando...';try{const key=await derive($('#password').value);if(!(await validKey(key)))throw new Error('Senha inválida');sessionStorage.setItem(SESSION,key);status.className='status ok';status.textContent='Acesso autorizado.';location.replace(nextUrl())}catch(err){status.className='status';status.textContent=err.message||'Senha inválida';$('#password').select()}finally{btn.disabled=false;btn.textContent='Entrar'}};
 existing();
})();
