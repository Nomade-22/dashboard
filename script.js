// Dashboard Adequações Civis v1.4.6
// Fixes: translado capturado e refletido nas OFs; Orçado (OF) com máscara BRL correta;
// datas da dashboard exibidas em dd/mm/yyyy (tabela e gráficos).

document.addEventListener('DOMContentLoaded', () => {
  const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const KEY = 'adq_civis_lancamentos_v14';
  const CFG_KEY = 'adq_civis_cfg_v14_6';
  const OF_KEY = 'adq_civis_ofs_v11';
  const SUP_KEY = 'adq_civis_suppliers_v14';

  let cfg  = JSON.parse(localStorage.getItem(CFG_KEY) || JSON.stringify({
    prof: 809, ajud: 405, almoco: 45, almoco_mode: 'por_pessoa', mult_sab: 1.5, mult_dom: 2.0
  }));
  let lanc = JSON.parse(localStorage.getItem(KEY) || '[]');
  let ofs  = JSON.parse(localStorage.getItem(OF_KEY)  || '[]');
  let sups = JSON.parse(localStorage.getItem(SUP_KEY) || '[]');

  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const q  = (s)=>document.querySelector(s);
  const qa = (s)=>Array.from(document.querySelectorAll(s));
  const sum = (arr, pick)=> arr.reduce((s,o)=> s + (+pick(o)||0), 0);

  // Helpers num/BR date
  const num = (v)=>{ if(v==null) return 0; const s=String(v).replace(/\uFEFF/g,'').replace(/R\$\s?/gi,'').replace(/\./g,'').replace(/\s+/g,'').replace(',', '.'); const n=parseFloat(s); return isNaN(n)?0:n; };
  const fmtBRDate = (iso)=> {
    if(!iso) return '';
    // espera "yyyy-mm-dd"
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if(!m) return iso;
    return `${m[3]}/${m[2]}/${m[1]}`;
  };

  const normalize = (s)=> (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  function canonicalSupplierName(input){
    const clean = normalize(input); if(!clean) return '';
    for(const s of sups){ if(normalize(s.name)===clean) return s.name; if((s.aliases||[]).some(a=> normalize(a)===clean)) return s.name; }
    return (input||'').trim();
  }

  function persistAll(){ localStorage.setItem(KEY, JSON.stringify(lanc)); localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); localStorage.setItem(OF_KEY, JSON.stringify(ofs)); localStorage.setItem(SUP_KEY, JSON.stringify(sups)); }
  function persistLanc(){ localStorage.setItem(KEY, JSON.stringify(lanc)); }
  function persistCfg(){ localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }
  function persistOFs(){ localStorage.setItem(OF_KEY, JSON.stringify(ofs)); }
  function persistSup(){ localStorage.setItem(SUP_KEY, JSON.stringify(sups)); }

  function ensureSupFromLanc(){
    const names = [...new Set(lanc.map(l=> (l.fornecedor||'').trim()).filter(Boolean))];
    names.forEach(n=>{
      if(!sups.some(s=> normalize(s.name)===normalize(n))){
        sups.push({id: uid(), name: n, aliases: []});
      }
    });
    persistSup();
  }

  // Cálculos
  function fatorDia(tipo){ if(tipo==='sabado') return +cfg.mult_sab||1.5; if(tipo==='domingo') return +cfg.mult_dom||2.0; return 1; }
  function almocoTotalDe(l){
    const ppl=(+l.profissionais||0)+(+l.ajudantes||0);
    const v=+l.almoco||0;
    const mode=cfg.almoco_mode||'por_pessoa';
    if(mode==='valor') return v;
    if(mode==='qtd')   return v*ppl*(+cfg.almoco||0);
    return ppl*(+cfg.almoco||0);
  }
  function gastoLanc(l){
    const f=fatorDia(l.tipo_dia||'util');
    const mo=l.profissionais*(+cfg.prof||0)*f + l.ajudantes*(+cfg.ajud||0)*f;
    return (+l.materiais||0)+mo+almocoTotalDe(l)+(+l.translado||0);
  }

  // Tabs
  document.addEventListener('click', (ev)=>{
    const b = ev.target.closest('button[data-tab]'); if(!b) return;
    ev.preventDefault(); qa('.tab').forEach(t=>t.classList.remove('active'));
    const id=b.dataset.tab, tgt=q('#'+id); if(tgt) tgt.classList.add('active');
    if(id==='dashboard') renderAll();
    if(id==='lancamentos'){ ensureTipoDiaField(); ensureFornecedorDatalist(); fillOFSelects(); bindMoneyFields(); }
    if(id==='ofs'){ renderOFs(); fillOFSelects(); ensureResetBtn(); bindMoneyFields(); }
    if(id==='config'){ ensureConfigUI(true); bindMoneyFields(); }
    if(id==='fornecedores'){ renderSupUI(); }
  });

  // Injeta tab Fornecedores se faltar
  (function injectSuppliersTab(){
    if(!q('button[data-tab="fornecedores"]')){
      const tabs=q('.tabs'); if(tabs){ const btn=document.createElement('button'); btn.className='btn'; btn.dataset.tab='fornecedores'; btn.textContent='Fornecedores'; tabs.appendChild(btn); }
    }
    if(!q('#fornecedores')){
      const m=document.createElement('section'); m.id='fornecedores'; m.className='tab card';
      m.innerHTML=`
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
        <div style="margin-top:12px"><div id="supList" class="sup-grid"></div></div>
        <p class="muted" style="margin-top:10px">“Unificar lançamentos” substitui variações pelo nome cadastrado.</p>
      `;
      q('main')?.appendChild(m);
    }
  })();

  // Lançamentos UI
  function ensureTipoDiaField(){
    if(q('#tipoDia')) return;
    const container=q('#form')?.querySelector('.row2')||q('#form'); if(!container) return;
    const label=document.createElement('label'); label.className='small';
    label.innerHTML=`Tipo de dia
      <select id="tipoDia">
        <option value="util">Dia útil</option>
        <option value="sabado">Sábado (+50%)</option>
        <option value="domingo">Domingo/Feriado (+100%)</option>
      </select>`;
    container.appendChild(label);
  }
  function ensureFornecedorDatalist(){
    if(!q('#fornList')){ const dl=document.createElement('datalist'); dl.id='fornList'; document.body.appendChild(dl); const inp=q('#fornecedor'); if(inp) inp.setAttribute('list','fornList'); }
    const dl=q('#fornList'); if(dl) dl.innerHTML=sups.map(s=>`<option value="${s.name}">`).join('');
  }

  // === MÁSCARA BRL – compatível com type="number" ===
  function bindMoneyField(el){
    if(!el || el.dataset.moneyBound) return; 
    el.dataset.moneyBound='1';

    const isNumber = (el.type||'').toLowerCase()==='number';

    // Se for number: NÃO mascara (vírgula/“R$” quebram). Só garante step e mostra prévia no title.
    if(isNumber){
      if(!el.step) el.step = '0.01';
      el.addEventListener('blur', () => {
        const n = num(el.value||0);
        el.title = n ? n.toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2}) : '0,00';
      });
      return;
    }

    // type="text": máscara leve (sem "R$")
    const toPlain = ()=>{ 
      const v=num(el.value); 
      el.value = v || v===0 ? String(v).replace('.',',') : ''; 
    };
    const toBRL   = ()=>{ 
      const v=num(el.value); 
      el.value = v || v===0 ? v.toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2}) : ''; 
    };
    const sanitize = ()=>{
      let v=(el.value||'').replace(/[^\d,\.]/g,'');
      const lc=v.lastIndexOf(','); const ld=v.lastIndexOf('.');
      const p=Math.max(lc,ld);
      if(p>=0){
        const int=v.slice(0,p).replace(/[^\d]/g,'');
        const dec=v.slice(p+1).replace(/[^\d]/g,'').slice(0,2);
        v=int+(dec?','+dec:'');
      } else {
        v=v.replace(/[^\d]/g,'');
        if(v) v = v + ',00'; // ajuda no primeiro foco
      }
      el.value=v;
    };
    el.addEventListener('focus', toPlain);
    el.addEventListener('input', sanitize);
    el.addEventListener('blur', toBRL);
    if(el.value) toBRL();
  }
  function bindMoneyFields(){
    // inclui orçamento da OF, materiais, translado (ou transporte) e config
    ['#ofOrcado','#cfgProf','#cfgAjud','#cfgAlmoco','#materiais','#translado','#transporte'].forEach(sel=>{
      const el=q(sel); if(el) bindMoneyField(el);
    });
  }

  // OFs
  function renderOFs(){
    const wrap=q('#ofCards'); if(!wrap) return; wrap.innerHTML='';
    const mapG={}; lanc.forEach(l=>{ mapG[l.of_id]=(mapG[l.of_id]||0)+gastoLanc(l); });
    ofs.forEach(of=>{
      const gasto=mapG[of.id]||0, orc=+of.orcado||0, pct=orc>0?Math.min(100,(gasto/orc)*100):0, saldo=orc-gasto;
      const card=document.createElement('div'); card.className='card of-card';
      card.innerHTML=`
        <div class="head">
          <div><div style="font-weight:700">${of.id}</div><div class="muted">${of.cliente||''}</div></div>
          <div><span class="pill">Orçado: ${orc?BRL.format(orc):'—'}</span></div>
        </div>
        <div class="muted" style="margin-top:8px">${of.desc||'Sem descrição'}</div>
        <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
          <span class="pill">Gasto: <b>${BRL.format(gasto)}</b></span>
          <span class="pill ${saldo<0?'tag-danger':(pct>=80?'tag-warn':'')}">Saldo: <b>${BRL.format(saldo)}</b></span>
          <span class="pill">${pct.toFixed(0)}% consumido</span>
        </div>
        <div class="of-progress"><div class="of-bar" style="width:${pct}%;"></div></div>`;
      wrap.appendChild(card);
    });
    ensureResetBtn();
  }
  function ensureResetBtn(){
    if(!q('#btnResetOFs')){
      const cont=q('#ofs'); const holder=cont?.querySelector('.toolbar')||cont;
      if(holder){ const b=document.createElement('button'); b.id='btnResetOFs'; b.className='btn ghost'; b.textContent='Apagar todas as OFs'; holder.appendChild(b); }
    }
    const btn=q('#btnResetOFs');
    if(btn && !btn.dataset.bound){
      btn.dataset.bound='1';
      btn.onclick=()=>{ if(confirm('Excluir TODAS as OFs? (lançamentos não serão apagados; ficarão sem OF)')){ ofs=[]; persistOFs(); lanc.forEach(l=> l.of_id=''); persistLanc(); renderOFs(); fillOFSelects(); renderAll(); } };
    }
  }
  function fillOFSelects(){
    const sel1=q('#ofId'), sel2=q('#selOF'); const opts=(all)=>{ let h=all?`<option value="__ALL__">— Todas OFs —</option>`:''; ofs.forEach(of=> h+=`<option value="${of.id}">${of.id} — ${of.cliente||''}</option>`); return h; };
    if(sel1) sel1.innerHTML=opts(false);
    if(sel2){ sel2.innerHTML=opts(true); if(!sel2.value) sel2.value='__ALL__'; }
  }

  // Cadastro OF
  const formOF=q('#formOF');
  if(formOF){
    bindMoneyFields(); // garante máscara no ofOrcado
    formOF.addEventListener('submit',(e)=>{
      e.preventDefault();
      const id=(q('#ofNumero')?.value||'').trim(); if(!id) return alert('Informe o Nº/ID da OF.');
      if(ofs.some(o=>o.id===id)) return alert('Já existe uma OF com esse ID.');
      const cliente=(q('#ofCliente')?.value||'').trim();
      const orcado=num(q('#ofOrcado')?.value||0); // BRL -> número
      const desc=(q('#ofDesc')?.value||'').trim();
      ofs.push({id,cliente,orcado,desc}); persistOFs();
      formOF.reset(); renderOFs(); fillOFSelects();
      alert('OF cadastrada.');
    });
  }

  // Lançamentos
  const form=q('#form');
  if(form){
    bindMoneyFields();
    form.addEventListener('submit',(e)=>{
      e.preventDefault();
      const of_id=q('#ofId')?.value; if(!of_id) return alert('Selecione uma OF.');
      const data=q('#data')?.value||'';
      const fornecedor=canonicalSupplierName((q('#fornecedor')?.value||'').trim());
      const materiais=num(q('#materiais')?.value||0);
      const profissionais=parseInt((q('#profissionais')?.value||'').toString().replace(/\D/g,''))||0;
      const ajudantes=parseInt((q('#ajudantes')?.value||'').toString().replace(/\D/g,''))||0;
      const almocoInput=num(q('#almoco')?.value||0);
      // translado aceita #translado ou #transporte (compatibilidade)
      const transladoEl = q('#translado') || q('#transporte');
      const translado=num(transladoEl?.value||0);
      const tipo_dia=(q('#tipoDia')?.value)||'util';

      lanc.push({id:uid(), of_id, data, fornecedor, materiais, profissionais, ajudantes, almoco:almocoInput, translado, tipo_dia});
      ensureSupFromLanc(); persistAll(); form.reset();
      const td=q('#tipoDia'); if(td) td.value=tipo_dia;
      alert('Lançamento adicionado.'); renderAll();
    });
  }

  // Config
  function ensureConfigUI(forceOpen=false){
    const cont=q('#config'); if(!cont) return;
    let formCfg=cont.querySelector('.form'); if(!formCfg){ formCfg=document.createElement('div'); formCfg.className='form'; cont.appendChild(formCfg); }
    const addMoney=(id,lbl)=>{ if(q('#'+id)) return; const w=document.createElement('label'); w.className='small'; w.innerHTML=`${lbl}<input type="text" id="${id}" class="money" />`; formCfg.appendChild(w); };
    const addNumber=(id,lbl)=>{ if(q('#'+id)) return; const w=document.createElement('label'); w.className='small'; w.innerHTML=`${lbl}<input type="number" id="${id}" step="0.01" min="0" />`; formCfg.appendChild(w); };
    const addSelect=()=>{ if(q('#cfgAlmocoMode')) return; const w=document.createElement('label'); w.className='small'; w.innerHTML=`Almoço interpreta entrada como
      <select id="cfgAlmocoMode">
        <option value="por_pessoa">Por pessoa (ignora campo)</option>
        <option value="qtd">Quantidade de dias (qtd × pessoas × R$)</option>
        <option value="valor">Valor total (R$)</option>
      </select>`; formCfg.appendChild(w); };
    if(!q('#btnSalvarCfg')){ const btns=document.createElement('div'); btns.className='btns'; btns.innerHTML=`<button class="btn primary" id="btnSalvarCfg" type="button">Salvar</button>`; formCfg.appendChild(btns); }

    addMoney('cfgProf','R$/profissional (dias úteis)');
    addMoney('cfgAjud','R$/ajudante (dias úteis)');
    addMoney('cfgAlmoco','R$/almoço (por pessoa)');
    addNumber('cfgMultSab','Multiplicador sábado (ex.: 1,5)');
    addNumber('cfgMultDom','Multiplicador domingo/feriado (ex.: 2,0)');
    addSelect();

    const setM=(id,v)=>{ const el=q('#'+id); if(!el) return;
      const isNumber = (el.type||'').toLowerCase()==='number';
      if(isNumber){
        el.step = el.step || '0.01';
        el.value = Number.isFinite(+v) ? (+v).toFixed(2) : '0.00';
      } else {
        el.value = BRL.format(+v||0).replace(/^R\$\s?/, ''); // só valor, sem "R$"
        bindMoneyField(el);
      }
    };
    setM('cfgProf',cfg.prof); setM('cfgAjud',cfg.ajud); setM('cfgAlmoco',cfg.almoco);
    const ms=q('#cfgMultSab'); if(ms) ms.value=cfg.mult_sab??1.5;
    const md=q('#cfgMultDom'); if(md) md.value=cfg.mult_dom??2.0;
    const im=q('#cfgAlmocoMode'); if(im) im.value=cfg.almoco_mode||'por_pessoa';

    const btn=q('#btnSalvarCfg');
    if(btn && !btn.dataset.bound){
      btn.dataset.bound='1';
      btn.onclick=()=>{ cfg.prof=num(q('#cfgProf')?.value||0); cfg.ajud=num(q('#cfgAjud')?.value||0); cfg.almoco=num(q('#cfgAlmoco')?.value||0); cfg.mult_sab=parseFloat(q('#cfgMultSab')?.value||1.5); cfg.mult_dom=parseFloat(q('#cfgMultDom')?.value||2.0); cfg.almoco_mode=(q('#cfgAlmocoMode')?.value)||'por_pessoa'; persistCfg(); if(forceOpen) alert('Configurações salvas.'); renderAll(); };
    }
    if(!q('#btnExportPDF')){ const tb=q('.toolbar'); if(tb){ const b=document.createElement('button'); b.id='btnExportPDF'; b.className='btn'; b.textContent='Exportar PDF'; b.onclick=()=>window.print(); tb.appendChild(b); } }
  }

  // Fornecedores
  function renderSupUI(){
    ensureSupFromLanc();
    const list=q('#supList'); if(!list) return; list.innerHTML='';
    sups.forEach(s=>{
      const div=document.createElement('div'); div.className='sup-item';
      div.innerHTML=`<div><b>${s.name}</b><div class="muted" style="font-size:12px">${(s.aliases||[]).join(', ')||'Sem apelidos'}</div></div>
        <div style="display:flex; gap:8px"><button class="btn" data-editsup="${s.id}" type="button">Editar</button>
        <button class="btn ghost" data-delsup="${s.id}" type="button">Excluir</button></div>`;
      list.appendChild(div);
    });
    const btnAdd=q('#btnAddSup'), iNome=q('#supNome'), iAliases=q('#supAliases');
    if(btnAdd) btnAdd.onclick=()=>{ const name=(iNome?.value||'').trim(); if(!name) return alert('Informe o nome do fornecedor.'); const al=(iAliases?.value||'').split(',').map(s=>s.trim()).filter(Boolean); if(sups.some(x=> normalize(x.name)===normalize(name))) return alert('Fornecedor já cadastrado.'); sups.push({id:uid(), name, aliases:al}); persistSup(); iNome.value=''; iAliases.value=''; renderSupUI(); ensureFornecedorDatalist(); };
    list.querySelectorAll('[data-delsup]').forEach(b=>{
      b.onclick=()=>{ const id=b.dataset.delsup; const s=sups.find(x=>x.id===id); sups=sups.filter(x=>x.id!==id); persistSup();
        if(s){ const all=[s.name,...(s.aliases||[])].map(x=>normalize(x)); lanc.forEach(l=>{ if(all.includes(normalize(l.fornecedor||''))) l.fornecedor=''; }); persistLanc(); }
        renderSupUI(); ensureFornecedorDatalist(); renderAll();
      };
    });
    list.querySelectorAll('[data-editsup]').forEach(b=>{
      b.onclick=()=>{ const s=sups.find(x=>x.id===b.dataset.editsup); if(!s) return; q('#supNome').value=s.name; q('#supAliases').value=(s.aliases||[]).join(', '); sups=sups.filter(x=>x.id!==s.id); persistSup(); renderSupUI(); ensureFornecedorDatalist(); };
    });
    const btnUni=q('#btnUnificar');
    if(btnUni) btnUni.onclick=()=>{ lanc.forEach(l=>{ l.fornecedor=canonicalSupplierName(l.fornecedor||''); }); persistLanc(); alert('Lançamentos unificados pelos fornecedores cadastrados.'); renderAll(); renderSupUI(); };
  }

  // Filtros
  const btnFiltrar=q('#btnFiltrar'); if(btnFiltrar) btnFiltrar.onclick=()=> renderAll();
  const btnLimpar=q('#btnLimpar');
  if(btnLimpar){
    btnLimpar.onclick=()=>{
      const de=q('#fDe'); const ate=q('#fAte'); const forn=q('#fFornecedor'); const sel=q('#selOF');
      if(de) de.value=''; if(ate) ate.value=''; if(forn) forn.value='';
      if(sel) sel.value='__ALL__';
      renderAll();
    };
  }

  // CSV backup simétrico
  const CSV_HEAD=['of_id','data','fornecedor','materiais','profissionais','ajudantes','almoco','translado','tipo_dia'];
  const btnExportar=q('#btnExportar');
  if(btnExportar){
    btnExportar.onclick=()=>{
      const rows=[CSV_HEAD];
      lanc.forEach(l=> rows.push([l.of_id,l.data,l.fornecedor||'',l.materiais,l.profissionais,l.ajudantes,l.almoco,l.translado,l.tipo_dia||'util']));
      const csv=rows.map(r=> r.map(v=>{ const s=(v==null?'':String(v)); return /[",;\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }).join(',')).join('\n');
      const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='adequacoes_civis_backup_v14.csv'; a.click();
    };
  }
  const inputCSV=q('#inputCSV');
  if(inputCSV){
    inputCSV.removeAttribute('accept');
    inputCSV.addEventListener('change', async (e)=>{ const file=e.target.files[0]; if(!file) return; await handleCsvFile(file); inputCSV.value=''; });
  }
  async function handleCsvFile(file){
    try{
      let txt=await file.text(); if(txt.charCodeAt(0)===0xFEFF) txt=txt.slice(1);
      const lines=txt.trim().split(/\r?\n/); if(!lines.length) return;
      const head=splitCsv(lines.shift()); const map=CSV_HEAD.map(h=> head.indexOf(h)); if(map.some(i=> i<0)){ alert('Cabeçalho CSV inválido. Esperado: '+CSV_HEAD.join(',')); return; }
      const imported=[]; lines.forEach(line=>{ if(!line.trim()) return; const c=splitCsv(line); imported.push({
        id:uid(), of_id:c[map[0]].trim(), data:c[map[1]].trim(), fornecedor:canonicalSupplierName(c[map[2]].trim()),
        materiais:num(c[map[3]]), profissionais:parseInt((c[map[4]]||'').toString().replace(/\D/g,''))||0,
        ajudantes:parseInt((c[map[5]]||'').toString().replace(/\D/g,''))||0, almoco:num(c[map[6]]),
        translado:num(c[map[7]]), tipo_dia:(c[map[8]]||'util').trim().toLowerCase()
      }); });
      lanc=imported; ensureSupFromLanc(); persistAll(); alert('Backup restaurado com sucesso!'); renderAll();
    }catch(err){ console.error('Import CSV:', err); alert('Não foi possível importar o CSV.'); }
  }
  function splitCsv(line){ const out=[]; let cur=''; let qd=false; for(let i=0;i<line.length;i++){ const ch=line[i]; if(ch==='"'){ if(qd && line[i+1]==='"'){cur+='"'; i++;} else qd=!qd; } else if(ch===',' && !qd){ out.push(cur); cur=''; } else cur+=ch; } out.push(cur); return out.map(s=>s.trim()); }

  // Dados filtrados
  function filtrarDados(){
    const sel=q('#selOF')?.value||'__ALL__'; const de=q('#fDe')?.value||null; const ate=q('#fAte')?.value||null; const forn=(q('#fFornecedor')?.value||'').toLowerCase().trim();
    return lanc.filter(l=>{
      const okOF=(sel==='__ALL__') || (l.of_id===sel);
      const okData=(!de || (l.data && l.data>=de)) && (!ate || (l.data && l.data<=ate));
      const okForn=!forn || (canonicalSupplierName(l.fornecedor||'').toLowerCase().includes(forn));
      return okOF && okData && okForn;
    }).sort((a,b)=>(a.data||'').localeCompare(b.data||''));
  }

  // Tabela (datas em dd/mm/yyyy)
  function renderTable(rows){
    const tb=q('#tabela tbody'); if(!tb) return; tb.innerHTML='';
    rows.forEach(l=>{
      const total=gastoLanc(l), ppl=(+l.profissionais||0)+(+l.ajudantes||0), mode=cfg.almoco_mode||'por_pessoa', almTotal=almocoTotalDe(l);
      const almInfo=(mode==='valor')?`${BRL.format(almTotal)}`:(mode==='qtd')?`${l.almoco||0} × ${ppl} × ${BRL.format(+cfg.almoco||0)} = ${BRL.format(almTotal)}`:`${ppl} × ${BRL.format(+cfg.almoco||0)} = ${BRL.format(almTotal)}`;
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${l.of_id||''}</td><td>${fmtBRDate(l.data)||''}</td><td>${canonicalSupplierName(l.fornecedor||'')}</td><td>${BRL.format(l.materiais||0)}</td><td>${l.profissionais||0}</td><td>${l.ajudantes||0}</td><td>${almInfo}</td><td>${BRL.format(l.translado||0)}</td><td><b>${BRL.format(total)}</b></td><td><button class="btn ghost" data-delid="${l.id||''}" type="button">Excluir</button></td>`;
      tb.appendChild(tr);
    });
    tb.querySelectorAll('button[data-delid]').forEach(b=>{
      b.onclick=()=>{ const id=b.getAttribute('data-delid'); const idx=lanc.findIndex(x=>x.id===id); if(idx>=0 && confirm('Remover este lançamento?')){ lanc.splice(idx,1); persistLanc(); renderAll(); } };
    });
  }

  // KPIs
  function renderKpis(rows){
    const mat=sum(rows, r=> +r.materiais||0);
    const mo=sum(rows, r=>{ const f=fatorDia(r.tipo_dia||'util'); return r.profissionais*(+cfg.prof||0)*f + r.ajudantes*(+cfg.ajud||0)*f; });
    const ind=sum(rows, r=> almocoTotalDe(r) + (+r.translado||0));
    const total=mat+mo+ind;
    const set=(sel,v)=>{ const el=q(sel); if(el) el.textContent=v; };
    set('#kpiMateriais', BRL.format(mat)); set('#kpiMO', BRL.format(mo)); set('#kpiIndiretos', BRL.format(ind)); set('#kpiTotal', BRL.format(total));
    set('#kpiRegistros', rows.length?`${rows.length} registros`:'Sem registros'); set('#kpiHh', `${sum(rows, r=> r.profissionais + r.ajudantes)} pessoas·dia`); set('#kpiIndPct', `Indiretos ${total?(ind/total*100).toFixed(1):0}%`);

    const pillOrcado=q('#pillOrcado'), pillSaldo=q('#pillSaldo');
    if(pillOrcado && pillSaldo){
      const sel=q('#selOF')?.value||'__ALL__'; let orcado=0, gastoOF=0;
      if(sel!=='__ALL__'){ const of=ofs.find(o=>o.id===sel); orcado=of?(+of.orcado||0):0; gastoOF=sum(lanc.filter(l=>l.of_id===sel), l=>gastoLanc(l)); }
      else{ orcado=sum(ofs, o=> +o.orcado||0); gastoOF=sum(lanc, l=> gastoLanc(l)); }
      const saldo=orcado-gastoOF; pillOrcado.textContent=`Orçado: ${orcado?BRL.format(orcado):'—'}`; pillSaldo.textContent=`Saldo: ${BRL.format(saldo)}`;
      pillSaldo.classList.remove('tag-warn','tag-danger');
      if(orcado>0){ const p=gastoOF/orcado; if(saldo<0) pillSaldo.classList.add('tag-danger'); else if(p>=0.8) pillSaldo.classList.add('tag-warn'); }
    }
  }

  // Gráficos (datas dd/mm/yyyy nos labels)
  let chEvo=null, chCat=null, chForn=null;
  function renderCharts(rows){
    // agrupa por data (chave ISO) para manter ordenação depois formata
    const byDateRaw={}; rows.forEach(r=>{ const k=r.data||'—'; byDateRaw[k]=(byDateRaw[k]||0)+gastoLanc(r); });
    const dates = Object.keys(byDateRaw).sort(); // ISO ordena naturalmente
    const labels = dates.map(d => d==='—' ? '—' : fmtBRDate(d));
    const series = dates.map(d => byDateRaw[d]);

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
      const vm=+r.materiais||0;
      const forn=canonicalSupplierName(r.fornecedor||'');
      if(vm>0&&forn){ byForn[forn]=(byForn[forn]||0)+vm; }
    });

    [chEvo,chCat,chForn].forEach(ch=> ch && ch.destroy());
    const e1=q('#graficoEvolucao'); if(e1){
      chEvo = new Chart(e1.getContext('2d'), { type:'line',
        data:{ labels, datasets:[{ label:'Total por dia', data:series, tension:.25 }]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ ticks:{ callback:v=>BRL.format(v) } } } }
      });
    }
    const e2=q('#graficoCategorias'); if(e2){
      chCat = new Chart(e2.getContext('2d'), { type:'doughnut',
        data:{ labels:Object.keys(cat), datasets:[{ data:Object.values(cat) }]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' } } }
      });
    }
    const e3=q('#graficoFornecedores'); if(e3){
      chForn = new Chart(e3.getContext('2d'), { type:'bar',
        data:{ labels:Object.keys(byForn), datasets:[{ label:'Materiais por fornecedor', data:Object.values(byForn) }]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ ticks:{ callback:v=>BRL.format(v) } } } }
      });
    }
  }

  function renderAll(){
    ensureSupFromLanc();
    ensureFornecedorDatalist();
    fillOFSelects();
    bindMoneyFields();
    const rows=filtrarDados();
    renderKpis(rows);
    renderCharts(rows);
    renderTable(rows);
  }

  // Seeds (só pra não ficar vazio em ambiente novo)
  if(ofs.length===0){
    ofs=[ {id:'OF-2025-001', cliente:'Bortolaso', orcado:22100, desc:'Adequações civis — etapa 1'},
          {id:'OF-2025-002', cliente:'—', orcado:15000, desc:'Reservado'} ];
  }
  if(lanc.length===0){
    lanc=[ {id:uid(), of_id:'6519481', data:'2025-09-19', fornecedor:'Bortolaso', materiais:20600, profissionais:4, ajudantes:2, almoco:0, translado:250, tipo_dia:'util'},
           {id:uid(), of_id:'6519481', data:'2025-09-21', fornecedor:'Bortolaso Ltda', materiais:0, profissionais:4, ajudantes:3, almoco:0, translado:180, tipo_dia:'domingo'} ];
  }

  persistAll();
  renderOFs();
  renderAll();
});
