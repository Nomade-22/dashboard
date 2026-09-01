'use strict';
(() => {
  const section=document.getElementById('tab-historico');
  if(!section)return;
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(num(v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parse=(s,f={})=>{try{return s?JSON.parse(s):f}catch{return f}};

  const KEY_HISTORY='multprest_orc_history_v1';
  const KEY_CURRENT='multprest_orc_current_meta_v1';
  const KEY_NR_TOTALS='multprest_orc_reverse_note_totals_v1';
  const KEY_NEG_TOTALS='multprest_orc_negotiation_totals_v1';

  // Estados que pertencem ao orçamento e devem ser restaurados ao reabri-lo.
  const BUDGET_KEYS=[
    'multprest_orc_labor_items_v1',
    'multprest_orc_team_size_v1',
    'multprest_orc_bdi_materials_v1',
    'multprest_orc_trips_v1',
    'multprest_orc_trip_settings_v1',
    'multprest_orc_travel_totals_v1',
    'multprest_orc_expenses_v1',
    'multprest_orc_expense_totals_v1',
    'multprest_orc_reverse_note_v1',
    'multprest_orc_reverse_note_totals_v1',
    'multprest_orc_negotiation_v1',
    'multprest_orc_negotiation_totals_v1'
  ];

  // Parâmetros globais são fotografados para permitir reproduzir exatamente um orçamento antigo.
  // Eles continuam somente no navegador enquanto não houver backend privado.
  const PARAM_KEYS=[
    'multprest_orc_bdi_profiles_v1',
    'multprest_orc_labor_rates_v1',
    'multprest_orc_internal_hour_costs_v1'
  ];

  let history=parse(localStorage.getItem(KEY_HISTORY),[]);
  if(!Array.isArray(history))history=[];
  let current=parse(localStorage.getItem(KEY_CURRENT),{});
  let search='';

  const saveHistory=()=>localStorage.setItem(KEY_HISTORY,JSON.stringify(history));
  const saveCurrent=()=>localStorage.setItem(KEY_CURRENT,JSON.stringify(current));
  const getStore=keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]));
  const restoreStore=obj=>Object.entries(obj||{}).forEach(([k,v])=>v===null||v===undefined?localStorage.removeItem(k):localStorage.setItem(k,String(v)));

  function autoNumber(){
    const d=new Date(),p=n=>String(n).padStart(2,'0');
    return `ORC-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  }

  function inferClient(){
    const labor=parse(localStorage.getItem('multprest_orc_labor_items_v1'),[]);
    const mats=parse(localStorage.getItem('multprest_orc_bdi_materials_v1'),[]);
    const ids=[...(Array.isArray(labor)?labor:[]).map(x=>x.clientId),...(Array.isArray(mats)?mats:[]).map(x=>x.clientId)].filter(Boolean);
    const names={brf:'BRF',couros:'JBS Couros','0%':'inss0',jbs:'JBS',vibra:'VIBRA',agrogen:'Agrogen',migplus:'MIG PLUS',sbe:'LAR'};
    if(!ids.length)return '';
    const freq={};ids.forEach(id=>freq[id]=(freq[id]||0)+1);
    const id=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0];
    return names[id]||id||'';
  }

  function liveTotals(){
    const nr=parse(localStorage.getItem(KEY_NR_TOTALS),{}),neg=parse(localStorage.getItem(KEY_NEG_TOTALS),{});
    return {
      total:num(nr.grand),
      valorNota:num(nr.gross),
      lucro:num(nr.final),
      lucroPercent:num(nr.lucro),
      negociado:num(neg.newGross||neg.novoValorBruto||0),
      lucroNegociado:num(neg.final||neg.lucroFinal||0)
    };
  }

  function capture(meta){
    const now=new Date(),totals=liveTotals();
    return {
      id:meta.id||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      numero:String(meta.numero||autoNumber()).trim(),
      cliente:String(meta.cliente||inferClient()).trim(),
      descricao:String(meta.descricao||'').trim(),
      observacoes:String(meta.observacoes||'').trim(),
      status:String(meta.status||'Rascunho'),
      createdAt:meta.createdAt||now.toISOString(),
      updatedAt:now.toISOString(),
      totals,
      state:getStore(BUDGET_KEYS),
      parameters:getStore(PARAM_KEYS),
      schemaVersion:1
    };
  }

  function upsert(meta){
    const snap=capture(meta),idx=history.findIndex(x=>x.id===snap.id);
    if(idx>=0){snap.createdAt=history[idx].createdAt||snap.createdAt;history[idx]=snap}else history.unshift(snap);
    history.sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
    saveHistory();
    current={id:snap.id,numero:snap.numero,cliente:snap.cliente,descricao:snap.descricao,observacoes:snap.observacoes,status:snap.status,createdAt:snap.createdAt};
    saveCurrent();
    render();
  }

  function restoreBudget(item,restoreParams=true){
    if(!item)return;
    restoreStore(item.state||{});
    if(restoreParams)restoreStore(item.parameters||{});
    current={id:item.id,numero:item.numero,cliente:item.cliente,descricao:item.descricao,observacoes:item.observacoes,status:item.status,createdAt:item.createdAt};
    saveCurrent();
    sessionStorage.setItem('multprest_orc_restored_message',`Orçamento ${item.numero||''} restaurado`);
    location.reload();
  }

  function newBudget(){
    if(!confirm('Iniciar um novo orçamento? Os parâmetros globais de BDI/HH serão mantidos, mas os itens do orçamento atual serão limpos.'))return;
    BUDGET_KEYS.forEach(k=>localStorage.removeItem(k));
    localStorage.removeItem(KEY_CURRENT);
    location.reload();
  }

  function download(name,data){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500);
  }

  function formatDate(v){
    if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
  }

  function filtered(){
    const q=search.trim().toLowerCase();if(!q)return history;
    return history.filter(x=>[x.numero,x.cliente,x.descricao,x.status].some(v=>String(v||'').toLowerCase().includes(q)));
  }

  function render(){
    const list=filtered(),t=liveTotals();
    section.classList.remove('placeholder');
    section.innerHTML=`
      <div class="page-title">
        <div><span class="eyebrow">Rastreabilidade</span><h2>Histórico de Orçamentos</h2><p>Salve uma fotografia completa do orçamento e reabra depois mantendo itens, cálculos e parâmetros históricos.</p></div>
        <div class="title-actions"><button class="btn ghost" id="histNew">+ Novo orçamento</button><label class="btn ghost file-btn" for="histImport">Importar histórico</label><input id="histImport" type="file" accept=".json" hidden><button class="btn ghost" id="histExportAll">Exportar histórico</button></div>
      </div>

      <div class="history-kpis">
        <div class="kpi blue"><span>Orçamentos salvos</span><strong>${history.length}</strong></div>
        <div class="kpi green"><span>Total atual</span><strong>${money(t.total)}</strong></div>
        <div class="kpi teal"><span>Lucro atual</span><strong>${money(t.lucro)}</strong></div>
        <div class="kpi purple"><span>Margem atual</span><strong>${t.lucroPercent.toFixed(1)}%</strong></div>
      </div>

      <section class="card hist-save-card">
        <div class="card-title actions-title"><div><h3>${current.id?'Atualizar orçamento salvo':'Salvar orçamento atual'}</h3><p>${current.id?'Você está editando um orçamento reaberto. Salvar atualizará a fotografia histórica.':'Informe os dados de identificação antes de salvar.'}</p></div><button class="btn" id="histSave">💾 ${current.id?'Atualizar orçamento':'Salvar orçamento'}</button></div>
        <div class="hist-meta-grid">
          <label>Número<input id="histNumber" value="${esc(current.numero||autoNumber())}"></label>
          <label>Cliente<input id="histClient" value="${esc(current.cliente||inferClient())}" placeholder="Ex.: JBS"></label>
          <label>Descrição / Serviço<input id="histDesc" value="${esc(current.descricao||'')}" placeholder="Ex.: Reforma sala de compressores"></label>
          <label>Status<select id="histStatus">${['Rascunho','Enviado','Aprovado','Reprovado','Cancelado'].map(s=>`<option ${current.status===s?'selected':''}>${s}</option>`).join('')}</select></label>
          <label class="hist-notes">Observações<textarea id="histNotes" rows="2" placeholder="Referência, pedido, revisão ou observação interna">${esc(current.observacoes||'')}</textarea></label>
        </div>
        <div class="hist-snapshot-note"><b>Fotografia do cálculo:</b> ao salvar, o histórico guarda os itens do orçamento e também uma cópia dos parâmetros de BDI, tarifas HH e custos internos usados naquele momento. Esses dados permanecem somente neste navegador nesta etapa.</div>
      </section>

      <section class="card">
        <div class="card-title actions-title"><div><h3>Orçamentos salvos</h3><p>Pesquise por número, cliente, serviço ou status.</p></div><input class="hist-search" id="histSearch" type="search" value="${esc(search)}" placeholder="Buscar orçamento..."></div>
        <label class="hist-restore-option"><input id="histRestoreParams" type="checkbox" checked> Ao abrir, restaurar também BDI/HH históricos para reproduzir exatamente o cálculo salvo.</label>
        <div class="hist-table-wrap"><table class="hist-table"><thead><tr><th>Número</th><th>Cliente / Serviço</th><th>Atualização</th><th>Status</th><th>Total</th><th>Lucro</th><th>Ações</th></tr></thead><tbody>
          ${list.length?list.map(item=>`<tr data-id="${esc(item.id)}"><td><strong>${esc(item.numero||'—')}</strong><small>${formatDate(item.createdAt)}</small></td><td><strong>${esc(item.cliente||'—')}</strong><small>${esc(item.descricao||'Sem descrição')}</small></td><td>${formatDate(item.updatedAt)}</td><td><span class="hist-status">${esc(item.status||'Rascunho')}</span></td><td><strong>${money(item.totals?.total)}</strong><small>Nota: ${money(item.totals?.valorNota)}</small></td><td><strong class="${num(item.totals?.lucro)<0?'negative':''}">${money(item.totals?.lucro)}</strong><small>${num(item.totals?.lucroPercent).toFixed(1)}%</small></td><td><div class="hist-actions"><button data-act="open" class="btn tiny">Abrir</button><button data-act="copy" class="btn ghost tiny">Duplicar</button><button data-act="export" class="btn ghost tiny">JSON</button><button data-act="delete" class="btn ghost danger tiny">×</button></div></td></tr>`).join(''):`<tr><td colspan="7" class="hist-empty">Nenhum orçamento salvo neste navegador.</td></tr>`}
        </tbody></table></div>
      </section>

      <div class="warning-box"><b>Etapa de migração:</b> o Histórico está funcional localmente. Quando conectarmos autenticação e banco privado, os registros sairão do <code>localStorage</code> e passarão a ficar disponíveis entre dispositivos e usuários autorizados.</div>`;
    bind();
  }

  function bind(){
    section.querySelector('#histSave').onclick=()=>{
      const numero=section.querySelector('#histNumber').value.trim();
      if(!numero){alert('Informe o número do orçamento.');return}
      upsert({
        ...current,
        numero,
        cliente:section.querySelector('#histClient').value.trim(),
        descricao:section.querySelector('#histDesc').value.trim(),
        status:section.querySelector('#histStatus').value,
        observacoes:section.querySelector('#histNotes').value.trim()
      });
    };
    section.querySelector('#histNew').onclick=newBudget;
    section.querySelector('#histSearch').oninput=e=>{search=e.target.value;render()};
    section.querySelector('#histExportAll').onclick=()=>download(`historico-orcamentos-multprest-${new Date().toISOString().slice(0,10)}.json`,{schemaVersion:1,exportedAt:new Date().toISOString(),budgets:history});
    section.querySelector('#histImport').onchange=async e=>{
      const f=e.target.files?.[0];if(!f)return;
      try{
        const data=JSON.parse(await f.text()),incoming=Array.isArray(data)?data:(Array.isArray(data.budgets)?data.budgets:[]);
        if(!incoming.length)throw new Error('Nenhum orçamento encontrado');
        const map=new Map(history.map(x=>[x.id,x]));incoming.forEach(x=>{if(x&&x.id&&x.state)map.set(x.id,x)});history=[...map.values()].sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));saveHistory();render();
      }catch(err){alert(`Não foi possível importar: ${err instanceof Error?err.message:'arquivo inválido'}`)}
      e.target.value='';
    };
    section.querySelectorAll('tr[data-id]').forEach(row=>row.querySelectorAll('[data-act]').forEach(btn=>btn.onclick=()=>{
      const item=history.find(x=>x.id===row.dataset.id);if(!item)return;
      const act=btn.dataset.act;
      if(act==='open')restoreBudget(item,section.querySelector('#histRestoreParams').checked);
      if(act==='export')download(`${String(item.numero||'orcamento').replace(/[^a-z0-9_-]+/gi,'_')}.json`,{schemaVersion:1,budget:item});
      if(act==='copy'){
        const copy=JSON.parse(JSON.stringify(item));copy.id=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;copy.numero=`${item.numero||'ORC'}-COPIA`;copy.descricao=`${item.descricao||''}${item.descricao?' — ':''}Cópia`;copy.status='Rascunho';copy.createdAt=new Date().toISOString();copy.updatedAt=copy.createdAt;history.unshift(copy);saveHistory();render();
      }
      if(act==='delete'&&confirm(`Excluir ${item.numero||'este orçamento'} do histórico local?`)){history=history.filter(x=>x.id!==item.id);if(current.id===item.id){current={};localStorage.removeItem(KEY_CURRENT)}saveHistory();render()}
    }));
  }

  const style=document.createElement('style');
  style.textContent=`
    .history-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:14px}.hist-save-card{margin-bottom:13px}.hist-meta-grid{display:grid;grid-template-columns:1fr 1fr 2fr 1fr;gap:9px}.hist-meta-grid label{display:grid;gap:5px;font-size:10px;color:var(--muted)}.hist-meta-grid input,.hist-meta-grid select,.hist-meta-grid textarea,.hist-search{width:100%;background:#0f1c30;border:1px solid var(--line);color:var(--text);padding:9px;border-radius:8px;outline:0;font:inherit}.hist-notes{grid-column:1/-1}.hist-snapshot-note{margin-top:10px;padding:9px 11px;border-radius:9px;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.18);font-size:10px;line-height:1.45;color:#bfdbfe}.hist-search{max-width:260px}.hist-restore-option{display:flex;align-items:center;gap:8px;margin:4px 0 11px;color:#94a3b8;font-size:10px}.hist-table-wrap{overflow:auto}.hist-table{width:100%;border-collapse:collapse;min-width:920px}.hist-table th,.hist-table td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);font-size:10px;vertical-align:middle}.hist-table th{color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:.04em}.hist-table td>strong{display:block;color:#e2e8f0}.hist-table td>small{display:block;color:#64748b;margin-top:3px}.hist-table .negative{color:#f87171}.hist-status{display:inline-block;border:1px solid #334155;background:#172033;color:#cbd5e1;padding:4px 7px;border-radius:999px}.hist-actions{display:flex;gap:5px;white-space:nowrap}.btn.tiny{padding:6px 8px;font-size:9px;border-radius:7px}.hist-empty{text-align:center!important;color:#64748b;padding:28px!important}
    @media(max-width:900px){.history-kpis{grid-template-columns:1fr 1fr}.hist-meta-grid{grid-template-columns:1fr 1fr}.hist-notes{grid-column:1/-1}}@media(max-width:560px){.history-kpis,.hist-meta-grid{grid-template-columns:1fr}.hist-notes{grid-column:auto}.hist-search{max-width:none}}
  `;document.head.appendChild(style);

  document.querySelector('[data-tab="historico"]')?.addEventListener('click',()=>setTimeout(render,0));
  render();
})();