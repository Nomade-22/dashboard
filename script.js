/* Adequações Civis — script.js (v3.3) */

// ====================================================================
// Variáveis de Estado
// ====================================================================
let data = {
    cfg: {},
    ofs: [],
    fornecedores: [],
    lancamentos: []
};

const CFG_DEFAULTS = {
    prof_day_rate: 809.00,
    help_day_rate: 405.00,
    lunch_cost: 45.00,
    lunch_mode: 'Por pessoa',
    multiplier_sat: 1.5,
    multiplier_sun: 2.0,
    webAppUrl: '',
    apiToken: ''
};

// ====================================================================
// Helpers de Persistência e Data
// ====================================================================

function saveLocal() {
    localStorage.setItem('dashboardData', JSON.stringify(data));
}

function loadLocal() {
    const saved = localStorage.getItem('dashboardData');
    if (saved) {
        data = JSON.parse(saved);
        // Garante que o cfg sempre tenha defaults se faltar algo
        data.cfg = { ...CFG_DEFAULTS, ...data.cfg };
    } else {
        data.cfg = CFG_DEFAULTS;
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function formatDate(date) {
    if (date instanceof Date) {
        return date.toISOString().split('T')[0];
    }
    return date;
}

// ====================================================================
// Helpers de UI
// ====================================================================

function formatMoney(value) {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function updateUI() {
    // 1. Configurações
    document.getElementById('prof_day_rate').value = data.cfg.prof_day_rate.toFixed(2);
    document.getElementById('help_day_rate').value = data.cfg.help_day_rate.toFixed(2);
    document.getElementById('lunch_cost').value = data.cfg.lunch_cost.toFixed(2);
    document.getElementById('lunch_mode').value = data.cfg.lunch_mode;
    document.getElementById('multiplier_sat').value = data.cfg.multiplier_sat;
    document.getElementById('multiplier_sun').value = data.cfg.multiplier_sun;
    document.getElementById('webAppUrl').value = data.cfg.webAppUrl;
    document.getElementById('apiToken').value = data.cfg.apiToken;

    // 2. Renderizar outras abas (funções placeholder)
    renderKPIs();
    renderLancamentos();
    renderOFs();
    renderFornecedores();
}

// Função Placeholder para o exemplo
function renderKPIs() {
    // Implementar lógica de cálculo e exibição de KPIs
    const totalLancado = data.lancamentos.reduce((acc, l) => acc + (l.materiais || 0) + (l.profissionais || 0) + (l.ajudantes || 0) + (l.almoco || 0) + (l.translado || 0), 0);
    document.getElementById('kpi-total').textContent = formatMoney(totalLancado);
}

function renderLancamentos() {
    // Implementar a renderização da tabela de lançamentos
    const tableBody = document.querySelector('#lancamentos-tab table tbody');
    if (!tableBody) return;
    tableBody.innerHTML = data.lancamentos.map(l => `
        <tr data-id="${l.id}">
            <td>${l.data}</td>
            <td>${l.of_id}</td>
            <td>${l.fornecedor}</td>
            <td class="money">${formatMoney(l.materiais)}</td>
            <td class="money">${formatMoney(l.profissionais)}</td>
            <td>
                <button onclick="editLancamento('${l.id}')">Editar</button>
                <button onclick="deleteLancamento('${l.id}')">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function renderOFs() {
    // Implementar a renderização da grade de OFs
    const grid = document.getElementById('ofs-grid');
    if (!grid) return;
    grid.innerHTML = data.ofs.map(of => {
        const lancamentosOF = data.lancamentos.filter(l => l.of_id === of.id);
        const totalGasto = lancamentosOF.reduce((acc, l) => acc + (l.materiais || 0) + (l.profissionais || 0) + (l.ajudantes || 0) + (l.almoco || 0) + (l.translado || 0), 0);
        const orcado = of.orcado || 0;
        const progress = (totalGasto / orcado) * 100;
        const tagClass = progress > 90 ? 'tag-danger' : progress > 75 ? 'tag-warn' : '';

        return `
            <div class="card of-card ${tagClass}">
                <div class="head">
                    <div>
                        <strong>${of.id}</strong>
                        <span class="muted"> / ${of.cliente}</span>
                    </div>
                    <span>${formatMoney(totalGasto)} / ${formatMoney(orcado)}</span>
                </div>
                <div class="of-progress">
                    <div class="of-bar" style="width:${Math.min(100, progress)}%"></div>
                </div>
                <div class="sub muted">${of.desc}</div>
            </div>
        `;
    }).join('');
}

function renderFornecedores() {
    // Implementar a renderização da lista de Fornecedores
    const grid = document.getElementById('fornecedores-grid');
    if (!grid) return;
    grid.innerHTML = data.fornecedores.map(f => `
        <div class="sup-item">
            <span>${f.name}</span>
            <b>${formatMoney(data.lancamentos.filter(l => l.fornecedor === f.name).reduce((acc, l) => acc + (l.materiais || 0), 0))}</b>
        </div>
    `).join('');
}

// ====================================================================
// Funções de Formulário
// ====================================================================

function handleConfigSave(event) {
    event.preventDefault();
    
    // Coleta os valores do formulário de Configuração
    data.cfg.prof_day_rate = parseFloat(document.getElementById('prof_day_rate').value) || 0;
    data.cfg.help_day_rate = parseFloat(document.getElementById('help_day_rate').value) || 0;
    data.cfg.lunch_cost = parseFloat(document.getElementById('lunch_cost').value) || 0;
    data.cfg.lunch_mode = document.getElementById('lunch_mode').value;
    data.cfg.multiplier_sat = parseFloat(document.getElementById('multiplier_sat').value) || 0;
    data.cfg.multiplier_sun = parseFloat(document.getElementById('multiplier_sun').value) || 0;
    data.cfg.webAppUrl = document.getElementById('webAppUrl').value.trim();
    data.cfg.apiToken = document.getElementById('apiToken').value.trim();

    saveLocal();
    updateUI();
    alert('Configurações salvas localmente!');
}

function handleLancamentoSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const lancamento = {
        id: form.id.value || generateId(),
        of_id: form.of_id.value,
        data: formatDate(form.data.value),
        fornecedor: form.fornecedor.value,
        materiais: parseFloat(form.materiais.value) || 0,
        profissionais: parseFloat(form.profissionais.value) || 0,
        ajudantes: parseFloat(form.ajudantes.value) || 0,
        almoco: parseFloat(form.almoco.value) || 0,
        translado: parseFloat(form.translado.value) || 0,
        tipo_dia: form.tipo_dia.value,
    };

    const index = data.lancamentos.findIndex(l => l.id === lancamento.id);
    if (index > -1) {
        data.lancamentos[index] = lancamento;
    } else {
        data.lancamentos.push(lancamento);
    }

    saveLocal();
    updateUI();
    form.reset();
    form.querySelector('input[name="id"]').value = '';

    // Tenta sincronizar o item único se o Web App estiver configurado
    if (data.cfg.webAppUrl) {
        sheetsPost('upsert_lanc', { lanc: lancamento })
            .then(res => {
                if (res.ok) console.log('Lançamento sincronizado na nuvem:', lancamento.id);
                else console.error('Erro ao salvar na nuvem:', res.error);
            });
    }
}

function editLancamento(id) {
    const lancamento = data.lancamentos.find(l => l.id === id);
    if (!lancamento) return;

    const form = document.getElementById('lancamento-form');
    form.id.value = lancamento.id;
    form.of_id.value = lancamento.of_id;
    form.data.value = lancamento.data;
    form.fornecedor.value = lancamento.fornecedor;
    form.materiais.value = lancamento.materiais.toFixed(2);
    form.profissionais.value = lancamento.profissionais.toFixed(2);
    form.ajudantes.value = lancamento.ajudantes.toFixed(2);
    form.almoco.value = lancamento.almoco.toFixed(2);
    form.translado.value = lancamento.translado.toFixed(2);
    form.tipo_dia.value = lancamento.tipo_dia;
    // Abre a aba de Lançamentos
    switchTab('lancamentos');
}

function deleteLancamento(id) {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;

    const index = data.lancamentos.findIndex(l => l.id === id);
    if (index > -1) {
        const removed = data.lancamentos.splice(index, 1)[0];
        saveLocal();
        updateUI();

        // Tenta sincronizar a exclusão se o Web App estiver configurado
        if (data.cfg.webAppUrl) {
            sheetsPost('delete_lanc', { id: removed.id })
                .then(res => {
                    if (res.ok) console.log('Lançamento excluído na nuvem:', removed.id);
                    else console.error('Erro ao excluir na nuvem:', res.error);
                });
        }
    }
}

// ====================================================================
// Funções de Conexão Google Sheets (API)
// ====================================================================

/**
 * Envia uma requisição GET para o Apps Script
 * @param {string} action - Ação a ser executada (ex: 'load', 'test')
 * @returns {Promise<object>} Resposta JSON do Apps Script
 */
async function sheetsGet(action) {
    const webAppUrl = data.cfg.webAppUrl;
    if (!webAppUrl || !webAppUrl.endsWith('/exec')) {
        alert('URL do Web App não configurada ou incorreta. Salve a URL nas Configurações.');
        return { ok: false, error: 'Configuração ausente' };
    }

    const url = `${webAppUrl}?action=${action}`;

    try {
        const response = await fetch(url, { method: 'GET' });
        const result = await response.json();
        return result;
    } catch (error) {
        alert(`Erro: ${error.message}. Verifique a URL e a Implantação do Web App.`);
        return { ok: false, error: error.message };
    }
}

/**
 * Envia uma requisição POST para o Apps Script
 * @param {string} action - Ação a ser executada (ex: 'sync_all', 'upsert_lanc')
 * @param {object} payload - Dados a serem enviados
 * @returns {Promise<object>} Resposta JSON do Apps Script
 */
async function sheetsPost(action, payload) {
    const webAppUrl = data.cfg.webAppUrl;
    if (!webAppUrl || !webAppUrl.endsWith('/exec')) {
        alert('URL do Web App não configurada ou incorreta. Salve a URL nas Configurações.');
        return { ok: false, error: 'Configuração ausente' };
    }

    // 1. ANEXA O PARÂMETRO 'action' à URL
    const url = `${webAppUrl}?action=${action}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            // 2. DEFINE OS HEADERS PARA JSON
            headers: {
                'Content-Type': 'application/json',
            },
            // 3. CONVERTE OS DADOS DO JAVASCRIPT EM STRING JSON
            body: JSON.stringify(payload),
            // 4. MODO CORS (necessário para o fetch funcionar em domínios diferentes)
            mode: 'cors'
        });

        // Verifica se a resposta foi bem-sucedida (status 200)
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro HTTP: ${response.status}. Resposta: ${errorText.substring(0, 100)}...`);
        }

        const result = await response.json();
        if (!result.ok) {
            throw new Error(`Erro no Apps Script: ${result.error}`);
        }
        return result;

    } catch (error) {
        // Mostra o erro exato ao usuário
        console.error('Erro na requisição POST:', error);
        alert(`Erro ao sincronizar. Detalhes: ${error.message}`);
        return { ok: false, error: error.message };
    }
}

// ====================================================================
// Funções de Sincronização
// ====================================================================

async function testConnection() {
    const res = await sheetsGet('test');
    if (res && res.ok) {
        alert('Conexão OK! Dados disponíveis no Web App.');
    } else if (res && res.error) {
        alert(`Conexão Falhou: ${res.error}`);
    }
}

async function loadFromSheets() {
    if (!confirm('Isso irá apagar os dados locais e substituí-los pelos dados da Planilha. Continuar?')) return;
    
    // Mostra um feedback de loading
    document.body.style.cursor = 'wait';
    
    const res = await sheetsGet('load');
    
    document.body.style.cursor = 'default';

    if (res && res.ok && res.data) {
        data.lancamentos = res.data.lancamentos || [];
        data.ofs = res.data.ofs || [];
        data.fornecedores = res.data.fornecedores || [];
        // Mescla a configuração carregada com as configurações locais
        data.cfg = { ...data.cfg, ...res.data.cfg };

        saveLocal();
        updateUI();
        alert(`Dados carregados com sucesso! Lançamentos: ${data.lancamentos.length}, OFs: ${data.ofs.length}`);
    } else {
        alert('Falha ao carregar dados do Sheets. Verifique o console para mais detalhes.');
    }
}

async function syncToSheets() {
    if (!confirm('Isso irá sobrescrever TODOS os dados da Planilha com os dados locais. Continuar?')) return;
    
    document.body.style.cursor = 'wait';

    // Monta o payload completo
    const payload = {
        cfg: data.cfg,
        ofs: data.ofs,
        fornecedores: data.fornecedores,
        lancamentos: data.lancamentos
    };

    const res = await sheetsPost('sync_all', payload);
    
    document.body.style.cursor = 'default';

    if (res && res.ok) {
        alert(`Sincronização completa! 
        Lançamentos salvos: ${res.lancamentos}
        OFs salvos: ${res.ofs}
        Fornecedores salvos: ${res.fornecedores}`);
    } else {
        alert('Falha na sincronização. Verifique o console para mais detalhes.');
    }
}


// ====================================================================
// Inicialização e Event Listeners
// ====================================================================

function switchTab(tabId) {
    // Esconde todas as abas
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    // Desativa todos os botões de aba
    document.querySelectorAll('.tabs .btn').forEach(btn => btn.classList.remove('primary'));
    
    // Mostra a aba ativa
    document.getElementById(tabId + '-tab').classList.add('active');
    // Ativa o botão correspondente
    document.querySelector(`.tabs .btn[onclick*="${tabId}"]`).classList.add('primary');

    // Força a atualização da UI na troca de aba (necessário para gráficos, etc.)
    updateUI();
}

document.addEventListener('DOMContentLoaded', () => {
    loadLocal();
    updateUI();
    switchTab('dashboard'); // Inicia na aba principal

    // Botões do Header (Tabs)
    document.querySelectorAll('.tabs .btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('onclick').match(/'(.*)'/)[1];
            switchTab(tabId);
        });
    });

    // Event Listeners dos Formulários
    document.getElementById('config-form').addEventListener('submit', handleConfigSave);
    document.getElementById('lancamento-form').addEventListener('submit', handleLancamentoSubmit);

    // Event Listeners de Sincronização
    document.getElementById('testConnection').addEventListener('click', testConnection);
    document.getElementById('loadFromSheets').addEventListener('click', loadFromSheets);
    document.getElementById('syncToSheets').addEventListener('click', syncToSheets);
});
