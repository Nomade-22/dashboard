// Configuração pública da interface.
// A URL da API pode ser preenchida após o backend privado ser publicado.
// Exemplo: window.MULTPREST_ROUTE_API = 'https://api.exemplo.com/api/calculate-route';
window.MULTPREST_ROUTE_API = window.MULTPREST_ROUTE_API || '';

// Carrega módulos complementares sem expor dados sensíveis no código público.
(() => {
  const s=document.createElement('script');
  s.src='despesas.js';
  s.defer=true;
  document.head.appendChild(s);
})();