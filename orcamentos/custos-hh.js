'use strict';
(() => {
  const section=document.getElementById('tab-custos-hh');
  if(!section)return;
  const $=s=>section.querySelector(s);
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(num(v));
  const KEY='multprest_orc_internal_hour_costs_v1';
  const MAP={
    'mecanico-caldeireiro':'caldereiro',
    'pedreiro':'pedreiro',
    'servente':'servente',
    'meio-oficial':'meio-oficial',
    'serralheiro':'serralheiro',
    'soldador':'soldador',
    'supervisor-manutencao':'supervisor'
  };
  const WORKER_NAMES={caldereiro:'Mecânico Caldeireiro',pedreiro:'Pedreiro',servente:'Servente','meio-oficial':'Meio Oficial',serralheiro:'Serralheiro',soldador:'Soldador',supervisor:'Supervisor'};
  const loadApplied=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
  const core=()=>window.CalcHHCore;

  function preview(){
    const c=core(); if(!c)return [];
    return c.cargos.map(cargo=>{
      const workerId=MAP[cargo.id];
      if(!workerId)return null;
      const dados={...c.dados,salario:num(cargo.salarioBase)};
      const r=c.calcular(dados);
      const custoHora=num(dados.jornada)>0?r.custoTotalMensal/num(dados.jornada):0;
      return {cargoId:cargo.id,workerId,nome:WORKER_NAMES[workerId]||cargo.nome,salario:num(cargo.salarioBase),custoMensal:r.custoTotalMensal,jornada:num(dados.jornada),custoHora};
    }).filter(Boolean);
  }

  function render(){
    const c=core(),applied=loadApplied(),rows=preview();
    section.classList.remove('placeholder');
    if(!c){section.innerHTML='<div class="warning-box"><b>Calc HH não carregado.</b> Abra o módulo Calc HH e confirme que os arquivos da calculadora estão disponíveis.</div>';return}
    section.innerHTML=`
      <div class="page-title"><div><span class="eyebrow">Integração opcional</span><h2>Custos HH</h2><p>Consulta o mesmo núcleo de cálculo do Calc HH. Nada é copiado automaticamente para o Orçamento.</p></div><div class="title-actions"><a class="btn ghost" href="../calc-hh/">Abrir Calc HH</a><button class="btn" id="applyHH">Usar estes custos no Orçamento</button></div></div>
      <div class="warning-box compact"><b>Importante:</b> estes valores são <b>custos internos por hora</b> usados na Nota Reversa. Eles não substituem as tarifas de venda de Mão de Obra por cliente.</div>
      <div class="hh-source card"><div><span>Jornada</span><strong>${num(c.dados.jornada)} h/mês</strong></div><div><span>Funcionários no rateio</span><strong>${num(c.dados.qtdFunc)}</strong></div><div><span>Custo operacional</span><strong>${money(c.dados.custoOperacional)}</strong></div><div><span>Atualização</span><strong>Calc HH local</strong></div></div>
      <section class="card hh-table-card"><div class="card-title"><div><h3>Prévia dos custos internos</h3><p>Calculados com o salário de cada cargo e as configurações atuais do Calc HH.</p></div><button class="btn ghost danger" id="clearHH">Remover custos aplicados</button></div>
        <div class="rate-table-wrap"><table class="rate-table hh-cost-table"><thead><tr><th>Profissional</th><th>Salário base</th><th>Custo mensal calculado</th><th>Jornada</th><th>Custo interno / h</th><th>Valor aplicado</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.nome}</td><td>${money(r.salario)}</td><td>${money(r.custoMensal)}</td><td>${r.jornada}h</td><td><strong>${money(r.custoHora)}</strong></td><td>${num(applied[r.workerId])>0?`<span class="hh-applied">${money(applied[r.workerId])}</span>`:'<span class="hh-not">Não aplicado</span>'}</td></tr>`).join('')}</tbody></table></div>
      </section>
      <div class="hh-actions card"><div><b>Você decide quando sincronizar.</b><p>Alterar dados no Calc HH não muda automaticamente um orçamento já salvo. Clique em “Usar estes custos” somente quando quiser atualizar a base interna usada pela Nota Reversa.</p></div><button class="btn ghost" id="keepManual">Manter custos atuais / manuais</button></div>`;
    bind(rows);
  }

  function bind(rows){
    $('#applyHH').onclick=()=>{if(!rows.length)return;if(!confirm('Aplicar os custos internos calculados no Calc HH à Nota Reversa do Orçamento? As tarifas comerciais de venda não serão alteradas.'))return;const obj={};rows.forEach(r=>obj[r.workerId]=Number(r.custoHora.toFixed(6)));localStorage.setItem(KEY,JSON.stringify(obj));window.dispatchEvent(new CustomEvent('multprest:internal-hh-updated'));render()};
    $('#clearHH').onclick=()=>{if(confirm('Remover os custos internos aplicados pelo Calc HH? Depois você poderá importar/preencher novamente.')){localStorage.removeItem(KEY);window.dispatchEvent(new CustomEvent('multprest:internal-hh-updated'));render()}};
    $('#keepManual').onclick=()=>{const t=document.getElementById('toast');if(t){t.textContent='Nenhuma alteração realizada';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600)}};
  }

  const style=document.createElement('style');
  style.textContent=`.hh-source{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-bottom:12px;padding:0;overflow:hidden}.hh-source div{padding:13px;border-right:1px solid var(--line)}.hh-source div:last-child{border-right:0}.hh-source span{display:block;color:var(--muted);font-size:9px;margin-bottom:4px}.hh-source strong{font-size:11px}.hh-table-card{margin-bottom:12px}.hh-cost-table td strong{color:#6ee7b7}.hh-applied{color:#6ee7b7;font-weight:700}.hh-not{color:#64748b}.hh-actions{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px}.hh-actions b{font-size:11px}.hh-actions p{margin:4px 0 0;color:#94a3b8;font-size:10px;max-width:760px;line-height:1.5}.hh-actions .btn{flex-shrink:0}@media(max-width:800px){.hh-source{grid-template-columns:1fr 1fr}.hh-source div:nth-child(2){border-right:0}.hh-actions{align-items:flex-start;flex-direction:column}}`;
  document.head.appendChild(style);
  document.querySelector('[data-tab="custos-hh"]')?.addEventListener('click',()=>setTimeout(render,0));
  window.addEventListener('storage',e=>{if(e.key===KEY)render()});
  render();
})();