'use strict';
(() => {
  const LEGACY_API='https://adugefhgzqruajjdavba.supabase.co/functions/v1/multprest-legacy-history';
  const SESSION='multprest_platform_session_key_v1';
  const CALC_API='https://63a2001d-676d-47d6-a98d-4e0843dd6483.created.app';
  const PRICES_API='https://1c6ea4b9-b2b7-4514-aae1-ab1263b2b25d.created.app';
  let remoteRows=[];

  window.MULTPREST_DATA_SOURCES=window.MULTPREST_DATA_SOURCES||{};
  Object.assign(window.MULTPREST_DATA_SOURCES,{
    historico:{api:LEGACY_API,mode:'authenticated-read-only-legacy-bridge'},
    calcHH:{api:CALC_API,mode:'public-read-authenticated-write'},
    precos:{api:PRICES_API,mode:'public-read-authenticated-write'}
  });

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR')};
  const authHeaders=()=>{const k=sessionStorage.getItem(SESSION)||'';return {Accept:'application/json',...(k?{Authorization:`Bearer ${k}`}:{})}};

  function panel(){
    const section=document.getElementById('tab-historico');if(!section)return null;
    let p=section.querySelector('#histRemotePanel');if(p)return p;
    const title=section.querySelector('.page-title');if(!title)return null;
    p=document.createElement('section');p.id='histRemotePanel';p.className='card hist-remote-panel';
    p.innerHTML=`<div class="hist-remote-main"><span class="hist-remote-dot" id="histRemoteDot"></span><div><b>Histórico original — recuperação</b><small id="histRemoteStatus">Verificando os orçamentos salvos no sistema antigo...</small></div></div><div class="hist-remote-actions"><button class="btn ghost tiny" id="histRemoteCheck">Atualizar</button><button class="btn ghost tiny" id="histRemoteView" disabled>Ver orçamentos antigos</button></div>`;
    title.insertAdjacentElement('afterend',p);
    p.querySelector('#histRemoteCheck').onclick=checkHistory;
    p.querySelector('#histRemoteView').onclick=showRemote;
    return p;
  }

  function setStatus(ok,text){const p=panel();if(!p)return;const d=p.querySelector('#histRemoteDot'),s=p.querySelector('#histRemoteStatus');d.classList.remove('ok','bad');d.classList.add(ok===true?'ok':ok===false?'bad':'');s.textContent=text;p.querySelector('#histRemoteView').disabled=!(ok===true&&remoteRows.length)}

  async function checkHistory(){
    setStatus(null,'Consultando o histórico original com segurança...');
    try{
      const r=await fetch(LEGACY_API,{headers:authHeaders(),cache:'no-store',credentials:'omit'});
      let body={};try{body=await r.json()}catch{}
      if(!r.ok)throw new Error(body?.error||`HTTP ${r.status}`);
      const data=body?.data;
      remoteRows=Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:(Array.isArray(data?.orcamentos)?data.orcamentos:[]));
      setStatus(true,remoteRows.length?`Recuperação disponível • ${remoteRows.length} orçamento(s) encontrado(s) no sistema antigo`:'Conexão realizada, mas o banco antigo não retornou orçamentos.');
    }catch(e){
      console.warn('Falha ao recuperar histórico legado',e);remoteRows=[];
      setStatus(false,`Não foi possível consultar o histórico antigo agora: ${e.message||'erro de conexão'}`);
    }
  }

  function rowTitle(x){return x.numero||x.number||x.codigo||x.id||'—'}
  function rowDesc(x){return x.descricao||x.description||x.titulo||x.title||x.cliente||x.client||'Sem descrição'}
  function rowDate(x){return x.updated_at||x.updatedAt||x.created_at||x.createdAt||x.data||''}
  function rowStatus(x){if(x.status)return x.status;if(x.is_fechado===true||x.is_fechado===1)return 'Fechado';if(x.is_fechado===false||x.is_fechado===0)return 'Aberto';return 'Legado'}

  function showRemote(){
    if(!remoteRows.length)return;
    const old=document.getElementById('histRemoteModal');if(old)old.remove();
    const modal=document.createElement('div');modal.id='histRemoteModal';modal.className='hist-remote-modal';
    modal.innerHTML=`<div class="hist-remote-box"><div class="hist-remote-head"><div><b>Orçamentos recuperados do sistema antigo</b><small>Consulta somente leitura. O banco original não será alterado. Na próxima etapa, os registros completos compatíveis poderão ser incorporados ao Histórico novo.</small></div><button id="histRemoteClose">×</button></div><div class="hist-remote-list">${remoteRows.slice(0,250).map(x=>`<div><span><b>${esc(rowTitle(x))}</b><small>${esc(rowDesc(x))}</small></span><span><b>${esc(rowStatus(x))}</b><small>${fmt(rowDate(x))}</small></span></div>`).join('')}</div></div>`;
    document.body.appendChild(modal);modal.querySelector('#histRemoteClose').onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};
  }

  const style=document.createElement('style');style.textContent=`.hist-remote-panel{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 13px;margin:0 0 12px;border-color:rgba(16,185,129,.25)!important}.hist-remote-main,.hist-remote-actions{display:flex;align-items:center;gap:9px}.hist-remote-main b{display:block;font-size:10px}.hist-remote-main small{display:block;color:#94a3b8;font-size:9px;margin-top:2px;max-width:780px}.hist-remote-dot{width:9px;height:9px;border-radius:50%;background:#f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,.13);flex-shrink:0}.hist-remote-dot.ok{background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.13)}.hist-remote-dot.bad{background:#ef4444;box-shadow:0 0 0 4px rgba(239,68,68,.13)}.hist-remote-modal{position:fixed;inset:0;z-index:100;background:rgba(2,6,23,.75);display:grid;place-items:center;padding:18px}.hist-remote-box{width:min(820px,100%);max-height:82vh;overflow:auto;background:#0b1728;border:1px solid #334155;border-radius:14px;padding:15px}.hist-remote-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}.hist-remote-head b{display:block}.hist-remote-head small{display:block;color:#94a3b8;font-size:9px;margin-top:3px;max-width:690px}.hist-remote-head button{border:0;background:transparent;color:#cbd5e1;font-size:22px;cursor:pointer}.hist-remote-list{display:grid;gap:7px}.hist-remote-list>div{display:flex;justify-content:space-between;gap:14px;padding:9px 10px;border:1px solid #25364c;border-radius:9px;background:#0f1c30}.hist-remote-list span:last-child{text-align:right}.hist-remote-list b{display:block;font-size:10px}.hist-remote-list small{display:block;color:#64748b;font-size:8px;margin-top:2px}@media(max-width:700px){.hist-remote-panel{align-items:flex-start;flex-direction:column}.hist-remote-actions{width:100%}}`;
  document.head.appendChild(style);

  document.querySelector('[data-tab="historico"]')?.addEventListener('click',()=>setTimeout(()=>{panel();checkHistory()},80));
  const observer=new MutationObserver(()=>{const s=document.getElementById('tab-historico');if(s?.classList.contains('active')&&!s.querySelector('#histRemotePanel'))panel()});
  const target=document.getElementById('tab-historico');if(target)observer.observe(target,{childList:true,subtree:false});
})();