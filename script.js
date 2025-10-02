// Dashboard Adequações Civis v3.3
// – Máscara BRL com buffer de dígitos
// – Lançamentos editáveis (inline via formulário)
// – CSV simétrico
// – Aba Fornecedores
// – Integração Google Sheets (URL/Token, Testar, Carregar, Sincronizar)
// – Gráficos mobile compactos

document.addEventListener('DOMContentLoaded', () => {
  const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

  const KEY     = 'adq_civis_lancamentos_v14';
  const CFG_KEY = 'adq_civis_cfg_v14_6';
  const OF_KEY  = 'adq_civis_ofs_v11';
  const SUP_KEY = 'adq_civis_suppliers_v14';

  let cfg  = JSON.parse(localStorage.getItem(CFG_KEY) || JSON.stringify({
    prof: 809, ajud: 405, almoco: 45, almoco_mode: 'por_pessoa', mult_sab: 1.5, mult_dom: 2.0,
    sheets_url:'', sheets_token:''
  }));
  let lanc = JSON.parse(localStorage.getItem(KEY) || '[]');
  let ofs  = JSON.parse(localStorage.getItem(OF_KEY)  || '[]');
  let sups = JSON.parse(localStorage.getItem(SUP_KEY) || '[]');

  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const q  = (s)=>document.querySelector(s);
  const qa = (s)=>Array.from(document.querySelectorAll(s));
  const sum = (arr, pick)=> arr.reduce((s,o)=> s + (+pick(o)||0), 0);

  const num = (v)=>{ 
    if(v==null) return 0; 
    const s=String(v).replace(/\uFEFF/g,'').replace(/R\$\s?/gi,'').replace(/\./g,'').replace(/\s+/g,'').replace(',', '.');
    const n=parseFloat(s); return isNaN(n)?0:n; 
  };
  const fmtBRDate = (iso)=> {
    if(!iso) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
  };

  const normalize = (s)=> (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  function canonicalSupplierName(input){
    const clean = normalize(input); if(!clean) return (input||'').trim();
    for(const s of sups){ 
      if(normalize(s.name)===clean) return s.name; 
      if((s.aliases||[]).some(a=> normalize(a)===clean)) return s.name; 
    }
    return (input||'').trim();
  }

  const persistAll = ()=>{ 
    localStorage.setItem(KEY, JSON.stringify(lanc)); 
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); 
    localStorage.setItem(OF_KEY, JSON.stringify(ofs)); 
    localStorage.setItem(SUP_KEY, JSON.stringify(sups)); 
  };
  const persistLanc=()=>localStorage.setItem(KEY, JSON.stringify(lanc));
  const persistCfg =()=>localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  const persistOFs =()=>localStorage.setItem(OF_KEY, JSON.stringify(ofs));
  const persistSup =()=>localStorage.setItem(SUP_KEY, JSON.stringify(sups));

  // ==== Cálculos
  function fatorDia(tipo){ 
    if(tipo==='sabado') return +cfg.mult_sab||1.5; 
    if(tipo==='domingo') return +cfg.mult_dom||2.0; 
    return 1; 
  }
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

  // ==== Tabs
  document.addEventListener('click', (ev)=>{
    const b = ev.target.closest('button[data-tab]'); if(!b) return;
    ev.preventDefault(); qa('.tab').forEach(t=>t.classList.remove('active'));
    const id=b.dataset.tab, tgt=q('#'+id); if(tgt) tgt.classList.add('active');
    if(id==='dashboard') renderAll();
    if(id==='lancamentos'){ fillOFSelects(true); ensureFornecedorDatalist(); bindMoneyFields(); }
    if(id==='ofs'){ renderOFs(); fillOFSelects(true); bindMoneyFields(); }
    if(id==='config'){ ensureConfigUI(); bindMoneyFields(); }
    if(id==='fornecedores'){ renderSupUI(); }
  });

  // ==== Fornecedores (injeta tab + UI)
  (function injectSuppliersTab(){
    const tabs=q('.tabs');
    if(tabs && !tabs.querySelector('[data-tab="fornecedores"]')){
      const btn=document.createElement('button');
      btn.className='btn'; btn.dataset.tab='fornecedores'; btn.textContent='Fornecedores';
      tabs.appendChild(btn);
    }
    if(!q('#fornecedores')){
      const sec=document.createElement('section'); sec.id='fornecedores'; sec.className='tab card';
      sec.innerHTML=`
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
      q('main')?.appendChild(sec);
    }
  })();
  function renderSupUI(){
    const list=q('#supList'); if(!list) return; list.innerHTML='';
    sups.forEach(s=>{
      const div=document.createElement('div'); div.className='sup-item';
      div.innerHTML=`<div><b>${s.name}</b><div class="muted" style="font-size:12px">${(s.aliases||[]).join(', ')||'Sem apelidos'}</div></div>
        <div style="display:flex; gap:8px"><button class="btn" data-editsup="${s.id}" type="button">Editar</button>
        <button class="btn ghost" data-delsup="${s.id}" type="button">Excluir</button></div>`;
      list.appendChild(div);
    });
    const btnAdd=q('#btnAddSup'), iNome=q('#supNome'), iAliases=q('#supAliases');
    if(btnAdd) btnAdd.onclick=()=>{ 
      const name=(iNome?.value||'').trim(); 
      if(!name) return alert('Informe o nome do fornecedor.'); 
      const al=(iAliases?.value||'').split(',').map(s=>s.trim()).filter(Boolean); 
      if(sups.some(x=> normalize(x.name)===normalize(name))) return alert('Fornecedor já cadastrado.'); 
      sups.push({id:uid(), name, aliases:al}); 
      persistSup(); iNome.value=''; iAliases.value=''; renderSupUI(); ensureFornecedorDatalist(); 
    };
    list.querySelectorAll('[data-delsup]').forEach(b=>{
      b.onclick=()=>{ 
        const id=b.dataset.delsup; 
        const s=sups.find(x=>x.id===id);
        sups=sups.filter(x=>x.id!==id); persistSup();
        // limpa fornecedor dos lançamentos que tinham esse nome/aliases
        if(s){ const all=[s.name,...(s.aliases||[])].map(x=>normalize(x));
          lanc.forEach(l=>{ if(all.includes(normalize(l.fornecedor||''))) l.fornecedor=''; }); persistLanc(); }
        renderSupUI(); ensureFornecedorDatalist(); renderAll();
      };
    });
    list.querySelectorAll('[data-editsup]').forEach(b=>{
      b.onclick=()=>{ 
        const s=sups.find(x=>x.id===b.dataset.editsup); if(!s) return;
        q('#supNome').value=s.name; q('#supAliases').value=(s.aliases||[]).join(', ');
        sups=sups.filter(x=>x.id!==s.id); persistSup(); renderSupUI(); ensureFornecedorDatalist();
      };
    });
    const btnUni=q('#btnUnificar');
    if(btnUni) btnUni.onclick=()=>{ 
      lanc.forEach(l=>{ l.fornecedor=canonicalSupplierName(l.fornecedor||''); }); 
      persistLanc(); alert('Lançamentos unificados pelos fornecedores cadastrados.'); renderAll(); renderSupUI(); 
    };
  }
  function ensureFornecedorDatalist(){
    const dl=q('#fornList'); if(!dl) return;
    dl.innerHTML=sups.map(s=>`<option value="${s.name}">`).join('');
    const inpLanc=q('#fornecedor'); if(inpLanc) inpLanc.setAttribute('list','fornList');
    const inpFiltro=q('#fFornecedor'); if(inpFiltro) inpFiltro.setAttribute('list','fornList');
  }

  // ==== Máscara BRL com buffer
  function forceTextInput(el){
    if(!el) return el;
    if((el.type||'').toLowerCase() === 'text') return el;
    try{ el.type = 'text'; return el; }
    catch{
      const rep = el.cloneNode(true);
      rep.setAttribute('type', 'text');
      el.replaceWith(rep);
      return rep;
    }
  }
  const onlyDigits = (v)=> (v||'').replace(/\D/g,'');
  function brlFormatFromDigits(digs){
    if(!digs) digs='0';
    digs = digs.replace(/^0+(?=\d)/,'');
    if(digs.length===1) digs='0'+digs;
    const int = digs.slice(0, -2) || '0';
    const dec = digs.slice(-2);
    const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${intFmt},${dec}`;
  }
  function moneyMaskBind(el){
    if(!el) return;
    el = forceTextInput(el);
    if(el.dataset.moneyBound) return; el.dataset.moneyBound='1';
    let digs = onlyDigits(el.value) || '0';
    el.value = brlFormatFromDigits(digs);
    function caretEnd(){ try{ el.selectionStart = el.selectionEnd = el.value.length; }catch{} }
    el.addEventListener('keydown', ev=> el.dataset.lastKey = ev.key || '' );
    el.addEventListener('input', ev=>{
      const t = ev.inputType || ''; const k = el.dataset.lastKey || ''; const data = ev.data || '';
      if(t==='deleteContentBackward' || k==='Backspace'){ digs = digs.slice(0,-1)||'0'; }
      else if(t==='deleteContentForward' || k==='Delete'){ digs = digs.slice(0,-1)||'0'; }
      else if(t==='insertFromPaste'){
        const pasted = (ev.clipboardData && ev.clipboardData.getData('text')) || el.value;
        const pd = onlyDigits(pasted); digs = pd || '0';
      } else if(t==='insertText'){
        if(/\d/.test(data)){ digs = (digs==='0' ? data : digs + data); }
      } else { digs = onlyDigits(el.value) || '0'; }
      if(digs.length>15) digs = digs.slice(0,15);
      el.value = brlFormatFromDigits(digs); caretEnd();
    });
    el.addEventListener('blur', ()=> el.value = brlFormatFromDigits(digs));
  }
  function bindMoneyFields(){
    ['#materiais','#almoco','#translado','#ofOrcado','#cfgProf','#cfgAjud','#cfgAlmoco']
      .forEach(sel=>{ const el=q(sel); if(el) moneyMaskBind(el); });
  }

  // ==== OFs
  function fillOFSelects(preserve=true){
    const sel1=q('#ofId'), sel2=q('#selOF'); 
    const buildOpts=(all)=>{ 
      let h=all?`<option value="__ALL__">— Todas OFs —</option>`:''; 
      ofs.forEach(of=> h+=`<option value="${of.id}">${of.id} — ${of.cliente||''}</option>`); 
      return h; 
    };
    if(sel1){ const cur=preserve?sel1.value:''; sel1.innerHTML=buildOpts(false); if(preserve && cur && [...sel1.options].some(o=>o.value===cur)) sel1.value=cur; }
    if(sel2){ const cur=preserve?sel2.value:''; sel2.innerHTML=buildOpts(true); if(preserve && cur && [...sel2.options].some(o=>o.value===cur)) sel2.value=cur; else if(!sel2.value) sel2.value='__ALL__'; }
  }
  function renderOFs(){
    const wrap=q('#ofCards'); if(!wrap) return; wrap.innerHTML='';
    const mapG={}; lanc.forEach(l=>{ mapG[l.of_id]=(mapG[l.of_id]||0)+gastoLanc(l); });
    ofs.forEach(of=>{
      const gasto=mapG[of.id]||0, orc=+of.orcado||0, pct=orc>0?Math.min(100,(gasto/orc)*100):0, saldo=orc-gasto;
      const card=document.createElement('div'); card.className='of-card card';
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

    const btn=q('#btnResetOFs');
    if(btn && !btn.dataset.bound){
      btn.dataset.bound='1';
      btn.onclick=()=>{ 
        if(confirm('Excluir TODAS as OFs? (lançamentos não serão apagados; ficarão sem OF)')){
          ofs=[]; persistOFs(); lanc.forEach(l=> l.of_id=''); persistLanc(); renderOFs(); fillOFSelects(true); renderAll(); 
        } 
      };
    }
  }
  const formOF=q('#formOF');
  if(formOF){
    bindMoneyFields();
    formOF.addEventListener('submit',(e)=>{
      e.preventDefault();
      const id=(q('#ofNumero')?.value||'').trim(); if(!id) return alert('Informe o Nº/ID da OF.');
      if(ofs.some(o=>o.id===id)) return alert('Já existe uma OF com esse ID.');
      const cliente=(q('#ofCliente')?.value||'').trim();
      const orcado=num(q('#ofOrcado')?.value||0);
      const desc=(q('#ofDesc')?.value||'').trim();
      ofs.push({id,cliente,orcado,desc}); persistOFs();
      formOF.reset(); renderOFs(); fillOFSelects(true);
      alert('OF cadastrada.');
    });
  }

  // ==== Lançamentos (CRUD com edição)
  const form=q('#form');
  let editId=null;
  function enterEdit(l){
    editId = l.id;
    q('#formTitle').textContent='Editar Lançamento';
    q('#btnSalvarLanc').textContent='Salvar';
    q('#btnCancelarEdit').style.display='';
    q('[data-tab="lancamentos"]').click?.();
    q('#editId').value=l.id;
    q('#ofId').value=l.of_id;
    q('#data').value=l.data||'';
    q('#fornecedor').value=l.fornecedor||'';
    q('#materiais').value = BRL.format(+l.materiais||0);
    q('#profissionais').value=l.profissionais||0;
    q('#ajudantes').value=l.ajudantes||0;
    q('#almoco').value = BRL.format(+l.almoco||0);
    q('#translado').value = BRL.format(+l.translado||0);
    q('#tipoDia').value=l.tipo_dia||'util';
    bindMoneyFields();
  }
  function leaveEdit(){
    editId = null;
    q('#editId').value='';
    q('#formTitle').textContent='Novo Lançamento';
    q('#btnSalvarLanc').textContent='Adicionar';
    q('#btnCancelarEdit').style.display='none';
    form.reset();
  }
  if(form){
    bindMoneyFields();
    form.addEventListener('reset', ()=> { setTimeout(leaveEdit, 0); });
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const of_id=q('#ofId')?.value; if(!of_id) return alert('Selecione uma OF.');
      const data=q('#data')?.value||'';
      const fornecedor=canonicalSupplierName((q('#fornecedor')?.value||'').trim());
      const materiais=num(q('#materiais')?.value||0);
      const profissionais=parseInt((q('#profissionais')?.value||'').toString().replace(/\D/g,''))||0;
      const ajudantes=parseInt((q('#ajudantes')?.value||'').toString().replace(/\D/g,''))||0;
      const almocoInput=num(q('#almoco')?.value||0);
      const translado=num((q('#translado')?.value)||0);
      const tipo_dia=(q('#tipoDia')?.value)||'util';

      if(editId){
        const i = lanc.findIndex(x=>x.id===editId);
        if(i>=0){
          lanc[i] = { ...lanc[i], of_id, data, fornecedor, materiais, profissionais, ajudantes, almoco:almocoInput, translado, tipo_dia };
          persistLanc();
          // upsert remoto
          try{ await sheetsPost('upsert_lanc', { lanc:lanc[i] }); }catch(e){ console.warn('upsert_lanc falhou:', e.message); }
        }
        leaveEdit();
        alert('Lançamento atualizado.');
      }else{
        const item={id:uid(), of_id, data, fornecedor, materiais, profissionais, ajudantes, almoco:almocoInput, translado, tipo_dia};
        lanc.push(item); persistAll();
        try{ await sheetsPost('upsert_lanc', { lanc:item }); }catch(e){ console.warn('upsert_lanc falhou:', e.message); }
        form.reset();
        alert('Lançamento adicionado.');
      }
      ensureFornecedorDatalist();
      renderAll();
    });
  }

  // ==== Filtros
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

  // ==== CSV (simétrico)
  const CSV_HEAD=['of_id','data','fornecedor','materiais','profissionais','ajudantes','almoco','translado','tipo_dia'];
  function exportCsvLancamentos(filename='adequacoes_civis_lancamentos.csv'){
    const rows=[CSV_HEAD];
    lanc.forEach(l=> rows.push([l.of_id,l.data,l.fornecedor||'',l.materiais,l.profissionais,l.ajudantes,l.almoco,l.translado,l.tipo_dia||'util']));
    const csv=rows.map(r=> r.map(v=>{ const s=(v==null?'':String(v)); return /[",;\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); 
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
  }
  const btnExportar=q('#btnExportar');
  if(btnExportar){ btnExportar.onclick=()=> exportCsvLancamentos(); }
  const inputCSV=q('#inputCSV');
  if(inputCSV){
    inputCSV.addEventListener('change', async (e)=>{ 
      const file=e.target.files[0]; if(!file) return; 
      await importFromCsvFile(file); inputCSV.value=''; 
    });
  }
  async function importFromCsvFile(file){
    try{
      const raw = await file.text();
      await importFromCsvText(raw);
      alert('CSV importado com sucesso!');
      ensureFornecedorDatalist();
      renderAll();
    }catch(err){
      console.error('Import CSV:', err);
      alert('Não foi possível importar o arquivo CSV.');
    }
  }
  async function importFromCsvText(txt){
    let t = stripBom(txt).replace(/\r/g,'');
    const lines=t.split('\n'); if(!lines.length) return;
    while(lines.length && !lines[0].trim()) lines.shift();
    const head = splitCsv(lines.shift() || '');
    if (!CSV_HEAD.every(h=> head.includes(h))){ throw new Error('Cabeçalho CSV inválido (esperado: '+CSV_HEAD.join(',')+')'); }
    const map = CSV_HEAD.map(h=> head.indexOf(h));
    const imported=[];
    for(const line of lines){
      if(line==='' || !line.trim()) continue;
      const c=splitCsv(line), get=(idx)=> (idx>=0 && idx<c.length)? c[idx] : '';
      imported.push({
        id:uid(),
        of_id:(get(map[0])||'').trim(),
        data:(get(map[1])||'').trim(),
        fornecedor: canonicalSupplierName((get(map[2])||'').trim()),
        materiais:num(get(map[3])),
        profissionais:parseInt((get(map[4])||'0').toString().replace(/\D/g,''))||0,
        ajudantes:parseInt((get(map[5])||'0').toString().replace(/\D/g,''))||0,
        almoco:num(get(map[6])),
        translado:num(get(map[7])),
        tipo_dia:(get(map[8])||'util').trim().toLowerCase()
      });
    }
    lanc=imported; persistAll();
  }
  function stripBom(s){ if(!s) return s; return s.charCodeAt(0)===0xFEFF ? s.slice(1) : s; }
  function splitCsv(line){
    const out=[]; let cur=''; let qd=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'){ if(qd && line[i+1]==='"'){ cur+='"'; i++; } else qd=!qd; }
      else if(ch===',' && !qd){ out.push(cur); cur=''; }
      else cur+=ch;
    }
    out.push(cur);
    return out.map(s=>s.trim());
  }

  // ==== Tabela
  function filtrarDados(){
    const sel=q('#selOF')?.value||'__ALL__'; 
    const de=q('#fDe')?.value||null; 
    const ate=q('#fAte')?.value||null; 
    const forn=(q('#fFornecedor')?.value||'').toLowerCase().trim();
    return lanc.filter(l=>{
      const okOF=(sel==='__ALL__') || (l.of_id===sel);
      const okData=(!de || (l.data && l.data>=de)) && (!ate || (l.data && l.data<=ate));
      const okForn=!forn || (canonicalSupplierName(l.fornecedor||'').toLowerCase().includes(forn));
      return okOF && okData && okForn;
    }).sort((a,b)=>(a.data||'').localeCompare(b.data||''));
  }
  function renderTable(rows){
    const tb=q('#tabela tbody'); if(!tb) return; tb.innerHTML='';
    rows.forEach(l=>{
      const total=gastoLanc(l), ppl=(+l.profissionais||0)+(+l.ajudantes||0), mode=cfg.almoco_mode||'por_pessoa', almTotal=almocoTotalDe(l);
      const almInfo=(mode==='valor')
        ? `${BRL.format(almTotal)}`
        : (mode==='qtd')
          ? `${l.almoco||0} × ${ppl} × ${BRL.format(+cfg.almoco||0)} = ${BRL.format(almTotal)}`
          : `${ppl} × ${BRL.format(+cfg.almoco||0)} = ${BRL.format(almTotal)}`;
      const tr=document.createElement('tr');
      tr.innerHTML=
        `<td>${l.of_id||''}</td>
         <td>${fmtBRDate(l.data)||''}</td>
         <td>${canonicalSupplierName(l.fornecedor||'')}</td>
         <td>${BRL.format(l.materiais||0)}</td>
         <td>${l.profissionais||0}</td>
         <td>${l.ajudantes||0}</td>
         <td>${almInfo}</td>
         <td>${BRL.format(l.translado||0)}</td>
         <td><b>${BRL.format(total)}</b></td>
         <td>
           <div style="display:flex;gap:6px;justify-content:center">
             <button class="btn" data-editid="${l.id||''}" type="button">Editar</button>
             <button class="btn ghost" data-delid="${l.id||''}" type="button">Excluir</button>
           </div>
         </td>`;
      tb.appendChild(tr);
    });
    tb.querySelectorAll('button[data-delid]').forEach(b=>{
      b.onclick=async ()=>{ 
        const id=b.getAttribute('data-delid'); 
        const idx=lanc.findIndex(x=>x.id===id); 
        if(idx>=0 && confirm('Remover este lançamento?')){ 
          const removed = lanc[idx];
          lanc.splice(idx,1); persistLanc(); renderAll();
          try{ await sheetsPost('delete_lanc', { id: removed.id }); }catch(e){ console.warn('delete_lanc falhou:', e.message); }
        } 
      };
    });
    tb.querySelectorAll('button[data-editid]').forEach(b=>{
      b.onclick=()=>{ const id=b.getAttribute('data-editid'); const item=lanc.find(x=>x.id===id); if(item) enterEdit(item); };
    });
  }

  // ==== KPIs / Gráficos
  function renderKpis(rows){
    const mat=sum(rows, r=> +r.materiais||0);
    const mo=sum(rows, r=>{ const f=fatorDia(r.tipo_dia||'util'); return r.profissionais*(+cfg.prof||0)*f + r.ajudantes*(+cfg.ajud||0)*f; });
    const alm=sum(rows, r=> almocoTotalDe(r));
    const tra=sum(rows, r=> +r.translado||0);
    const ind=alm+tra;
    const total=mat+mo+ind;

    const set=(sel,v)=>{ const el=q(sel); if(el) el.textContent=v; };
    set('#kpiMateriais', BRL.format(mat)); 
    set('#kpiMO', BRL.format(mo)); 
    set('#kpiIndiretos', BRL.format(ind)); 
    set('#kpiTotal', BRL.format(total));
    set('#kpiRegistros', rows.length?`${rows.length} registros`:'Sem registros'); 
    set('#kpiHh', `${sum(rows, r=> r.profissionais + r.ajudantes)} pessoas·dia`); 
    set('#kpiIndPct', `Indiretos ${total?(ind/total*100).toFixed(1):0}%`);
    if(q('#kpiAlmoco')) q('#kpiAlmoco').textContent = BRL.format(alm);
    if(q('#kpiTranslado')) q('#kpiTranslado').textContent = BRL.format(tra);
    if(q('#kpiAlmocoSub')) q('#kpiAlmocoSub').textContent = rows.length?`média ${BRL.format(alm/rows.length)}`:'—';
    if(q('#kpiTransladoSub')) q('#kpiTransladoSub').textContent = rows.length?`média ${BRL.format(tra/rows.length)}`:'—';

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
  let chEvo=null, chCat=null, chForn=null;
  function isMobile(){ return window.matchMedia('(max-width: 640px)').matches; }
  function mobileTuning(base){
    if(!isMobile()) return base;
    const tuned = JSON.parse(JSON.stringify(base));
    tuned.options = tuned.options || {};
    tuned.options.maintainAspectRatio = false;
    tuned.options.plugins = tuned.options.plugins || {};
    tuned.options.plugins.legend = tuned.options.plugins.legend || {};
    if(tuned.options.plugins.legend.labels){
      tuned.options.plugins.legend.labels.font = { size: 10 };
    } else {
      tuned.options.plugins.legend.labels = { font: { size: 10 } };
    }
    tuned.options.scales = tuned.options.scales || {};
    if(tuned.options.scales.x){ tuned.options.scales.x.ticks = { maxTicksLimit: 6, autoSkip: true, font:{size:10} }; }
    if(tuned.options.scales.y){ tuned.options.scales.y.ticks = { callback:(v)=>BRL.format(v), maxTicksLimit: 5, font:{size:10} }; }
    if(tuned.data && Array.isArray(tuned.data.datasets)){
      tuned.data.datasets = tuned.data.datasets.map(ds=>{
        const out = {...ds};
        if(tuned.type==='line'){ out.tension = .25; out.pointRadius = 2; out.borderWidth = 2; }
        if(tuned.type==='bar'){ out.maxBarThickness = 24; }
        return out;
      });
    }
    return tuned;
  }
  function renderCharts(rows){
    const byDateRaw={}; rows.forEach(r=>{ const k=r.data||'—'; byDateRaw[k]=(byDateRaw[k]||0)+gastoLanc(r); });
    const dates = Object.keys(byDateRaw).sort();
    const labels = dates.map(d => d==='—' ? '—' : fmtBRDate(d));
    const series = dates.map(d => byDateRaw[d]);

    const cat = {
      'Materiais': sum(rows, r=> +r.materiais||0),
      'Mão de Obra': sum(rows, r=> { const f = fatorDia(r.tipo_dia||'util'); return r.profissionais*(+cfg.prof||0)*f + r.ajudantes*(+cfg.ajud||0)*f; }),
      'Indiretos': sum(rows, r=> almocoTotalDe(r) + (+r.translado||0)),
    };
    const byForn = {};
    rows.forEach(r=>{
      const vm=+r.materiais||0;
      const forn=canonicalSupplierName(r.fornecedor||'');
      if(vm>0&&forn){ byForn[forn]=(byForn[forn]||0)+vm; }
    });

    [chEvo,chCat,chForn].forEach(ch=> ch && ch.destroy());

    const e1=q('#graficoEvolucao'); 
    if(e1){
      const cfg1 = mobileTuning({
        type:'line',
        data:{ labels, datasets:[{ label:'Total por dia', data:series, tension:.25 }]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ ticks:{ callback:v=>BRL.format(v) } } } }
      });
      chEvo = new Chart(e1.getContext('2d'), cfg1);
    }
    const e2=q('#graficoCategorias'); 
    if(e2){
      const cfg2 = mobileTuning({
        type:'doughnut',
        data:{ labels:Object.keys(cat), datasets:[{ data:Object.values(cat) }]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' } } }
      });
      chCat = new Chart(e2.getContext('2d'), cfg2);
    }
    const e3=q('#graficoFornecedores'); 
    if(e3){
      const cfg3 = mobileTuning({
        type:'bar',
        data:{ labels:Object.keys(byForn), datasets:[{ label:'Materiais por fornecedor', data:Object.values(byForn) }]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ ticks:{ callback:v=>BRL.format(v) } } } }
      });
      chForn = new Chart(e3.getContext('2d'), cfg3);
    }
  }

  // ==== Config + Integração Sheets
  function sheetsUrl(){ return (q('#cfgSheetsUrl')?.value || cfg.sheets_url || '').replace(/\s+/g,'').trim(); }
  function sheetsToken(){ return (q('#cfgSheetsToken')?.value || cfg.sheets_token || '').trim(); }

  async function sheetsGet(action){
    const urlStr = sheetsUrl(); if(!urlStr) throw new Error('Sheets URL vazia');
    const u = new URL(urlStr); u.searchParams.set('action', action);
    if (sheetsToken()) u.searchParams.set('token', sheetsToken());
    const r = await fetch(u.toString(), { method:'GET' });
    const t = await r.text();
    if(!r.ok) throw new Error(`GET ${action} HTTP ${r.status}: ${t.slice(0,200)}`);
    try{ return JSON.parse(t); }catch{ throw new Error(`GET ${action} JSON inválido: ${t.slice(0,200)}`); }
  }
  async function sheetsPost(action, payload){
    const urlStr = sheetsUrl(); if(!urlStr) throw new Error('Sheets URL vazia');
    const u = new URL(urlStr); u.searchParams.set('action', action);
    if (sheetsToken()) u.searchParams.set('token', sheetsToken());
    const r = await fetch(u.toString(), {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...payload, token: sheetsToken() })
    });
    const t = await r.text();
    if(!r.ok) throw new Error(`POST ${action} HTTP ${r.status}: ${t.slice(0,200)}`);
    try{ return JSON.parse(t); }catch{ throw new Error(`POST ${action} JSON inválido: ${t.slice(0,200)}`); }
  }
  async function testSheetsConnection(){
    const urlStr = sheetsUrl();
    if(!urlStr) return alert('Cole a URL do Web App (termina com /exec).');
    try{
      const u = new URL(urlStr);
      u.searchParams.set('action','load');
      if (sheetsToken()) u.searchParams.set('token', sheetsToken());
      const resp = await fetch(u.toString(), { method:'GET' });
      const text = await resp.text();
      let json=null; try{ json = JSON.parse(text); }catch{}
      if(!resp.ok){ alert(`Falha HTTP ${resp.status}\nBody:\n${text.slice(0,400)}...`); return; }
      if(!json || json.ok!==true){ alert(`Resposta inesperada do Web App.\nBody:\n${text.slice(0,400)}...`); return; }
      alert('Conexão OK! Dados disponíveis no Web App.');
      console.log('LOAD data:', json.data);
    }catch(err){ alert('Erro de rede/fetch: ' + (err?.message||err)); }
  }
  async function loadFromSheets(){
    const res = await sheetsGet('load'); // espera { ok:true, data:{lancamentos,ofs,fornecedores,cfg} }
    if(!res.ok) throw new Error(res.error || 'Falha ao carregar');
    const d = res.data || {};
    if(d.ofs) ofs = d.ofs;
    if(d.fornecedores) sups = d.fornecedores;
    if(d.lancamentos) lanc = d.lancamentos;
    if(d.cfg) cfg = { ...cfg, ...d.cfg };
    persistAll(); fillOFSelects(true); ensureFornecedorDatalist(); renderOFs(); renderAll();
  }
  async function syncSheets(){
    const payload = { cfg, ofs, fornecedores:sups, lancamentos:lanc };
    const res = await sheetsPost('sync_all', payload);
    if(!res.ok) throw new Error(res.error || 'Falha ao sincronizar');
    alert('Sincronizado com o Google Sheets!');
  }

  function ensureConfigUI(){
    // set values
    const setM=(id,v)=>{ const el=q('#'+id); if(el){ el.value=(+v||0).toFixed(2).replace('.',','); moneyMaskBind(el); } };
    const setN=(id,v)=>{ const el=q('#'+id); if(el) el.value = (v ?? ''); };
    setM('cfgProf',cfg.prof); setM('cfgAjud',cfg.ajud); setM('cfgAlmoco',cfg.almoco);
    setN('cfgMultSab',cfg.mult_sab??1.5); setN('cfgMultDom',cfg.mult_dom??2.0);
    setN('cfgAlmocoMode',cfg.almoco_mode||'por_pessoa');
    setN('cfgSheetsUrl',cfg.sheets_url||''); setN('cfgSheetsToken',cfg.sheets_token||'');

    const btn=q('#btnSalvarCfg');
    if(btn && !btn.dataset.bound){
      btn.dataset.bound='1';
      btn.onclick=()=>{ 
        cfg.prof=num(q('#cfgProf')?.value||0); 
        cfg.ajud=num(q('#cfgAjud')?.value||0); 
        cfg.almoco=num(q('#cfgAlmoco')?.value||0); 
        cfg.mult_sab=parseFloat(q('#cfgMultSab')?.value||1.5); 
        cfg.mult_dom=parseFloat(q('#cfgMultDom')?.value||2.0); 
        cfg.almoco_mode=(q('#cfgAlmocoMode')?.value)||'por_pessoa';
        cfg.sheets_url=(q('#cfgSheetsUrl')?.value||'').trim();
        cfg.sheets_token=(q('#cfgSheetsToken')?.value||'').trim();
        persistCfg(); alert('Configurações salvas.'); renderAll();
      };
    }
    const bLoad=q('#btnLoadSheets'); if(bLoad && !bLoad.dataset.bound){ bLoad.dataset.bound='1'; bLoad.onclick=()=> loadFromSheets().catch(e=>alert('Erro: '+e.message)); }
    const bSync=q('#btnSyncSheets'); if(bSync && !bSync.dataset.bound){ bSync.dataset.bound='1'; bSync.onclick=()=> syncSheets().catch(e=>alert('Erro: '+e.message)); }
    const bTest=q('#btnTestSheets'); if(bTest && !bTest.dataset.bound){ bTest.dataset.bound='1'; bTest.onclick=()=> testSheetsConnection(); }
  }

  // PDF na dashboard
  const btnPDF = q('#btnExportPDF'); if(btnPDF) btnPDF.onclick=()=> window.print();

  // ==== Render All
  function renderAll(){
    ensureFornecedorDatalist();
    bindMoneyFields();
    const rows=filtrarDados();
    renderKpis(rows);
    renderCharts(rows);
    renderTable(rows);
  }

  // Seeds (se vazio)
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
  fillOFSelects(true);
  renderAll();
});
