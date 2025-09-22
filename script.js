// Dashboard Adequações Civis v1.4
// - Almoço modo "por_pessoa": (prof + ajud) * R$/almoço
// - Aba Fornecedores (cadastro/normalização + unificar lançamentos)
// - Exportar PDF (window.print com layout de impressão)
// - CSV simétrico export/import (backup)

document.addEventListener('DOMContentLoaded', () => {
  const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const KEY = 'adq_civis_lancamentos_v14';
  const CFG_KEY = 'adq_civis_cfg_v14';
  const OF_KEY = 'adq_civis_ofs_v11';
  const SUP_KEY = 'adq_civis_suppliers_v14';

  let cfg  = JSON.parse(localStorage.getItem(CFG_KEY) || JSON.stringify({
    prof: 809, ajud: 405,
    almoco: 45,             // R$ por pessoa
    almoco_mode: 'por_pessoa', // 'por_pessoa' | 'qtd' | 'valor'
    mult_sab: 1.5, mult_dom: 2.0
  }));
  let lanc = JSON.parse(localStorage.getItem(KEY) || '[]');
  let ofs  = JSON.parse(localStorage.getItem(OF_KEY)  || '[]');
  let sups = JSON.parse(localStorage.getItem(SUP_KEY) || '[]'); // [{id,name,aliases:[]}]
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  const q  = (s)=>document.querySelector(s);
  const qa = (s)=>Array.from(document.querySelectorAll(s));
  const sum = (arr, pick)=> arr.reduce((s,o)=> s + (+pick(o)||0), 0);
  const num = (v)=> {
    if (v==null) return 0;
    const s = String(v).replace(/\uFEFF/g,'').replace(/R\$\s?/gi,'').replace(/\./g,'').replace(/\s+/g,'').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  function persistAll(){ localStorage.setItem(KEY, JSON.stringify(lanc)); localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); localStorage.setItem(OF_KEY, JSON.stringify(ofs)); localStorage.setItem(SUP_KEY, JSON.stringify(sups)); }
  function persistLanc(){ localStorage.setItem(KEY, JSON.stringify(lanc)); }
  function persistCfg(){ localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }
  function persistOFs(){ localStorage.setItem(OF_KEY, JSON.stringify(ofs)); }
  function persistSup(){ localStorage.setItem(SUP_KEY, JSON.stringify(sups)); }

  // ---------- Fornecedores: normalização ----------
  const normalize = (s)=> (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  function canonicalSupplierName(input){
    const clean = normalize(input);
    if(!clean) return '';
    for(const s of sups){
      if(normalize(s.name)===clean) return s.name;
      if((s.aliases||[]).some(a=> normalize(a)===clean)) return s.name;
    }
    return input.trim(); // se não achar, devolve como veio
  }
  function ensureSupFromLanc(){
    const names = [...new Set(lanc.map(l=> (l.fornecedor||'').trim()).filter(Boolean))];
    names.forEach(n=>{
      if(!sups.some(s=> normalize(s.name)===normalize(n))){
        sups.push({id: uid(), name: n, aliases: []});
      }
    });
    persistSup();
  }

  // ---------- Cálculos ----------
  function fatorDia(tipo){
    if (tipo === 'sabado') return +cfg.mult_sab || 1.5;
    if (tipo === 'domingo') return +cfg.mult_dom || 2.0;
    return 1;
  }
  function almocoTotalDe(l){
    const ppl = (+l.profissionais||0) + (+l.ajudantes||0);
    const v = +l.almoco||0;
    const mode = cfg.almoco_mode || 'por_pessoa';
    if(mode==='valor') return v;                                 // valor total R$
    if(mode==='qtd')   return v * ppl * (+cfg.almoco||0);        // qtd × pessoas × R$
    return ppl * (+cfg.almoco||0);                               // por pessoa (IGNORA campo almoco)
  }
  function gastoLanc(l){
    const f = fatorDia(l.tipo_dia||'util');
    const mo  = (l.profissionais*(+cfg.prof||0)*f) + (l.ajudantes*(+cfg.ajud||0)*f);
    return (+l.materiais||0) + mo + almocoTotalDe(l) + (+l.translado||0);
  }

  // ---------- Abas ----------
  qa('button[data-tab]').forEach(b=>{
    if(!b.getAttribute('type')) b.setAttribute('type','button');
    b.addEventListener('click',()=>{
      qa('.tab').forEach(t=>t.classList.remove('active'));
      const tgt = q('#'+b.dataset.tab);
      if(tgt) tgt.classList.add('active');
      if(b.dataset.tab==='dashboard') renderAll();
      if(b.dataset.tab==='lancamentos'){ ensureTipoDiaField(); ensureFornecedorDatalist(); fillOFSelects(); }
      if(b.dataset.tab==='ofs'){ renderOFs(); fillOFSelects(); }
      if(b.dataset.tab==='config') ensureConfigUI();
      if(b.dataset.tab==='fornecedores') renderSupUI();
    });
  });

  // cria a Tab "Fornecedores" se não existe
  (function injectSuppliersTab(){
    if(!q('button[data-tab="fornecedores"]')){
      const tabs = q('.tabs');
      if(tabs){
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.dataset.tab = 'fornecedores';
        btn.textContent = 'Fornecedores';
        tabs.appendChild(btn);
        btn.addEventListener('click', ()=> btn.dispatchEvent(new Event('click'))); // só para estilo
      }
    }
    if(!q('#fornecedores')){
      const m = document.createElement('section');
      m.id='fornecedores'; m.className='tab card';
      m.innerHTML = `
        <h2>Cadastro de Fornecedores</h2>
        <div class="form" style="margin-top:10px">
          <div class="row2">
            <label class="small">Nome do fornecedor
              <input id="supNome" placeholder="Ex.: Bortolaso" />
            </label>
            <label class="small">Apelidos (separados por vírgula)
              <input id="supAliases" placeholder="Ex.: Borto, Bortolaso Ltda" />
            </label>
          </div>
          <div class="btns">
            <button class="btn primary" id="btnAddSup" type="button">Adicionar</button>
            <button class="btn" id="btnUnificar" type="button">Unificar lançamentos</button>
          </div>
        </div>
        <div style="margin-top:12px">
          <div id="supList" class="sup-grid"></div>
        </div>
        <p class="muted" style="margin-top:10px">Dica: “Unificar lançamentos” substitui todos os nomes/variações pelos nomes cadastrados aqui.</p>
      `;
      q('main')?.appendChild(m);
    }
    // re-wire events
    qa('button[data-tab]').forEach(b=>{
      if(!b.getAttribute('type')) b.setAttribute('type','button');
      b.onclick = b.onclick || (()=>{});
    });
  })();

  // ---------- UI Lançamentos ----------
  function ensureTipoDiaField(){
    if(q('#tipoDia')) return;
    const container = q('#form')?.querySelector('.row2') || q('#form');
    if(!container) return;
    const label = document.createElement('label');
    label.className = 'small';
    label.innerHTML = `Tipo de dia
      <select id="tipoDia">
        <option value="util">Dia útil</option>
        <option value="sabado">Sábado (+50%)</option>
        <option value="domingo">Domingo/Feriado (+100%)</option>
      </select>`;
    container.appendChild(label);
  }
  function ensureFornecedorDatalist(){
    // cria um datalist para ajudar a padronizar
    if(!q('#fornList')){
      const dl = document.createElement('datalist'); dl.id='fornList';
      document.body.appendChild(dl);
      const inp = q('#fornecedor'); if(inp) inp.setAttribute('list','fornList');
    }
    const dl = q('#fornList');
    if(dl){
      dl.innerHTML = sups.map(s=> `<option value="${s.name}">`).join('');
    }
  }

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
      `;
      wrap.appendChild(card);
    });
  }
  function fillOFSelects(){
    const sel1 = q('#ofId'), sel2 = q('#selOF');
    const makeOpts = (includeAll)=>{
      let html = includeAll? `<option value="__ALL__">— Todas OFs —</option>` : '';
      ofs.forEach(of=> html += `<option value="${of.id}">${of.id} — ${of.cliente||''}</option>`);
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
  }

  // ---------- Lançamentos ----------
  const form = q('#form');
  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const of_id = q('#ofId')?.value;
      if(!of_id){ alert('Selecione uma OF.'); return; }
      const data = q('#data')?.value || '';
      const fornecedorRaw = (q('#fornecedor')?.value||'').trim();
      const fornecedor = canonicalSupplierName(fornecedorRaw);
      const materiais = num(q('#materiais')?.value||0);
      const profissionais = num(q('#profissionais')?.value||0);
      const ajudantes = num(q('#ajudantes')?.value||0);
      const almocoInput = num(q('#almoco')?.value||0); // ignorado se modo 'por_pessoa'
      const translado = num(q('#translado')?.value||0);
      const tipo_dia = (q('#tipoDia')?.value)||'util';

      lanc.push({ id:uid(), of_id, data, fornecedor, materiais, profissionais, ajudantes, almoco:almocoInput, translado, tipo_dia });
      ensureSupFromLanc();
      persistAll();
      form.reset();
      const td = q('#tipoDia'); if(td) td.value = tipo_dia; // mantém seleção
      alert('Lançamento adicionado.');
      renderAll();
    });
  }

  // ---------- Config ----------
  function ensureConfigUI(){
    const formCfg = q('#config .form') || q('#config');
    const addNum = (id, label, step='0.01')=>{
      if(q('#'+id)) return;
      const w = document.createElement('label'); w.className='small';
      w.innerHTML = `${label}<input type="number" id="${id}" step="${step}" min="0" />`;
      formCfg?.insertBefore(w, formCfg.querySelector('.btns') || formCfg.lastChild);
    };
    addNum('cfgProf','R$/profissional (dias úteis)');
    addNum('cfgAjud','R$/ajudante (dias úteis)');
    addNum('cfgAlmoco','R$/almoço (por pessoa)');
    addNum('cfgMultSab','Multiplicador sábado (ex.: 1.5)');
    addNum('cfgMultDom','Multiplicador domingo/feriado (ex.: 2.0)');

    if(!q('#cfgAlmocoMode')){
      const wrap = document.createElement('label'); wrap.className='small';
      wrap.innerHTML = `Almoço interpreta entrada como
        <select id="cfgAlmocoMode">
          <option value="por_pessoa">Por pessoa (ignora campo)</option>
          <option value="qtd">Quantidade de dias (qtd × pessoas × R$)</option>
          <option value="valor">Valor total (R$)</option>
        </select>`;
      formCfg?.insertBefore(wrap, formCfg.querySelector('.btns') || formCfg.lastChild);
    }

    // set values
    const setVal = (id, val)=>{ const el=q('#'+id); if(el) el.value = val }
    setVal('cfgProf', cfg.prof ?? 809);
    setVal('cfgAjud', cfg.ajud ?? 405);
    setVal('cfgAlmoco', cfg.almoco ?? 45);
    setVal('cfgMultSab', cfg.mult_sab ?? 1.5);
    setVal('cfgMultDom', cfg.mult_dom ?? 2.0);
    const im = q('#cfgAlmocoMode'); if(im) im.value = cfg.almoco_mode || 'por_pessoa';

    const btnSalvar = q('#btnSalvarCfg');
    if(btnSalvar){
      btnSalvar.onclick = ()=>{
        cfg.prof         = num(q('#cfgProf')?.value||0);
        cfg.ajud         = num(q('#cfgAjud')?.value||0);
        cfg.almoco       = num(q('#cfgAlmoco')?.value||0);
        cfg.mult_sab     = num(q('#cfgMultSab')?.value||1.5);
        cfg.mult_dom     = num(q('#cfgMultDom')?.value||2.0);
        cfg.almoco_mode  = (q('#cfgAlmocoMode')?.value)||'por_pessoa';
        persistCfg();
        renderAll();
      };
    }

    // Botão Exportar PDF (inserido na toolbar do dashboard, se existir)
    if(!q('#btnExportPDF')){
      const tb = q('.toolbar');
      if(tb){
        const b = document.createElement('button');
        b.id='btnExportPDF'; b.className='btn';
        b.textContent='Exportar PDF';
        b.onclick = ()=> window.print();
        tb.appendChild(b);
      }
    }
  }
  ensureConfigUI();

  // ---------- Fornecedores UI ----------
  function renderSupUI(){
    ensureSupFromLanc();
    const list = q('#supList'); if(!list) return;
    list.innerHTML = '';
    sups.forEach(s=>{
      const div = document.createElement('div');
      div.className='sup-item';
      div.innerHTML = `
        <div><b>${s.name}</b><div class="muted" style="font-size:12px">${(s.aliases||[]).join(', ')||'Sem apelidos'}</div></div>
        <div style="display:flex; gap:8px">
          <button class="btn" data-editsup="${s.id}" type="button">Editar</button>
          <button class="btn ghost" data-delsup="${s.id}" type="button">Excluir</button>
        </div>`;
      list.appendChild(div);
    });

    // add
    const btnAdd = q('#btnAddSup'), iNome=q('#supNome'), iAliases=q('#supAliases');
    if(btnAdd){
      btnAdd.onclick = ()=>{
        const name=(iNome?.value||'').trim(); if(!name) return alert('Informe o nome do fornecedor.');
        const al=(iAliases?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
        if(sups.some(x=> normalize(x.name)===normalize(name))) return alert('Fornecedor já cadastrado.');
        sups.push({id:uid(), name, aliases: al});
        persistSup(); iNome.value=''; iAliases.value=''; renderSupUI(); ensureFornecedorDatalist();
      };
    }

    // delete
    list.querySelectorAll('[data-delsup]').forEach(b=>{
      b.onclick = ()=>{
        const id=b.dataset.delsup;
        sups = sups.filter(s=> s.id!==id);
        persistSup(); renderSupUI(); ensureFornecedorDatalist();
      };
    });

    // edit (simples: repõe nos inputs para regravar)
    list.querySelectorAll('[data-editsup]').forEach(b=>{
      b.onclick = ()=>{
        const s = sups.find(x=>x.id===b.dataset.editsup);
        if(!s) return;
        q('#supNome').value = s.name;
        q('#supAliases').value = (s.aliases||[]).join(', ');
        // ao salvar, tratamos como "novo" e removemos antigo se o nome mudar
        sups = sups.filter(x=>x.id!==s.id);
        persistSup(); renderSupUI(); ensureFornecedorDatalist();
      };
    });

    // unificar
    const btnUni = q('#btnUnificar');
    if(btnUni){
      btnUni.onclick = ()=>{
        lanc.forEach(l=>{
          l.fornecedor = canonicalSupplierName(l.fornecedor||'');
        });
        persistLanc();
        alert('Lançamentos unificados pelos fornecedores cadastrados.');
        renderAll(); renderSupUI();
      };
    }
  }

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

  // ---------- CSV (backup simétrico) ----------
  // Cabeçalho único: of_id,data,fornecedor,materiais,profissionais,ajudantes,almoco,translado,tipo_dia
  const CSV_HEAD = ['of_id','data','fornecedor','materiais','profissionais','ajudantes','almoco','translado','tipo_dia'];

  const btnExportar = q('#btnExportar');
  if(btnExportar){
    btnExportar.onclick = ()=>{
      const rows = [CSV_HEAD];
      lanc.forEach(l=> rows.push([
        l.of_id, l.data, l.fornecedor||'',
        l.materiais, l.profissionais, l.ajudantes,
        l.almoco, l.translado, l.tipo_dia||'util'
      ]));
      const csv = rows.map(r=> r.map(v=>{
        const s = (v==null?'':String(v));
        return /[",;\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
      }).join(',')).join('\n');
      const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'adequacoes_civis_backup_v14.csv'; a.click();
    };
  }

  const inputCSV = q('#inputCSV');
  if(inputCSV){
    inputCSV.removeAttribute('accept'); // compat mobile
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
      const lines = txt.trim().split(/\r?\n/);
      if(!lines.length) return;
      const head = splitCsv(lines.shift());
      const map = CSV_HEAD.map(h=> head.indexOf(h));
      if(map.some(i=> i<0)){
        alert('Cabeçalho CSV inválido. Esperado: ' + CSV_HEAD.join(','));
        return;
      }
      const imported=[];
      lines.forEach(line=>{
        if(!line.trim()) return;
        const c = splitCsv(line);
        imported.push({
          id: uid(),
          of_id: c[map[0]].trim(),
          data: c[map[1]].trim(),
          fornecedor: canonicalSupplierName(c[map[2]].trim()),
          materiais: num(c[map[3]]),
          profissionais: num(c[map[4]]),
          ajudantes: num(c[map[5]]),
          almoco: num(c[map[6]]),
          translado: num(c[map[7]]),
          tipo_dia: (c[map[8]]||'util').trim().toLowerCase()
        });
      });
      lanc = imported; // backup total (substitui)
      ensureSupFromLanc();
      persistAll();
      alert('Backup restaurado com sucesso!');
      renderAll();
    }catch(err){
      console.error('Import CSV:', err);
      alert('Não foi possível importar o CSV.');
    }
  }
  function splitCsv(line){
    const out=[]; let cur=''; let q=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'){ if(q && line[i+1]==='"'){cur+='"'; i++;} else {q=!q;} }
      else if(ch===',' && !q){ out.push(cur); cur=''; }
      else cur+=ch;
    }
    out.push(cur);
    return out.map(s=>s.trim());
  }

  // ---------- Agregadores / Tabela / KPIs / Gráficos ----------
  function filtrarDados(){
    const sel = q('#selOF')?.value || '__ALL__';
    const de = q('#fDe')?.value || null;
    const ate = q('#fAte')?.value || null;
    const forn = (q('#fFornecedor')?.value||'').toLowerCase().trim();
    return lanc.filter(l=>{
      const okOF = (sel==='__ALL__') || (l.of_id===sel);
      const okData = (!de || l.data>=de) && (!ate || l.data<=ate);
      const okForn = !forn || (canonicalSupplierName(l.fornecedor||'').toLowerCase().includes(forn));
      return okOF && okData && okForn;
    }).sort((a,b)=>(a.data||'').localeCompare(b.data||''));
  }

  function renderTable(rows){
    const tb = q('#tabela tbody'); if(!tb) return; tb.innerHTML = '';
    rows.forEach((l)=>{
      const total = gastoLanc(l);
      const ppl = (+l.profissionais||0)+(+l.ajudantes||0);
      const mode = cfg.almoco_mode || 'por_pessoa';
      const almTotal = almocoTotalDe(l);
      const almInfo = (()=>{
        if(mode==='valor') return `${BRL.format(almTotal)}`;
        if(mode==='qtd')   return `${l.almoco||0} × ${ppl} × ${BRL.format(+cfg.almoco||0)} = ${BRL.format(almTotal)}`;
        return `${ppl} × ${BRL.format(+cfg.almoco||0)} = ${BRL.format(almTotal)}`;
      })();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${l.of_id||''}</td>
        <td>${l.data||''}</td>
        <td>${canonicalSupplierName(l.fornecedor||'')}</td>
        <td>${BRL.format(l.materiais||0)}</td>
        <td>${l.profissionais||0}</td>
        <td>${l.ajudantes||0}</td>
        <td>${almInfo}</td>
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
    const mo  = sum(rows, r=> {
      const f = fatorDia(r.tipo_dia||'util');
      return r.profissionais*(+cfg.prof||0)*f + r.ajudantes*(+cfg.ajud||0)*f;
    });
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
  }

  // gráficos: fornecedor soma apenas Materiais, usando nome canônico
  let chEvo=null, chCat=null, chForn=null;
  function renderCharts(rows){
    const byDate = {}; rows.forEach(r=>{ const k=r.data||'—'; byDate[k]=(byDate[k]||0)+gastoLanc(r); });
    const cat = {
      'Materiais': sum(rows, r=> +r.materiais||0),
      'Mão de Obra': sum(rows, r=> {
        const f = fatorDia(r.tipo_dia||'util');
        return r.profissionais*(+cfg.prof||0)*f + r.ajudantes*(+cfg.ajud||0)*f;
      }),
      'Indiretos': sum(rows, r=> almocoTotalDe(r) + (+r.translado||0)),
    };
    const byForn = {};
    rows.forEach(r=>{
      const valorMat = +r.materiais||0;
      const forn = canonicalSupplierName(r.fornecedor||'');
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
    ensureSupFromLanc();
    ensureFornecedorDatalist();
    fillOFSelects();
    const rows = filtrarDados();
    renderKpis(rows);
    renderCharts(rows);
    renderTable(rows);
  }

  // ---------- Seeds (opcionais) ----------
  if(ofs.length===0){
    ofs = [
      {id:'OF-2025-001', cliente:'Bortolaso', orcado:22100, desc:'Adequações civis — etapa 1'},
      {id:'OF-2025-002', cliente:'—', orcado:15000, desc:'Reservado'}
    ];
  }
  if(lanc.length===0){
    lanc = [
      {id:uid(), of_id:'6519481', data:'2025-09-19', fornecedor:'Bortolaso', materiais:20600, profissionais:4, ajudantes:2, almoco:0, translado:25, tipo_dia:'util'},
      {id:uid(), of_id:'6519481', data:'2025-09-21', fornecedor:'Bortolaso Ltda', materiais:0, profissionais:4, ajudantes:3, almoco:0, translado:25, tipo_dia:'domingo'},
    ];
  }
  ensureSupFromLanc();
  persistAll();
  renderOFs();
  renderAll();
});
