// Configuração pública da interface.
// A URL da API de rotas será preenchida quando publicarmos o backend privado.
window.MULTPREST_ROUTE_API = window.MULTPREST_ROUTE_API || '';

// No sistema original a equipe padrão começa com até 9 pessoas por dia.
// Só aplicamos o fallback quando o usuário ainda não salvou outra configuração.
if (localStorage.getItem('multprest_orc_team_size_v1') === null) {
  localStorage.setItem('multprest_orc_team_size_v1', '9');
}

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