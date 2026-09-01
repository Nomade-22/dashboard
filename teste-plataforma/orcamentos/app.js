'use strict';
(() => {
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const brl=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}),money=n=>brl.format(Number.isFinite(n)?n:0),num=v=>Number.isFinite(Number(v))?Number(v):0;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast=m=>{const e=$('#toast');e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1800)};
  const load=(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):JSON.parse(JSON.stringify(f))}catch{return JSON.parse(JSON.stringify(f))}};

  // ---------- BASE COMUM ----------
  const CLIENTS=[
    {id:'brf',name:'BRF',dias:180},{id:'couros',name:'JBS Couros',dias:10},{id:'0%',name:'inss0',dias:30},{id:'jbs',name:'JBS',dias:135},
    {id:'vibra',name:'VIBRA',dias:30},{id:'agrogen',name:'Agrogen',dias:35},{id:'migplus',name:'MIG PLUS',dias:45},{id:'sbe',name:'LAR',dias:5}
  ];

  // ---------- BDI ----------
  const KEY_PROFILES='multprest_orc_bdi_profiles_v1',KEY_MATERIALS='multprest_orc_bdi_materials_v1';
  const DEFAULT_CFG={inss:11,simplesIssqn:19,lucroPercent:10,jurosDia:.1,trocaNota:0,descontoCompras:12};
  const defaultProfiles=()=>Object.fromEntries(CLIENTS.map(c=>[c.id,{...DEFAULT_CFG,diasPagamento:c.dias}]));
  let profiles={...defaultProfiles(),...load(KEY_PROFILES,{})};
  let materials=load(KEY_MATERIALS,[{id:String(Date.now()),clientId:'jbs',description:'',valorMaterial:0}]);
  let current='jbs';
  const saveProfiles=()=>localStorage.setItem(KEY_PROFILES,JSON.stringify(profiles)),saveMaterials=()=>localStorage.setItem(KEY_MATERIALS,JSON.stringify(materials));
  const profile=id=>profiles[id]||{...DEFAULT_CFG,diasPagamento:CLIENTS.find(c=>c.id===id)?.dias||30};
  function calcFinancialPercent(p){return (Math.pow(1+p.jurosDia/100,p.diasPagamento)-1)*100}
  function calcBDISum(p){return p.inss+p.simplesIssqn+p.lucroPercent+calcFinancialPercent(p)+p.trocaNota+p.descontoCompras}
  function calcNF(cost,p){if(cost<=0)return 0;const div=1-calcBDISum(p)/100;return div>0?cost/div:0}
  function renderProfileSelect(){
    $('#perfilCliente').innerHTML=CLIENTS.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');$('#perfilCliente').value=current;
    $('#perfilCliente').onchange=e=>{current=e.target.value;renderBDI()};
  }
  function renderProfile(){
    const p=profile(current),c=CLIENTS.find(x=>x.id===current);$$('[data-bdi]').forEach(e=>e.value=p[e.dataset.bdi]);
    $('#perfilDias').textContent=`${p.diasPagamento} dias`;$('#perfilBdi').textContent=`${calcBDISum(p).toFixed(2)}%`;
    const fin=calcFinancialPercent(p);
    $('#perfilBreakdown').innerHTML=[['Cliente',c?.name||current],['Prazo',`${p.diasPagamento} dias`],['INSS',`${p.inss.toFixed(2)}%`],['Simples + ISSQN',`${p.simplesIssqn.toFixed(2)}%`],['Lucro',`${p.lucroPercent.toFixed(2)}%`],['Financeiro',`${fin.toFixed(2)}%`],['Troca de nota',`${p.trocaNota.toFixed(2)}%`],['Desconto compras',`${p.descontoCompras.toFixed(2)}%`],['Soma BDI',`${calcBDISum(p).toFixed(2)}%`]].map((x,i)=>`<div class="break-row ${i===8?'total':''}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
  }
  function clientOptions(selected){return CLIENTS.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${c.name} — ${profile(c.id).diasPagamento}d</option>`).join('')}
  function renderMaterials(){
    $('#materialList').innerHTML=materials.map(m=>{const nf=calcNF(num(m.valorMaterial),profile(m.clientId));return `<div class="material-row" data-id="${m.id}"><select class="mat-client">${clientOptions(m.clientId)}</select><input class="mat-desc desc" placeholder="Descrição do material" value="${esc(m.description)}"><input class="mat-cost" type="number" step="0.01" value="${num(m.valorMaterial)}"><div class="nf-value">${money(nf)}</div><button class="remove" title="Remover">×</button></div>`}).join('');
    $$('.material-row').forEach(r=>{const m=materials.find(x=>x.id===r.dataset.id);r.querySelector('.mat-client').onchange=e=>{m.clientId=e.target.value;saveMaterials();renderMaterials();renderBDITotals()};r.querySelector('.mat-desc').oninput=e=>{m.description=e.target.value;saveMaterials()};r.querySelector('.mat-cost').oninput=e=>{m.valorMaterial=num(e.target.value);saveMaterials();renderMaterials();renderBDITotals()};r.querySelector('.remove').onclick=()=>{materials=materials.filter(x=>x.id!==m.id);if(!materials.length)materials=[{id:String(Date.now()),clientId:current,description:'',valorMaterial:0}];saveMaterials();renderMaterials();renderBDITotals()}});
  }
  function renderBDITotals(){
    let totalCost=0,totalNF=0,totalLucro=0,totalDescontos=0;
    for(const m of materials){const cost=num(m.valorMaterial),p=profile(m.clientId),nf=calcNF(cost,p),fin=calcFinancialPercent(p);totalCost+=cost;totalNF+=nf;totalLucro+=nf*(p.lucroPercent/100);totalDescontos+=nf*((p.inss+p.simplesIssqn+p.lucroPercent+fin+p.trocaNota+p.descontoCompras)/100)}
    const sobra=totalNF-totalCost-totalDescontos,p=profile(current);
    $('#kpiNF').textContent=money(totalNF);$('#kpiLucro').textContent=money(totalLucro);$('#kpiBDI').textContent=`${calcBDISum(p).toFixed(2)}%`;$('#kpiSobra').textContent=money(sobra);$('#totalCustoMaterial').textContent=money(totalCost);$('#totalNFMaterial').textContent=money(totalNF);
  }
  function renderBDI(){renderProfileSelect();renderProfile();renderMaterials();renderBDITotals()}

  // ---------- MÃO DE OBRA ----------
  const KEY_RATES='multprest_orc_labor_rates_v1',KEY_LABOR='multprest_orc_labor_items_v1',KEY_TEAM='multprest_orc_team_size_v1';
  const WORKERS=[
    {id:'caldereiro',name:'Caldereiro',icon:'🔧'},{id:'pedreiro',name:'Pedreiro',icon:'🧱'},{id:'servente',name:'Servente',icon:'👷'},
    {id:'meio-oficial',name:'Meio Oficial',icon:'👷'},{id:'serralheiro',name:'Serralheiro',icon:'👷'},{id:'soldador',name:'Soldador',icon:'⚡'},{id:'supervisor',name:'Supervisor',icon:'👷'}
  ];
  const HOUR_TYPES=[{id:'normal',name:'Normal',multiplier:1},{id:'50',name:'50%',multiplier:1.5},{id:'100',name:'100%',multiplier:2},{id:'120',name:'120%',multiplier:2.2}];
  const emptyRates=()=>Object.fromEntries(WORKERS.flatMap(w=>CLIENTS.map(c=>[`${w.id}|${c.id}`,0])));
  let rates={...emptyRates(),...load(KEY_RATES,{})};
  const newLabor=()=>({id:String(Date.now())+Math.random().toString(36).slice(2,7),title:'',workerTypeId:'pedreiro',clientId:'jbs',hourTypeId:'normal',hours:8.8,people:0,days:0});
  let laborItems=load(KEY_LABOR,[newLabor()]);
  let teamSize=Math.min(9,Math.max(1,num(localStorage.getItem(KEY_TEAM))||5));
  const saveRates=()=>localStorage.setItem(KEY_RATES,JSON.stringify(rates)),saveLabor=()=>localStorage.setItem(KEY_LABOR,JSON.stringify(laborItems));
  const getRate=(w,c)=>num(rates[`${w}|${c}`]);
  const hourType=id=>HOUR_TYPES.find(h=>h.id===id)||HOUR_TYPES[0];
  const worker=id=>WORKERS.find(w=>w.id===id)||WORKERS[0];
  const laborTotal=i=>getRate(i.workerTypeId,i.clientId)*hourType(i.hourTypeId).multiplier*num(i.hours)*num(i.people)*num(i.days);
  const laborHH=i=>num(i.hours)*num(i.people)*num(i.days);
  const laborClientOptions=id=>CLIENTS.map(c=>`<option value="${c.id}" ${c.id===id?'selected':''}>${c.name} (${c.dias}d)</option>`).join('');
  const workerOptions=id=>WORKERS.map(w=>`<option value="${w.id}" ${w.id===id?'selected':''}>${w.icon} ${w.name}</option>`).join('');
  const hourOptions=id=>HOUR_TYPES.map(h=>`<option value="${h.id}" ${h.id===id?'selected':''}>${h.name}</option>`).join('');
  function renderRateTable(){
    let html='<thead><tr><th>Profissional</th>'+CLIENTS.map(c=>`<th>${c.name}<small>${c.dias}d</small></th>`).join('')+'</tr></thead><tbody>';
    html+=WORKERS.map(w=>`<tr><td>${w.icon} ${w.name}</td>${CLIENTS.map(c=>`<td><input class="rate-input" type="number" min="0" step="0.01" data-worker="${w.id}" data-client="${c.id}" value="${getRate(w.id,c.id)}"></td>`).join('')}</tr>`).join('')+'</tbody>';
    $('#laborRateTable').innerHTML=html;
    $$('.rate-input').forEach(e=>e.oninput=()=>{rates[`${e.dataset.worker}|${e.dataset.client}`]=num(e.value);saveRates();renderLaborItems();renderLaborSummary()});
  }
  function renderLaborItems(){
    if(!laborItems.length)laborItems=[newLabor()];
    $('#laborItems').innerHTML=laborItems.map((i,idx)=>{const w=worker(i.workerTypeId),h=hourType(i.hourTypeId),rate=getRate(i.workerTypeId,i.clientId),total=laborTotal(i);return `<section class="card labor-item" data-id="${i.id}">
      <div class="labor-item-head"><span class="labor-badge">${w.icon} ${w.name} #${idx+1}${i.title?` • ${esc(i.title)}`:''}</span><button class="remove labor-remove" title="Remover" ${laborItems.length===1?'disabled':''}>×</button></div>
      <label class="labor-title">Título / Descrição<input class="li-title" type="text" placeholder="Ex.: Manutenção caldeira, reparo estrutural..." value="${esc(i.title)}"></label>
      <div class="labor-form"><label>Profissional<select class="li-worker">${workerOptions(i.workerTypeId)}</select></label><label>Cliente<select class="li-client">${laborClientOptions(i.clientId)}</select></label><label>Tipo Hora<select class="li-hourtype">${hourOptions(i.hourTypeId)}</select></label><label>Horas<input class="li-hours" type="number" step="0.5" min="0" value="${num(i.hours)}"></label><label>Pessoas<input class="li-people" type="number" step="1" min="0" value="${num(i.people)}"></label><label>Dias<input class="li-days" type="number" step="0.5" min="0" value="${num(i.days)}"></label></div>
      <div class="labor-result"><span>Taxa: <b>${money(rate)}/h${h.id!=='normal'?` × ${h.multiplier}`:''}</b></span><span>HH: <b>${laborHH(i).toFixed(2)}</b></span><strong>${money(total)}</strong></div>
    </section>`}).join('');
    $$('.labor-item').forEach(r=>{const i=laborItems.find(x=>x.id===r.dataset.id);const bind=(sel,key,number=false)=>{r.querySelector(sel).oninput=e=>{i[key]=number?num(e.target.value):e.target.value;saveLabor();renderLaborItems();renderLaborSummary()}};bind('.li-title','title');r.querySelector('.li-worker').onchange=e=>{i.workerTypeId=e.target.value;saveLabor();renderLaborItems();renderLaborSummary()};r.querySelector('.li-client').onchange=e=>{i.clientId=e.target.value;saveLabor();renderLaborItems();renderLaborSummary()};r.querySelector('.li-hourtype').onchange=e=>{i.hourTypeId=e.target.value;saveLabor();renderLaborItems();renderLaborSummary()};bind('.li-hours','hours',true);bind('.li-people','people',true);bind('.li-days','days',true);const rem=r.querySelector('.labor-remove');rem.onclick=()=>{if(laborItems.length===1)return;laborItems=laborItems.filter(x=>x.id!==i.id);saveLabor();renderLaborItems();renderLaborSummary()}});
  }
  function renderLaborSummary(){
    const total=laborItems.reduce((s,i)=>s+laborTotal(i),0),hh=laborItems.reduce((s,i)=>s+laborHH(i),0),people=laborItems.reduce((s,i)=>s+num(i.people),0),days=laborItems.reduce((s,i)=>s+num(i.days),0);
    $('#laborKpiItens').textContent=laborItems.length;$('#laborKpiHH').textContent=`${hh.toFixed(2)} HH`;$('#laborKpiPessoas').textContent=people;$('#laborKpiTotal').textContent=money(total);$('#laborGrandTotal').textContent=money(total);
    const workerRows=WORKERS.map(w=>({w,total:laborItems.filter(i=>i.workerTypeId===w.id).reduce((s,i)=>s+laborTotal(i),0)})).filter(x=>x.total>0);
    $('#laborByWorker').innerHTML=workerRows.length?workerRows.map(x=>`<div class="break-row"><span>${x.w.icon} ${x.w.name}</span><strong>${money(x.total)}</strong></div>`).join(''):'<div class="empty-note">Preencha pessoas e dias para gerar o resumo.</div>';
    $('#teamSize').value=teamSize;$('#teamDays').textContent=`${people>0?Math.ceil(people/teamSize):0} dias`;$('#teamCalc').textContent=`${people} pessoas ÷ ${teamSize} por equipe`;$('#detailPeople').textContent=people;$('#detailDays').textContent=days;
    const byType=HOUR_TYPES.map(h=>{const its=laborItems.filter(i=>i.hourTypeId===h.id);return{h,hh:its.reduce((s,i)=>s+laborHH(i),0),value:its.reduce((s,i)=>s+laborTotal(i),0)}}).filter(x=>x.hh>0||x.value>0);
    $('#hoursByType').innerHTML=byType.length?byType.map(x=>`<div class="hour-row"><span class="hour-badge">${x.h.name}</span><span>${x.hh.toFixed(1)}h</span><strong>${money(x.value)}</strong></div>`).join(''):'<div class="empty-note">Sem horas lançadas.</div>';
  }
  function renderLabor(){renderRateTable();renderLaborItems();renderLaborSummary()}
  function addLabor(){laborItems.push(newLabor());saveLabor();renderLaborItems();renderLaborSummary()}
  function exportRates(){
    const rows=[['worker_id','client_id','rate'],...WORKERS.flatMap(w=>CLIENTS.map(c=>[w.id,c.id,getRate(w.id,c.id)]))];
    const blob=new Blob([rows.map(r=>r.join(';')).join('\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tabela-hh-local.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
  }
  async function importRates(file){
    const text=await file.text();let imported=0;
    try{if(file.name.toLowerCase().endsWith('.json')){const obj=JSON.parse(text);for(const [k,v] of Object.entries(obj.rates||obj)){if(k.includes('|')){rates[k]=num(v);imported++}}}else{const lines=text.split(/\r?\n/).filter(Boolean);for(const line of lines.slice(1)){const [w,c,r]=line.split(/[;,]/);if(w&&c&&r!==undefined){rates[`${w.trim()}|${c.trim()}`]=num(String(r).replace(',','.'));imported++}}}saveRates();renderLabor();toast(`${imported} taxas importadas localmente`)}catch{toast('Não foi possível importar a tabela')}
  }

  // ---------- NAVEGAÇÃO / EVENTOS ----------
  $$('.main-tabs button').forEach(b=>b.onclick=()=>{$$('.main-tabs button').forEach(x=>x.classList.toggle('active',x===b));$$('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===`tab-${b.dataset.tab}`))});
  $$('[data-bdi]').forEach(e=>e.addEventListener('input',()=>{profiles[current]={...profile(current),[e.dataset.bdi]:num(e.value)};renderProfile();renderMaterials();renderBDITotals()}));
  $('#btnSalvarPerfil').onclick=()=>{saveProfiles();toast(`Perfil BDI de ${CLIENTS.find(c=>c.id===current)?.name||current} salvo neste navegador`)};
  $('#btnResetBDI').onclick=()=>{if(confirm('Restaurar este cliente para os valores padrão de migração?')){const c=CLIENTS.find(x=>x.id===current);profiles[current]={...DEFAULT_CFG,diasPagamento:c?.dias||30};saveProfiles();renderBDI();toast('Perfil restaurado')}};
  $('#btnAddMaterial').onclick=()=>{materials.push({id:String(Date.now())+Math.random().toString(36).slice(2,5),clientId:current,description:'',valorMaterial:0});saveMaterials();renderMaterials();renderBDITotals()};
  $('#btnResetMateriais').onclick=()=>{if(confirm('Zerar os materiais desta tela?')){materials=[{id:String(Date.now()),clientId:current,description:'',valorMaterial:0}];saveMaterials();renderMaterials();renderBDITotals()}};

  $('#btnAddLabor').onclick=addLabor;$('#btnAddLabor2').onclick=addLabor;
  $('#btnResetLabor').onclick=()=>{if(confirm('Zerar os itens de mão de obra?')){laborItems=[newLabor()];saveLabor();renderLaborItems();renderLaborSummary()}};
  $('#btnSaveRates').onclick=()=>{saveRates();toast('Tabela HH salva neste navegador')};
  $('#btnResetRates').onclick=()=>{if(confirm('Zerar todas as taxas locais?')){rates=emptyRates();saveRates();renderLabor();toast('Taxas locais zeradas')}};
  $('#btnExportRates').onclick=exportRates;$('#inputRates').onchange=e=>{const f=e.target.files?.[0];if(f)importRates(f);e.target.value=''};
  $('#teamSize').oninput=e=>{teamSize=Math.min(9,Math.max(1,num(e.target.value)||1));localStorage.setItem(KEY_TEAM,String(teamSize));renderLaborSummary()};

  renderBDI();renderLabor();
})();
