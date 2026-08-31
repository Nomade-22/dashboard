'use strict';
(() => {
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const brl=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}),money=n=>brl.format(Number.isFinite(n)?n:0),num=v=>Number.isFinite(Number(v))?Number(v):0;
  const KEY_PROFILES='multprest_orc_bdi_profiles_v1',KEY_MATERIALS='multprest_orc_bdi_materials_v1';
  const CLIENTS=[
    {id:'jbs',name:'JBS',dias:135},{id:'brf',name:'BRF',dias:180},{id:'vibra',name:'VIBRA',dias:30},{id:'agrogen',name:'Agrogen',dias:35},
    {id:'migplus',name:'MIG PLUS',dias:45},{id:'sbe',name:'LAR',dias:5},{id:'couros',name:'JBS Couros',dias:10},{id:'0%',name:'inss0',dias:30}
  ];
  const DEFAULT_CFG={inss:11,simplesIssqn:19,lucroPercent:10,jurosDia:.1,trocaNota:0,descontoCompras:12};
  const defaultProfiles=()=>Object.fromEntries(CLIENTS.map(c=>[c.id,{...DEFAULT_CFG,diasPagamento:c.dias}]));
  const load=(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):f}catch{return f}};
  let profiles={...defaultProfiles(),...load(KEY_PROFILES,{})};
  let materials=load(KEY_MATERIALS,[{id:String(Date.now()),clientId:'jbs',description:'',valorMaterial:0}]);
  let current='jbs';
  const toast=m=>{const e=$('#toast');e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1600)};
  const saveProfiles=()=>localStorage.setItem(KEY_PROFILES,JSON.stringify(profiles)),saveMaterials=()=>localStorage.setItem(KEY_MATERIALS,JSON.stringify(materials));
  const profile=id=>profiles[id]||{...DEFAULT_CFG,diasPagamento:CLIENTS.find(c=>c.id===id)?.dias||30};
  function calcFinancialPercent(p){return (Math.pow(1+p.jurosDia/100,p.diasPagamento)-1)*100}
  function calcBDISum(p){return p.inss+p.simplesIssqn+p.lucroPercent+calcFinancialPercent(p)+p.trocaNota+p.descontoCompras}
  function calcNF(cost,p){if(cost<=0)return 0;const div=1-calcBDISum(p)/100;return div>0?cost/div:0}
  function renderProfileSelect(){
    $('#perfilCliente').innerHTML=CLIENTS.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');$('#perfilCliente').value=current;
    $('#perfilCliente').onchange=e=>{current=e.target.value;renderAll()};
  }
  function renderProfile(){
    const p=profile(current),c=CLIENTS.find(x=>x.id===current);$$('[data-bdi]').forEach(e=>e.value=p[e.dataset.bdi]);
    $('#perfilDias').textContent=`${p.diasPagamento} dias`;$('#perfilBdi').textContent=`${calcBDISum(p).toFixed(2)}%`;
    const fin=calcFinancialPercent(p);
    $('#perfilBreakdown').innerHTML=[['Cliente',c?.name||current],['Prazo',`${p.diasPagamento} dias`],['INSS',`${p.inss.toFixed(2)}%`],['Simples + ISSQN',`${p.simplesIssqn.toFixed(2)}%`],['Lucro',`${p.lucroPercent.toFixed(2)}%`],['Financeiro',`${fin.toFixed(2)}%`],['Troca de nota',`${p.trocaNota.toFixed(2)}%`],['Desconto compras',`${p.descontoCompras.toFixed(2)}%`],['Soma BDI',`${calcBDISum(p).toFixed(2)}%`]].map((x,i)=>`<div class="break-row ${i===8?'total':''}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
  }
  function clientOptions(selected){return CLIENTS.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${c.name} — ${profile(c.id).diasPagamento}d</option>`).join('')}
  function renderMaterials(){
    $('#materialList').innerHTML=materials.map(m=>{const nf=calcNF(num(m.valorMaterial),profile(m.clientId));return `<div class="material-row" data-id="${m.id}"><select class="mat-client">${clientOptions(m.clientId)}</select><input class="mat-desc desc" placeholder="Descrição do material" value="${String(m.description||'').replace(/"/g,'&quot;')}"><input class="mat-cost" type="number" step="0.01" value="${num(m.valorMaterial)}"><div class="nf-value">${money(nf)}</div><button class="remove" title="Remover">×</button></div>`}).join('');
    $$('.material-row').forEach(r=>{const m=materials.find(x=>x.id===r.dataset.id);r.querySelector('.mat-client').onchange=e=>{m.clientId=e.target.value;saveMaterials();renderMaterials();renderTotals()};r.querySelector('.mat-desc').oninput=e=>{m.description=e.target.value;saveMaterials()};r.querySelector('.mat-cost').oninput=e=>{m.valorMaterial=num(e.target.value);saveMaterials();renderMaterials();renderTotals()};r.querySelector('.remove').onclick=()=>{materials=materials.filter(x=>x.id!==m.id);if(!materials.length)materials=[{id:String(Date.now()),clientId:current,description:'',valorMaterial:0}];saveMaterials();renderMaterials();renderTotals()}});
  }
  function renderTotals(){
    let totalCost=0,totalNF=0,totalLucro=0,totalDescontos=0;
    for(const m of materials){const cost=num(m.valorMaterial),p=profile(m.clientId),nf=calcNF(cost,p),fin=calcFinancialPercent(p);totalCost+=cost;totalNF+=nf;totalLucro+=nf*(p.lucroPercent/100);totalDescontos+=nf*((p.inss+p.simplesIssqn+p.lucroPercent+fin+p.trocaNota+p.descontoCompras)/100)}
    const sobra=totalNF-totalCost-totalDescontos,p=profile(current);
    $('#kpiNF').textContent=money(totalNF);$('#kpiLucro').textContent=money(totalLucro);$('#kpiBDI').textContent=`${calcBDISum(p).toFixed(2)}%`;$('#kpiSobra').textContent=money(sobra);$('#totalCustoMaterial').textContent=money(totalCost);$('#totalNFMaterial').textContent=money(totalNF);
  }
  function renderAll(){renderProfileSelect();renderProfile();renderMaterials();renderTotals()}
  $$('.main-tabs button').forEach(b=>b.onclick=()=>{$$('.main-tabs button').forEach(x=>x.classList.toggle('active',x===b));$$('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===`tab-${b.dataset.tab}`))});
  $$('[data-bdi]').forEach(e=>e.addEventListener('input',()=>{profiles[current]={...profile(current),[e.dataset.bdi]:num(e.value)};renderProfile();renderMaterials();renderTotals()}));
  $('#btnSalvarPerfil').onclick=()=>{saveProfiles();toast(`Perfil BDI de ${CLIENTS.find(c=>c.id===current)?.name||current} salvo neste navegador`)};
  $('#btnResetBDI').onclick=()=>{if(confirm('Restaurar este cliente para os valores padrão de migração?')){const c=CLIENTS.find(x=>x.id===current);profiles[current]={...DEFAULT_CFG,diasPagamento:c?.dias||30};saveProfiles();renderAll();toast('Perfil restaurado')}};
  $('#btnAddMaterial').onclick=()=>{materials.push({id:String(Date.now())+Math.random().toString(36).slice(2,5),clientId:current,description:'',valorMaterial:0});saveMaterials();renderMaterials();renderTotals()};
  $('#btnResetMateriais').onclick=()=>{if(confirm('Zerar os materiais desta tela?')){materials=[{id:String(Date.now()),clientId:current,description:'',valorMaterial:0}];saveMaterials();renderMaterials();renderTotals()}};
  renderAll();
})();