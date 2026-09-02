// Configuração pública da interface.
// Gateway de rotas da Plataforma Multprest no Supabase.
// Ele libera CORS apenas para o GitHub Pages e repassa a consulta ao backend original,
// onde a chave do OpenRouteService continua protegida.
window.MULTPREST_ROUTE_API = window.MULTPREST_ROUTE_API || 'https://adugefhgzqruajjdavba.supabase.co/functions/v1/multprest-route';

// Proteção + sincronização criptografada do módulo.
(() => {
  const s=document.createElement('script');
  s.src='../auth-client.js?v=20260902-prodcheck1';
  s.dataset.scope='orcamentos';
  document.head.appendChild(s);
})();

// No sistema original a equipe padrão começa com até 9 pessoas por dia.
// Só aplicamos o fallback quando o usuário ainda não salvou outra configuração.
if (localStorage.getItem('multprest_orc_team_size_v1') === null) {
  localStorage.setItem('multprest_orc_team_size_v1', '9');
}

// Ponte de TARIFAS COMERCIAIS Calc HH -> Orçamento.
// CUSTO HH interno continua separado da TARIFA HH DE VENDA.
// Prioridade: valor manual do Orçamento > tabela comercial do Calc HH > zero.
(() => {
  const API='https://63a2001d-676d-47d6-a98d-4e0843dd6483.created.app/api/public/valores-hora';
  const RATE_KEY='multprest_orc_labor_rates_v1';
  const SOURCE_KEY='multprest_orc_labor_rates_sources_v1';
  const COMMERCIAL_KEY='multprest_calc_hh_commercial_rates_v1';
  const CACHE_KEY='multprest_calc_hh_remote_v1';
  const RELOAD_KEY='multprest_orc_rates_reload_once_v2';
  const CARGO_TO_WORKER={
    'mecanico-caldeireiro':'caldereiro',
    'pedreiro':'pedreiro',
    'servente':'servente',
    'meio-oficial':'meio-oficial',
    'serralheiro':'serralheiro',
    'soldador':'soldador',
    'supervisor-manutencao':'supervisor'
  };
  const EMPRESA_TO_CLIENT={brf:'brf',jbs:'jbs',vibra:'vibra',agrogen:'agrogen',lar:'sbe',migplus:'migplus'};
  const read=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}};
  const nearly=(a,b)=>Math.abs((Number(a)||0)-(Number(b)||0))<0.000001;

  function normalize(data){
    const out={};
    if(!Array.isArray(data?.valores))return out;
    for(const row of data.valores){
      const worker=CARGO_TO_WORKER[String(row?.cargo?.id||row?.cargoId||'')];
      const client=EMPRESA_TO_CLIENT[String(row?.empresa?.id||row?.empresaId||'')];
      const value=Number(row?.valorHora)||0;
      if(worker&&client&&value>0)out[`${worker}|${client}`]=value;
    }
    return out;
  }

  function mergeRates(srcRates){
    const rates=read(RATE_KEY,{}),sources=read(SOURCE_KEY,{});
    let changed=false,metaChanged=false;
    for(const [key,remoteRaw] of Object.entries(srcRates||{})){
      const remote=Number(remoteRaw)||0;if(remote<=0)continue;
      const local=Number(rates[key])||0,meta=sources[key],tracked=meta?.source==='calc-hh';
      if(tracked&&local>0&&!nearly(local,meta.value)){
        delete sources[key];metaChanged=true;continue;
      }
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

  // 1) Fonte central normalizada publicada pelo próprio Calc HH.
  const central=read(COMMERCIAL_KEY,{rates:{}});
  let initialChanged=mergeRates(central.rates||{});

  // 2) Compatibilidade com a última cópia da API, caso o Calc HH ainda não tenha sido aberto.
  const oldCache=read(CACHE_KEY,null)?.data||null;
  if(oldCache)initialChanged=mergeRates(normalize(oldCache))||initialChanged;

  // 3) Atualização em segundo plano da fonte original.
  fetch(API,{headers:{Accept:'application/json'},cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()})
    .then(data=>{
      if(!Array.isArray(data?.valores))throw new Error('Resposta inválida do Calc HH');
      const normalized=normalize(data);
      localStorage.setItem(CACHE_KEY,JSON.stringify({syncedAt:new Date().toISOString(),data}));
      localStorage.setItem(COMMERCIAL_KEY,JSON.stringify({source:'calc-hh',syncedAt:new Date().toISOString(),rates:normalized}));
      const changed=mergeRates(normalized)||initialChanged;
      window.dispatchEvent(new CustomEvent('multprest:commercial-rates-ready',{detail:{rates:normalized}}));
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

// Ajustes de texto da interface após a migração.
// O valor mostrado em Viagens é tarifa comercial faturável, não custo HH interno.
(() => {
  const apply=()=>{
    const kpi=document.querySelector('#tripKpiCost')?.previousElementSibling;
    if(kpi)kpi.textContent='Valor Horas Viajadas';
    const help=document.querySelector('.route-help');
    if(help)help.innerHTML='<b>Busca de rota:</b> cálculo servido pela função segura do Supabase. A chave OpenRouteService permanece somente no servidor e não é exposta no GitHub público.';
    const rateTitle=document.querySelector('.labor-rate-card h3');
    if(rateTitle)rateTitle.textContent='Tabela de Tarifas Comerciais (R$/hora)';
    const rateNote=document.querySelector('.labor-rate-card .warning-box');
    if(rateNote)rateNote.innerHTML='<b>Fonte das tarifas:</b> Calc HH por Profissional + Cliente. Valores manuais do Orçamento continuam tendo prioridade. <b>JBS Couros e inss0</b> ainda não existem como empresas no Calc HH; para esses perfis, a tarifa deve ser cadastrada manualmente até incluirmos uma fonte confirmada.';
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();