// Configuração pública da interface.
// Gateway de rotas da Plataforma Multprest no Supabase.
// Ele libera CORS apenas para o GitHub Pages e repassa a consulta ao backend original,
// onde a chave do OpenRouteService continua protegida.
window.MULTPREST_ROUTE_API = window.MULTPREST_ROUTE_API || 'https://adugefhgzqruajjdavba.supabase.co/functions/v1/multprest-route';

// Proteção + sincronização criptografada do módulo.
(() => {
  const s=document.createElement('script');
  s.src='../auth-client.js?v=20260901-supabase3';
  s.dataset.scope='orcamentos';
  document.head.appendChild(s);
})();

// No sistema original a equipe padrão começa com até 9 pessoas por dia.
// Só aplicamos o fallback quando o usuário ainda não salvou outra configuração.
if (localStorage.getItem('multprest_orc_team_size_v1') === null) {
  localStorage.setItem('multprest_orc_team_size_v1', '9');
}

// Ponte de TARIFAS COMERCIAIS do Calc HH -> Orçamento.
// CUSTO HH interno continua separado da TARIFA HH DE VENDA.
// Prioridade: valor manual do Orçamento > tarifa do banco Calc HH > zero.
// Uma tarifa importada do Calc HH só é atualizada automaticamente enquanto não tiver
// sido alterada manualmente pelo usuário no Orçamento.
(() => {
  const API='https://63a2001d-676d-47d6-a98d-4e0843dd6483.created.app/api/public/valores-hora';
  const RATE_KEY='multprest_orc_labor_rates_v1';
  const SOURCE_KEY='multprest_orc_labor_rates_sources_v1';
  const CACHE_KEY='multprest_calc_hh_remote_v1';
  const RELOAD_KEY='multprest_orc_rates_reload_once_v1';
  const CARGO_TO_WORKER={
    'mecanico-caldeireiro':'caldereiro',
    'pedreiro':'pedreiro',
    'servente':'servente',
    'meio-oficial':'meio-oficial',
    'serralheiro':'serralheiro',
    'soldador':'soldador',
    'supervisor-manutencao':'supervisor'
  };
  const EMPRESA_TO_CLIENT={
    'brf':'brf',
    'jbs':'jbs',
    'vibra':'vibra',
    'agrogen':'agrogen',
    'lar':'sbe',
    'migplus':'migplus'
  };
  const read=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}};
  const nearly=(a,b)=>Math.abs((Number(a)||0)-(Number(b)||0))<0.000001;

  function mergeRemote(data){
    if(!data||!Array.isArray(data.valores))return false;
    const rates=read(RATE_KEY,{}),sources=read(SOURCE_KEY,{});
    let changed=false,metaChanged=false;
    for(const row of data.valores){
      const cargoId=String(row?.cargo?.id||row?.cargoId||'');
      const empresaId=String(row?.empresa?.id||row?.empresaId||'');
      const worker=CARGO_TO_WORKER[cargoId],client=EMPRESA_TO_CLIENT[empresaId];
      const remote=Number(row?.valorHora)||0;
      if(!worker||!client||remote<=0)continue;
      const key=`${worker}|${client}`;
      const local=Number(rates[key])||0;
      const meta=sources[key];
      const tracked=meta?.source==='calc-hh';

      // Se o usuário digitou outro valor positivo manualmente, preserva esse valor.
      if(tracked&&local>0&&!nearly(local,meta.value)){
        delete sources[key];metaChanged=true;continue;
      }
      // Se está vazio/zero ou ainda é um valor rastreado do Calc HH, usa o banco.
      if(local<=0||tracked){
        if(!nearly(local,remote)){rates[key]=remote;changed=true;}
        const next={source:'calc-hh',value:remote,updatedAt:new Date().toISOString()};
        if(!meta||!nearly(meta.value,remote)){sources[key]=next;metaChanged=true;}
      }
    }
    if(changed)localStorage.setItem(RATE_KEY,JSON.stringify(rates));
    if(metaChanged)localStorage.setItem(SOURCE_KEY,JSON.stringify(sources));
    return changed;
  }

  // Se o Calc HH já foi aberto neste navegador, aplica a última cópia antes de app.js/viagens.js.
  const cached=read(CACHE_KEY,null)?.data||null;
  if(cached)mergeRemote(cached);

  // Atualiza a cópia em segundo plano. Se trouxe novas tarifas, recarrega UMA vez para
  // que Mão de Obra e Viagens renderizem os valores sem exigir ação manual.
  fetch(API,{headers:{Accept:'application/json'},cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()})
    .then(data=>{
      if(!Array.isArray(data?.valores))throw new Error('Resposta inválida do Calc HH');
      localStorage.setItem(CACHE_KEY,JSON.stringify({syncedAt:new Date().toISOString(),data}));
      const changed=mergeRemote(data);
      window.dispatchEvent(new CustomEvent('multprest:commercial-rates-ready'));
      if(changed&&sessionStorage.getItem(RELOAD_KEY)!=='1'){
        sessionStorage.setItem(RELOAD_KEY,'1');
        location.reload();
      }
    })
    .catch(error=>console.warn('Tarifas comerciais do Calc HH indisponíveis; valores locais preservados.',error));
})();

// Integrações seguras da plataforma.
// Nenhuma credencial é colocada no GitHub: os módulos abaixo consomem somente
// endpoints próprios dos sistemas e mantêm escrita sensível protegida.
(() => {
  const load=(src)=>new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;
    s.onload=resolve;
    s.onerror=reject;
    document.head.appendChild(s);
  });
  load('../calc-hh/core.js')
    .then(()=>load('custos-hh.js'))
    .then(()=>load('remote-db.js'))
    .then(()=>load('tabela-precos.js'))
    .catch((error)=>console.warn('Integração privada parcialmente indisponível:',error));
})();