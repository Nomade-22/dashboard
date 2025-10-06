/* Dashboard Adequações Civis — script.js (v3.3.3)
   Atualização: correção de CORS usando FormData no sheetsPost()
*/

// ---------- VARIÁVEIS ----------
let cfg = {
  prof: 0, ajud: 0, almoco: 0,
  almoco_mode: "por_pessoa",
  mult_sab: 1.5, mult_dom: 2,
  sheets_url: "", sheets_token: ""
};
let ofs = [];
let lancamentos = [];
let fornecedores = [];

// ---------- FUNÇÕES DE UTILIDADE ----------
const formatBRL = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const parseBRL = s => parseFloat(s.replace(/[^\d,-]/g,"").replace(",",".")||0);
const uuid = () => Math.random().toString(36).substring(2,10);

// ---------- TABS ----------
document.querySelectorAll(".tabs .btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// ---------- LANÇAMENTOS ----------
function atualizarTabela(){
  const tbody = document.querySelector("#tabela tbody");
  tbody.innerHTML = "";
  lancamentos.forEach((l,i)=>{
    const tr = document.createElement("tr");
    const totalDia = calcTotal(l);
    tr.innerHTML = `
      <td>${l.of_id}</td>
      <td>${l.data}</td>
      <td>${l.fornecedor}</td>
      <td>${formatBRL(l.materiais)}</td>
      <td>${l.profissionais}</td>
      <td>${l.ajudantes}</td>
      <td>${detalheAlmoco(l)}</td>
      <td>${formatBRL(l.translado)}</td>
      <td><b>${formatBRL(totalDia)}</b></td>
      <td>
        <button class="btn ghost" onclick="editarLanc(${i})">Editar</button>
        <button class="btn ghost" onclick="excluirLanc(${i})">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  atualizarDashboard();
}

function detalheAlmoco(l){
  if(cfg.almoco_mode === "valor") return formatBRL(l.almoco);
  const qtd = l.profissionais + l.ajudantes;
  return `${qtd} × ${formatBRL(cfg.almoco)} = ${formatBRL(qtd * cfg.almoco)}`;
}

function editarLanc(i){
  const l = lancamentos[i];
  document.querySelector("#editId").value = i;
  document.querySelector("#ofId").value = l.of_id;
  document.querySelector("#data").value = l.data;
  document.querySelector("#fornecedor").value = l.fornecedor;
  document.querySelector("#materiais").value = formatBRL(l.materiais);
  document.querySelector("#profissionais").value = l.profissionais;
  document.querySelector("#ajudantes").value = l.ajudantes;
  document.querySelector("#almoco").value = formatBRL(l.almoco);
  document.querySelector("#translado").value = formatBRL(l.translado);
  document.querySelector("#tipoDia").value = l.tipo_dia;
  document.querySelector("#btnSalvarLanc").textContent = "Salvar";
  document.querySelector("#btnCancelarEdit").style.display = "inline-block";
}

function excluirLanc(i){
  if(confirm("Excluir lançamento?")){
    lancamentos.splice(i,1);
    salvarLocal();
    atualizarTabela();
  }
}

// ---------- CÁLCULOS ----------
function calcTotal(l){
  const mult = l.tipo_dia==="sabado"?cfg.mult_sab:l.tipo_dia==="domingo"?cfg.mult_dom:1;
  const valorProf = l.profissionais * cfg.prof;
  const valorAjud = l.ajudantes * cfg.ajud;
  const base = (valorProf + valorAjud) * mult;
  const almocoVal = cfg.almoco_mode==="por_pessoa"
    ? (l.profissionais+l.ajudantes)*cfg.almoco
    : cfg.almoco_mode==="valor"?l.almoco:cfg.almoco;
  return l.materiais + base + almocoVal + l.translado;
}

// ---------- DASHBOARD ----------
function atualizarDashboard(){
  const totalMat = lancamentos.reduce((a,b)=>a+b.materiais,0);
  const totalMO = lancamentos.reduce((a,b)=>a+(b.profissionais*cfg.prof)+(b.ajudantes*cfg.ajud),0);
  const totalAlmoco = lancamentos.reduce((a,b)=>a+((b.profissionais+b.ajudantes)*cfg.almoco),0);
  const totalTrans = lancamentos.reduce((a,b)=>a+b.translado,0);
  const totalGeral = totalMat + totalMO + totalAlmoco + totalTrans;

  document.querySelector("#kpiMateriais").textContent = formatBRL(totalMat);
  document.querySelector("#kpiMO").textContent = formatBRL(totalMO);
  document.querySelector("#kpiAlmoco").textContent = formatBRL(totalAlmoco);
  document.querySelector("#kpiTranslado").textContent = formatBRL(totalTrans);
  document.querySelector("#kpiTotal").textContent = formatBRL(totalGeral);
  document.querySelector("#kpiRegistros").textContent = `${lancamentos.length} lançamentos`;
}

// ---------- LOCAL STORAGE ----------
function salvarLocal(){
  localStorage.setItem("cfg",JSON.stringify(cfg));
  localStorage.setItem("ofs",JSON.stringify(ofs));
  localStorage.setItem("lancamentos",JSON.stringify(lancamentos));
}
function carregarLocal(){
  cfg = JSON.parse(localStorage.getItem("cfg")||JSON.stringify(cfg));
  ofs = JSON.parse(localStorage.getItem("ofs")||"[]");
  lancamentos = JSON.parse(localStorage.getItem("lancamentos")||"[]");
  atualizarTabela();
}

// ---------- FORMULÁRIOS ----------
document.querySelector("#form").addEventListener("submit",e=>{
  e.preventDefault();
  const l = {
    of_id: document.querySelector("#ofId").value,
    data: document.querySelector("#data").value,
    fornecedor: document.querySelector("#fornecedor").value,
    materiais: parseBRL(document.querySelector("#materiais").value),
    profissionais: +document.querySelector("#profissionais").value||0,
    ajudantes: +document.querySelector("#ajudantes").value||0,
    almoco: parseBRL(document.querySelector("#almoco").value),
    translado: parseBRL(document.querySelector("#translado").value),
    tipo_dia: document.querySelector("#tipoDia").value
  };
  const editId = document.querySelector("#editId").value;
  if(editId){
    lancamentos[editId] = l;
    document.querySelector("#btnSalvarLanc").textContent = "Adicionar";
    document.querySelector("#btnCancelarEdit").style.display = "none";
  } else {
    lancamentos.push(l);
  }
  salvarLocal();
  atualizarTabela();
  e.target.reset();
});

// ---------- CONFIGURAÇÕES ----------
document.querySelector("#btnSalvarCfg").addEventListener("click",()=>{
  cfg.prof = parseBRL(document.querySelector("#cfgProf").value);
  cfg.ajud = parseBRL(document.querySelector("#cfgAjud").value);
  cfg.almoco = parseBRL(document.querySelector("#cfgAlmoco").value);
  cfg.almoco_mode = document.querySelector("#cfgAlmocoMode").value;
  cfg.mult_sab = parseFloat(document.querySelector("#cfgMultSab").value||1.5);
  cfg.mult_dom = parseFloat(document.querySelector("#cfgMultDom").value||2);
  cfg.sheets_url = document.querySelector("#cfgSheetsUrl").value;
  cfg.sheets_token = document.querySelector("#cfgSheetsToken").value;
  salvarLocal();
  alert("Configurações salvas!");
});

// ---------- INTEGRAÇÃO GOOGLE SHEETS ----------
// ✅ versão corrigida — evita erro "Failed to fetch"
async function sheetsPost(action, payload){
  const urlStr = (document.querySelector('#cfgSheetsUrl')?.value || cfg.sheets_url || '').trim();
  if(!urlStr) throw new Error('Sheets URL vazia');

  const u = new URL(urlStr);
  u.searchParams.set('action', action);
  const tok = (document.querySelector('#cfgSheetsToken')?.value || cfg.sheets_token || '').trim();
  if (tok) u.searchParams.set('token', tok);

  const fd = new FormData();
  fd.append('action', action);
  fd.append('payload', JSON.stringify(payload || {}));

  const r = await fetch(u.toString(), { method:'POST', body: fd });
  const t = await r.text();

  if (!r.ok) throw new Error(`POST ${action} HTTP ${r.status}: ${t.slice(0,200)}`);
  let data;
  try { data = JSON.parse(t); }
  catch { throw new Error(`POST ${action} JSON inválido: ${t.slice(0,200)}`); }
  if (!data.ok) throw new Error(data.error || 'Falha no servidor');
  return data;
}

document.querySelector("#btnTestSheets").addEventListener("click",async()=>{
  try{
    const res = await fetch(cfg.sheets_url+"?action=pong");
    if(res.ok) alert("Conexão ativa com Google Sheets!");
    else throw new Error("Falha no teste");
  }catch(e){ alert("Erro: "+e.message); }
});

document.querySelector("#btnSyncSheets").addEventListener("click",async()=>{
  try{
    await sheetsPost("upsert_all",{cfg,ofs,lancamentos});
    alert("Sincronizado com Google Sheets!");
  }catch(e){ alert("Erro: "+e.message); }
});

document.querySelector("#btnLoadSheets").addEventListener("click",async()=>{
  try{
    const res = await fetch(cfg.sheets_url+"?action=load_all");
    const json = await res.json();
    if(json.ok){
      cfg = json.cfg; ofs = json.ofs; lancamentos = json.lancamentos;
      salvarLocal();
      atualizarTabela();
      alert("Dados carregados do Sheets!");
    } else throw new Error(json.error);
  }catch(e){ alert("Erro: "+e.message); }
});

// ---------- INICIALIZAÇÃO ----------
carregarLocal();
atualizarTabela();
