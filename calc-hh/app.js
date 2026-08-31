'use strict';
(() => {
  const load = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  load('core.js').then(() => load('ui.js')).catch((error) => {
    console.error('Falha ao carregar o Calc HH:', error);
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = 'Erro ao carregar a calculadora.';
      toast.classList.add('show');
    }
  });
})();