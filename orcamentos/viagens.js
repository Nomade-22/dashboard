'use strict';
(() => {
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const brl=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}),money=n=>brl.format(num(n));
  const load=(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):JSON.parse(JSON.stringify(f))}catch{return JSON.parse(JSON.stringify(f))}};
  const toast=m=>{const e=$('#toast');if(!e)return; e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1800)};

  const CLIENTS=[
    {id:'brf',name:'BRF'},{id:'couros',name:'JBS Couros'},{id:'0%',name:'inss0'},{id:'jbs',name:'JBS'},
    {id:'vibra',name:'VIBRA'},{id:'agrogen',name:'Agrogen'},{id:'migplus',name:'MIG PLUS'},{id:'sbe',name:'LAR'}
  ];
  const WORKERS=[
    {id:'caldereiro',name:'Caldereiro',icon:'🔧'},{id:'pedreiro',name:'Pedreiro',icon:'🧱'},{id:'servente',name:'Servente',icon:'👷'},
    {id:'meio-oficial',name:'Meio Oficial',icon:'👷'},{id:'serralheiro',name:'Serralheiro',icon:'👷'},{id:'soldador',name:'Soldador',icon:'⚡'},{id:'supervisor',name:'Supervisor',icon:'👷'}
  ];
  const HOUR_TYPES=[{id:'normal',name:'Normal',multiplier:1},{id:'50',name:'50%',multiplier:1.5},{id:'100',name:'100%',multiplier:2},{id:'120',name:'120%',multiplier:2.2}];
  const KEY_RATES='multprest_orc_labor_rates_v1',KEY_TRIPS='multprest_orc_trips_v1',KEY_SETTINGS='multprest_orc_trip_settings_v1';
  const rates=()=>load(KEY_RATES,{});
  const getRate=(w,c)=>num(rates()[`${w}|${c}`]);
  const hourType=id=>HOUR_TYPES.find(h=>h.id===id)||HOUR_TYPES[0];
  const routeApi=()=>String(window.MULTPREST_ROUTE_API||'').trim();

  const newTrip=()=>({id:String(Date.now())+Math.random().toString(36).slice(2,7),origin:'',destination:'',tripType:'one-way',people:0,days:0,clientId:'jbs',workerTypeId:'pedreiro',hourTypeId:'normal',manualHours:null,distanceKm:null,durationMinutes:null,originAddress:null,destinationAddress:null,isLoading:false,error:null});
  let trips=load(KEY_TRIPS,[newTrip()]);
  let settings={paymentRule:'all',maxHours:1,...load(KEY_SETTINGS,{})};
  const saveTrips=()=>localStorage.setItem(KEY_TRIPS,JSON.stringify(trips));
  const saveSettings=()=>localStorage.setItem(KEY_SETTINGS,JSON.stringify(settings));
  const rate=i=>getRate(i.workerTypeId,i.clientId)*hourType(i.hourTypeId).multiplier;
  const baseMinutes=i=>num(i.manualHours)>0?num(i.manualHours)*60:num(i.durationMinutes);
  const valid=i=>baseMinutes(i)>0;
  const totalMinutes=i=>baseMinutes(i)*(i.tripType==='round-trip'?2:1)*num(i.days);
  const totalDistance=i=>num(i.distanceKm)*(i.tripType==='round-trip'?2:1)*num(i.days);
  const paid=i=>valid(i)&&(settings.paymentRule==='all'||totalMinutes(i)/60<=num(settings.maxHours));
  const cost=i=>paid(i)?(totalMinutes(i)/60)*num(i.people)*rate(i):0;
  const fmtDuration=min=>{min=num(min);const h=Math.floor(min/60),m=Math.round(min%60);return h?`${h}h ${String(m).padStart(2,'0')}min`:`${m}min`};
  const clientOptions=id=>CLIENTS.map(c=>`<option value="${c.id}" ${c.id===id?'selected':''}>${c.name}</option>`).join('');
  const workerOptions=id=>WORKERS.map(w=>`<option value="${w.id}" ${w.id===id?'selected':''}>${w.icon} ${w.name}</option>`).join('');
  const hourOptions=id=>HOUR_TYPES.map(h=>`<option value="${h.id}" ${h.id===id?'selected':''}>${h.name}</option>`).join('');

  function renderSettings(){
    $('#tripPaymentRule').value=settings.paymentRule;$('#tripMaxHours').value=num(settings.maxHours)||1;
    $('#maxHoursLabel').classList.toggle('hidden',settings.paymentRule!=='max-hours');
    const ok=!!routeApi();$('#routeApiStatus').textContent=ok?'API de rota configurada':'API de rota pendente';$('#routeApiStatus').classList.toggle('api-ok',ok);
  }
  function renderTrips(){
    if(!trips.length)trips=[newTrip()];
    $('#tripItems').innerHTML=trips.map((i,idx)=>{const r=rate(i),mins=totalMinutes(i),dist=totalDistance(i),isPaid=paid(i),v=cost(i);return `<section class="card trip-card" data-id="${i.id}">
      <div class="trip-head"><span class="labor-badge">Trecho ${idx+1}</span><div class="trip-actions"><button class="btn route-calc" ${i.isLoading?'disabled':''}>${i.isLoading?'Calculando...':'📍 Calcular'}</button><button class="remove trip-remove" ${trips.length===1?'disabled':''}>×</button></div></div>
      <div class="route-grid"><label>Origem<input class="tr-origin" placeholder="Ex: São Paulo, SP" value="${esc(i.origin)}"></label><label>Destino<input class="tr-destination" placeholder="Ex: Rio de Janeiro, RJ" value="${esc(i.destination)}"></label></div>
      <div class="trip-fields trip-main"><label>Cliente<select class="tr-client">${clientOptions(i.clientId)}</select></label><label>Função<select class="tr-worker">${workerOptions(i.workerTypeId)}</select></label><label>Tipo Hora<select class="tr-hourtype">${hourOptions(i.hourTypeId)}</select></label><label>R$/hora<div class="readonly-rate">${r?money(r):'—'}</div></label></div>
      <div class="trip-fields trip-options"><label>Tipo<select class="tr-type"><option value="one-way" ${i.tripType==='one-way'?'selected':''}>Ida</option><option value="round-trip" ${i.tripType==='round-trip'?'selected':''}>Ida/Volta</option></select></label><label>Pessoas<input class="tr-people" type="number" min="0" step="1" value="${num(i.people)}"></label><label>Horas<input class="tr-hours" type="number" min="0" step="0.5" placeholder="Auto" value="${i.manualHours??''}"></label><label>Dias<input class="tr-days" type="number" min="0" step="1" value="${num(i.days)}"></label><label>Pago?<div class="paid-badge ${valid(i)?(isPaid?'yes':'no'):''}">${valid(i)?(isPaid?'SIM':'NÃO'):'—'}</div></label></div>
      ${(dist||valid(i)||i.error||i.originAddress)?`<div class="trip-result">${i.error?`<span class="trip-error">${esc(i.error)}</span>`:`${dist?`<span>🧭 <b>${dist.toFixed(1)} km</b></span>`:''}${valid(i)?`<span>🕒 <b>${fmtDuration(mins)}</b></span>`:''}${valid(i)&&r&&isPaid?`<span class="trip-money">${money(v)}</span>`:''}${i.originAddress?`<small>${esc(i.originAddress)} → ${esc(i.destinationAddress||'')}</small>`:''}`}</div>`:''}
    </section>`}).join('');
    $$('.trip-card').forEach(card=>{const i=trips.find(x=>x.id===card.dataset.id);const rerender=()=>{saveTrips();renderTrips();renderTotals()};
      card.querySelector('.tr-origin').oninput=e=>{i.origin=e.target.value;saveTrips()};card.querySelector('.tr-destination').oninput=e=>{i.destination=e.target.value;saveTrips()};
      card.querySelector('.tr-client').onchange=e=>{i.clientId=e.target.value;rerender()};card.querySelector('.tr-worker').onchange=e=>{i.workerTypeId=e.target.value;rerender()};card.querySelector('.tr-hourtype').onchange=e=>{i.hourTypeId=e.target.value;rerender()};card.querySelector('.tr-type').onchange=e=>{i.tripType=e.target.value;rerender()};
      card.querySelector('.tr-people').oninput=e=>{i.people=num(e.target.value);rerender()};card.querySelector('.tr-hours').oninput=e=>{i.manualHours=e.target.value===''?null:num(e.target.value);rerender()};card.querySelector('.tr-days').oninput=e=>{i.days=num(e.target.value);rerender()};
      card.querySelector('.route-calc').onclick=()=>calculateRoute(i.id);card.querySelector('.trip-remove').onclick=()=>{if(trips.length===1)return;trips=trips.filter(x=>x.id!==i.id);saveTrips();renderTrips();renderTotals()};
    });
  }
  function renderTotals(){
    let totalMin=0,paidMin=0,personHours=0,totalCost=0,distance=0,totalViagens=0;
    for(const i of trips){const m=totalMinutes(i),d=totalDistance(i);totalMin+=m;distance+=d;totalViagens+=num(i.days);if(paid(i)&&valid(i)){paidMin+=m;personHours+=(m/60)*num(i.people);totalCost+=cost(i)}}
    $('#tripKpiDistance').textContent=`${distance.toFixed(distance%1?1:0)} km`;$('#tripKpiTime').textContent=fmtDuration(totalMin);$('#tripKpiPaid').textContent=fmtDuration(paidMin);$('#tripKpiPH').textContent=personHours.toFixed(1);$('#tripKpiCost').textContent=money(totalCost);
    window.MULTPREST_TRAVEL_TOTALS={totalMinutes:totalMin,paidMinutes:paidMin,personHours,totalCost,totalDistance:distance,totalViagens};
    localStorage.setItem('multprest_orc_travel_totals_v1',JSON.stringify(window.MULTPREST_TRAVEL_TOTALS));
  }
  async function calculateRoute(id){
    const i=trips.find(x=>x.id===id);if(!i)return;
    if(!String(i.origin).trim()||!String(i.destination).trim()){i.error='Preencha origem e destino';saveTrips();renderTrips();return}
    const api=routeApi();if(!api){i.error='A API privada de rotas ainda não foi conectada nesta branch. Os cálculos manuais continuam funcionando.';saveTrips();renderTrips();toast('Falta conectar a API privada de rotas');return}
    i.isLoading=true;i.error=null;saveTrips();renderTrips();
    try{const response=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin:i.origin,destination:i.destination})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Erro ao calcular rota');i.distanceKm=num(data.distance_km);i.durationMinutes=num(data.duration_minutes);i.originAddress=data.origin_address||i.origin;i.destinationAddress=data.destination_address||i.destination;i.error=null}
    catch(err){i.error=err instanceof Error?err.message:'Erro ao calcular rota'}finally{i.isLoading=false;saveTrips();renderTrips();renderTotals()}
  }

  const style=document.createElement('style');style.textContent=`
  .travel-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px}.kpi.teal{border-color:rgba(20,184,166,.28);color:#5eead4;background:rgba(20,184,166,.08)}
  .travel-config{margin-bottom:14px}.travel-config-grid{display:grid;grid-template-columns:minmax(220px,1fr) 150px 2fr;gap:12px;align-items:end}.travel-config-grid label,.route-grid label,.trip-fields label{display:grid;gap:5px;color:var(--muted);font-size:10px}.travel-config-grid select,.travel-config-grid input,.route-grid input,.trip-fields select,.trip-fields input{width:100%;min-width:0;background:#0f1c30;border:1px solid var(--line);color:var(--text);padding:9px;border-radius:8px;outline:0;font-size:10px}.route-help{font-size:10px;line-height:1.45;color:#bfdbfe;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.2);border-radius:9px;padding:9px 11px}.route-help code{color:#93c5fd}.hidden{display:none!important}.pill.api-ok{color:#6ee7b7;border-color:rgba(16,185,129,.5);background:rgba(16,185,129,.12)}
  .trip-items{display:grid;gap:11px}.trip-card{padding:13px}.trip-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.trip-actions{display:flex;align-items:center;gap:7px}.route-calc{background:#2563eb;border-color:#1d4ed8}.route-calc:disabled{opacity:.6;cursor:wait}.route-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:9px}.trip-fields{display:grid;gap:8px;margin-bottom:9px}.trip-main{grid-template-columns:1.1fr 1.1fr 1fr .8fr}.trip-options{grid-template-columns:1fr .7fr .8fr .7fr .65fr}.readonly-rate,.paid-badge{min-height:35px;display:flex;align-items:center;padding:8px 9px;border-radius:8px;background:#13283b;border:1px solid #284059;font-size:10px;font-weight:750;color:#6ee7b7}.paid-badge{justify-content:center;color:#94a3b8}.paid-badge.yes{color:#6ee7b7;background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.25)}.paid-badge.no{color:#fca5a5;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.25)}.trip-result{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding-top:9px;border-top:1px solid var(--line);font-size:10px;color:#cbd5e1}.trip-result .trip-money{color:#6ee7b7;font-weight:800}.trip-result small{width:100%;color:#64748b}.trip-error{color:#fca5a5}.route-footer{text-align:center;color:#64748b;font-size:10px;margin:13px 0 0}
  @media(max-width:900px){.travel-kpis{grid-template-columns:repeat(3,1fr)}.travel-config-grid{grid-template-columns:1fr 1fr}.route-help{grid-column:1/-1}.trip-main{grid-template-columns:1fr 1fr}.trip-options{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:600px){.travel-kpis{grid-template-columns:1fr 1fr}.travel-config-grid,.route-grid,.trip-main,.trip-options{grid-template-columns:1fr}.trip-head{align-items:flex-start}.trip-actions{flex-shrink:0}}`;
  document.head.appendChild(style);

  $('#tripPaymentRule').onchange=e=>{settings.paymentRule=e.target.value;saveSettings();renderSettings();renderTrips();renderTotals()};
  $('#tripMaxHours').oninput=e=>{settings.maxHours=num(e.target.value)||1;saveSettings();renderTrips();renderTotals()};
  $('#btnAddTrip').onclick=()=>{trips.push(newTrip());saveTrips();renderTrips();renderTotals()};
  $('#btnResetTrips').onclick=()=>{if(confirm('Zerar todos os trechos e configurações de viagem?')){trips=[newTrip()];settings={paymentRule:'all',maxHours:1};saveTrips();saveSettings();renderSettings();renderTrips();renderTotals()}};
  window.addEventListener('storage',e=>{if(e.key===KEY_RATES){renderTrips();renderTotals()}});
  renderSettings();renderTrips();renderTotals();
})();
