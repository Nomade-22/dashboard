// Dashboard Adequações Civis v1.1 (OF) — robusto com DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const KEY = 'adq_civis_lancamentos_v11';
  const CFG_KEY = 'adq_civis_cfg_v11';
  const OF_KEY = 'adq_civis_ofs_v11';

  let lanc = JSON.parse(localStorage.getItem(KEY) || '[]');
  let cfg  = JSON.parse(localStorage.getItem(CFG_KEY) || '{"prof":809,"ajud":405}');
  let ofs  = JSON.parse(localStorage.getItem(OF_KEY)  || '[]');

  const q  = (s)=>document.querySelector(s);
  const qa = (s)=>Array.from(document.querySelectorAll(s));
  const sum = (arr, pick)=> arr.reduce((s,o)=> s + (+pick(o)||0), 0);

  function persistLanc(){ localStorage.setItem(KEY, JSON.stringify(lanc)); }
  function persistCfg(){ localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }
  function persistOFs(){ localStorage.setItem(OF_KEY, JSON.stringify(ofs)); }

  function findOF(id){ return ofs.find(o => o.id===id); }
  function gastoLanc(l){ return (+l.materiais||0) + (l.profissionais*cfg.prof) + (l.ajudantes*cfg.ajud) + (+l.almoco||0) + (+l.translado||0); }
  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  // ======= Navegação entre abas (defensivo) =======
  qa('button[data-tab]').forEach(b=>{
    b.addEventListener('click',()=>{
      qa('.tab').forEach(t=>t.classList.remove('active'));
      const target = q('#'+b.dataset.tab);
      if(target){ target.classList.add('active'); }
      // renderizações on-demand
      if(b.dataset.tab==='dashboard'){ renderAll(); }
      if(b.dataset.tab==='lancamentos'){ fillOFSelects(); }
      if(b.dataset.tab==='ofs'){ renderOFs(); fillOFSelects(); }
      if(b.dataset.tab==='config'){
        const p = q('#cfgProf'); const a = q('#cfgAjud');
        if(p) p.value = cfg.prof ?? 809;
        if(a) a.value = cfg.ajud ?? 405;
      }
    });
    // garante que botões em forms não disparem submit
    if(!b.getAttribute('type')) b.setAttribute('type','button');
  });

  // ======= OFs =======
  function renderOFs(){
    const wrap = q('#ofCards'); if(!wrap) return;
    wrap.innerHTML='';
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
            <div style="font-weight:700">${escapeHtml(of.id)}</div>
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
          <button class="btn" data-ativar="${escapeHtml(of.id)}" type="button">Selecionar no Dashboard</button>
          <button class="btn ghost" data-delof="${escapeHtml(of.id)}" type="button">Excluir OF</button>
        </div>`;
      wrap.appendChild(card);
    });

    wrap.querySelectorAll('[data-ativar]').forEach(b=>{
      b.onclick = ()=>{ const sel=q('#selOF'); if(sel){ sel.value = b.dataset.ativar; } renderAll(); window.scrollTo({top:0,behavior:'smooth'}); };
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
      ofs.forEach(of=> html += `<option value="${escapeHtml(of.id)}">${escapeHtml(of.id)} — ${escapeHtml(of.cliente||'')}</option>`);
      return html;
    };
    if(sel1) sel1.innerHTML = makeOpts(false);
    if(sel2){ sel2.innerHTML = makeOpts(true); if(!sel2.value) sel2.value='__ALL__'; }
  }

  // Cadastro OF
  const formOF = q('#formOF');
  if(formOF){
    formOF.addEventListener('submit', (e)=>{
      e.preventDefault();
      const id=(q('#ofNumero')?.value||'').trim();
      if(!id) return alert('Informe o Nº/ID da OF.');
      if(ofs.some(o=>o.id===id)) return alert('Já existe uma OF com esse ID.');
      const cliente=(q('#ofCliente')?.value||'').trim();
      const orcado= +(q('#ofOrcado')?.value||0);
      const desc=(q('#ofDesc')?.value||'').trim();
      ofs.push({id, cliente, orcado, desc});
      persistOFs();
      formOF.reset();
      renderOFs(); fillOFSelects();
      alert('OF cadastrada.');
    });
    const btnResetOFs = q('#btnResetOFs');
    if(btnResetOFs){
      btnResetOFs.setAttribute('type','button');
      btnResetOFs.onclick = ()=>{
        if(confirm('Apagar TODAS as OFs? (lançamentos não serão apagados)')){
          ofs=[]; persistOFs(); renderOFs(); fillOFSelects(); renderAll();
        }
      };
    }
  }

  // ======= Lançamentos =======
  const form = q('#form');
  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const of_id = q('#ofId')?.value;
      if(!of_id){ alert('Selecione uma OF.'); return; }
      const data = q('#data')?.value || '';
      const fornecedor = (q('#fornecedor')?.value||'').trim();
      const materiais = +(q('#materiais')?.value||0);
      const profissionais = +(q('#profissionais')?.value||0);
      const ajudantes = +(q('#ajudantes')?.value||0);
      const almoco = +(q('#almoco')?.value||0);
      const translado = +(q('#translado')?.value||0);
      lanc.push({of_id, data, fornecedor, materiais, profissionais, ajudantes, almoco, translado});
      persistLanc();
      form.reset();
      alert('Lançamento adicionado.');
      renderAll();
    });
  }

  // ======= Config =======
  const btnSalvarCfg = q('#btnSalvarCfg');
  if(btnSalvarCfg){
    const ip = q('#cfgProf'), ia = q('#cfgAjud');
    if(ip) ip.value = cfg.prof ?? 809;
    if(ia) ia.value = cfg.ajud ?? 405;
    btnSalvarCfg.setAttribute('type','button');
    btnSalvarCfg.onclick = ()=>{
      cfg.prof = +(ip?.value||0);
      cfg.ajud = +(ia?.value||0);
      persistCfg();
      renderAll();
    };
    const btnResetar = q('#btnResetar');
    if(btnResetar){
      btnResetar.setAttribute('type','button');
      btnResetar.onclick = ()=>{
        if(confirm('Apagar TODOS os lançamentos?')){
          lanc=[]; persistLanc(); renderAll();
        }
      };
    }
  }

  // ======= Filtros / Header =======
  const btnFiltrar = q('#btnFiltrar');
  if(btnFiltrar){
    btnFiltrar.setAttribute('type','button');
    btnFiltrar.onclick = ()=> renderAll();
  }
  const btnLimpar = q('#btnLimpar');
  if(btnLimpar){
    btnLimpar.setAttribute('type','button');
    btnLimpar.onclick = ()=>{
      const de=q('#fDe'), ate=q('#fAte'), forn=q('#fFornecedor'), sel=q('#selOF');
      if(de) de.value=''; if(ate) ate.value=''; if(forn) forn.value='';
      if(sel) sel.value='__ALL__';
      renderAll();
    };
  }

  // ======= Import/Export CSV =======
  const btnExportar = q('#btnExportar');
  if(btnExportar){
    btnExportar.setAttribute('type','button');
    btnExportar.onclick = ()=>{
      const rows = [['of_id','data','fornecedor','materiais','profissionais','ajudantes','almoco','translado']];
      lanc.forEach(l=> rows.push([l.of_id,l.data,l.fornecedor,l.materiais,l.profissionais,l.ajudantes,l.almoco,l.translado]));
      const csv = rows.map(r=>r.map(v=> typeof v==='string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : v).join(',')).join('\n');
      const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'adequacoes_civis_v11.csv'; a.click();
    };
  }
  const inputCSV = q('#inputCSV');
  if(inputCSV){
    inputCSV.addEventListener('change', async (e)=>{
      const file = e.target.files[0]; if(!file) return;
      const txt = await file.text();
      const lines = txt.trim().split(/\r?\n/);
      const head = lines.shift().split(',').map(s=>s.trim().toLowerCase());
      const idx = (k)=> head.indexOf(k);
      const need = ['of_id','data','fornecedor','materiais','profissionais','ajudantes','almoco','translado'];
      const missing = need.filter(k=> idx(k)<0);
      if(missing.length){ alert('Cabeçalho CSV faltando: '+missing.join(', ')); return; }
      lines.forEach(line=>{
        if(!line.trim()) return;
        const cols = parseCsvLine(line);
        const rec = {
          of_id: cols[idx('of_id')]||'',
          data: cols[idx('data')]||'',
          fornecedor: cols[idx('fornecedor')]||'',
          materiais: +cols[idx('materiais')]||0,
          profissionais: +cols[idx('profissionais')]||0,
          ajudantes: +cols[idx('ajudantes')]||0,
          almoco: +cols[idx('almoco')]||0,
          translado: +cols[idx('translado')]||0,
        };
        lanc.push(rec);
      });
      persistLanc();
      inputCSV.value='';
      // garantir OFs referenciadas
      const idsUsados = [...new Set(lanc.map(l=>l.of_id).filter(Boolean))];
      idsUsados.forEach(id=>{ if(!ofs.some(o=>o.id===id)){ ofs.push({id, cliente:'', orcado:0, desc:''}); } });
      persistOFs(); fillOFSelects(); renderOFs(); renderAll();
    });
  }

  function parseCsvLine(s){
    const out=[]; let cur=''; let q=false;
    for(let i=0;i<s.length;i++){
      const c=s[i];
      if(c==='"' ){ if(q && s[i+1]==='"'){cur+='"'; i++;} else {q=!q;} }
      else if(c===',' && !q){ out.push(cur); cur=''; }
      else cur+=c;
    }
    out.push(cur);
    return out.map(x=>x.trim());
  }

  // ======= Agregadores =======
  function filtrarDados(){
    const sel = q('#selOF')?.value || '__ALL__';
    const de = q('#fDe')?.value || null;
    const ate = q('#fAte')?.value || null;
    const forn = (q('#fFornecedor')?.value||'').toLowerCase().trim();
    return lanc.filter(l=>{
      const okOF = (sel==='__ALL__') || (l.of_id===sel);
      const okData = (!de || l.data>=de) && (!ate || l.data<=ate);
      const okForn = !forn || (l.fornecedor||'').toLowerCase().includes(forn);
      return okOF && okData && okForn;
    }).sort((a,b)=>(a.data||'').localeCompare(b.data||''));
  }

  function renderTable(rows){
    const tb = q('#tabela tbody'); if(!tb) return; tb.innerHTML = '';
    rows.forEach((l,idx)=>{
      const total = gastoLanc(l);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(l.of_id||'')}</td>
        <td>${l.data||''}</td>
        <td>${escapeHtml(l.fornecedor||'')}</td>
        <td>${BRL.format(l.materiais||0)}</td>
        <td>${l.profissionais||0}</td>
        <td>${l.ajudantes||0}</td>
        <td>${BRL.format(l.almoco||0)}</td>
        <td>${BRL.format(l.translado||0)}</td>
        <td><b>${BRL.format(total)}</b></td>
        <td><button class="btn ghost" data-del="${idx}" type="button">Excluir</button></td>`;
      tb.appendChild(tr);
    });
    tb.querySelectorAll('button[data-del]').forEach(b=>{
      b.onclick = ()=>{ const i = +b.dataset.del; if(confirm('Remover este lançamento?')){ lanc.splice(i,1); persistLanc(); renderAll(); } }
    });
  }

  function renderKpis(rows){
    const mat = sum(rows, r=> +r.materiais||0);
    const mo  = sum(rows, r=> r.profissionais*cfg.prof + r.ajudantes*cfg.ajud );
    const ind = sum(rows, r=> +r.almoco + +r.translado);
    const total = mat + mo + ind;

    const setText = (sel, val)=>{ const el=q(sel); if(el) el.textContent = val; };
    setText('#kpiMateriais', BRL.format(mat));
    setText('#kpiMO', BRL.format(mo));
    setText('#kpiIndiretos', BRL.format(ind));
    setText('#kpiTotal', BRL.format(total));
    setText('#kpiRegistros', rows.length ? `${rows.length} registros` : 'Sem registros');
    setText('#kpiHh', `${sum(rows, r=> r.profissionais + r.ajudantes)} pessoas·dia`);
    setText('#kpiIndPct', `Indiretos ${total?(ind/total*100).toFixed(1):0}%`);

    // Orçado/Saldo (pills)
    const pillOrcado = q('#pillOrcado'), pillSaldo = q('#pillSaldo');
    if(pillOrcado && pillSaldo){
      const sel = q('#selOF')?.value || '__ALL__';
      let orcado=0, gastoOF=0;
      if(sel && sel!=='__ALL__'){
        const of = findOF(sel);
        orcado = of ? (+of.orcado||0) : 0;
        gastoOF = sum(lanc.filter(l=>l.of_id===sel), l=>gastoLanc(l));
      } else {
        orcado = sum(ofs, o=> +o.orcado||0);
        gastoOF = sum(lanc, l=> gastoLanc(l));
      }
      const saldo = orcado - gastoOF;
      pillOrcado.textContent = `Orçado: ${orcado?BRL.format(orcado):'—'}`;
      pillSaldo.textContent = `Saldo: ${BRL.format(saldo)}`;
      pillSaldo.classList.remove('tag-warn','tag-danger');
      if(orcado>0){
        const p = gastoOF/orcado;
        if(saldo<0) pillSaldo.classList.add('tag-danger');
        else if(p>=0.8) pillSaldo.classList.add('tag-warn');
      }
    }
  }

  // Gráficos (com destruição prévia)
  let chEvo=null, chCat=null, chForn=null;
  function renderCharts(rows){
    const byDate = {}; rows.forEach(r=>{ const k=r.data||'—'; byDate[k]=(byDate[k]||0)+gastoLanc(r); });
    const cat = {
      'Materiais': sum(rows, r=> +r.materiais||0),
      'Mão de Obra': sum(rows, r=> r.profissionais*cfg.prof + r.ajudantes*cfg.ajud ),
      'Indiretos': sum(rows, r=> +r.almoco + +r.translado),
    };
    const byForn = {}; rows.forEach(r=>{ const k=r.fornecedor||'—'; byForn[k]=(byForn[k]||0)+gastoLanc(r); });

    [chEvo,chCat,chForn].forEach(ch=> ch && ch.destroy());

    const e1 = q('#graficoEvolucao'); if(e1){
      chEvo = new Chart(e1.getContext('2d'), {
        type:'line',
        data:{ labels:Object.keys(byDate), datasets:[{ label:'Total por dia', data:Object.values(byDate), tension:.25 }]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ ticks:{ callback:v=>BRL.format(v) } } } }
      });
    }
    const e2 = q('#graficoCategorias'); if(e2){
      chCat = new Chart(e2.getContext('2d'), {
        type:'doughnut',
        data:{ labels:Object.keys(cat), datasets:[{ data:Object.values(cat) }]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' } } }
      });
    }
    const e3 = q('#graficoFornecedores'); if(e3){
      chForn = new Chart(e3.getContext('2d'), {
        type:'bar',
        data:{ labels:Object.keys(byForn), datasets:[{ label:'Total por fornecedor', data:Object.values(byForn) }]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ ticks:{ callback:v=>BRL.format(v) } } } }
      });
    }
  }

  // ======= Render all =======
  function renderAll(){
    fillOFSelects();
    const rows = filtrarDados();
    renderKpis(rows);
    renderCharts(rows);
    renderTable(rows);
  }

  // ======= Seeds (opcionais) =======
  if(ofs.length===0){
    ofs = [
      {id:'OF-2025-001', cliente:'Bortolaso', orcado:22100, desc:'Adequações civis — etapa 1'},
      {id:'OF-2025-002', cliente:'—', orcado:15000, desc:'Reservado'}
    ];
    persistOFs();
  }
  if(lanc.length===0){
    lanc = [
      {of_id:'OF-2025-001', data:'2025-09-09', fornecedor:'Bortolaso', materiais:344, profissionais:2, ajudantes:0, almoco:40, translado:25},
      {of_id:'OF-2025-001', data:'2025-09-10', fornecedor:'—',        materiais:0,   profissionais:2, ajudantes:0, almoco:40, translado:25},
      {of_id:'OF-2025-001', data:'2025-09-15', fornecedor:'Bortolaso', materiais:355, profissionais:2, ajudantes:0, almoco:40, translado:25},
      {of_id:'OF-2025-002', data:'2025-09-16', fornecedor:'Bortolaso', materiais:86,  profissionais:2, ajudantes:0, almoco:40, translado:25},
    ];
    persistLanc();
  }

  // Inicialização
  try { renderOFs(); } catch(e){ console.warn('renderOFs:', e); }
  try { renderAll(); } catch(e){ console.warn('renderAll:', e); }

}); // DOMContentLoaded
