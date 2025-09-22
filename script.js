// Dashboard Adequações Civis v1.1 (OF)
const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const KEY = 'adq_civis_lancamentos_v11';
const CFG_KEY = 'adq_civis_cfg_v11';
const OF_KEY = 'adq_civis_ofs_v11';

let lanc = JSON.parse(localStorage.getItem(KEY) || '[]');
let cfg  = JSON.parse(localStorage.getItem(CFG_KEY) || '{"prof":809,"ajud":405}');
let ofs  = JSON.parse(localStorage.getItem(OF_KEY)  || '[]');

const q = (s)=>document.querySelector(s);
const qa = (s)=>[...document.querySelectorAll(s)];
const sum = (arr, pick)=> arr.reduce((s,o)=> s + (+pick(o)||0), 0);

function persistLanc(){ localStorage.setItem(KEY, JSON.stringify(lanc)); }
function persistCfg(){ localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }
function persistOFs(){ localStorage.setItem(OF_KEY, JSON.stringify(ofs)); }

function findOF(id){ return ofs.find(o => o.id===id); }
function gastoLanc(l){ return (+l.materiais||0) + (l.profissionais*cfg.prof) + (l.ajudantes*cfg.ajud) + (+l.almoco||0) + (+l.translado||0); }
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

// Navegação entre abas
qa('button[data-tab]').forEach(b=>{
  b.addEventListener('click',()=>{
    qa('.tab').forEach(t=>t.classList.remove('active'));
    q('#'+b.dataset.tab).classList.add('active');
    if(b.dataset.tab==='dashboard'){ renderAll(); }
    if(b.dataset.tab==='lancamentos'){ fillOFSelects(); }
    if(b.dataset.tab==='ofs'){ renderOFs(); fillOFSelects(); }
    if(b.dataset.tab==='config'){ q('#cfgProf').value = cfg.prof; q('#cfgAjud').value = cfg.ajud; }
  });
});

// ======= OFs =======
function renderOFs(){
  const wrap = q('#ofCards'); wrap.innerHTML='';
  const mapGastos = {};
  lanc.forEach(l => { mapGastos[l.of_id] = (mapGastos[l.of_id]||0) + gastoLanc(l); });

  ofs.forEach(of=>{
    const gasto = mapGastos[of.id]||0;
    const orc = +of.orcado||0;
    const pct = orc>0 ? Math.min(100, (gasto/orc)*100) : 0;
    const saldo = orc - gasto;
    const card = document.createElement('div');
    card.className = 'card of-card';
    card.innerHTML = `
      <div class="head">
        <div>
          <div style="font-weight:700">${of.id}</div>
          <div class="muted">${escapeHtml(of.cliente||'')}</div>
        </div>
        <div><span class="pill">Orçado: ${orc?BRL.format(orc):'—'}</span></div>
      </div>
      <div style="margin-top:8px">${of.desc?('<span class="muted">'+escapeHtml(of.desc)+'</span>'):'<span class="muted">Sem descrição</span>'}</div>
      <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
        <span class="pill">Gasto: <b>${BRL.format(gasto)}</b></span>
        <span class="pill ${saldo<0?'tag-danger':(pct>=80?'tag-warn':'')}">Saldo: <b>${BRL.format(saldo)}</b></span>
        <span class="pill">${pct.toFixed(0)}% consumido</span>
      </div>
      <div class="of-progress"><div class="of-bar" style="width:${pct}%;"></div></div>
      <div style="display:flex; gap:8px; margin-top:10px">
        <button class="btn" data-ativar="${of.id}">Selecionar no Dashboard</button>
        <button class="btn ghost" data-delof="${of.id}">Excluir OF</button>
      </div>`;
    wrap.appendChild(card);
  });

  wrap.querySelectorAll('[data-ativar]').forEach(b=>{
    b.onclick = ()=>{ q('#selOF').value = b.dataset.ativar; renderAll(); window.scrollTo({top:0,behavior:'smooth'}); };
  });
  wrap.querySelectorAll('[data-delof]').forEach(b=>{
    b.onclick = ()=>{
      const id=b.dataset.delof;
      if(confirm('Excluir OF e manter os lançamentos (eles ficarão sem OF)?')){
        ofs = ofs.filter(o=>o.id!==id); persistOFs();
        lanc.forEach(l=>{ if(l.of_id===id) l.of_id=''; }); persistLanc();
        renderOFs(); fillOFSelects(); renderAll();
      }
    };
  });
}

function fillOFSelects(){
  const sel1 = q('#ofId'), sel2 = q('#selOF');
  const makeOpts = (includeAll)=>{
    let html = includeAll? `<option value="__ALL__">— Todas OFs —</option>` : '';
    ofs.forEach(of=> html += `<option value="${of.id}">${of.id} — ${escapeHtml(of.cliente||'')}</option>`);
    return html;
  };
  if(sel1) sel1.innerHTML = makeOpts(false);
  if(sel2){ sel2.innerHTML = makeOpts(true); if(!sel2.value) sel2.value='__ALL__'; }
}

// Cadastro OF
q('#formOF').addEventListener('submit', (e)=>{
  e.preventDefault();
  const id=(q('#ofNumero').value||'').trim();
  if(!id) return alert('Informe o Nº/ID da OF.');
  if(ofs.some(o=>o.id===id)) return alert('Já existe uma OF com esse ID.');
  const cliente=(q('#ofCliente').value||'').trim();
  const orcado= +q('#ofOrcado').value||0;
  const desc=(q('#ofDesc').value||'').trim();
  ofs.push({id, cliente, orcado, desc});
  persistOFs();
  e.target.reset();
  renderOFs(); fillOFSelects();
  alert('OF cadastrada.');
});

q('#btnResetOFs').onclick = ()=>{
  if(confirm('Apagar TODAS as OFs? (lançamentos não serão apagados)')){
    ofs=[]; persistOFs(); renderOFs(); fillOFSelects(); renderAll();
  }
};

// ======= Lançamentos =======
q('#form').addEventListener('submit', (e)=>{
  e.preventDefault();
  const of_id = q('#ofId').value;
  if(!of_id){ alert('Selecione uma OF.'); return; }
  const data = q('#data').value;
  const fornecedor = (q('#fornecedor').value||'').trim();
  const materiais = +q('#materiais').value||0;
  const profissionais = +q('#profissionais').value||0;
  const ajudantes = +q('#ajudantes').value||0;
  const almoco = +q('#almoco').value||0;
  const translado = +q('#translado').value||0;
  lanc.push({of_id, data, fornecedor, materiais, profissionais, ajudantes, almoco, translado});
  persistLanc();
  e.target.reset();
  alert('Lançamento adicionado.');
});

// ======= Config =======
q('#cfgProf').value = cfg.prof ?? 809;
q('#cfgAjud').value = cfg.ajud ?? 405;
q('#btnSalvarCfg').onclick = ()=>{ cfg.prof = +q('#cfgProf').value||0; cfg.ajud = +q('#cfgAjud').value||0; persistCfg(); renderAll(); }
q('#btnResetar').onclick = ()=>{ if(confirm('Apagar TODOS os lançamentos?')){ lanc=[]; persistLanc(); renderAll(); } }

// ======= Funções principais =======
function filtrarDados(){
  const sel = q('#selOF').value;
  const de = q('#fDe').value || null;
  const ate = q('#fAte').value || null;
  const forn = (q('#fFornecedor').value||'').toLowerCase().trim();
  return lanc.filter(l=>{
    const okOF = (sel==='__ALL__') || (l.of_id===sel);
    const okData = (!de || l.data>=de) && (!ate || l.data<=ate);
    const okForn = !forn || (l.fornecedor||'').toLowerCase().includes(forn);
    return okOF && okData && okForn;
  }).sort((a,b)=>(a.data||'').localeCompare(b.data||''));
}

function renderTable(rows){
  const tb = q('#tabela tbody'); tb.innerHTML = '';
  rows.forEach((l,idx)=>{
    const total = gastoLanc(l);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(l.of_id||'')}</td>
      <td>${l.data||''}</td>
      <td>${escapeHtml(l.fornecedor||'')}</td>
      <td>${BRL.format(l.materiais||0)}</td>
      <td>${l.profissionais||0}</td>
      <td>${l.ajudantes||0}<
