'use strict';
window.CalcHHCore = (() => {
  const STORAGE={dados:'multprest_calc_hh_dados_v1',cargos:'multprest_calc_hh_cargos_v1',custos:'multprest_calc_hh_custos_fixos_v1'};
  const DEFAULT_DADOS={salario:2219.80,jornada:220,salarioMinimo:1621,premioAssiduidade:380,insalubridadePerc:20,almoco:0,epi:450,transporte:0,exames:500,ferramentas:300,planoSaude:15,seguroVidaTotal:500,treinamentosAnual:330,custoOperacional:28775,qtdFunc:8,inssPatronalPerc:8,inssPrestadorPerc:11,simplesPerc:14,issqnPerc:4.59,lucroPerc:30,diasAntecipacao:120,descontoNegociacaoPerc:12};
  const CARGOS_DEFAULT=[
    {id:'mecanico-caldeireiro',nome:'Mecânico Caldeireiro',salarioBase:2574.53},
    {id:'pedreiro',nome:'Pedreiro',salarioBase:2219.80},{id:'servente',nome:'Servente',salarioBase:1841.40},
    {id:'meio-oficial',nome:'Meio Oficial',salarioBase:1889.80},{id:'serralheiro',nome:'Serralheiro',salarioBase:2574.53},
    {id:'soldador',nome:'Soldador',salarioBase:4000},{id:'supervisor-manutencao',nome:'Supervisor de Manutenção',salarioBase:2587.80}
  ];
  const EMPRESAS=[{id:'brf',nome:'BRF',diasAntecipacao:180},{id:'jbs',nome:'JBS',diasAntecipacao:135},{id:'vibra',nome:'VIBRA',diasAntecipacao:30},{id:'agrogen',nome:'AGROGEN',diasAntecipacao:35},{id:'lar',nome:'LAR',diasAntecipacao:5},{id:'migplus',nome:'MIG PLUS',diasAntecipacao:45}];
  const CUSTOS_FIXOS_DEFAULT=[['Aluguel',6000],['Água',0],['Luz',700],['Internet',100],['Seguro Func.',600],['Assessoria',2500],['HGM',304],['EML',3000],['Salários ADM',14000],['Manut. Carros',300],['ISEG',710],['Higiene',80],['ACI',125],['Santander',240],['Protej',116],['Ponto Web',125]].map((x,i)=>({id:String(i+1),nome:x[0],valor:x[1]}));
  const clone=x=>JSON.parse(JSON.stringify(x));
  const load=(key,fallback)=>{try{const r=localStorage.getItem(key);return r?JSON.parse(r):clone(fallback)}catch{return clone(fallback)}};
  let dados={...DEFAULT_DADOS,...load(STORAGE.dados,{})};
  let cargos=load(STORAGE.cargos,CARGOS_DEFAULT);
  let custosFixos=load(STORAGE.custos,CUSTOS_FIXOS_DEFAULT);
  const saveDados=()=>localStorage.setItem(STORAGE.dados,JSON.stringify(dados));
  const saveCargos=()=>localStorage.setItem(STORAGE.cargos,JSON.stringify(cargos));
  const saveCustos=()=>localStorage.setItem(STORAGE.custos,JSON.stringify(custosFixos));

  function calcular(input=dados){
    const d=input,margemAntecipacao=d.diasAntecipacao*0.1;
    const insalubridadeValor=(d.insalubridadePerc/100)*d.salarioMinimo;
    const baseEncargos=d.salario+d.premioAssiduidade+insalubridadeValor;
    const ferias=baseEncargos/12,tercoFerias=ferias/3,feriasComTerco=ferias+tercoFerias,decimoTerceiro=baseEncargos/12;
    const fgtsBase=baseEncargos*.08,fgtsFerias=feriasComTerco*.08,fgts13=decimoTerceiro*.08,fgtsTotal=fgtsBase+fgtsFerias+fgts13;
    const inssBase=baseEncargos*(d.inssPatronalPerc/100),inssFerias=feriasComTerco*(d.inssPatronalPerc/100),inss13=decimoTerceiro*(d.inssPatronalPerc/100),inssPatronal=inssBase+inssFerias+inss13;
    const multaFgts=(fgtsTotal*12)*.4,provisaoRescisao=multaFgts/12;
    const encargosTotais=feriasComTerco+decimoTerceiro+fgtsTotal+inssPatronal+provisaoRescisao;
    const custosFixosIndividuais=d.almoco+d.epi+d.transporte+d.exames+d.ferramentas+d.planoSaude;
    const seguroVidaFunc=d.qtdFunc>0?d.seguroVidaTotal/d.qtdFunc:0,treinamentosMensal=d.treinamentosAnual/12,custoOperFunc=d.qtdFunc>0?d.custoOperacional/d.qtdFunc:0;
    const custoTotalMensal=baseEncargos+encargosTotais+custosFixosIndividuais+custoOperFunc+seguroVidaFunc+treinamentosMensal;
    const aliquotaImpostos=(d.inssPrestadorPerc+d.simplesPerc+d.issqnPerc)/100,custoComLucro=custoTotalMensal*(1+d.lucroPerc/100);
    const precoFinal=aliquotaImpostos<1?custoComLucro/(1-aliquotaImpostos):custoComLucro;
    const custoAntecipacao=d.diasAntecipacao>15?precoFinal*(margemAntecipacao/100):0;
    const denomAnt=1-aliquotaImpostos-margemAntecipacao/100;
    const precoFinalComAntecipacao=d.diasAntecipacao>15&&denomAnt>0?custoComLucro/denomAnt:precoFinal;
    const valorHora=d.jornada>0?precoFinal/d.jornada:0,valorHoraComAntecipacao=d.jornada>0?precoFinalComAntecipacao/d.jornada:0;
    const precoBase=d.diasAntecipacao>15?precoFinalComAntecipacao:precoFinal,denomMargem=1-d.descontoNegociacaoPerc/100;
    const precoComMargem=d.descontoNegociacaoPerc>0&&denomMargem>0?precoBase/denomMargem:precoBase;
    const margemNegociacaoValor=precoComMargem-precoBase,valorHoraComMargem=d.jornada>0?precoComMargem/d.jornada:0;
    const percentualEncargos=baseEncargos>0?(encargosTotais/baseEncargos)*100:0;
    const precoReverso=d.diasAntecipacao>15?precoFinalComAntecipacao:precoFinal;
    const rinss=precoReverso*(d.inssPrestadorPerc/100),rsimples=precoReverso*(d.simplesPerc/100),rissqn=precoReverso*(d.issqnPerc/100),rtotal=rinss+rsimples+rissqn;
    const rant=d.diasAntecipacao>15?precoReverso*(margemAntecipacao/100):0,rreceita=precoReverso-rtotal-rant,rlucro=rreceita-custoTotalMensal,rlucroPerc=custoTotalMensal>0?(rlucro/custoTotalMensal)*100:0;
    const esperado=custoTotalMensal*(d.lucroPerc/100),diferenca=Math.abs(rlucro-esperado);
    const minss=precoComMargem*(d.inssPrestadorPerc/100),msimples=precoComMargem*(d.simplesPerc/100),missqn=precoComMargem*(d.issqnPerc/100),mtotal=minss+msimples+missqn;
    const mant=d.diasAntecipacao>15?precoComMargem*(margemAntecipacao/100):0,mreceita=precoComMargem-mtotal-mant,mlucro=mreceita-custoTotalMensal,mlucroPerc=custoTotalMensal>0?(mlucro/custoTotalMensal)*100:0;
    return{insalubridadeValor,baseEncargos,ferias,tercoFerias,feriasComTerco,decimoTerceiro,fgtsBase,fgtsFerias,fgts13,fgtsTotal,inssBase,inssFerias,inss13,inssPatronal,multaFgts,provisaoRescisao,encargosTotais,custosFixosIndividuais,custoOperFunc,seguroVidaFunc,treinamentosMensal,custoTotalMensal,aliquotaImpostos,precoFinal,valorHora,valorHoraComAntecipacao,percentualEncargos,custoAntecipacao,precoFinalComAntecipacao,margemAntecipacaoCalculada:margemAntecipacao,margemNegociacaoValor,precoComMargem,valorHoraComMargem,reverso:{precoFinal:precoReverso,inssRetido:rinss,simples:rsimples,issqn:rissqn,totalImpostos:rtotal,custoAntecipacao:rant,receitaLiquida:rreceita,custoTotalMensal,lucroReal:rlucro,lucroRealPerc:rlucroPerc,lucroEsperado:esperado,lucroEsperadoPerc:d.lucroPerc,diferenca,confere:diferenca<1},reversoComMargem:{precoComMargem,valorHoraComMargem,inssRetido:minss,simples:msimples,issqn:missqn,totalImpostos:mtotal,custoAntecipacao:mant,receitaLiquida:mreceita,lucroReal:mlucro,lucroRealPerc:mlucroPerc,ganhoExtra:mlucro-rlucro}};
  }
  function calcularValorHoraTabela(salario,diasAntecipacao){return calcular({salario,diasAntecipacao,jornada:220,salarioMinimo:1621,insalubridadePerc:20,premioAssiduidade:380,almoco:0,epi:450,transporte:0,exames:500,ferramentas:300,planoSaude:15,seguroVidaTotal:500,treinamentosAnual:330,custoOperacional:28775,qtdFunc:8,inssPatronalPerc:8,inssPrestadorPerc:11,simplesPerc:14,issqnPerc:4.59,lucroPerc:30,descontoNegociacaoPerc:12}).valorHoraComMargem}
  const api={STORAGE,DEFAULT_DADOS,CARGOS_DEFAULT,EMPRESAS,CUSTOS_FIXOS_DEFAULT,get dados(){return dados},set dados(v){dados=v},get cargos(){return cargos},set cargos(v){cargos=v},get custosFixos(){return custosFixos},set custosFixos(v){custosFixos=v},saveDados,saveCargos,saveCustos,calcular,calcularValorHoraTabela,clone};
  return api;
})();