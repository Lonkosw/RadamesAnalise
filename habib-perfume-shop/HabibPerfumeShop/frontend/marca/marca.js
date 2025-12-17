/**
 * ============================================
 * MARCA.JS - JavaScript do CRUD de Marcas
 * HabibPerfumeShop
 * ============================================
 */

const API_URL = '/marca';

// Estado da aplicação
let marcas = [];
let marcaParaExcluir = null;
let estatisticas = {};

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    carregarMarcas();
    configurarEventos();
});

function configurarEventos() {
    // Formulário
    document.getElementById('formMarca').addEventListener('submit', salvarMarca);
    
    // Busca com debounce
    const inputBusca = document.getElementById('buscaMarca');
    let timeoutBusca;
    inputBusca.addEventListener('input', (e) => {
        clearTimeout(timeoutBusca);
        timeoutBusca = setTimeout(() => {
            filtrarMarcas(e.target.value);
        }, 300);
    });
    
    // Botão confirmar exclusão
    document.getElementById('btnConfirmarExclusao').addEventListener('click', confirmarExclusao);
}

// ============================================
// OPERAÇÕES CRUD
// ============================================

/**
 * Carrega todas as marcas com estatísticas
 */
async function carregarMarcas() {
    try {
        // Carregar marcas e estatísticas em paralelo
        const [marcasRes, statsRes] = await Promise.all([
            fetch(API_URL),
            fetch(`${API_URL}/estatisticas`)
        ]);
        
        if (!marcasRes.ok) throw new Error('Erro ao carregar marcas');
        
        marcas = await marcasRes.json();
        
        if (statsRes.ok) {
            const stats = await statsRes.json();
            estatisticas = {};
            stats.forEach(s => {
                estatisticas[s.id_marca] = parseInt(s.total_produtos) || 0;
            });
        }
        
        renderizarTabela(marcas);
        atualizarEstatisticas();
    } catch (error) {
        console.error('Erro ao carregar marcas:', error);
        mostrarMensagem('Erro ao carregar marcas: ' + error.message, 'error');
    }
}

/**
 * Salva ou atualiza uma marca
 */
async function salvarMarca(event) {
    event.preventDefault();
    
    const id = document.getElementById('idMarca').value;
    const nome = document.getElementById('nomeMarca').value.trim();
    
    if (!nome) {
        mostrarMensagem('Nome da marca é obrigatório', 'error');
        return;
    }
    
    try {
        const url = id ? `${API_URL}/${id}` : API_URL;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome_marca: nome })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao salvar marca');
        }
        
        const acao = id ? 'atualizada' : 'criada';
        mostrarMensagem(`✅ Marca "${data.nome_marca}" ${acao} com sucesso!`, 'success');
        
        limparFormulario();
        carregarMarcas();
    } catch (error) {
        console.error('Erro ao salvar marca:', error);
        mostrarMensagem(error.message, 'error');
    }
}

/**
 * Prepara o formulário para edição
 */
function editarMarca(id) {
    const marca = marcas.find(m => m.id_marca === id);
    if (!marca) return;
    
    document.getElementById('idMarca').value = marca.id_marca;
    document.getElementById('nomeMarca').value = marca.nome_marca;
    
    document.getElementById('formTitle').innerHTML = '✏️ Editar Marca';
    document.getElementById('btnSalvar').innerHTML = '💾 Atualizar';
    
    // Scroll para o formulário
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('nomeMarca').focus();
}

/**
 * Abre modal de confirmação para exclusão
 */
function excluirMarca(id) {
    const marca = marcas.find(m => m.id_marca === id);
    if (!marca) return;
    
    marcaParaExcluir = id;
    
    const totalProdutos = estatisticas[id] || 0;
    let mensagem = `Deseja realmente excluir a marca "${marca.nome_marca}"?`;
    
    if (totalProdutos > 0) {
        mensagem = `⚠️ A marca "${marca.nome_marca}" possui ${totalProdutos} produto(s) vinculado(s). Não é possível excluí-la.`;
        document.getElementById('btnConfirmarExclusao').style.display = 'none';
    } else {
        document.getElementById('btnConfirmarExclusao').style.display = 'inline-flex';
    }
    
    document.getElementById('mensagemModal').innerHTML = mensagem;
    document.getElementById('modalConfirmacao').style.display = 'flex';
}

/**
 * Confirma a exclusão da marca
 */
async function confirmarExclusao() {
    if (!marcaParaExcluir) return;
    
    try {
        const response = await fetch(`${API_URL}/${marcaParaExcluir}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao excluir marca');
        }
        
        mostrarMensagem(`✅ Marca "${data.marca}" excluída com sucesso!`, 'success');
        
        fecharModal();
        carregarMarcas();
    } catch (error) {
        console.error('Erro ao excluir marca:', error);
        mostrarMensagem(error.message, 'error');
        fecharModal();
    }
}

// ============================================
// RENDERIZAÇÃO
// ============================================

/**
 * Renderiza a tabela de marcas
 */
function renderizarTabela(dados) {
    const tbody = document.getElementById('corpoTabela');
    const semResultados = document.getElementById('semResultados');
    const tabela = document.getElementById('tabelaMarcas');
    
    if (!dados || dados.length === 0) {
        tbody.innerHTML = '';
        tabela.style.display = 'none';
        semResultados.style.display = 'block';
        return;
    }
    
    tabela.style.display = 'table';
    semResultados.style.display = 'none';
    
    tbody.innerHTML = dados.map(marca => {
        const totalProdutos = estatisticas[marca.id_marca] || 0;
        const badgeClass = totalProdutos > 0 ? 'badge-primary' : 'badge-secondary';
        
        return `
            <tr>
                <td>${marca.id_marca}</td>
                <td><strong>${escapeHtml(marca.nome_marca)}</strong></td>
                <td>
                    <span class="badge ${badgeClass}">${totalProdutos} produto(s)</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-edit" onclick="editarMarca(${marca.id_marca})" title="Editar">
                            ✏️ Editar
                        </button>
                        <button class="btn btn-delete" onclick="excluirMarca(${marca.id_marca})" title="Excluir">
                            🗑️ Excluir
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Filtra marcas pelo nome
 */
function filtrarMarcas(termo) {
    if (!termo || termo.trim() === '') {
        renderizarTabela(marcas);
        return;
    }
    
    const termoLower = termo.toLowerCase();
    const filtradas = marcas.filter(m => 
        m.nome_marca.toLowerCase().includes(termoLower)
    );
    
    renderizarTabela(filtradas);
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Limpa o formulário
 */
function limparFormulario() {
    document.getElementById('formMarca').reset();
    document.getElementById('idMarca').value = '';
    document.getElementById('formTitle').innerHTML = '➕ Nova Marca';
    document.getElementById('btnSalvar').innerHTML = '💾 Salvar';
    document.getElementById('nomeMarca').focus();
}

/**
 * Fecha o modal de confirmação
 */
function fecharModal() {
    document.getElementById('modalConfirmacao').style.display = 'none';
    marcaParaExcluir = null;
}

/**
 * Mostra mensagem de feedback
 */
function mostrarMensagem(texto, tipo) {
    const mensagem = document.getElementById('mensagem');
    mensagem.innerHTML = texto;
    mensagem.className = `message ${tipo}`;
    
    // Auto-esconder após 5 segundos
    setTimeout(() => {
        mensagem.className = 'message';
    }, 5000);
}

/**
 * Atualiza o contador de estatísticas
 */
function atualizarEstatisticas() {
    const total = marcas.length;
    document.getElementById('totalMarcas').innerHTML = `Total: ${total} marca(s)`;
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Fechar modal ao clicar fora
document.addEventListener('click', (e) => {
    const modal = document.getElementById('modalConfirmacao');
    if (e.target === modal) {
        fecharModal();
    }
});

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        fecharModal();
    }
});
