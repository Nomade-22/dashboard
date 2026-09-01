'use strict';
(() => {
  const section=document.getElementById('tab-tabela-precos');if(!section)return;
  function render(){
    section.classList.remove('placeholder');
    section.innerHTML=`<div class="page-title"><div><span class="eyebrow">Integração opcional</span><h2>Tabela de Preços</h2><p>A Tabela continua sendo um sistema independente. Consultar ou pesquisar materiais não altera este orçamento.</p></div><a class="btn" href="../precos/">Abrir Tabela de Preços</a></div><section class="card" style="padding:18px"><div class="card-title"><h3>Como usar</h3></div><div class="breakdown"><div class="break-row"><span>1. Apenas consultar</span><strong>Nenhuma alteração</strong></div><div class="break-row"><span>2. Adicionar ao orçamento</span><strong>Ação explícita na Tabela</strong></div><div class="break-row"><span>3. Quantidade + Cliente</span><strong>Confirmados antes do envio</strong></div><div class="break-row total"><span>BDI</span><strong>Aplicado aqui, conforme o cliente</strong></div></div><div class="warning-box" style="margin-top:12px"><b>Regra preservada:</b> nenhum item entra automaticamente. Você também pode continuar adicionando materiais manualmente na aba BDI sem usar a Tabela de Preços.</div></section>`;
  }
  document.querySelector('[data-tab="tabela-precos"]')?.addEventListener('click',()=>setTimeout(render,0));render();
})();