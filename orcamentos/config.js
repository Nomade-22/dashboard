// Configuração pública da interface.
// A URL da API pode ser preenchida após o backend privado ser publicado.
// Exemplo: window.MULTPREST_ROUTE_API = 'https://api.exemplo.com/api/calculate-route';
window.MULTPREST_ROUTE_API = window.MULTPREST_ROUTE_API || '';

// Integração opcional com o núcleo do Calc HH.
// Não copia nenhum valor automaticamente: apenas disponibiliza a prévia na aba Custos HH.
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
    .catch((error)=>console.warn('Integração Calc HH indisponível:',error));
})();