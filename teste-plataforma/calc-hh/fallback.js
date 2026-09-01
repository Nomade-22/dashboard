'use strict';
(() => {
  const C=window.CalcHHCore;
  if(!C)return;
  // Só corrige o fallback quando ainda não existe cadastro local/remoto aplicado.
  if(localStorage.getItem(C.STORAGE.cargos))return;
  const original={serralheiro:3000,soldador:3000};
  C.cargos=C.cargos.map(c=>original[c.id]!==undefined?{...c,salarioBase:original[c.id]}:c);
  C.saveCargos();
})();