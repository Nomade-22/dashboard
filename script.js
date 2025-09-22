// exemplo mínimo
const q = (s)=>document.querySelector(s);
const qa = (s)=>[...document.querySelectorAll(s)];
const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

let lanc = JSON.parse(localStorage.getItem("lanc_v11")||"[]");
let ofs  = JSON.parse(localStorage.getItem("ofs_v11")||"[]");

qa('button[data-tab]').forEach(b=>{
  b.addEventListener('click',()=>{
    qa('.tab').forEach(t=>t.classList.remove('active'));
    q('#'+b.dataset.tab).classList.add('active');
  });
});

// aqui entram todas as funções que já te entreguei (renderAll, renderOFs, etc)
