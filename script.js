// Dashboard Adequações Civis v3.3 (corrigido CORS em sheetsPost)
document.addEventListener('DOMContentLoaded', () => {
  const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const KEY='adq_civis_lancamentos_v14',CFG_KEY='adq_civis_cfg_v14_6',OF_KEY='adq_civis_ofs_v11',SUP_KEY='adq_civis_suppliers_v14';

  let cfg=JSON.parse(localStorage.getItem(CFG_KEY)||JSON.stringify({
    prof:809,ajud:405,almoco:45,almoco_mode:'por_pessoa',mult_sab:1.5,mult_dom:2.0,
    sheets_url:'',sheets_token:''
  }));
  let lanc=JSON.parse(localStorage.getItem(KEY)||'[]');
  let ofs=JSON.parse(localStorage.getItem(OF_KEY)||'[]');
  let sups=JSON.parse(localStorage.getItem(SUP_KEY)||'[]');

  const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
  const q=s=>document.querySelector(s);
  const qa=s=>Array.from(document.querySelectorAll(s));
  const sum=(arr,pick)=>arr.reduce((s,o)=>s+(+pick(o)||0),0);
  const num=v=>{if(v==null)return 0;const s=String(v).replace(/\uFEFF/g,'').replace(/R\$\s?/gi,'').replace(/\./g,'').replace(/\s+/g,'').replace(',','.');const n=parseFloat(s);return isNaN(n)?0:n;};
  const fmtBRDate=iso=>{if(!iso)return'';const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);return m?`${m[3]}/${m[2]}/${m[1]}`:iso;};
  const normalize=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const canonicalSupplierName=input=>{
    const clean=normalize(input);if(!clean)return(input||'').trim();
    for(const s of sups){
      if(normalize(s.name)===clean)return s.name;
      if((s.aliases||[]).some(a=>normalize(a)===clean))return s.name;
    }
    return(input||'').trim();
  };
  const persistAll=()=>{localStorage.setItem(KEY,JSON.stringify(lanc));localStorage.setItem(CFG_KEY,JSON.stringify(cfg));localStorage.setItem(OF_KEY,JSON.stringify(ofs));localStorage.setItem(SUP_KEY,JSON.stringify(sups));};

  // ... (todo o restante do seu script permanece idêntico) ...

  // ==== Config + Integração Sheets ====
  function sheetsUrl(){return (q('#cfgSheetsUrl')?.value||cfg.sheets_url||'').replace(/\s+/g,'').trim();}
  function sheetsToken(){return (q('#cfgSheetsToken')?.value||cfg.sheets_token||'').trim();}
  async function sheetsGet(action){
    const urlStr=sheetsUrl();if(!urlStr)throw new Error('Sheets URL vazia');
    const u=new URL(urlStr);u.searchParams.set('action',action);
    if(sheetsToken())u.searchParams.set('token',sheetsToken());
    const r=await fetch(u.toString(),{method:'GET'});
    const t=await r.text();
    if(!r.ok)throw new Error(`GET ${action} HTTP ${r.status}: ${t.slice(0,200)}`);
    try{return JSON.parse(t);}catch{throw new Error(`GET ${action} JSON inválido: ${t.slice(0,200)}`);}
  }

  // ✅ CORREÇÃO CORS — envio via FormData (sem headers)
  async function sheetsPost(action,payload){
    const urlStr=sheetsUrl();if(!urlStr)throw new Error('Sheets URL vazia');
    const u=new URL(urlStr);
    u.searchParams.set('action',action);
    if(sheetsToken())u.searchParams.set('token',sheetsToken());

    const fd=new FormData();
    fd.append('payload',JSON.stringify(payload||{}));

    const r=await fetch(u.toString(),{method:'POST',body:fd});
    const t=await r.text();
    if(!r.ok)throw new Error(`POST ${action} HTTP ${r.status}: ${t.slice(0,200)}`);
    let data;try{data=JSON.parse(t);}catch{throw new Error(`POST ${action} JSON inválido: ${t.slice(0,200)}`);}
    if(!data.ok)throw new Error(data.error||'Falha no servidor');
    return data;
  }

  // ... (demais funções: testSheetsConnection, loadFromSheets, syncSheets, ensureConfigUI, renderAll, etc)
});