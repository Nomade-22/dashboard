// Dashboard Adequações Civis v1.3.1 — correção de somas (modo do Almoço) + delete por ID
document.addEventListener('DOMContentLoaded', () => {
  const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const KEY = 'adq_civis_lancamentos_v11';
  const CFG_KEY = 'adq_civis_cfg_v13_1';  // novo: cfg.almoco_mode
  const OF_KEY = 'adq_civis_ofs_v11';

  let cfg  = JSON.parse(localStorage.getItem(CFG_KEY) || '{"prof":809,"ajud":405,"almoco":35,"almoco_mode":"qtd"}');
  let lanc = JSON.parse(localStorage.getItem(KEY) || '[]');
  let ofs  = JSON.parse(localStorage.getItem(OF_KEY)  || '[]');

  const q  = (s)=>document.querySelector(s);
  const qa = (s)=>Array.from(document.querySelectorAll(s));
  const sum = (arr, pick)=> arr.reduce((s,o)=> s + (+pick(o)||0), 0);
  const num = (v)=> {
    if (v==null) return 0;
    const s = String(v).replace(/\uFEFF/g,'').replace(/R\$\s?/gi,'').replace(/\./g,'').replace(/\s+/g,'').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  function persistLanc(){ localStorage.setItem(KEY, JSON.stringify(lanc)); }
  function persistCfg(){ localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }
  function persistOFs(){ localStorage.setItem(OF_KEY, JSON.stringify(ofs)); }

  function findOF(id){ return ofs.find(o => o.id===id); }

  // === Cálculo: Almoço pode ser "qtd dias" (qtd×pessoas×R$) ou "valor total (R$)" ===
  function almocoTotalDe(l){
    const pessoas = (+l.profissionais||0) + (+l.ajudantes||0);
    const qtdOuValor = +l.almoco||0;
    if ((cfg.almoco_mode||'qtd') === 'valor'){
      return qtdOuValor; // já é o valor total em R$
    } else {
      return qtdOuValor * pessoas * (+cfg.almoco||0); // quantidade × pessoas × R$/almoço
    }
  }

  function gastoLanc(l){
    const mat = +l.materiais||0;
    const mo  = (l.profissionais*cfg.prof) + (l.ajudantes*cfg.ajud);
    const alm = almocoTotalDe(l);
    const translado = +l.translado||0;
    return mat + mo + alm + translado;
  }

  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  // ---------- Abas ----------
  qa('button[data-tab]').forEach(b=>{
    if(!b.getAttribute('type')) b.setAttribute('type','button');
    b.addEventListener('click',()=>{
      qa('.tab').forEach(t=>t.classList.remove('active'));
      const tgt = q('#'+b.dataset.tab);
      if(tgt) tgt.classList.add('active');
      if(b.dataset.tab==='dashboard') renderAll();
      if(b.dataset.tab==='lancamentos') fillOFSelects();
      if(b.dataset.tab==='ofs'){ renderOFs(); fillOFSelects(); }
      if(b.dataset.tab==='config') ensureConfigUI();
    });
  });

  // ---------- OFs ----------
  function renderOFs(){
    const wrap = q('#ofCards'); if(!wrap) return; wrap.innerHTML='';
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
      const orcado= num(q('#ofOrcado')?.value||0);
      const desc=(q('#ofDesc')?.value||'').trim();
      ofs.push({id, cliente, orcado, desc});
      persistOFs();
      formOF.reset();
      renderOFs(); fillOFSelects();
      alert('OF cadastrada.');
    });
    const btnResetOFs = q('#btnResetOFs');
    if(btnResetOFs){
      btnResetOFs.onclick = ()=>{
        if(confirm('Apagar TODAS as OFs? (lançamentos não serão apagados)')){
          ofs=[]; persistOFs(); renderOFs(); fillOFSelects(); renderAll();
        }
      };
    }
  }

  // ---------- Lançamentos ----------
  const form = q('#form');
  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const of_id = q('#ofId')?.value;
      if(!of_id){ alert('Selecione uma OF.'); return; }
      const data = q('#data')?.value || '';
      const fornecedor = (q('#fornecedor')?.value||'').trim();
      const materiais = num(q('#materiais')?.value||0);
      const profissionais = num(q('#profissionais')?.value||0);
      const ajudantes = num(q('#ajudantes')?.value||0);
      const almocoInput = num(q('#almoco')?.value||0);  // quantidade OU valor total
      const translado = num(q('#translado')?.value||0);

      lanc.push({
        id: uid(),
        of_id, data, fornecedor,
        materiais, profissionais, ajudantes,
        almoco: almocoInput, translado
      });

      persistLanc();
      form.reset();
      alert('Lançamento adicionado.');
      renderAll();
    });
  }

  // ---------- Config (inclui modo do almoço) ----------
  function ensureConfigUI(){
    const ip = q('#cfgProf'), ia = q('#cfgAjud');
    if(ip) ip.value = cfg.prof ?? 809;
    if(ia) ia.value = cfg.ajud ?? 405;

    // R$/almoço (por pessoa)
    if(!q('#cfgAlmoco')){
      const formCfg = q('#config .form') || q('#config');
      if(formCfg){
        const wrap = document.createElement('label');
        wrap.className = 'small';
        wrap.innerHTML = `R$/almoço (por pessoa)
          <input type="number" id="cfgAlmoco" step="0.01" min="0" />`;
        formCfg.insertBefore(wrap, formCfg.querySelector('.btns') || formCfg.lastChild);
      }
    }
    const ic = q('#cfgAlmoco'); if(ic) ic.value = cfg.almoco ?? 35;

    // Modo do almoço: quantidade de dias ou valor total
    if(!q('#cfgAlmocoMode')){
      const formCfg = q('#config .form') || q('#config');
      if(formCfg){
        const wrap = document.createElement('label');
        wrap.className = 'small';
        wrap.innerHTML = `Almoço interpreta entrada como
          <select id="cfgAlmocoMode">
            <option value="qtd">Quantidade de dias</option>
            <option value="valor">Valor total (R$)</option>
          </select>`;
        formCfg.insertBefore(wrap, formCfg.querySelector('.btns') || formCfg.lastChild);
      }
    }
    const im = q('#cfgAlmocoMode'); if(im) im.value = cfg.almoco_mode || 'qtd';

    const btnSalvar = q('#btnSalvarCfg');
    if(btnSalvar){
      btnSalvar.onclick = ()=>{
        cfg.prof         = num(q('#cfgProf')?.value||0);
        cfg.ajud         = num(q('#cfgAjud')?.value||0);
        cfg.almoco       = num(q('#cfgAlmoco')?.value||0);
        cfg.almoco_mode  = (q('#cfgAlmocoMode')?.value)||'qtd';
        persistCfg();
        renderAll();
      };
    }
  }
  ensureConfigUI();

  // ---------- Filtros ----------
  const btnFiltrar = q('#btnFiltrar'); if(btnFiltrar) btnFiltrar.onclick = ()=> renderAll();
  const btnLimpar = q('#btnLimpar');
  if(btnLimpar){
    btnLimpar.onclick = ()=>{
      const de=q('#fDe'), ate=q('#fAte'), forn=q('#fFornecedor'), sel=q('#selOF');
      if(de) de.value=''; if(ate) ate.value=''; if(forn) forn.value='';
      if(sel) sel.value='__ALL__';
      renderAll();
    };
  }

  // ---------- CSV (aceita qualquer arquivo; robusto) ----------
  const inputCSV = q('#inputCSV');
  if(inputCSV){
    inputCSV.removeAttribute('accept');
    inputCSV.addEventListener('change', async (e)=>{
      const file = e.target.files[0]; if(!file) return;
      await handleCsvFile(file);
      inputCSV.value='';
    });
  }
  async function handleCsvFile(file){
    try{
      let txt = await file.text();
      if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);
      const first = txt.split(/\r?\n/)[0] || '';
      const delim = (first.split(';').length > first.split(',').length) ? ';' : ',';
      const lines = txt.trim().split(/\r?\n/);
      const head = lines.shift().split(delim).map(s=> s.trim().toLowerCase());
      const idx = (k)=> head.indexOf(k);
      const need = ['of_id','data','fornecedor','materiais','profissionais','ajudantes','almoco','translado'];
      if(idx('of_id')<0){
        const alt = ['of','ordem','ordem de fabricação','obra','centro de custo'];
        for(const a of alt){ const p = idx(a); if(p>=0){ head[p] = 'of_id'; break; } }
      }
      const missing = need.filter(k=> idx(k)<0);
      if(missing.length){ alert('Cabeçalho CSV faltando: '+missing.join(', ')); return; }
      lines.forEach(line=>{
        if(!line.trim()) return;
        const cols = parseCsvLine(line, delim);
        const rec = {
          id: uid(),
          of_id: (cols[idx('of_id')]||'').trim(),
          data: (cols[idx('data')]||'').trim(),
          fornecedor: (cols[idx('fornecedor')]||'').trim(),
          materiais: num(cols[idx('materiais')]),
          profissionais: num(cols[idx('profissionais')]),
          ajudantes: num(cols[idx('ajudantes')]),
          almoco: num(cols[idx('almoco')]),      // quantidade ou valor (conforme modo)
          translado: num(cols[idx('translado')]),
        };
        lanc.push(rec);
      });
      persistLanc();
      // garantir OFs
      const idsUsados = [...new Set(lanc.map(l=>l.of_id).filter(Boolean))];
      idsUsados.forEach(id=>{ if(!ofs.some(o=>o.id===id)){ ofs.push({id, cliente:'', orcado:0, desc:''}); } });
      persistOFs(); fillOFSelects(); renderOFs(); renderAll();
      alert('Importação concluída com sucesso!');
    }catch(err){
      console.error('Import CSV:', err);
      alert('Não foi possível importar o CSV.');
    }
  }
  function parseCsvLine(s, delim){
    const out=[]; let cur=''; let q=false;
    for(let i=0;i<s.length;i++){
      const c=s[i];
      if(c==='"'){ if(q && s[i+1]==='"'){cur+='"'; i++;} else {q=!q;} }
      else if(c===delim && !q){ out.push(cur); cur=''; }
      else cur+=c;
    }
    out.push(cur);
    return out.map(x=>x.trim());
  }

  // ---------- Agregadores / tabela / KPIs ----------
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
    rows.forEach((l)=>{
      const total = gastoLanc(l);
      const pessoas = (+l.profissionais||0)+(+l.ajudantes||0);
      const almTotal = almocoTotalDe(l);
      const almInfo = (cfg.almoco_mode==='valor')
        ? `${BRL.format(almTotal)}`
        : `${l.almoco||0} × ${pessoas} × ${BRL.format(+cfg.almoco||0)} = ${BRL.format(almTotal)}`;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(l.of_id||'')}</td>
        <td>${l.data||''}</td>
        <td>${escapeHtml(l.fornecedor||'')}</td>
        <td>${BRL.format(l.materiais||0)}</td>
        <td>${l.profissionais||0}</td>
        <td>${l.ajudantes||0}</td>
        <td title="Almoço">${almInfo}</td>
        <td>${BRL.format(l.translado||0)}</td>
        <td><b>${BRL.format(total)}</b></td>
        <td><button class="btn ghost" data-delid="${l.id||''}" type="button">Excluir</button></td>`;
      tb.appendChild(tr);
    });
    tb.querySelectorAll('button[data-delid]').forEach(b=>{
      b.onclick = ()=>{
        const id = b.getAttribute('data-delid');
        const idx = lanc.findIndex(x=>x.id===id);
        if(idx>=0 && confirm('Remover este lançamento?')){
          lanc.splice(idx,1); persistLanc(); renderAll();
        }
      };
    });
  }

  function renderKpis(rows){
    const mat = sum(rows, r=> +r.materiais||0);
    const mo  = sum(rows, r=> r.profissionais*cfg.prof + r.ajudantes*cfg.ajud );
    const ind = sum(rows, r=> almocoTotalDe(r) + (+r.translado||0));
    const total = mat + mo + ind;
    const set = (sel, v)=>{ const el=q(sel); if(el) el.textContent = v; };
    set('#kpiMateriais', BRL.format(mat));
    set('#kpiMO', BRL.format(mo));
    set('#kpiIndiretos', BRL.format(ind));
    set('#kpiTotal', BRL.format(total));
    set('#kpiRegistros', rows.length ? `${rows.length} registros` : 'Sem registros');
    set('#kpiHh', `${sum(rows, r=> r.profissionais + r.ajudantes)} pessoas·dia`);
    set('#kpiIndPct', `Indiretos ${total?(ind/total*100).toFixed(1):0}%`);

    // Orçado/Saldo
    const pillOrcado = q('#pillOrcado'), pillSaldo = q('#pillSaldo');
    if(pillOrcado && pillSaldo){
      const sel = q('#selOF')?.value || '__ALL__';
      let orcado=0, gastoOF=0;
      if(sel && sel!=='__ALL__'){
        const of = findOF(sel); orcado = of ? (+of.orcado||0) : 0;
        gastoOF = sum(lanc.filter(l=>l.of_id===sel), l=> gastoLanc(l));
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

  // ---------- Gráficos (fornecedor só Materiais) ----------
  let chEvo=null, chCat=null, chForn=null;
  function renderCharts(rows){
    const byDate = {}; rows.forEach(r=>{ const k=r.data||'—'; byDate[k]=(byDate[k]||0)+gastoLanc(r); });
    const cat = {
      'Materiais': sum(rows, r=> +r.materiais||0),
      'Mão de Obra': sum(rows, r=> r.profissionais*cfg.prof + r.ajudantes*cfg.ajud ),
      'Indiretos': sum(rows, r=> almocoTotalDe(r) + (+r.translado||0)),
    };
    const byForn = {};
    rows.forEach(r=>{
      const valorMat = +r.materiais||0;
      const forn = (r.fornecedor||'').trim();
      if(valorMat>0 && forn){ byForn[forn] = (byForn[forn]||0) + valorMat; }
    });

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
        data:{ labels:Object.keys(byForn), datasets:[{ label:'Materiais por fornecedor', data:Object.values(byForn) }]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ ticks:{ callback:v=>BRL.format(v) } } } }
      });
    }
  }

  function renderAll(){
    fillOFSelects();
    const rows = filtrarDados();
    renderKpis(rows);
    renderCharts(rows);
    renderTable(rows);
  }

  // Seeds opcionais (idem versões anteriores)
  if(ofs.length===0){
    ofs = [
      {id:'OF-2025-001', cliente:'Bortolaso', orcado:22100, desc:'Adequações civis — etapa 1'},
      {id:'OF-2025-002', cliente:'—', orcado:15000, desc:'Reservado'}
    ];
    persistOFs();
  }
  if(lanc.length===0){
    lanc = [
      {id:uid(), of_id:'OF-2025-001', data:'2025-09-09', fornecedor:'Bortolaso', materiais:344, profissionais:2, ajudantes:0, almoco:1, translado:25},
      {id:uid(), of_id:'OF-2025-001', data:'2025-09-10', fornecedor:'',         materiais:0,   profissionais:2, ajudantes:0, almoco:1, translado:25},
      {id:uid(), of_id:'OF-2025-001', data:'2025-09-15', fornecedor:'Bortolaso', materiais:355, profissionais:2, ajudantes:0, almoco:1, translado:25},
      {id:uid(), of_id:'OF-2025-002', data:'2025-09-16', fornecedor:'Bortolaso', materiais:86,  profissionais:2, ajudantes:0, almoco:1, translado:25},
    ];
    persistLanc();
  }

  renderOFs();
  renderAll();
});
