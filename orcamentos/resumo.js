'use strict';
(() => {
  const section=document.getElementById('tab-resumo'); if(!section)return;
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(num(v));
  const load=(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):JSON.parse(JSON.stringify(f))}catch{return JSON.parse(JSON.stringify(f))}};
  const CLIENTS=[{id:'brf',dias:180},{id:'couros',dias:10},{id:'0%',dias:30},{id:'jbs',dias:135},{id:'vibra',dias:30},{id:'agrogen',dias:35},{id:'migplus',dias:45},{id:'sbe',dias:5}];
  const DEFAULT_BDI={inss:11,simplesIssqn:19,lucroPercent:10,jurosDia:.1,trocaNota:0,descontoCompras:12};
  const HOUR_TYPES={normal:1,'50':1.5,'100':2,'120':2.2};
  function profile(id){const p=load('multprest_orc_bdi_profiles_v1',{});return {...DEFAULT_BDI,diasPagamento:CLIENTS.find(c=>c.id===id)?.dias||30,...(p[id]||{})}}
  function withBDI(cost,id){const p=profile(id),fin=(Math.pow(1+num(p.jurosDia)/100,num(p.diasPagamento))-1)*100,sum=num(p.inss)+num(p.simplesIssqn)+num(p.lucroPercent)+fin+num(p.trocaNota)+num(p.descontoCompras),div=1-sum/100;return cost>0&&div>0?cost/div:0}
  function totals(){
    const laborItems=load('multprest_orc_labor_items_v1',[]),rates=load('multprest_orc_labor_rates_v1',{});
    const maoDeObra=laborItems.reduce((s,i)=>s+num(rates[`${i.workerTypeId}|${i.clientId}`])*num(HOUR_TYPES[i.hourTypeId]||1)*num(i.hours)*num(i.people)*num(i.days),0);
    const materials=load('multprest_orc_bdi_materials_v1',[]),material=materials.reduce((s,m)=>s+withBDI(num(m.valorMaterial),m.clientId),0);
    const travel=load('multprest_orc_travel_totals_v1',{totalCost:0}),viagens=num(travel.totalCost);
    const exp=load('multprest_orc_expense_totals_v1',{stay:0,transport:0,lunch:0,dinner:0,coffee:0});
    const estadia=num(exp.stay),transporte=num(exp.transport),almoco=num(exp.lunch),janta=num(exp.dinner),cafe=num(exp.coffee),alimentacao=almoco+janta+cafe;
    const despesasViagem=estadia+transporte+alimentacao+viagens;
    const grand=maoDeObra+material+estadia+transporte+alimentacao+viagens;
    const nr=load('multprest_orc_reverse_note_totals_v1',{});
    return {maoDeObra,material,estadia,transporte,almoco,janta,cafe,alimentacao,viagens,despesasViagem,grand,lucro:num(nr.final),lucroPercent:num(nr.lucro)};
  }
  const pct=(v,g)=>g>0?v/g*100:0;
  function render(){
    const t=totals(); window.MULTPREST_SUMMARY_TOTALS=t;localStorage.setItem('multprest_orc_summary_totals_v1',JSON.stringify(t));
    const cards=[['👷','Mão de Obra',t.maoDeObra,'orange'],['📦','Material',t.material,'blue'],['💼','Despesas de Viagem',t.despesasViagem,'pink'],['🏠','Estadia',t.estadia,'purple'],['🚗','Transporte',t.transporte,'cyan'],['☕','Alimentação',t.alimentacao,'amber'],['🕒','Horas Viajadas',t.viagens,'rose']];
    section.classList.remove('placeholder');
    section.innerHTML=`
      <div class="page-title"><div><span class="eyebrow">Consolidação</span><h2>Resumo Final</h2><p>Consolidação preservada do sistema original: Mão de Obra + Material + Estadia + Transporte + Alimentação + Horas Viajadas.</p></div><span class="pill">Orçamento Completo</span></div>
      <section class="summary-hero"><div><span class="sum-icon">🧮</span><div><small>Preço Final Total</small><strong>${money(t.grand)}</strong></div></div><span>↗ Orçamento Completo</span></section>
      <section class="summary-profit"><div><small>Lucro Final</small><strong>${money(t.lucro)}</strong></div><div><b>✦ ${t.lucroPercent.toFixed(1)}%</b><small>do valor bruto</small></div></section>
      <div class="summary-cards">${cards.map(([icon,label,value,color])=>`<section class="sum-card ${color}"><div class="sum-card-top"><span>${icon}</span><em>${pct(value,t.grand).toFixed(1)}%</em></div><small>${label}</small><strong>${money(value)}</strong><div class="sum-progress"><i style="width:${Math.min(pct(value,t.grand),100)}%"></i></div></section>`).join('')}</div>
      <section class="card summary-detail"><div class="card-title"><h3>🧾 Detalhamento Completo</h3></div>
        <div class="sum-row"><span>👷 Mão de Obra</span><strong>${money(t.maoDeObra)}</strong></div>
        <div class="sum-row"><span>📦 Material (NF)</span><strong>${money(t.material)}</strong></div>
        <div class="sum-row"><span>🏠 Estadia</span><strong>${money(t.estadia)}</strong></div>
        <div class="sum-food"><div class="sum-row"><span>☕ Alimentação</span><strong>${money(t.alimentacao)}</strong></div><div class="sum-sub"><span>☀ Almoço</span><b>${money(t.almoco)}</b></div><div class="sum-sub"><span>🌙 Janta</span><b>${money(t.janta)}</b></div><div class="sum-sub"><span>☕ Café</span><b>${money(t.cafe)}</b></div></div>
        <div class="sum-row"><span>🚗 Transporte</span><strong>${money(t.transporte)}</strong></div>
        <div class="sum-row"><span>🕒 Horas Viajadas</span><strong>${money(t.viagens)}</strong></div>
        <div class="sum-total"><span>🧮 TOTAL GERAL</span><strong>${money(t.grand)}</strong></div>
      </section>
      <section class="card summary-chart"><div class="card-title"><h3>↗ Distribuição de Custos</h3></div>${cards.map(([,label,value,color])=>`<div class="chart-row"><div><span>${label}</span><b>${pct(value,t.grand).toFixed(1)}%</b></div><div class="chart-track"><i class="${color}" style="width:${Math.min(pct(value,t.grand),100)}%"></i></div></div>`).join('')}</section>`;
  }
  const style=document.createElement('style');style.textContent=`
    .summary-hero{display:flex;justify-content:space-between;align-items:center;padding:20px;border:1px solid rgba(16,185,129,.3);border-radius:15px;background:linear-gradient(135deg,rgba(16,185,129,.16),rgba(20,184,166,.1));margin-bottom:12px}.summary-hero>div{display:flex;align-items:center;gap:13px}.sum-icon{font-size:30px;background:rgba(16,185,129,.16);padding:10px;border-radius:12px}.summary-hero small,.summary-profit small{display:block;color:#6ee7b7;font-size:10px;margin-bottom:3px}.summary-hero strong{display:block;font-size:31px}.summary-hero>span{font-size:10px;color:#34d399}.summary-profit{display:flex;justify-content:space-between;align-items:center;padding:15px 18px;border:1px solid rgba(34,197,94,.3);border-radius:13px;background:linear-gradient(135deg,rgba(34,197,94,.12),rgba(16,185,129,.07));margin-bottom:14px}.summary-profit strong{font-size:24px;color:#4ade80}.summary-profit>div:last-child{text-align:right}.summary-profit b{display:block;font-size:22px;color:#4ade80}.summary-profit>div:last-child small{color:#4ade80;opacity:.7}.summary-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}.sum-card{border:1px solid #334155;background:rgba(30,41,59,.72);border-radius:12px;padding:13px}.sum-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}.sum-card-top span{font-size:18px}.sum-card-top em{font-size:9px;font-style:normal;background:#0f172a;padding:3px 7px;border-radius:99px}.sum-card>small{display:block;color:#94a3b8;font-size:10px}.sum-card>strong{display:block;font-size:16px;margin-top:3px}.sum-progress,.chart-track{height:5px;background:rgba(51,65,85,.7);border-radius:999px;overflow:hidden;margin-top:10px}.sum-progress i,.chart-track i{display:block;height:100%;border-radius:999px;background:#10b981}.sum-card.orange{border-color:rgba(249,115,22,.25)}.sum-card.blue{border-color:rgba(59,130,246,.25)}.sum-card.pink{border-color:rgba(236,72,153,.25)}.sum-card.purple{border-color:rgba(139,92,246,.25)}.sum-card.cyan{border-color:rgba(6,182,212,.25)}.sum-card.amber{border-color:rgba(245,158,11,.25)}.sum-card.rose{border-color:rgba(244,63,94,.25)}.summary-detail,.summary-chart{margin-bottom:12px}.sum-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(51,65,85,.7);font-size:11px}.sum-row span{color:#cbd5e1}.sum-food{border-bottom:1px solid rgba(51,65,85,.7)}.sum-food>.sum-row{border-bottom:0}.sum-sub{display:flex;justify-content:space-between;padding:4px 0 4px 25px;color:#94a3b8;font-size:10px}.sum-sub b{font-weight:500}.sum-total{display:flex;justify-content:space-between;align-items:center;padding-top:14px;margin-top:5px}.sum-total span{font-size:13px;font-weight:750}.sum-total strong{font-size:22px;color:#34d399}.chart-row{margin-bottom:12px}.chart-row>div:first-child{display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}.chart-row b{font-weight:600}.chart-track{height:9px}.chart-track i.orange{background:#f97316}.chart-track i.blue{background:#3b82f6}.chart-track i.pink{background:#ec4899}.chart-track i.purple{background:#8b5cf6}.chart-track i.cyan{background:#06b6d4}.chart-track i.amber{background:#f59e0b}.chart-track i.rose{background:#f43f5e}
    @media(max-width:900px){.summary-cards{grid-template-columns:1fr 1fr}}@media(max-width:600px){.summary-hero,.summary-profit{align-items:flex-start}.summary-hero>span{display:none}.summary-hero strong{font-size:24px}.summary-cards{grid-template-columns:1fr}.summary-profit strong{font-size:19px}.summary-profit b{font-size:18px}}
  `;document.head.appendChild(style);
  document.querySelector('[data-tab="resumo"]')?.addEventListener('click',()=>setTimeout(render,0));
  window.addEventListener('multprest:expenses-updated',render);
  window.addEventListener('multprest:travel-updated',render);
  render();
})();
