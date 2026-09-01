'use strict';
(() => {
  const API='https://63a2001d-676d-47d6-a98d-4e0843dd6483.created.app';
  const KEY_CACHE='multprest_calc_hh_remote_v1';
  const KEY_SOURCE='multprest_calc_hh_table_source_v1';
  let remote=null;
  const $=s=>document.querySelector(s);
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function inject(){
    const main=$('main.container');if(!main||$('#calcRemoteBar'))return;
    const bar=document.createElement('section');bar.id='calcRemoteBar';bar.className='calc-remote-bar';
    bar.innerHTML=`<div class="calc-remote-state"><span class="calc-remote-dot" id="calcRemoteDot"></span><div><b>Banco privado — Calc HH</b><small id="calcRemoteStatus">Verificando valores atuais...</small></div></div><div class="calc-remote-actions"><label><input type="checkbox" id="calcUseRemoteTable" ${localStorage.getItem(KEY_SOURCE)!=='local'?'checked':''}> Tabela de Valores usa banco</label><button id="calcApplySalaries">Aplicar salários do banco</button><button id="calcRefreshRemote">Atualizar do banco</button></div>`;
    const tabs=$('nav.main-tabs');tabs?tabs.insertAdjacentElement('afterend',bar):main.insertBefore(bar,main.firstChild);
    const st=document.createElement('style');st.textContent=`.calc-remote-bar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:12px 0 16px;padding:11px 13px;border:1px solid #28405c;border-radius:11px;background:#0d1b2c}.calc-remote-state,.calc-remote-actions{display:flex;align-items:center;gap:9px}.calc-remote-state b{display:block;font-size:11px}.calc-remote-state small{display:block;color:#94a3b8;font-size:9px;margin-top:2px}.calc-remote-dot{width:9px;height:9px;border-radius:50%;background:#f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,.14)}.calc-remote-dot.ok{background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.14)}.calc-remote-dot.bad{background:#ef4444;box-shadow:0 0 0 4px rgba(239,68,68,.14)}.calc-remote-actions{font-size:9px;color:#cbd5e1}.calc-remote-actions label{display:flex;gap:5px;align-items:center;white-space:nowrap}.calc-remote-actions button{border:1px solid #334e6e;background:#13283f;color:#dbeafe;border-radius:8px;padding:8px 9px;font:700 9px Inter;cursor:pointer}.calc-remote-actions button:last-child{background:#1d4ed8;border-color:#2563eb;color:white}.calc-remote-actions button:disabled{opacity:.55;cursor:wait}.remote-table-note{display:block;margin:6px 0;color:#60a5fa;font-size:9px;font-weight:700}@media(max-width:900px){.calc-remote-bar{align-items:flex-start;flex-direction:column}.calc-remote-actions{flex-wrap:wrap}}`;
    document.head.appendChild(st);
    $('#calcRefreshRemote').onclick=refresh;
    $('#calcApplySalaries').onclick=applySalaries;
    $('#calcUseRemoteTable').onchange=e=>{localStorage.setItem(KEY_SOURCE,e.target.checked?'remote':'local');if(e.target.checked)renderRemoteTable();else location.reload()};
    document.addEventListener('click',e=>{if(e.target.closest('[data-tab="tabela"]'))setTimeout(renderRemoteTable,80)});
  }

  function status(ok,text){const d=$('#calcRemoteDot'),s=$('#calcRemoteStatus');if(!d||!s)return;d.classList.remove('ok','bad');d.classList.add(ok===true?'ok':ok===false?'bad':'');s.textContent=text}
  async function loadRemote(){
    const r=await fetch(`${API}/api/public/valores-hora`,{headers:{Accept:'application/json'},cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const data=await r.json();if(!Array.isArray(data?.cargos)||!Array.isArray(data?.empresas)||!Array.isArray(data?.valores))throw new Error('Resposta inválida');
    remote=data;localStorage.setItem(KEY_CACHE,JSON.stringify({syncedAt:new Date().toISOString(),data}));return data;
  }
  function cached(){try{return JSON.parse(localStorage.getItem(KEY_CACHE)||'null')?.data||null}catch{return null}}

  async function refresh(){
    const b=$('#calcRefreshRemote');if(b){b.disabled=true;b.textContent='Atualizando...'}
    try{const d=await loadRemote();status(true,`Conectado • ${d.cargos.length} cargos × ${d.empresas.length} empresas • ${new Date(d.atualizadoEm||Date.now()).toLocaleString('pt-BR')}`);renderRemoteTable()}
    catch(e){console.warn(e);remote=cached();status(false,remote?'Banco indisponível agora — exibindo última cópia':'Sem acesso ao banco agora — cálculos locais preservados');renderRemoteTable()}
    finally{if(b){b.disabled=false;b.textContent='Atualizar do banco'}}
  }

  async function waitCore(){for(let i=0;i<40;i++){if(window.CalcHHCore)return window.CalcHHCore;await new Promise(r=>setTimeout(r,100))}return null}
  async function applySalaries(){
    const c=await waitCore(),d=remote||cached();if(!c||!d){alert('Os dados do banco ainda não estão disponíveis. Clique em “Atualizar do banco”.');return}
    if(!confirm('Aplicar ao Calc HH os salários-base atualmente cadastrados no banco? Os demais campos e fórmulas locais serão mantidos.'))return;
    const byId=Object.fromEntries(d.cargos.map(x=>[x.id,Number(x.salarioBase)||0]));
    c.cargos=c.cargos.map(x=>({...x,salarioBase:byId[x.id]||x.salarioBase}));c.saveCargos();
    localStorage.setItem('multprest_calc_hh_remote_applied_at',new Date().toISOString());
    alert('Salários-base atualizados a partir do banco do Calc HH.');location.reload();
  }

  function renderRemoteTable(){
    if(localStorage.getItem(KEY_SOURCE)==='local')return;
    const d=remote||cached(),table=$('#empresaTable');if(!d||!table)return;
    const map=new Map(d.valores.map(v=>[`${v.cargo.id}|${v.empresa.id}`,v]));
    let h='<thead><tr><th>Cargo</th>'+d.empresas.map(e=>`<th>${esc(e.nome)}<span class="company-days">${Number(e.diasAntecipacao)||0} dias</span></th>`).join('')+'</tr></thead><tbody>';
    h+=d.cargos.map(c=>`<tr><td>${esc(c.nome)}</td>${d.empresas.map(e=>{const v=map.get(`${c.id}|${e.id}`);return `<td class="value">${v?money(v.valorHora):'—'}</td>`}).join('')}</tr>`).join('')+'</tbody>';
    table.innerHTML=h;
    const wrap=table.closest('.table-wrap');if(wrap&&!wrap.previousElementSibling?.classList?.contains('remote-table-note')){const n=document.createElement('span');n.className='remote-table-note';n.textContent='Fonte: banco original do Calc HH • leitura em tempo real/cópia mais recente';wrap.before(n)}
  }

  window.MULTPREST_DATA_SOURCES=window.MULTPREST_DATA_SOURCES||{};window.MULTPREST_DATA_SOURCES.calcHH={api:API,mode:'public-read-authenticated-write'};
  inject();refresh();
})();