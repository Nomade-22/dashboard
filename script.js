// Dashboard Adequações Civis v3.3.2
// – Máscara BRL com buffer
// – CRUD Lançamentos + edição
// – CSV simétrico
// – Fornecedores (aliases)
// – Integração Google Sheets (GET/POST)
// – Diagnóstico de sincronização

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

  // ==== Fornecedores UI (mesmo do seu app)
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

  // ==== Máscara BRL
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
    const de
