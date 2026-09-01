'use strict';
(() => {
  const section=document.getElementById('tab-despesas'); if(!section)return;
  const $=s=>section.querySelector(s),$$=s=>[...section.querySelectorAll(s)];
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(num(v));
  const load=(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):JSON.parse(JSON.stringify(f))}catch{return JSON.parse(JSON.stringify(f))}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const id=()=>String(Date.now())+Math.random().toString(36).slice(2,7);

  const CLIENTS=[{id:'brf',name:'BRF',dias:180},{id:'couros',name:'JBS Couros',dias:10},{id:'0%',name:'inss0',dias:30},{id:'jbs',name:'JBS',dias:135},{id:'vibra',name:'VIBRA',dias:30},{id:'agrogen',name:'Agrogen',dias:35},{id:'migplus',name:'MIG PLUS',dias:45},{id:'sbe',name:'LAR',dias:5}];
  const VEHICLES=[{id:'gol',name:'Gol',capacity:5},{id:'montana',name:'Montana',capacity:2},{id:'kombi',name:'Kombi',capacity:9}];
  const DEFAULT_CFG={inss:11,simplesIssqn:19,lucroPercent:10,jurosDia:.1,trocaNota:0,descontoCompras:12};
  const KEY_PROFILES='multprest_orc_bdi_profiles_v1',KEY_EXP='multprest_orc_expenses_v1',KEY_TRAVEL='multprest_orc_travel_totals_v1',KEY_LABOR='multprest_orc_labor_items_v1',KEY_TEAM='multprest_orc_team_size_v1';
  const newAccommodation=(clientId='jbs')=>({id:id(),clientId,baseCost:0,people:0,days:0});
  const newMeal=(clientId='jbs')=>({id:id(),clientId,location:'',baseCost:0,people:0,days:0});
  const newTransport=(clientId='jbs')=>({id:id(),clientId,vehicleId:'gol',description:'',gasPricePerLiter:0,kmPerLiter:0,toll:0,manualKm:0,manualViagens:0});

  function normalize(saved){
    if(saved&&Array.isArray(saved.accommodationItems)) return {
      accommodationItems:saved.accommodationItems.length?saved.accommodationItems:[newAccommodation()],
      transportItems:Array.isArray(saved.transportItems)&&saved.transportItems.length?saved.transportItems:[newTransport()],
      lunchItems:Array.isArray(saved.lunchItems)&&saved.lunchItems.length?saved.lunchItems:[newMeal()],
      dinnerItems:Array.isArray(saved.dinnerItems)&&saved.dinnerItems.length?saved.dinnerItems:[newMeal()],
      breakfastItems:Array.isArray(saved.breakfastItems)&&saved.breakfastItems.length?saved.breakfastItems:[newMeal()],
      teamSize:num(saved.teamSize)||9
    };
    if(saved&&Array.isArray(saved.accommodation)) return {
      accommodationItems:saved.accommodation.length?saved.accommodation:[newAccommodation()],
      transportItems:Array.isArray(saved.transport)&&saved.transport.length?saved.transport:[newTransport()],
      lunchItems:Array.isArray(saved.lunches)&&saved.lunches.length?saved.lunches:[newMeal()],
      dinnerItems:Array.isArray(saved.dinners)&&saved.dinners.length?saved.dinners:[newMeal()],
      breakfastItems:Array.isArray(saved.breakfasts)&&saved.breakfasts.length?saved.breakfasts:[newMeal()],
      teamSize:num(saved.teamSize)||9
    };
    const stay=saved?.stay||{},tr=saved?.transport||{},lu=saved?.lunch||{},di=saved?.dinner||{},co=saved?.coffee||{};
    return {
      accommodationItems:[{id:id(),clientId:stay.clientId||'jbs',baseCost:num(stay.unitCost),people:num(stay.people),days:num(stay.days)}],
      transportItems:[{id:id(),clientId:tr.clientId||'jbs',vehicleId:String(tr.vehicleId||'gol'),description:String(tr.description||tr.vehicle||''),gasPricePerLiter:num(tr.pricePerLiter),kmPerLiter:num(tr.kmPerLiter),toll:num(tr.toll),manualKm:tr.source==='manual'?num(tr.manualKm):0,manualViagens:tr.source==='manual'?num(tr.trips):0}],
      lunchItems:[{id:id(),clientId:lu.clientId||'jbs',location:String(lu.location||''),baseCost:num(lu.unitCost),people:num(lu.people),days:num(lu.days)}],
      dinnerItems:[{id:id(),clientId:di.clientId||'jbs',location:String(di.location||''),baseCost:num(di.unitCost),people:num(di.people),days:num(di.days)}],
      breakfastItems:[{id:id(),clientId:co.clientId||'jbs',location:String(co.location||''),baseCost:num(co.unitCost),people:num(co.people),days:num(co.days)}],
      teamSize:9
    };
  }

  let state=normalize(load(KEY_EXP,{}));
  const profile=clientId=>({...DEFAULT_CFG,diasPagamento:CLIENTS.find(c=>c.id===clientId)?.dias||30,...(load(KEY_PROFILES,{})[clientId]||{})});
  const financial=p=>(Math.pow(1+num(p.jurosDia)/100,num(p.diasPagamento))-1)*100;
  const bdi=p=>num(p.inss)+num(p.simplesIssqn)+num(p.lucroPercent)+financial(p)+num(p.trocaNota)+num(p.descontoCompras);
  const withBDI=(cost,clientId)=>{const div=1-bdi(profile(clientId))/100;return cost>0&&div>0?cost/div:0};
  const clients=selected=>CLIENTS.map(c=>`<option value="${c.id}" ${selected===c.id?'selected':''}>${c.name} (${profile(c.id).diasPagamento}d)</option>`).join('');
  const vehicles=selected=>VEHICLES.map(v=>`<option value="${v.id}" ${selected===v.id?'selected':''}>${v.name} (${v.capacity}p)</option>`).join('');
  const travel=()=>window.MULTPREST_TRAVEL_TOTALS||load(KEY_TRAVEL,{totalDistance:0,totalViagens:0});

  const mealRawItem=o=>num(o.baseCost)*num(o.people)*num(o.days);
  const mealSaleItem=o=>withBDI(num(o.baseCost),o.clientId)*num(o.people)*num(o.days);
  const sumRaw=arr=>arr.reduce((s,o)=>s+mealRawItem(o),0);
  const sumSale=arr=>arr.reduce((s,o)=>s+mealSaleItem(o),0);
  function transportItemCalc(t){
    const tr=travel(),useKm=num(t.manualKm)>0?num(t.manualKm):num(tr.totalDistance),useTrips=num(t.manualViagens)>0?num(t.manualViagens):(num(tr.totalViagens)||1);
    const costPerKm=num(t.kmPerLiter)>0?num(t.gasPricePerLiter)/num(t.kmPerLiter):0;
    const gasCost=useKm*costPerKm,base=(gasCost+num(t.toll))*useTrips;
    return {useKm,useTrips,costPerKm,gasCost,base,total:withBDI(base,t.clientId)};
  }
  function compute(){
    const raw={stay:sumRaw(state.accommodationItems),lunch:sumRaw(state.lunchItems),dinner:sumRaw(state.dinnerItems),coffee:sumRaw(state.breakfastItems),transport:state.transportItems.reduce((s,t)=>s+transportItemCalc(t).base,0)};
    raw.total=raw.stay+raw.transport+raw.lunch+raw.dinner+raw.coffee;
    const sale={stay:sumSale(state.accommodationItems),lunch:sumSale(state.lunchItems),dinner:sumSale(state.dinnerItems),coffee:sumSale(state.breakfastItems),transport:state.transportItems.reduce((s,t)=>s+transportItemCalc(t).total,0)};
    sale.total=sale.stay+sale.transport+sale.lunch+sale.dinner+sale.coffee;
    return {raw,sale};
  }
  function persist(){
    const {raw}=compute();
    const stored={...state,stay:{unitCost:raw.stay,people:1,days:1},transport:{source:'manual',manualKm:raw.transport,trips:1,pricePerLiter:1,kmPerLiter:1,toll:0},lunch:{unitCost:raw.lunch,people:1,days:1},dinner:{unitCost:raw.dinner,people:1,days:1},coffee:{unitCost:raw.coffee,people:1,days:1}};
    localStorage.setItem(KEY_EXP,JSON.stringify(stored));
  }
  function publishTotals(){
    const {raw,sale}=compute();
    window.MULTPREST_EXPENSE_TOTALS=sale;window.MULTPREST_EXPENSE_RAW_TOTALS=raw;
    localStorage.setItem('multprest_orc_expense_totals_v1',JSON.stringify(sale));localStorage.setItem('multprest_orc_expense_raw_totals_v1',JSON.stringify(raw));
    window.dispatchEvent(new CustomEvent('multprest:expenses-updated',{detail:{sale,raw}}));
    return {raw,sale};
  }
  function saveAndRender(){persist();render()}

  function laborSyncValues(){
    const items=load(KEY_LABOR,[]),laborTeamSize=Math.min(9,Math.max(1,num(localStorage.getItem(KEY_TEAM))||9));
    const totalPeople=(Array.isArray(items)?items:[]).reduce((s,i)=>s+num(i.people),0),teamDays=laborTeamSize>0?Math.ceil(totalPeople/laborTeamSize):0;
    return {laborTeamSize,totalPeople,teamDays};
  }
  function syncFirst(kind){
    const {laborTeamSize,teamDays}=laborSyncValues();state.teamSize=laborTeamSize;const arr=state[kind];if(!arr?.length)return;arr[0]={...arr[0],people:laborTeamSize,days:teamDays};saveAndRender();
  }

  function itemHead(title,total,onAdd,onReset,syncKind=''){
    return `<div class="exp-section-head"><div><h3>${title}</h3><strong>${money(total)}</strong></div><div>${syncKind?`<button class="btn ghost tiny exp-sync" data-sync="${syncKind}">↙ Puxar Mão de Obra</button>`:''}<button class="btn ghost tiny exp-reset" data-reset="${onReset}">↻ Zerar</button><button class="btn tiny exp-add" data-add="${onAdd}">+ Adicionar</button></div></div>`;
  }
  function mealRows(arr,kind,hasLocation=true){
    return arr.map(o=>`<div class="expense-row meal-exp-row" data-kind="${kind}" data-id="${o.id}"><label>Cliente<select data-k="clientId">${clients(o.clientId)}</select></label>${hasLocation?`<label>Local<input data-k="location" value="${esc(o.location||'')}"></label>`:''}<label>Custo R$<input data-k="baseCost" type="number" min="0" step="0.01" value="${num(o.baseCost)}"></label><label>Pessoas<input data-k="people" type="number" min="0" step="1" value="${num(o.people)}"></label><label>Dias<input data-k="days" type="number" min="0" step="1" value="${num(o.days)}"></label><div class="expense-calc"><span>Base ${money(mealRawItem(o))}</span><strong>${money(mealSaleItem(o))}</strong></div><button class="remove exp-remove" ${arr.length===1?'disabled':''}>×</button></div>`).join('');
  }
  function transportRows(){
    return state.transportItems.map(t=>{const c=transportItemCalc(t),v=VEHICLES.find(v=>v.id===t.vehicleId);return `<div class="expense-row transport-exp-row" data-kind="transportItems" data-id="${t.id}"><label>Cliente<select data-k="clientId">${clients(t.clientId)}</select></label><label>Veículo<select data-k="vehicleId">${vehicles(t.vehicleId)}</select></label><label>Descrição<input data-k="description" value="${esc(t.description||'')}"></label><label>R$/Litro<input data-k="gasPricePerLiter" type="number" min="0" step="0.01" value="${num(t.gasPricePerLiter)}"></label><label>KM/L<input data-k="kmPerLiter" type="number" min="0" step="0.1" value="${num(t.kmPerLiter)}"></label><label>Pedágio<input data-k="toll" type="number" min="0" step="0.01" value="${num(t.toll)}"></label><label>KM Manual<input data-k="manualKm" type="number" min="0" step="0.1" value="${num(t.manualKm)}" placeholder="0 = Horas Viajadas"></label><label>Viagens Manual<input data-k="manualViagens" type="number" min="0" step="1" value="${num(t.manualViagens)}" placeholder="0 = Horas Viajadas"></label><div class="transport-result"><span>${v?.name||'Veículo'} • ${c.useKm.toFixed(1)} km × ${money(c.costPerKm)}/km • ${c.useTrips} viagem(ns)</span><small>Base ${money(c.base)}</small><strong>${money(c.total)}</strong></div><button class="remove exp-remove" ${state.transportItems.length===1?'disabled':''}>×</button></div>`}).join('');
  }

  function render(){
    const {raw,sale}=publishTotals(),tr=travel(),sync=laborSyncValues();section.classList.remove('placeholder');
    section.innerHTML=`<div class="page-title"><div><span class="eyebrow">Custos de campo</span><h2>Estadia e Alimentação</h2><p>Estrutura validada contra o sistema original: permite vários itens por categoria, BDI por cliente, KM/viagens automáticos ou manuais e sincronização com Mão de Obra.</p></div><button class="btn ghost danger" id="btnResetExpenses">↻ Zerar todas</button></div><div class="expense-kpis"><div class="kpi blue"><span>Estadia</span><strong>${money(sale.stay)}</strong></div><div class="kpi purple"><span>Transporte</span><strong>${money(sale.transport)}</strong></div><div class="kpi amber"><span>Almoço</span><strong>${money(sale.lunch)}</strong></div><div class="kpi teal"><span>Janta</span><strong>${money(sale.dinner)}</strong></div><div class="kpi green"><span>Café</span><strong>${money(sale.coffee)}</strong></div><div class="kpi total-kpi"><span>Total</span><strong>${money(sale.total)}</strong></div></div><div class="labor-sync-note">Mão de Obra atual: <b>${sync.totalPeople} pessoas somadas</b> • equipe de <b>${sync.laborTeamSize}</b> • <b>${sync.teamDays} dias de equipe</b>. O botão “Puxar Mão de Obra” altera somente o primeiro item da categoria, como no original.</div><section class="card exp-group">${itemHead('🏠 Estadia',sale.stay,'accommodationItems','accommodationItems','accommodationItems')}<div class="expense-list">${mealRows(state.accommodationItems,'accommodationItems',false)}</div></section><section class="card exp-group">${itemHead('🚗 Transporte',sale.transport,'transportItems','transportItems')}<div class="travel-link-box"><div><span>KM Total — Horas Viajadas</span><strong>${num(tr.totalDistance).toFixed(1)} km</strong></div><div><span>Viagens</span><strong>${num(tr.totalViagens)}x</strong></div><small>Preencher KM/Viagens Manual acima de zero substitui automaticamente esses dados, igual ao sistema original.</small></div><div class="expense-list">${transportRows()}</div></section><section class="card exp-group">${itemHead('🍽️ Almoço',sale.lunch,'lunchItems','lunchItems','lunchItems')}<div class="expense-list">${mealRows(state.lunchItems,'lunchItems')}</div></section><section class="card exp-group">${itemHead('🌙 Janta',sale.dinner,'dinnerItems','dinnerItems','dinnerItems')}<div class="expense-list">${mealRows(state.dinnerItems,'dinnerItems')}</div></section><section class="card exp-group">${itemHead('☕ Café',sale.coffee,'breakfastItems','breakfastItems','breakfastItems')}<div class="expense-list">${mealRows(state.breakfastItems,'breakfastItems')}</div></section><div class="expense-total-bar"><span>Total sem BDI: ${money(raw.total)}</span><strong>Total de Estadia e Alimentação ${money(sale.total)}</strong></div>`;bind();
  }

  function add(kind){if(kind==='transportItems')state[kind].push(newTransport());else if(kind==='accommodationItems')state[kind].push(newAccommodation());else state[kind].push(newMeal());saveAndRender()}
  function reset(kind){if(kind==='transportItems')state[kind]=[newTransport()];else if(kind==='accommodationItems')state[kind]=[newAccommodation()];else state[kind]=[newMeal()];saveAndRender()}
  function bind(){
    $$('.expense-row').forEach(row=>{const arr=state[row.dataset.kind],o=arr.find(x=>x.id===row.dataset.id);if(!o)return;row.querySelectorAll('[data-k]').forEach(el=>{const k=el.dataset.k,numeric=['baseCost','people','days','gasPricePerLiter','kmPerLiter','toll','manualKm','manualViagens'].includes(k);el.addEventListener(el.tagName==='SELECT'?'change':'input',e=>{o[k]=numeric?num(e.target.value):e.target.value;saveAndRender()})});row.querySelector('.exp-remove').onclick=()=>{if(arr.length===1)return;state[row.dataset.kind]=arr.filter(x=>x.id!==o.id);saveAndRender()}});$$('[data-add]').forEach(b=>b.onclick=()=>add(b.dataset.add));$$('[data-reset]').forEach(b=>b.onclick=()=>reset(b.dataset.reset));$$('[data-sync]').forEach(b=>b.onclick=()=>syncFirst(b.dataset.sync));$('#btnResetExpenses').onclick=()=>{if(confirm('Zerar todos os itens de Estadia, Transporte e Alimentação?')){state={accommodationItems:[newAccommodation()],transportItems:[newTransport()],lunchItems:[newMeal()],dinnerItems:[newMeal()],breakfastItems:[newMeal()],teamSize:9};saveAndRender()}};
  }

  const style=document.createElement('style');style.textContent=`.expense-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin-bottom:12px}.total-kpi{border-color:rgba(16,185,129,.45)!important;background:rgba(16,185,129,.12)!important;color:#a7f3d0!important}.labor-sync-note{margin-bottom:12px;padding:9px 11px;border:1px solid rgba(59,130,246,.2);background:rgba(59,130,246,.05);border-radius:9px;color:#94a3b8;font-size:9px}.labor-sync-note b{color:#bfdbfe}.exp-group{margin-bottom:11px}.exp-section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.exp-section-head>div:first-child{display:flex;align-items:center;gap:10px}.exp-section-head h3{margin:0;font-size:13px}.exp-section-head strong{color:#6ee7b7}.exp-section-head>div:last-child{display:flex;gap:6px;flex-wrap:wrap}.btn.tiny{padding:6px 8px;font-size:9px}.expense-list{display:grid;gap:8px}.expense-row{display:grid;gap:7px;align-items:end;padding:9px;border:1px solid var(--line);border-radius:9px;background:#0d192a}.meal-exp-row{grid-template-columns:1.1fr 1.1fr .7fr .65fr .65fr 1.05fr 32px}.transport-exp-row{grid-template-columns:repeat(8,minmax(85px,1fr)) 2.1fr 32px}.expense-row label{display:grid;gap:4px;color:var(--muted);font-size:9px}.expense-row input,.expense-row select{min-width:0;width:100%;background:#0f1c30;border:1px solid var(--line);color:var(--text);padding:8px;border-radius:7px;outline:0;font-size:9px}.expense-calc,.transport-result{display:grid;gap:2px;color:#94a3b8;font-size:9px}.expense-calc strong,.transport-result strong{color:#6ee7b7;font-size:11px}.transport-result small{color:#cbd5e1}.travel-link-box{display:grid;grid-template-columns:180px 120px 1fr;gap:9px;align-items:center;margin-bottom:10px;padding:9px 10px;border:1px solid rgba(59,130,246,.2);background:rgba(59,130,246,.05);border-radius:9px}.travel-link-box div{display:grid;gap:2px}.travel-link-box span,.travel-link-box small{color:#94a3b8;font-size:9px}.travel-link-box strong{color:#93c5fd}.expense-total-bar{display:flex;justify-content:space-between;align-items:center;gap:20px;border:1px solid rgba(16,185,129,.25);background:rgba(16,185,129,.07);border-radius:12px;padding:14px 16px;font-size:10px;color:#94a3b8}.expense-total-bar strong{font-size:14px;color:#6ee7b7}@media(max-width:1200px){.transport-exp-row{grid-template-columns:repeat(4,1fr)}.transport-result{grid-column:1/-2}.meal-exp-row{grid-template-columns:repeat(3,1fr)}.expense-calc{grid-column:1/-2}}@media(max-width:700px){.expense-kpis{grid-template-columns:1fr 1fr}.exp-section-head{align-items:flex-start;flex-direction:column}.meal-exp-row,.transport-exp-row{grid-template-columns:1fr}.transport-result,.expense-calc{grid-column:auto}.travel-link-box{grid-template-columns:1fr 1fr}.travel-link-box small{grid-column:1/-1}.expense-total-bar{align-items:flex-start;flex-direction:column}}`;
  document.head.appendChild(style);
  document.querySelector('[data-tab="despesas"]')?.addEventListener('click',()=>setTimeout(render,0));window.addEventListener('multprest:travel-updated',render);render();
})();