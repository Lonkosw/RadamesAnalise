/**
 * crudPedido.js - CRUD de Pedidos para Gerente
 * HabibPerfumeShop - Baseado no modelo do professor (dw1-modelo-4bim)
 */

// Configuração da API
const API_BASE_URL = 'http://localhost:3001';
let currentPedidoId = null;
let operacao = null;
let editandoItemIndex = null;
let itensAtuais = [];
let produtosCache = [];

// Elementos do DOM - serão inicializados após DOMContentLoaded
let form, formFields, searchId;
let btnBuscar, btnNovo, btnAlterar, btnExcluir, btnCancelar, btnSalvar;
let secaoItens, selectProduto;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar referências DOM
    form = document.getElementById('pedidoForm');
    formFields = document.getElementById('formFields');
    searchId = document.getElementById('searchId');
    
    btnBuscar = document.getElementById('btnBuscar');
    btnNovo = document.getElementById('btnNovo');
    btnAlterar = document.getElementById('btnAlterar');
    btnExcluir = document.getElementById('btnExcluir');
    btnCancelar = document.getElementById('btnCancelar');
    btnSalvar = document.getElementById('btnSalvar');
    
    secaoItens = document.getElementById('secaoItens');
    selectProduto = document.getElementById('selectProduto');
    
    // Event Listeners
    btnBuscar.addEventListener('click', buscarPedido);
    btnNovo.addEventListener('click', incluirPedido);
    btnAlterar.addEventListener('click', alterarPedido);
    btnExcluir.addEventListener('click', excluirPedido);
    btnCancelar.addEventListener('click', cancelarOperacao);
    btnSalvar.addEventListener('click', salvarOperacao);
    
    // Listeners de itens
    document.getElementById('btnAdicionarItem').addEventListener('click', adicionarItem);
    document.getElementById('btnAtualizarItem').addEventListener('click', atualizarItemEditado);
    document.getElementById('btnCancelarItem').addEventListener('click', cancelarEdicaoItem);
    
    // Listener para select de produto
    selectProduto.addEventListener('change', atualizarPrecoItem);
    document.getElementById('itemQuantidade').addEventListener('input', atualizarSubtotalItem);
    
    // Estado inicial
    mostrarBotoes('inicial');
    formFields.disabled = true;
    
    // Carregar dados iniciais
    carregarProdutos();
    carregarListaPedidos();
    
    searchId.focus();
});

// =====================================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================================

function showToast(texto, tipo = 'info') {
    const toastBox = document.getElementById('toast-box');
    if (!toastBox) {
        console.log(`[${tipo.toUpperCase()}] ${texto}`);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = texto;
    toastBox.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function mostrarBotoes(estado) {
    // Estados: inicial, encontrado, editando, excluindo
    const estados = {
        inicial: { buscar: true, novo: true, alterar: false, excluir: false, salvar: false, cancelar: false },
        encontrado: { buscar: true, novo: true, alterar: true, excluir: true, salvar: false, cancelar: false },
        editando: { buscar: false, novo: false, alterar: false, excluir: false, salvar: true, cancelar: true },
        excluindo: { buscar: false, novo: false, alterar: false, excluir: false, salvar: true, cancelar: true }
    };
    
    const config = estados[estado] || estados.inicial;
    
    btnBuscar.style.display = config.buscar ? 'inline-block' : 'none';
    btnNovo.style.display = config.novo ? 'inline-block' : 'none';
    btnAlterar.style.display = config.alterar ? 'inline-block' : 'none';
    btnExcluir.style.display = config.excluir ? 'inline-block' : 'none';
    btnSalvar.style.display = config.salvar ? 'inline-block' : 'none';
    btnCancelar.style.display = config.cancelar ? 'inline-block' : 'none';
}

function limparFormulario() {
    form.reset();
    document.getElementById('id_pedido').value = '';
    document.getElementById('total_pedido').value = 'R$ 0,00';
    document.getElementById('cliente_nome').value = '';
    document.getElementById('itensTableBody').innerHTML = '<tr><td colspan="6" class="empty">Nenhum item adicionado</td></tr>';
    document.getElementById('totalGeralItens').innerHTML = '<strong>R$ 0,00</strong>';
    currentPedidoId = null;
    itensAtuais = [];
    secaoItens.style.display = 'none';
}

function formatarData(dataString) {
    if (!dataString) return '';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
}

function formatarDataParaInput(data) {
    const dataObj = new Date(data);
    const ano = dataObj.getFullYear();
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dataObj.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// =====================================================================
// FUNÇÕES DE CARREGAMENTO
// =====================================================================

async function carregarProdutos() {
    try {
        const response = await fetch(`${API_BASE_URL}/produto`);
        if (response.ok) {
            produtosCache = await response.json();
            renderizarSelectProdutos();
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

function renderizarSelectProdutos() {
    selectProduto.innerHTML = '<option value="">Selecione um produto...</option>';
    produtosCache.forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.id_produto;
        option.textContent = `${produto.nome_produto} - ${formatarMoeda(produto.preco_produto)}`;
        option.dataset.preco = produto.preco_produto;
        selectProduto.appendChild(option);
    });
}

async function carregarListaPedidos() {
    const tbody = document.getElementById('pedidosTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading">Carregando pedidos...</td></tr>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/pedido`);
        if (response.ok) {
            const pedidos = await response.json();
            renderizarTabelaPedidos(pedidos);
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="empty">Erro ao carregar pedidos</td></tr>';
        }
    } catch (error) {
        console.error('Erro:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="empty">Erro ao carregar pedidos</td></tr>';
    }
}

function renderizarTabelaPedidos(pedidos) {
    const tbody = document.getElementById('pedidosTableBody');
    
    if (!pedidos || pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum pedido cadastrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    pedidos.forEach(pedido => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pedido.id_pedido}</td>
            <td>${formatarData(pedido.data_pedido)}</td>
            <td>${pedido.cliente_nome || pedido.nome_cliente || '-'}</td>
            <td>${pedido.cliente_cpf || pedido.cliente_pessoa_cpf_pessoa || '-'}</td>
            <td>${formatarMoeda(pedido.total_pedido)}</td>
            <td><span class="status-badge status-${pedido.status_pedido || 'pendente'}">${pedido.status_pedido || 'pendente'}</span></td>
        `;
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => {
            searchId.value = pedido.id_pedido;
            buscarPedido();
        });
        tbody.appendChild(tr);
    });
}

// =====================================================================
// FUNÇÕES CRUD - PEDIDO
// =====================================================================

async function buscarPedido() {
    const id = searchId.value.trim();
    if (!id) {
        showToast('Digite um ID para buscar', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/pedido/${id}`);
        
        if (response.ok) {
            const pedido = await response.json();
            preencherFormulario(pedido);
            await carregarItensDoPedido(pedido.id_pedido);
            
            formFields.disabled = true;
            secaoItens.style.display = 'block';
            mostrarBotoes('encontrado');
            showToast('Pedido encontrado!', 'success');
        } else if (response.status === 404) {
            limparFormulario();
            searchId.value = id;
            mostrarBotoes('inicial');
            showToast('Pedido não encontrado', 'warning');
        } else {
            throw new Error('Erro ao buscar pedido');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao buscar pedido', 'error');
    }
}

function preencherFormulario(pedido) {
    currentPedidoId = pedido.id_pedido;
    document.getElementById('id_pedido').value = pedido.id_pedido;
    searchId.value = pedido.id_pedido;
    document.getElementById('data_pedido').value = formatarDataParaInput(pedido.data_pedido);
    document.getElementById('cliente_cpf').value = pedido.cliente_pessoa_cpf_pessoa || pedido.cliente_cpf || '';
    document.getElementById('cliente_nome').value = pedido.nome_cliente || '';
    
    const statusEl = document.getElementById('status_pedido');
    if (pedido.status_pedido && statusEl) {
        statusEl.value = pedido.status_pedido;
    }
    
    const total = pedido.total_pedido || 0;
    document.getElementById('total_pedido').value = formatarMoeda(total);
}

async function carregarItensDoPedido(pedidoId) {
    try {
        const response = await fetch(`${API_BASE_URL}/pedido_has_produto/${pedidoId}`);
        
        if (response.ok) {
            const data = await response.json();
            itensAtuais = Array.isArray(data) ? data : [data];
            renderizarTabelaItens();
        } else {
            itensAtuais = [];
            renderizarTabelaItens();
        }
    } catch (error) {
        console.error('Erro ao carregar itens:', error);
        itensAtuais = [];
        renderizarTabelaItens();
    }
}

async function incluirPedido() {
    showToast('Preencha os dados do novo pedido', 'info');
    currentPedidoId = null;
    limparFormulario();
    
    document.getElementById('data_pedido').value = formatarDataParaInput(new Date());
    
    formFields.disabled = false;
    secaoItens.style.display = 'none';
    mostrarBotoes('editando');
    document.getElementById('cliente_cpf').focus();
    operacao = 'incluir';
}

async function alterarPedido() {
    showToast('Altere os dados do pedido', 'info');
    formFields.disabled = false;
    mostrarBotoes('editando');
    document.getElementById('data_pedido').focus();
    operacao = 'alterar';
}

async function excluirPedido() {
    if (!currentPedidoId) {
        showToast('Busque um pedido primeiro', 'warning');
        return;
    }
    
    showToast('Clique em Salvar para confirmar exclusão', 'warning');
    formFields.disabled = true;
    mostrarBotoes('excluindo');
    operacao = 'excluir';
}

async function salvarOperacao() {
    const pedidoData = {
        cliente_cpf: document.getElementById('cliente_cpf').value.replace(/\D/g, ''),
        data_pedido: document.getElementById('data_pedido').value,
        status_pedido: document.getElementById('status_pedido').value
    };

    let response = null;
    
    try {
        if (operacao === 'incluir') {
            if (!pedidoData.cliente_cpf) {
                showToast('CPF do cliente é obrigatório!', 'warning');
                return;
            }
            
            response = await fetch(`${API_BASE_URL}/pedido/gerente`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pedidoData)
            });
            
        } else if (operacao === 'alterar') {
            response = await fetch(`${API_BASE_URL}/pedido/${currentPedidoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pedidoData)
            });
            
        } else if (operacao === 'excluir') {
            if (!confirm(`Excluir pedido #${currentPedidoId}?\nEsta ação é irreversível!`)) {
                cancelarOperacao();
                return;
            }
            
            response = await fetch(`${API_BASE_URL}/pedido/${currentPedidoId}`, {
                method: 'DELETE'
            });
        }

        if (response && response.ok) {
            if (operacao === 'incluir') {
                const novoPedido = await response.json();
                currentPedidoId = novoPedido.id_pedido;
                document.getElementById('id_pedido').value = currentPedidoId;
                searchId.value = currentPedidoId;
                secaoItens.style.display = 'block';
                showToast(`Pedido #${currentPedidoId} criado com sucesso!`, 'success');
            } else if (operacao === 'alterar') {
                showToast('Pedido alterado com sucesso!', 'success');
            } else if (operacao === 'excluir') {
                showToast('Pedido excluído com sucesso!', 'success');
                limparFormulario();
            }
            
            carregarListaPedidos();
        } else if (response) {
            const error = await response.json();
            showToast(error.error || 'Erro na operação', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao processar operação', 'error');
    }

    formFields.disabled = true;
    mostrarBotoes(currentPedidoId ? 'encontrado' : 'inicial');
    searchId.focus();
    operacao = null;
}

function cancelarOperacao() {
    if (currentPedidoId) {
        // Recarregar dados do pedido atual
        buscarPedido();
    } else {
        limparFormulario();
    }
    
    formFields.disabled = true;
    mostrarBotoes(currentPedidoId ? 'encontrado' : 'inicial');
    searchId.focus();
    operacao = null;
    showToast('Operação cancelada', 'info');
}

// =====================================================================
// FUNÇÕES - ITENS DO PEDIDO (SELECT por nome)
// =====================================================================

function renderizarTabelaItens() {
    const tbody = document.getElementById('itensTableBody');
    
    if (!itensAtuais || itensAtuais.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum item adicionado</td></tr>';
        atualizarTotalGeral();
        return;
    }
    
    tbody.innerHTML = '';
    itensAtuais.forEach((item, index) => {
        const subtotal = (item.quantidade || 0) * (item.preco_unitario || 0);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.produto_id_produto}</td>
            <td>${item.nome_produto || 'Produto'}</td>
            <td>${item.quantidade}</td>
            <td>${formatarMoeda(item.preco_unitario)}</td>
            <td>${formatarMoeda(subtotal)}</td>
            <td class="acoes-cell">
                <button class="btn btn-warning btn-sm" onclick="editarItem(${index})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="excluirItem(${index})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    atualizarTotalGeral();
}

function atualizarTotalGeral() {
    let total = 0;
    itensAtuais.forEach(item => {
        total += (item.quantidade || 0) * (item.preco_unitario || 0);
    });
    
    document.getElementById('totalGeralItens').innerHTML = `<strong>${formatarMoeda(total)}</strong>`;
    document.getElementById('total_pedido').value = formatarMoeda(total);
}

function atualizarPrecoItem() {
    const option = selectProduto.options[selectProduto.selectedIndex];
    if (option && option.dataset.preco) {
        document.getElementById('itemPreco').value = formatarMoeda(option.dataset.preco);
        atualizarSubtotalItem();
    } else {
        document.getElementById('itemPreco').value = '';
        document.getElementById('itemSubtotal').value = '';
    }
}

function atualizarSubtotalItem() {
    const option = selectProduto.options[selectProduto.selectedIndex];
    const quantidade = parseInt(document.getElementById('itemQuantidade').value) || 0;
    const preco = option && option.dataset.preco ? parseFloat(option.dataset.preco) : 0;
    
    document.getElementById('itemSubtotal').value = formatarMoeda(quantidade * preco);
}

async function adicionarItem() {
    if (!currentPedidoId) {
        showToast('Salve o pedido primeiro para adicionar itens!', 'warning');
        return;
    }
    
    const produtoId = selectProduto.value;
    const quantidade = parseInt(document.getElementById('itemQuantidade').value) || 1;
    const option = selectProduto.options[selectProduto.selectedIndex];
    
    if (!produtoId) {
        showToast('Selecione um produto!', 'warning');
        return;
    }
    
    const itemData = {
        pedido_id_pedido: currentPedidoId,
        produto_id_produto: parseInt(produtoId),
        quantidade: quantidade,
        preco_unitario: parseFloat(option.dataset.preco)
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/pedido_has_produto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData)
        });
        
        if (response.ok) {
            showToast('Item adicionado com sucesso!', 'success');
            await carregarItensDoPedido(currentPedidoId);
            limparFormItem();
        } else {
            const error = await response.json();
            showToast(error.error || 'Erro ao adicionar item', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao adicionar item', 'error');
    }
}

function editarItem(index) {
    const item = itensAtuais[index];
    if (!item) return;
    
    editandoItemIndex = index;
    
    // Preencher campos
    selectProduto.value = item.produto_id_produto;
    document.getElementById('itemQuantidade').value = item.quantidade;
    atualizarPrecoItem();
    
    // Mostrar botões de edição
    document.getElementById('btnAdicionarItem').style.display = 'none';
    document.getElementById('btnAtualizarItem').style.display = 'inline-block';
    document.getElementById('btnCancelarItem').style.display = 'inline-block';
    
    showToast('Editando item. Altere e clique em Atualizar.', 'info');
}

async function atualizarItemEditado() {
    if (editandoItemIndex === null) return;
    
    const item = itensAtuais[editandoItemIndex];
    const quantidade = parseInt(document.getElementById('itemQuantidade').value) || 1;
    const option = selectProduto.options[selectProduto.selectedIndex];
    
    const itemData = {
        pedido_id_pedido: currentPedidoId,
        produto_id_produto: parseInt(selectProduto.value),
        quantidade: quantidade,
        preco_unitario: parseFloat(option.dataset.preco)
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/pedido_has_produto/${item.pedido_id_pedido}/${item.produto_id_produto}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData)
        });
        
        if (response.ok) {
            showToast('Item atualizado com sucesso!', 'success');
            await carregarItensDoPedido(currentPedidoId);
            cancelarEdicaoItem();
        } else {
            const error = await response.json();
            showToast(error.error || 'Erro ao atualizar item', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao atualizar item', 'error');
    }
}

async function excluirItem(index) {
    const item = itensAtuais[index];
    if (!item) return;
    
    if (!confirm(`Excluir item "${item.nome_produto || 'Produto'}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/pedido_has_produto/${item.pedido_id_pedido}/${item.produto_id_produto}`, {
            method: 'DELETE'
        });
        
        if (response.ok || response.status === 204) {
            showToast('Item excluído com sucesso!', 'success');
            await carregarItensDoPedido(currentPedidoId);
        } else {
            showToast('Erro ao excluir item', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao excluir item', 'error');
    }
}

function cancelarEdicaoItem() {
    editandoItemIndex = null;
    limparFormItem();
    
    document.getElementById('btnAdicionarItem').style.display = 'inline-block';
    document.getElementById('btnAtualizarItem').style.display = 'none';
    document.getElementById('btnCancelarItem').style.display = 'none';
}

function limparFormItem() {
    selectProduto.value = '';
    document.getElementById('itemQuantidade').value = 1;
    document.getElementById('itemPreco').value = '';
    document.getElementById('itemSubtotal').value = '';
}
