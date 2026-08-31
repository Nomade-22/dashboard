'use strict';
(() => {
  const section=document.getElementById('tab-despesas');
  if(!section) return;
  const $=s=>section.querySelector(s), $$=s=>[...section.querySelectorAll(s)];
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const brl=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}), money=v=>brl.format(num(v));
  const load=(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):JSON.parse(JSON.stringify(f))}catch{return JSON.parse(JSON.stringify(f))}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const CLIENTS=[
    {id:'brf',name:'BRF',dias:180},{id:'couros',name:'JBS Couros',dias:10},{id:'0%',name:'inss0',dias:30},{id:'jbs',name:'JBS',dias:135},
    {id:'vibra',name:'VIBRA',dias:30},{id:'agrogen',name:'Agrogen',dias:35},{id:'migplus',name:'MIG PLUS',dias:45},{id:'sbe',name:'LAR',dias:5}
  ];
  const DEFAULT_CFG={inss:11,simplesIssqn:19,lucroPercent:10,jurosDia:.1,trocaNota:0,descontoCompras:12};
  const KEY_PROFILES='multprest_orc_bdi_profiles_v1',KEY_EXP='multprest_orc_expenses_v1',KEY_TRAVEL='multprest_orc_travel_totals_v1';
  const DEFAULTS={
    stay:{clientId:'jbs',location:'Soledade',unitCost:129,people:0,days:0},
    transport:{clientId:'jbs',vehicle:'Gol (5p)',pricePerLiter:0,kmPerLiter:10,toll:0,source:'travel',manualKm:0,trips:1},
    lunch:{clientId:'jbs',location:'Local',unitCost:0,people:0,days:0},
    dinner:{clientId:'jbs',location:'Local',unitCost:0,people:0,days:0},
    coffee:{clientId:'jbs',location:'Local',unitCost:0,people:0,days:0}
  };
  let state={...DEFAULTS,...load(KEY_EXP,{})};
  const save=()=>localStorage.setItem(KEY_EXP,JSON.stringify(state));
  const storedProfiles=()=>load(KEY_PROFILES,{});
  const profile=id=>({
    ...DEFAULT_CFG,
    diasPagamento:CLIENTS.find(c=>c.id===id)?.dias||30,
    ...(storedProfiles()[id]||{})
  });
  const financial=p=>(Math.pow(1+num(p.jurosDia)/100,num(p.diasPagamento))-1)*100;
  const bdi=p=>num(p.inss)+num(p.simplesIssqn)+num(p.lucroPercent)+financial(p)+num(p.trocaNota)+num(p.descontoCompras);
  const withBDI=(cost,id)=>{const p=profile(id),div=1-bdi(p)/100;return cost>0&&div>0?cost/div:0};
  const clients=id=>CLIENTS.map(c=>`<option value="${c.id}" ${id===c.id?'selected':''}>${c.name} (${profile(c.id).diasPagamento}d)</option>`).join('');
  const travel=()=>window.MULTPREST_TRAVEL_TOTALS||load(KEY_TRAVEL,{totalDistance:0,totalViagens:0});

  function mealTotal(obj){return withBDI(num(obj.unitCost),obj.clientId)*num(obj.people)*num(obj.days)}
  function stayTotal(){return mealTotal(state.stay)}
  function transportCalc(){
    const t=state.transport,tr=travel();
    const costKm=num(t.kmPerLiter)>0?num(t.pricePerLiter)/num(t.kmPerLiter):0;
    let km=0,trips=0;
    if(t.source==='travel'){
      km=num(tr.totalDistance);trips=num(tr.totalViagens);
    }else{
      trips=num(t.trips);km=num(t.manualKm)*trips;
    }
    const baseFuel=km*costKm,baseToll=num(t.toll)*trips,base=baseFuel+baseToll;
    return {km,trips,costKm,baseFuel,baseToll,base,total:withBDI(base,t.clientId)};
  }
  function totals(){
    const transport=transportCalc().total;
    const data={stay:stayTotal(),transport,lunch:mealTotal(state.lunch),dinner:mealTotal(state.dinner),coffee:mealTotal(state.coffee)};
    data.total=Object.values(data).reduce((a,b)=>a+b,0);
    window.MULTPREST_EXPENSE_TOTALS=data;
    localStorage.setItem('multprest_orc_expense_totals_v1',JSON.stringify(data));
    return data;
  }

  function mealCard(key,title,icon,extra=''){
    const o=state[key],unitBDI=withBDI(num(o.unitCost),o.clientId),total=mealTotal(o);
    return `<section class="card exp-card" data-exp="${key}">
      <div class="exp-card-head"><div><span class="exp-icon">${icon}</span><h3>${title}</h3></div><strong>${money(total)}</strong></div>
      ${extra}
      <div class="exp-grid four">
        <label>Cliente<select data-k="clientId">${clients(o.clientId)}</select></label>
        <label>Local<input data-k="location" value="${esc(o.location)}" placeholder="Local"></label>
        <label>Custo R$<input data-k="unitCost" type="number" min="0" step="0.01" value="${num(o.unitCost)}"></label>
        <label>Pessoas<input data-k="people" type="number" min="0" step="1" value="${num(o.people)}"></label>
        <label>Dias<input data-k="days" type="number" min="0" step="1" value="${num(o.days)}"></label>
      </div>
      <div class="exp-formula"><span>Base: <b>${money(o.unitCost)}</b></span><span>→ c/ BDI: <b>${money(unitBDI)}</b></span><span>Total: <b>${money(total)}</b></span></div>
    </section>`;
  }

  function render(){
    const tt=totals(),tr=transportCalc(),t=state.transport,travelData=travel();
    section.classList.remove('placeholder');
    section.innerHTML=`
      <div class="page-title">
        <div><span class="eyebrow">Custos de campo</span><h2>Estadia e Alimentação</h2><p>Mantém a composição do sistema original e aplica o BDI do cliente em cada despesa. O transporte pode usar automaticamente os KM e viagens calculados em Horas Viajadas.</p></div>
        <button class="btn ghost danger" id="btnResetExpenses">↻ Zerar despesas</button>
      </div>
      <div class="expense-kpis">
        <div class="kpi blue"><span>Estadia</span><strong>${money(tt.stay)}</strong></div>
        <div class="kpi purple"><span>Transporte</span><strong>${money(tt.transport)}</strong></div>
        <div class="kpi amber"><span>Almoço</span><strong>${money(tt.lunch)}</strong></div>
        <div class="kpi teal"><span>Janta</span><strong>${money(tt.dinner)}</strong></div>
        <div class="kpi green"><span>Café</span><strong>${money(tt.coffee)}</strong></div>
        <div class="kpi total-kpi"><span>Total</span><strong>${money(tt.total)}</strong></div>
      </div>

      ${mealCard('stay','Estadia','🏠','<div class="location-note">📍 Referência preservada do sistema: Soledade — diária da casa. O valor continua editável.</div>')}

      <section class="card exp-card" data-exp="transport">
        <div class="exp-card-head"><div><span class="exp-icon">🚗</span><h3>Transporte</h3></div><strong>${money(tr.total)}</strong></div>
        <div class="travel-link-box"><div><span>KM Total</span><strong>${num(travelData.totalDistance).toFixed(1)} km</strong></div><div><span>Viagens</span><strong>${num(travelData.totalViagens)}x</strong></div><small>Dados da aba “Horas Viajadas”</small></div>
        <div class="exp-grid transport-grid">
          <label>Cliente<select data-k="clientId">${clients(t.clientId)}</select></label>
          <label>Veículo<input data-k="vehicle" value="${esc(t.vehicle)}" placeholder="Ex.: Gol (5p)"></label>
          <label>R$/Litro<input data-k="pricePerLiter" type="number" min="0" step="0.01" value="${num(t.pricePerLiter)}"></label>
          <label>KM/L<input data-k="kmPerLiter" type="number" min="0" step="0.1" value="${num(t.kmPerLiter)}"></label>
          <label>Pedágio / viagem<input data-k="toll" type="number" min="0" step="0.01" value="${num(t.toll)}"></label>
          <label>Fonte KM<select data-k="source"><option value="travel" ${t.source==='travel'?'selected':''}>Horas Viajadas</option><option value="manual" ${t.source==='manual'?'selected':''}>Manual</option></select></label>
          <label class="${t.source==='manual'?'':'muted-input'}">KM Manual<input data-k="manualKm" type="number" min="0" step="0.1" value="${num(t.manualKm)}" ${t.source==='manual'?'':'disabled'}></label>
          <label class="${t.source==='manual'?'':'muted-input'}">Viagens<input data-k="trips" type="number" min="0" step="1" value="${num(t.trips)}" ${t.source==='manual'?'':'disabled'}></label>
        </div>
        <div class="exp-formula transport-formula"><span>${esc(t.vehicle||'Veículo')} ${t.source==='manual'?'[Manual]':'[Horas Viajadas]'}</span><span><b>${tr.km.toFixed(1)} km</b> × <b>${money(tr.costKm)}/km</b> = ${money(tr.baseFuel)}</span><span>+ Pedágio: ${money(tr.baseToll)}</span><span>Base: <b>${money(tr.base)}</b></span><span>c/ BDI: <b>${money(tr.total)}</b></span></div>
      </section>

      ${mealCard('lunch','Almoço','🍽️')}
      ${mealCard('dinner','Janta','🌙')}
      ${mealCard('coffee','Café','☕')}
      <div class="expense-total-bar"><span>Total de Estadia e Alimentação</span><strong>${money(tt.total)}</strong></div>`;

    bind();
  }

  function bind(){
    $$('.exp-card').forEach(card=>{
      const key=card.dataset.exp,obj=state[key];
      card.querySelectorAll('[data-k]').forEach(el=>{
        const k=el.dataset.k, numeric=['unitCost','people','days','pricePerLiter','kmPerLiter','toll','manualKm','trips'].includes(k);
        const evt=el.tagName==='SELECT'?'change':'input';
        el.addEventListener(evt,e=>{obj[k]=numeric?num(e.target.value):e.target.value;save();render()});
      });
    });
    $('#btnResetExpenses').onclick=()=>{if(confirm('Zerar os valores de despesas desta tela?')){state=JSON.parse(JSON.stringify(DEFAULTS));save();render()}};
  }

  const style=document.createElement('style');
  style.textContent=`
    .expense-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin-bottom:14px}.total-kpi{border-color:rgba(16,185,129,.45)!important;background:rgba(16,185,129,.12)!important;color:#a7f3d0!important}
    .exp-card{margin-bottom:11px}.exp-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px}.exp-card-head>div{display:flex;align-items:center;gap:8px}.exp-card-head h3{margin:0;font-size:13px}.exp-card-head>strong{color:#6ee7b7;font-size:15px}.exp-icon{font-size:16px}
    .exp-grid{display:grid;gap:8px}.exp-grid.four{grid-template-columns:1.2fr 1.2fr repeat(3,.75fr)}.transport-grid{grid-template-columns:1.1fr 1fr repeat(4,.75fr)}.exp-grid label{display:grid;gap:5px;color:var(--muted);font-size:10px}.exp-grid input,.exp-grid select{width:100%;min-width:0;background:#0f1c30;border:1px solid var(--line);color:var(--text);padding:9px;border-radius:8px;outline:0;font-size:10px}.muted-input{opacity:.45}
    .exp-formula{margin-top:9px;padding-top:9px;border-top:1px solid var(--line);display:flex;gap:13px;flex-wrap:wrap;color:#94a3b8;font-size:10px}.exp-formula b{color:#e2e8f0}.transport-formula{color:#cbd5e1}.location-note{margin:-2px 0 10px;padding:8px 10px;border-radius:8px;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.18);font-size:10px;color:#bfdbfe}
    .travel-link-box{display:grid;grid-template-columns:140px 140px 1fr;gap:8px;align-items:center;margin-bottom:10px;padding:9px 10px;border:1px solid rgba(59,130,246,.2);background:rgba(59,130,246,.05);border-radius:9px}.travel-link-box div{display:flex;gap:7px;align-items:center}.travel-link-box span,.travel-link-box small{color:#94a3b8;font-size:9px}.travel-link-box strong{font-size:11px;color:#93c5fd}.travel-link-box small{text-align:right}
    .expense-total-bar{display:flex;align-items:center;justify-content:flex-end;gap:18px;border:1px solid rgba(16,185,129,.25);background:rgba(16,185,129,.07);border-radius:12px;padding:14px 16px;font-size:11px}.expense-total-bar span{color:#a7f3d0}.expense-total-bar strong{font-size:18px;color:#6ee7b7}
    @media(max-width:1050px){.expense-kpis{grid-template-columns:repeat(3,1fr)}.exp-grid.four,.transport-grid{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:650px){.expense-kpis{grid-template-columns:1fr 1fr}.exp-grid.four,.transport-grid{grid-template-columns:1fr}.travel-link-box{grid-template-columns:1fr 1fr}.travel-link-box small{grid-column:1/-1;text-align:left}.expense-total-bar{justify-content:space-between}}
  `;
  document.head.appendChild(style);

  document.querySelector('[data-tab="despesas"]')?.addEventListener('click',()=>setTimeout(render,0));
  window.addEventListener('multprest:travel-updated',render);
  render();
})();