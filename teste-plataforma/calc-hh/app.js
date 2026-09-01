'use strict';
(() => {
  const load = (src, scope) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    if(scope) script.dataset.scope=scope;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  load('../auth-client.js?v=20260901-supabase2','calc-hh')
    .then(() => load('core.js'))
    .then(() => load('fallback.js'))
    .then(() => load('ui.js'))
    .then(() => load('remote.js'))
    .catch((error) => {
      console.error('Falha ao carregar o Calc HH:', error);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'Erro ao carregar a calculadora.';
        toast.classList.add('show');
      }
    });
})();