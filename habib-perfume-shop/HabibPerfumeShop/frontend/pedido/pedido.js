// CRUD Pedido - Similar ao modelo do professor
const baseUrl = 'http://localhost:3001/pedido';
const itemPedidoUrl = 'http://localhost:3001/pedido_has_produto';
const produtoUrl = 'http://localhost:3001/produto';

let idPedidoAtual = null;
let operacaoAtual = null; // 'incluir' ou 'alterar'
let produtosCache = [];

// ==========================
// FUNÇÕES CRUD PEDIDO
// ==========================

async function buscarPedido() {
    const id = document.getElementById('searchId').value;
    if (!id) {
        showMessage('Por favor, digite um ID para buscar.', 'error');
        // Ocultar itens quando não há ID
        document.querySelector('.itensDoPedido').style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${baseUrl}/${id}`);
        if (!response.ok) {
            throw new Error('Pedido não encontrado.');
        }
        const data = await response.json();
        
        // Preenche os campos - suporta tanto formato antigo quanto novo
        const pedido = data.pedido || data;
        document.getElementById('searchId').value = pedido.id_pedido;
        document.getElementById('searchId').readOnly = true;
        
        // Formata data
        const dataPedido = new Date(pedido.data_pedido);
        const dataFormatada = dataPedido.toISOString().split('T')[0];
        document.getElementById('data_pedido').value = dataFormatada;
        
        document.getElementById('cliente_cpf').value = pedido.cliente_cpf || '';
        document.getElementById('funcionario_cpf').value = pedido.funcionario_cpf || '';

        // Atualiza status no select (BLOQUEADO por padrão)
        const statusSelect = document.getElementById('status_pedido');
        const status = pedido.status_pedido || pedido.status || 'pendente';
        if (statusSelect) {
            statusSelect.value = status;
            statusSelect.disabled = true; // Bloqueado até clicar em Alterar
        }

        idPedidoAtual = pedido.id_pedido;
        
        // Mostra botões Alterar/Excluir, esconde Incluir
        document.getElementById('btnIncluir').style.display = 'none';
        document.getElementById('btnAlterar').style.display = 'inline-block';
        document.getElementById('btnExcluir').style.display = 'inline-block';
        document.getElementById('btnSalvar').style.display = 'none';

        // Mostra seção de itens
        document.querySelector('.itensDoPedido').style.display = 'block';

        // Carrega itens do pedido
        await carregarItensDoPedido(pedido.id_pedido, data.itens);

        showMessage('Pedido encontrado!', 'success');
    } catch (error) {
        console.error('Erro:', error);
        showMessage(error.message, 'error');
        limparFormulario();
        document.querySelector('.itensDoPedido').style.display = 'none';
    }
}

async function incluirPedido() {
    operacaoAtual = 'incluir';
    limparFormulario();
    
    // Buscar próximo ID sequencial
    try {
        const response = await fetch(`${baseUrl}/proximo-id`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('searchId').value = data.proximo_id;
            document.getElementById('searchId').readOnly = true;
        }
    } catch (error) {
        console.error('Erro ao buscar próximo ID:', error);
    }
    
    // Define data atual
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('data_pedido').value = hoje;
    
    // Habilita edição dos campos (exceto ID e status)
    habilitarEdicao();
    document.getElementById('searchId').readOnly = true;
    document.getElementById('status_pedido').disabled = true;
    
    // Oculta itens até pedido ser salvo
    document.querySelector('.itensDoPedido').style.display = 'none';
    
    document.getElementById('btnIncluir').style.display = 'none';
    document.getElementById('btnSalvar').style.display = 'inline-block';
    
    showMessage('Preencha os dados do novo pedido.', 'info');
}

async function alterarPedido() {
    if (!idPedidoAtual) {
        showMessage('Primeiro busque um pedido para alterar.', 'error');
        return;
    }
    operacaoAtual = 'alterar';
    habilitarEdicao();
    
    // Habilitar status apenas no modo alterar
    document.getElementById('status_pedido').disabled = false;
    
    // ID sempre bloqueado
    document.getElementById('searchId').readOnly = true;
    
    document.getElementById('btnAlterar').style.display = 'none';
    document.getElementById('btnExcluir').style.display = 'none';
    document.getElementById('btnSalvar').style.display = 'inline-block';
    
    showMessage('Altere os dados do pedido.', 'info');
}

async function salvarOperacao() {
    const pedidoData = {
        data_pedido: document.getElementById('data_pedido').value,
        cliente_cpf: document.getElementById('cliente_cpf').value,
        funcionario_cpf: document.getElementById('funcionario_cpf').value,
        status_pedido: document.getElementById('status_pedido').value
    };

    // Validação
    if (!pedidoData.data_pedido || !pedidoData.cliente_cpf) {
        showMessage('Preencha todos os campos obrigatórios.', 'error');
        return;
    }

    try {
        let response;
        if (operacaoAtual === 'incluir') {
            response = await fetch(`${baseUrl}/gerente`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pedidoData)
            });
        } else if (operacaoAtual === 'alterar') {
            response = await fetch(`${baseUrl}/${idPedidoAtual}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pedidoData)
            });
        }

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Erro ao salvar pedido.');
        }

        const result = await response.json();
        
        if (operacaoAtual === 'incluir') {
            idPedidoAtual = result.id_pedido || result.pedido?.id_pedido;
            document.getElementById('searchId').value = idPedidoAtual;
            
            // Após criar pedido, mostrar seção de itens para adicionar produtos
            document.querySelector('.itensDoPedido').style.display = 'block';
            
            // Limpar tabela de itens e resetar total
            document.getElementById('itensTableBody').innerHTML = '';
            document.getElementById('totalPedido').innerHTML = '<strong>R$ 0,00</strong>';
            
            // Mensagem específica para incluir
            showMessage('✅ Pedido criado! Você já pode adicionar itens.', 'success');
        } else {
            showMessage('✅ Pedido alterado com sucesso!', 'success');
        }
        
        // Atualiza estado dos botões
        document.getElementById('btnIncluir').style.display = 'none';
        document.getElementById('btnAlterar').style.display = 'inline-block';
        document.getElementById('btnExcluir').style.display = 'inline-block';
        document.getElementById('btnSalvar').style.display = 'none';
        
        // Bloquear status após salvar
        document.getElementById('status_pedido').disabled = true;
        
        desabilitarEdicao();
        operacaoAtual = null;
        
    } catch (error) {
        console.error('Erro:', error);
        showMessage(error.message, 'error');
    }
}

async function excluirPedido() {
    if (!idPedidoAtual) {
        showMessage('Primeiro busque um pedido para excluir.', 'error');
        return;
    }

    if (!confirm('Tem certeza que deseja excluir este pedido?')) {
        return;
    }

    try {
        const response = await fetch(`${baseUrl}/${idPedidoAtual}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Erro ao excluir pedido.');
        }

        showMessage('Pedido excluído com sucesso!', 'success');
        limparFormulario();
        cancelarOperacao();
        
    } catch (error) {
        console.error('Erro:', error);
        showMessage(error.message, 'error');
    }
}

function cancelarOperacao() {
    limparFormulario();
    desabilitarEdicao();
    operacaoAtual = null;
    idPedidoAtual = null;
    
    // Bloquear status
    document.getElementById('status_pedido').disabled = true;
    document.getElementById('searchId').readOnly = false;
    
    document.getElementById('btnIncluir').style.display = 'inline-block';
    document.getElementById('btnAlterar').style.display = 'none';
    document.getElementById('btnExcluir').style.display = 'none';
    document.getElementById('btnSalvar').style.display = 'none';
    
    // Limpa e oculta tabela de itens
    document.getElementById('itensTableBody').innerHTML = '';
    document.querySelector('.itensDoPedido').style.display = 'none';
    atualizarTotalPedido();
}

// ==========================
// FUNÇÕES DE ITENS DO PEDIDO
// ==========================

async function carregarProdutos() {
    try {
        const response = await fetch(produtoUrl);
        if (response.ok) {
            produtosCache = await response.json();
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

async function carregarItensDoPedido(idPedido, itensPreCarregados = null) {
    const tbody = document.getElementById('itensTableBody');
    tbody.innerHTML = '';

    try {
        let itens;
        if (itensPreCarregados) {
            itens = itensPreCarregados;
        } else {
            const response = await fetch(`${itemPedidoUrl}?pedido=${idPedido}`);
            if (!response.ok) {
                return;
            }
            itens = await response.json();
        }

        itens.forEach(item => {
            adicionarLinhaItem(item);
        });

        atualizarTotalPedido();
    } catch (error) {
        console.error('Erro ao carregar itens:', error);
    }
}

function adicionarItem() {
    if (!idPedidoAtual) {
        showMessage('Primeiro salve o pedido antes de adicionar itens.', 'error');
        return;
    }

    const tbody = document.getElementById('itensTableBody');
    const tr = document.createElement('tr');
    tr.dataset.novo = 'true';

    // Cria select de produtos - inclui estoque e marca produtos sem estoque
    let optionsProdutos = '<option value="">Selecione...</option>';
    produtosCache.forEach(p => {
        const estoque = parseInt(p.quantidade_estoque) || 0;
        const semEstoque = estoque <= 0;
        const textoEstoque = semEstoque ? ' (SEM ESTOQUE)' : ` (${estoque} em estoque)`;
        optionsProdutos += `<option value="${p.id_produto}" data-preco="${p.preco_produto}" data-nome="${p.nome_produto}" data-estoque="${estoque}" ${semEstoque ? 'disabled style="color:#888"' : ''}>${p.nome_produto} - R$ ${Number(p.preco_produto).toFixed(2)}${textoEstoque}</option>`;
    });

    tr.innerHTML = `
        <td>${idPedidoAtual}</td>
        <td>
            <select class="select-produto" onchange="selecionarProduto(this)">
                ${optionsProdutos}
            </select>
        </td>
        <td class="nome-produto">-</td>
        <td><input type="number" class="input-qtd" value="1" min="1" onchange="atualizarSubtotal(this)"></td>
        <td class="preco-unitario">R$ 0,00</td>
        <td class="subtotal">R$ 0,00</td>
        <td>
            <button type="button" class="btn-small btn-save" onclick="salvarItem(this)">💾</button>
            <button type="button" class="btn-small btn-danger" onclick="removerLinhaItem(this)">🗑️</button>
        </td>
    `;

    tbody.appendChild(tr);
}

function adicionarLinhaItem(item) {
    const tbody = document.getElementById('itensTableBody');
    const tr = document.createElement('tr');
    tr.dataset.idProduto = item.produto_id_produto || item.id_produto;
    tr.dataset.preco = item.preco_unitario;

    const subtotal = Number(item.preco_unitario) * Number(item.quantidade);

    tr.innerHTML = `
        <td>${item.pedido_id_pedido || idPedidoAtual}</td>
        <td>${item.produto_id_produto || item.id_produto}</td>
        <td>${item.nome_produto || '-'}</td>
        <td><input type="number" class="input-qtd" value="${item.quantidade}" min="1" onchange="atualizarSubtotal(this)"></td>
        <td class="preco-unitario">R$ ${Number(item.preco_unitario).toFixed(2)}</td>
        <td class="subtotal">R$ ${subtotal.toFixed(2)}</td>
        <td>
            <button type="button" class="btn-small btn-secondary" onclick="btnAtualizarItem(this)">✏️</button>
            <button type="button" class="btn-small btn-danger" onclick="btnExcluirItem(this)">🗑️</button>
        </td>
    `;

    tbody.appendChild(tr);
}

function selecionarProduto(select) {
    const tr = select.closest('tr');
    const option = select.options[select.selectedIndex];
    
    if (option.value) {
        const preco = parseFloat(option.dataset.preco) || 0;
        const nome = option.dataset.nome || '';
        const estoque = parseInt(option.dataset.estoque) || 0;
        
        // Verificar estoque
        if (estoque <= 0) {
            showMessage(`⚠️ Estoque insuficiente! O produto "${nome}" está sem estoque.`, 'error');
            select.value = '';
            return;
        }
        
        tr.querySelector('.nome-produto').textContent = nome;
        tr.querySelector('.preco-unitario').textContent = `R$ ${preco.toFixed(2)}`;
        tr.dataset.idProduto = option.value;
        tr.dataset.preco = preco;
        tr.dataset.estoque = estoque;
        
        // Limitar input de quantidade ao estoque disponível
        const inputQtd = tr.querySelector('.input-qtd');
        inputQtd.max = estoque;
        
        atualizarSubtotal(inputQtd);
    }
}

function atualizarSubtotal(input) {
    const tr = input.closest('tr');
    const preco = parseFloat(tr.dataset.preco) || 0;
    let qtd = parseInt(input.value) || 1;
    const estoqueDisponivel = parseInt(tr.dataset.estoque) || 999;
    
    // Verificar se quantidade excede estoque (apenas para itens novos)
    if (tr.dataset.novo === 'true' && qtd > estoqueDisponivel) {
        showMessage(`⚠️ Quantidade ajustada! Estoque disponível: ${estoqueDisponivel} unidade(s).`, 'warning');
        qtd = estoqueDisponivel;
        input.value = qtd;
    }
    
    const subtotal = preco * qtd;
    
    tr.querySelector('.subtotal').textContent = `R$ ${subtotal.toFixed(2)}`;
    atualizarTotalPedido();
}

function atualizarTotalPedido() {
    const subtotais = document.querySelectorAll('#itensTableBody .subtotal');
    let total = 0;
    
    subtotais.forEach(cell => {
        const valor = parseFloat(cell.textContent.replace('R$', '').replace(',', '.').trim()) || 0;
        total += valor;
    });
    
    document.getElementById('totalPedido').innerHTML = `<strong>R$ ${total.toFixed(2)}</strong>`;
}

async function salvarItem(btn) {
    const tr = btn.closest('tr');
    const idProduto = tr.dataset.idProduto;
    const qtd = parseInt(tr.querySelector('.input-qtd').value) || 1;
    const preco = parseFloat(tr.dataset.preco) || 0;
    const estoqueDisponivel = parseInt(tr.dataset.estoque) || 0;

    if (!idProduto) {
        showMessage('Selecione um produto.', 'error');
        return;
    }

    // Verificar estoque antes de salvar
    if (estoqueDisponivel <= 0) {
        showMessage('⚠️ Estoque insuficiente! Este produto está sem estoque.', 'error');
        return;
    }

    if (qtd > estoqueDisponivel) {
        showMessage(`⚠️ Estoque insuficiente! Disponível: ${estoqueDisponivel} unidade(s).`, 'error');
        tr.querySelector('.input-qtd').value = estoqueDisponivel;
        atualizarSubtotal(tr.querySelector('.input-qtd'));
        return;
    }

    try {
        const response = await fetch(itemPedidoUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pedido_id_pedido: idPedidoAtual,
                produto_id_produto: parseInt(idProduto),
                quantidade: qtd,
                preco_unitario: preco
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Erro ao salvar item.');
        }

        const result = await response.json();
        
        // Atualiza a linha com os dados salvos
        tr.dataset.novo = 'false';
        
        // Atualiza botões
        tr.querySelector('td:last-child').innerHTML = `
            <button type="button" class="btn-small btn-secondary" onclick="btnAtualizarItem(this)">✏️</button>
            <button type="button" class="btn-small btn-danger" onclick="btnExcluirItem(this)">🗑️</button>
        `;
        
        // Atualiza células
        const select = tr.querySelector('.select-produto');
        if (select) {
            const nomeProduto = select.options[select.selectedIndex].dataset.nome;
            tr.cells[1].textContent = idProduto;
            tr.cells[2].textContent = nomeProduto;
        }
        
        // Atualizar total do pedido com valor do backend
        if (result.total_pedido !== undefined) {
            document.getElementById('totalPedido').innerHTML = `<strong>R$ ${parseFloat(result.total_pedido).toFixed(2)}</strong>`;
        } else {
            atualizarTotalPedido();
        }

        showMessage('Item salvo com sucesso!', 'success');
    } catch (error) {
        console.error('Erro:', error);
        showMessage(error.message, 'error');
    }
}

async function btnAtualizarItem(btn) {
    const tr = btn.closest('tr');
    const idProduto = tr.dataset.idProduto;
    const qtd = parseInt(tr.querySelector('.input-qtd').value) || 1;
    const preco = parseFloat(tr.dataset.preco) || 0;

    try {
        const response = await fetch(`${itemPedidoUrl}/${idPedidoAtual}/${idProduto}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quantidade: qtd,
                preco_unitario: preco
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Erro ao atualizar item.');
        }

        const result = await response.json();
        
        // Atualizar subtotal na linha
        atualizarSubtotal(tr.querySelector('.input-qtd'));
        
        // Atualizar total do pedido com valor do backend
        if (result.total_pedido !== undefined) {
            document.getElementById('totalPedido').innerHTML = `<strong>R$ ${parseFloat(result.total_pedido).toFixed(2)}</strong>`;
        }
        
        showMessage('Item atualizado!', 'success');
    } catch (error) {
        console.error('Erro:', error);
        showMessage(error.message, 'error');
    }
}

async function btnExcluirItem(btn) {
    const tr = btn.closest('tr');
    const idProduto = tr.dataset.idProduto;

    if (!confirm('Excluir este item?')) return;

    try {
        const response = await fetch(`${itemPedidoUrl}/${idPedidoAtual}/${idProduto}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Erro ao excluir item.');
        }

        const result = await response.json();
        
        tr.remove();
        
        // Atualizar total do pedido com valor do backend
        if (result.total_pedido !== undefined) {
            document.getElementById('totalPedido').innerHTML = `<strong>R$ ${parseFloat(result.total_pedido).toFixed(2)}</strong>`;
        } else {
            atualizarTotalPedido();
        }
        
        showMessage('Item excluído!', 'success');
    } catch (error) {
        console.error('Erro:', error);
        showMessage(error.message, 'error');
    }
}

function removerLinhaItem(btn) {
    const tr = btn.closest('tr');
    tr.remove();
    atualizarTotalPedido();
}

// ==========================
// FUNÇÕES AUXILIARES
// ==========================

function habilitarEdicao() {
    const campos = document.querySelectorAll('#formFields input');
    campos.forEach(campo => campo.disabled = false);
}

function desabilitarEdicao() {
    const campos = document.querySelectorAll('#formFields input');
    campos.forEach(campo => campo.disabled = true);
}

function limparFormulario() {
    document.getElementById('searchId').value = '';
    document.getElementById('data_pedido').value = '';
    document.getElementById('cliente_cpf').value = '';
    document.getElementById('funcionario_cpf').value = '';
    
    // Reset status select
    const statusSelect = document.getElementById('status_pedido');
    if (statusSelect) {
        statusSelect.value = 'pendente';
        statusSelect.disabled = true;
    }
}

function showMessage(message, type = 'info') {
    const container = document.getElementById('messageContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    container.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.classList.add('fade-out');
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// ==========================
// INICIALIZAÇÃO
// ==========================

document.addEventListener('DOMContentLoaded', async function() {
    // Carrega cache de produtos
    await carregarProdutos();
    
    // Desabilita campos inicialmente
    desabilitarEdicao();
    
    // Ocultar itens inicialmente (sem ID)
    document.querySelector('.itensDoPedido').style.display = 'none';
    
    // Bloquear status inicialmente
    document.getElementById('status_pedido').disabled = true;
    
    // Event listeners dos botões
    document.getElementById('btnBuscar').addEventListener('click', buscarPedido);
    document.getElementById('btnIncluir').addEventListener('click', incluirPedido);
    document.getElementById('btnAlterar').addEventListener('click', alterarPedido);
    document.getElementById('btnExcluir').addEventListener('click', excluirPedido);
    document.getElementById('btnSalvar').addEventListener('click', salvarOperacao);
    document.getElementById('btnCancelar').addEventListener('click', cancelarOperacao);
    
    // Enter no campo de busca
    document.getElementById('searchId').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            buscarPedido();
        }
    });
    
    // Monitorar mudanças no campo de busca para ocultar itens quando vazio
    document.getElementById('searchId').addEventListener('input', function(e) {
        if (!e.target.value.trim()) {
            document.querySelector('.itensDoPedido').style.display = 'none';
            document.getElementById('itensTableBody').innerHTML = '';
            atualizarTotalPedido();
        }
    });
});