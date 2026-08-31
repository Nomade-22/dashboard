'use strict';
(() => {
  const section=document.getElementById('tab-nota-reversa');
  if(!section) return;
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(num(v));
  const load=(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):JSON.parse(JSON.stringify(f))}catch{return JSON.parse(JSON.stringify(f))}};
  const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const KEY_STATE='multprest_orc_reverse_note_v1';
  const KEY_INTERNAL='multprest_orc_internal_hour_costs_v1';
  const KEY_LABOR='multprest_orc_labor_items_v1';
  const KEY_RATES='multprest_orc_labor_rates_v1';
  const KEY_MATERIALS='multprest_orc_bdi_materials_v1';
  const KEY_PROFILES='multprest_orc_bdi_profiles_v1';
  const KEY_TRIPS='multprest_orc_trips_v1';
  const KEY_TRIP_SETTINGS='multprest_orc_trip_settings_v1';
  const KEY_TRAVEL_TOTALS='multprest_orc_travel_totals_v1';
  const KEY_EXP='multprest_orc_expenses_v1';
  const KEY_EXP_TOTALS='multprest_orc_expense_totals_v1';

  const CLIENTS=[
    {id:'brf',dias:180},{id:'couros',dias:10},{id:'0%',dias:30},{id:'jbs',dias:135},
    {id:'vibra',dias:30},{id:'agrogen',dias:35},{id:'migplus',dias:45},{id:'sbe',dias:5}
  ];
  const DEFAULT_BDI={inss:11,simplesIssqn:19,lucroPercent:10,jurosDia:.1,trocaNota:0,descontoCompras:12};
  const HOUR_TYPES={normal:1,'50':1.5,'100':2,'120':2.2};
  const DEFAULT_STATE={
    valorBrutoNumerico:0,
    incluirIssqn:true,
    incluirInss:true,
    incluirSimples:true,
    incluirAntecipacao:false,
    antecipacaoPercent:0,
    incluirMaoDeObra:false,
    incluirMaterial:false,
    incluirViagens:false,
    incluirTransporte:false,
    incluirEstadia:false,
    incluirAlmoco:false,
    incluirJanta:false,
    incluirCafe:false
  };
  let state={...DEFAULT_STATE,...load(KEY_STATE,{})};
  let internalCosts=load(KEY_INTERNAL,{});

  function profile(id){
    const saved=load(KEY_PROFILES,{}),dias=CLIENTS.find(c=>c.id===id)?.dias||30;
    return {...DEFAULT_BDI,diasPagamento:dias,...(saved[id]||{})};
  }
  function financial(p){return (Math.pow(1+num(p.jurosDia)/100,num(p.diasPagamento))-1)*100}
  function bdi(p){return num(p.inss)+num(p.simplesIssqn)+num(p.lucroPercent)+financial(p)+num(p.trocaNota)+num(p.descontoCompras)}
  function withBDI(cost,id){const p=profile(id),div=1-bdi(p)/100;return cost>0&&div>0?cost/div:0}
  const hourMult=id=>num(HOUR_TYPES[id]||1);
  const getInternalCost=workerId=>num(internalCosts[workerId]);

  function laborData(){
    const items=load(KEY_LABOR,[]),rates=load(KEY_RATES,{});
    let sale=0,raw=0,missing=new Set();
    for(const i of items){
      const qty=num(i.hours)*num(i.people)*num(i.days),mult=hourMult(i.hourTypeId);
      sale+=num(rates[`${i.workerTypeId}|${i.clientId}`])*mult*qty;
      const c=getInternalCost(i.workerTypeId);
      if(qty>0&&!c) missing.add(i.workerTypeId);
      raw+=c*mult*qty;
    }
    return {sale,raw,missing:[...missing]};
  }

  function materialData(){
    const items=load(KEY_MATERIALS,[]);
    let sale=0,raw=0;
    for(const m of items){const c=num(m.valorMaterial);raw+=c;sale+=withBDI(c,m.clientId)}
    return {sale,raw};
  }

  function tripMinutes(i){
    const base=num(i.manualHours)>0?num(i.manualHours)*60:num(i.durationMinutes);
    return base*(i.tripType==='round-trip'?2:1)*num(i.days);
  }
  function tripPaid(i,settings){
    const mins=tripMinutes(i);if(mins<=0)return false;
    if(settings.paymentRule==='all')return true;
    return mins/60<=num(settings.maxHours);
  }
  function travelData(){
    const items=load(KEY_TRIPS,[]),settings={paymentRule:'all',maxHours:1,...load(KEY_TRIP_SETTINGS,{})};
    const saleTotals=load(KEY_TRAVEL_TOTALS,{totalCost:0});
    let raw=0,missing=new Set();
    for(const i of items){
      if(!tripPaid(i,settings))continue;
      const hours=tripMinutes(i)/60,qty=hours*num(i.people),c=getInternalCost(i.workerTypeId),mult=hourMult(i.hourTypeId);
      if(qty>0&&!c)missing.add(i.workerTypeId);
      raw+=qty*c*mult;
    }
    return {sale:num(saleTotals.totalCost),raw,missing:[...missing]};
  }

  function expenseData(){
    const totals=load(KEY_EXP_TOTALS,{stay:0,transport:0,lunch:0,dinner:0,coffee:0});
    const e=load(KEY_EXP,{}),travel=load(KEY_TRAVEL_TOTALS,{totalDistance:0,totalViagens:0});
    const meal=o=>num(o?.unitCost)*num(o?.people)*num(o?.days);
    const stay=meal(e.stay),lunch=meal(e.lunch),dinner=meal(e.dinner),coffee=meal(e.coffee);
    const t=e.transport||{};
    const useKm=t.source==='manual'&&num(t.manualKm)>0?num(t.manualKm):num(travel.totalDistance);
    const useTrips=t.source==='manual'&&num(t.trips)>0?num(t.trips):(num(travel.totalViagens)||1);
    const costPerKm=num(t.kmPerLiter)>0?num(t.pricePerLiter)/num(t.kmPerLiter):0;
    const transport=(useKm*costPerKm+num(t.toll))*useTrips;
    return {
      sale:{stay:num(totals.stay),transport:num(totals.transport),lunch:num(totals.lunch),dinner:num(totals.dinner),coffee:num(totals.coffee)},
      raw:{stay,transport,lunch,dinner,coffee}
    };
  }

  function budgetTotals(){
    const labor=laborData(),material=materialData(),travel=travelData(),exp=expenseData();
    const grand=labor.sale+material.sale+travel.sale+exp.sale.stay+exp.sale.transport+exp.sale.lunch+exp.sale.dinner+exp.sale.coffee;
    return {labor,material,travel,exp,grand};
  }

  function calc(){
    const d=budgetTotals(),gross=num(state.valorBrutoNumerico);
    const issqn=state.incluirIssqn?gross*.05:0;
    const inss=state.incluirInss?gross*.11:0;
    const simples=state.incluirSimples?gross*.14:0;
    const impostos=issqn+inss+simples;
    const liquidoSemAntecipacao=gross-impostos;
    const antecipacao=state.incluirAntecipacao?liquidoSemAntecipacao*(num(state.antecipacaoPercent)/100):0;
    const liquidoAposAntecipacao=liquidoSemAntecipacao-antecipacao;
    const costs={
      maoDeObra:state.incluirMaoDeObra?d.labor.raw:0,
      material:state.incluirMaterial?d.material.raw:0,
      viagens:state.incluirViagens?d.travel.raw:0,
      transporte:state.incluirTransporte?d.exp.raw.transport:0,
      estadia:state.incluirEstadia?d.exp.raw.stay:0,
      almoco:state.incluirAlmoco?d.exp.raw.lunch:0,
      janta:state.incluirJanta?d.exp.raw.dinner:0,
      cafe:state.incluirCafe?d.exp.raw.coffee:0
    };
    const totalDespesas=Object.values(costs).reduce((a,b)=>a+b,0);
    const final=liquidoAposAntecipacao-totalDespesas;
    const discounts=gross>0?((gross-final)/gross)*100:0;
    const lucro=gross>0?(final/gross)*100:0;
    const result={...d,gross,issqn,inss,simples,impostos,liquidoSemAntecipacao,antecipacao,liquidoAposAntecipacao,costs,totalDespesas,final,discounts,lucro};
    window.MULTPREST_REVERSE_NOTE_TOTALS=result;
    save('multprest_orc_reverse_note_totals_v1',result);
    return result;
  }

  const toggleRow=(key,label,value,icon)=>`<div class="nr-toggle-row ${value<=0?'disabled':''}"><label><input type="checkbox" data-state="${key}" ${state[key]?'checked':''} ${value<=0?'disabled':''}><span class="nr-switch"></span><span>${icon} ${label}</span></label><strong class="${state[key]&&value>0?'deduct':''}">${state[key]&&value>0?'- ':''}${money(value)}</strong></div>`;
  const taxRow=(key,label,pct,value)=>`<div class="nr-toggle-row"><label><input type="checkbox" data-state="${key}" ${state[key]?'checked':''}><span class="nr-switch"></span><span>${label} <small>${pct}%</small></span></label><strong class="${state[key]?'deduct':''}">${state[key]?'- ':''}${money(value)}</strong></div>`;

  function render(){
    const r=calc(),missing=[...new Set([...r.labor.missing,...r.travel.missing])];
    section.classList.remove('placeholder');
    section.innerHTML=`
      <div class="page-title">
        <div><span class="eyebrow">Análise líquida</span><h2>Nota Reversa</h2><p>Fórmula preservada do sistema original: impostos sobre o valor bruto, antecipação sobre o líquido após impostos e dedução dos custos reais sem BDI.</p></div>
        <div class="title-actions"><label class="btn ghost file-btn" for="nrImportCosts">Importar custos internos HH</label><input id="nrImportCosts" type="file" accept=".json,.csv" hidden><button class="btn ghost danger" id="nrReset">↻ Zerar Nota</button></div>
      </div>

      <div class="nr-kpis">
        <div class="kpi blue"><span>Valor Bruto</span><strong>${money(r.gross)}</strong></div>
        <div class="kpi red"><span>Impostos</span><strong>${money(r.impostos+r.antecipacao)}</strong></div>
        <div class="kpi amber"><span>Custos</span><strong>${money(r.totalDespesas)}</strong></div>
        <div class="kpi purple"><span>% Descontos</span><strong>${r.discounts.toFixed(1)}%</strong></div>
        <div class="kpi green"><span>Valor Líquido</span><strong>${money(r.final)}</strong></div>
        <div class="kpi teal"><span>Lucro</span><strong>${r.lucro.toFixed(1)}%<small>${money(r.final)}</small></strong></div>
      </div>

      <section class="card nr-card">
        <div class="card-title"><h3>Valor da Nota</h3><span class="pill">Total atual do orçamento: ${money(r.grand)}</span></div>
        <input id="nrGross" class="nr-gross" type="number" min="0" step="0.01" value="${num(state.valorBrutoNumerico)}" placeholder="R$ 0,00">
        <button class="btn nr-pull" id="nrPull">↓ Puxar Total do Orçamento (${money(r.grand)})</button>
      </section>

      <div class="nr-grid">
        <section class="card nr-card">
          <div class="card-title"><h3>Impostos e Descontos</h3></div>
          ${taxRow('incluirIssqn','ISSQN',5,r.issqn)}
          ${taxRow('incluirInss','INSS',11,r.inss)}
          ${taxRow('incluirSimples','Simples Nacional',14,r.simples)}
          <div class="nr-toggle-row"><label><input type="checkbox" data-state="incluirAntecipacao" ${state.incluirAntecipacao?'checked':''}><span class="nr-switch"></span><span>Antecipação</span></label><strong class="${state.incluirAntecipacao?'deduct':''}">${state.incluirAntecipacao?'- ':''}${money(r.antecipacao)}</strong></div>
          ${state.incluirAntecipacao?`<label class="nr-percent">Percentual de antecipação <span><input id="nrAntPct" type="number" min="0" max="100" step="0.01" value="${num(state.antecipacaoPercent)}"> %</span></label>`:''}
        </section>

        <section class="card nr-card">
          <div class="card-title"><div><h3>Deduzir Custos</h3><p>Valores sem BDI, como no sistema original.</p></div><span class="pill ${Object.keys(internalCosts).length?'api-ok':''}">${Object.keys(internalCosts).length?'Custos HH carregados':'Custos HH pendentes'}</span></div>
          ${toggleRow('incluirMaoDeObra','Mão de Obra',r.labor.raw,'👷')}
          ${toggleRow('incluirMaterial','Material',r.material.raw,'📦')}
          ${toggleRow('incluirViagens','Horas Viajadas',r.travel.raw,'🕒')}
          ${toggleRow('incluirTransporte','Transporte',r.exp.raw.transport,'🚗')}
          ${toggleRow('incluirEstadia','Estadia',r.exp.raw.stay,'🏠')}
          ${toggleRow('incluirAlmoco','Almoço',r.exp.raw.lunch,'🍽️')}
          ${toggleRow('incluirJanta','Janta',r.exp.raw.dinner,'🌙')}
          ${toggleRow('incluirCafe','Café',r.exp.raw.coffee,'☕')}
          <div class="nr-cost-total"><span>Total Custos</span><strong>- ${money(r.totalDespesas)}</strong></div>
          ${missing.length?`<div class="warning-box compact"><b>Custos internos faltando:</b> ${missing.map(esc).join(', ')}. Importe a tabela privada para calcular Mão de Obra/Horas Viajadas como no sistema original.</div>`:''}
        </section>
      </div>

      ${r.gross>0?`<section class="card nr-card nr-summary"><div class="card-title"><h3>Resumo do Cálculo</h3></div>
        <div class="break-row"><span>Valor Bruto</span><strong>${money(r.gross)}</strong></div>
        ${state.incluirIssqn?`<div class="break-row"><span>(-) ISSQN (5%)</span><strong class="deduct">- ${money(r.issqn)}</strong></div>`:''}
        ${state.incluirInss?`<div class="break-row"><span>(-) INSS (11%)</span><strong class="deduct">- ${money(r.inss)}</strong></div>`:''}
        ${state.incluirSimples?`<div class="break-row"><span>(-) Simples Nacional (14%)</span><strong class="deduct">- ${money(r.simples)}</strong></div>`:''}
        <div class="break-row subtotal"><span>Líquido (sem antecipação)</span><strong>${money(r.liquidoSemAntecipacao)}</strong></div>
        ${state.incluirAntecipacao&&num(state.antecipacaoPercent)>0?`<div class="break-row"><span>(-) Antecipação (${num(state.antecipacaoPercent)}%)</span><strong class="deduct">- ${money(r.antecipacao)}</strong></div>`:''}
        ${r.totalDespesas>0?`<div class="break-row subtotal"><span>Líquido (após impostos)</span><strong>${money(r.liquidoAposAntecipacao)}</strong></div>`:''}
        ${Object.entries(r.costs).filter(([,v])=>v>0).map(([k,v])=>`<div class="break-row"><span>(-) ${{maoDeObra:'Mão de Obra',material:'Material',viagens:'Horas Viajadas',transporte:'Transporte',estadia:'Estadia',almoco:'Almoço',janta:'Janta',cafe:'Café'}[k]}</span><strong class="cost-deduct">- ${money(v)}</strong></div>`).join('')}
        <div class="nr-final"><span>Valor Líquido Final</span><strong>${money(r.final)}</strong></div>
      </section>`:''}
    `;
    bind();
  }

  function bind(){
    section.querySelectorAll('[data-state]').forEach(el=>el.addEventListener('change',e=>{state[e.target.dataset.state]=e.target.checked;save(KEY_STATE,state);render()}));
    section.querySelector('#nrGross')?.addEventListener('input',e=>{state.valorBrutoNumerico=num(e.target.value);save(KEY_STATE,state);render()});
    section.querySelector('#nrAntPct')?.addEventListener('input',e=>{state.antecipacaoPercent=num(e.target.value);save(KEY_STATE,state);render()});
    section.querySelector('#nrPull')?.addEventListener('click',()=>{state.valorBrutoNumerico=budgetTotals().grand;save(KEY_STATE,state);render()});
    section.querySelector('#nrReset')?.addEventListener('click',()=>{if(confirm('Zerar a Nota Reversa e restaurar as opções originais?')){state={...DEFAULT_STATE};save(KEY_STATE,state);render()}});
    section.querySelector('#nrImportCosts')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const text=await f.text();let data={};if(f.name.toLowerCase().endsWith('.json')){const j=JSON.parse(text);data=j.costs||j;}else{const lines=text.split(/\r?\n/).filter(Boolean);for(const line of lines.slice(1)){const [w,c]=line.split(/[;,]/);if(w&&c!==undefined)data[w.trim()]=num(String(c).replace(',','.'))}}internalCosts={...internalCosts,...data};save(KEY_INTERNAL,internalCosts);render()}catch{alert('Não foi possível importar os custos internos.')}e.target.value=''});
  }

  const style=document.createElement('style');style.textContent=`
    .nr-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin-bottom:14px}.kpi.red{border-color:rgba(239,68,68,.28);color:#fca5a5;background:rgba(239,68,68,.08)}.kpi.teal{border-color:rgba(20,184,166,.28);color:#5eead4;background:rgba(20,184,166,.08)}.nr-kpis .kpi strong small{display:block;font-size:9px;margin-top:3px;font-weight:500;opacity:.75}.nr-card{margin-bottom:12px}.nr-gross{width:100%;background:#0f1c30;border:1px solid #475569;color:white;border-radius:11px;padding:15px;text-align:center;font-size:19px;font-weight:800;outline:0}.nr-pull{width:100%;margin-top:9px;background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.4);color:#6ee7b7}.nr-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.nr-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 4px;border-bottom:1px solid rgba(51,65,85,.7);font-size:11px}.nr-toggle-row:last-child{border-bottom:0}.nr-toggle-row label{display:flex;align-items:center;gap:9px;cursor:pointer}.nr-toggle-row input[type=checkbox]{display:none}.nr-switch{width:31px;height:17px;border-radius:999px;background:#475569;position:relative;transition:.2s}.nr-switch:after{content:'';position:absolute;width:13px;height:13px;left:2px;top:2px;border-radius:50%;background:#cbd5e1;transition:.2s}.nr-toggle-row input:checked+.nr-switch{background:#059669}.nr-toggle-row input:checked+.nr-switch:after{transform:translateX(14px);background:white}.nr-toggle-row small{padding:2px 6px;border-radius:99px;background:#334155;color:#cbd5e1}.nr-toggle-row.disabled{opacity:.45}.deduct{color:#f87171!important}.cost-deduct{color:#fb923c!important}.nr-percent{display:flex;justify-content:space-between;align-items:center;color:#94a3b8;font-size:10px;padding:9px 4px}.nr-percent span{display:flex;align-items:center;gap:5px}.nr-percent input{width:85px;background:#0f1c30;border:1px solid #475569;color:white;border-radius:8px;padding:7px}.nr-cost-total{display:flex;justify-content:space-between;padding:11px 4px 2px;font-size:11px}.nr-cost-total strong{color:#fb923c}.nr-summary{max-width:900px;margin-left:auto;margin-right:auto}.break-row.subtotal{border-top:1px solid #475569;margin-top:3px}.nr-final{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #475569;margin-top:5px;padding-top:12px;font-size:12px}.nr-final strong{font-size:18px;color:#34d399}.pill.api-ok{color:#6ee7b7;border-color:rgba(16,185,129,.5);background:rgba(16,185,129,.12)}
    @media(max-width:900px){.nr-kpis{grid-template-columns:repeat(3,1fr)}.nr-grid{grid-template-columns:1fr}}@media(max-width:600px){.nr-kpis{grid-template-columns:1fr 1fr}}
  `;document.head.appendChild(style);

  document.querySelector('[data-tab="nota-reversa"]')?.addEventListener('click',()=>setTimeout(render,0));
  render();
})();
