document.addEventListener('DOMContentLoaded', () => {
  const tabs = Array.from(document.querySelectorAll('.system-tab'));
  const panels = Array.from(document.querySelectorAll('.system-panel'));

  function activateSystem(system) {
    tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.system === system));
    panels.forEach(panel => panel.classList.toggle('active', panel.id === `panel-${system}`));
    history.replaceState(null, '', `#${system}`);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => activateSystem(tab.dataset.system));
  });

  const requested = location.hash.replace('#', '');
  if (['orcamentos', 'calc-hh', 'precos'].includes(requested)) {
    activateSystem(requested);
  }
});
