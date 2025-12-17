// ============================================================================
// pedidos.js - Script de Meus Pedidos - Habib Perfume Shop
// ============================================================================

const API_BASE = 'http://localhost:3001';
let cpfCliente = null;

document.addEventListener('DOMContentLoaded', async () => {
    await obterDadosUsuario();
    if (cpfCliente) {
        await carregarPedidos();
    }
});

async function obterDadosUsuario() {
    try {
        const response = await fetch(`${API_BASE}/login/status`, {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.status === 'ok' && data.usuario) {
            cpfCliente = data.usuario.cpf;
            console.log('Cliente logado:', data.usuario.nome, 'CPF:', cpfCliente);
        } else {
            alert('Você precisa estar logado para ver seus pedidos.');
            window.location.href = '/login/login.html';
        }
    } catch (error) {
        console.error('Erro ao obter dados do usuário:', error);
    }
}

async function carregarPedidos() {
    const container = document.getElementById('lista-pedidos');
    
    try {
        // Buscar pedidos do cliente
        const response = await fetch(`${API_BASE}/pedido/cliente/${cpfCliente}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar pedidos');
        }

        const pedidos = await response.json();
        console.log('Pedidos encontrados:', pedidos);

        if (pedidos.length === 0) {
            container.innerHTML = `
                <div class="sem-pedidos">
                    <p>Você ainda não fez nenhum pedido.</p>
                    <p><a href="/menu">Comece a comprar agora!</a></p>
                </div>
            `;
            return;
        }

        // Renderizar pedidos
        container.innerHTML = '';
        
        for (const pedido of pedidos) {
            // Buscar itens de cada pedido
            let itens = [];
            try {
                const itensResponse = await fetch(`${API_BASE}/pedido_has_produto/${pedido.id_pedido}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                if (itensResponse.ok) {
                    itens = await itensResponse.json();
                }
            } catch (e) {
                console.warn('Não foi possível carregar itens do pedido', pedido.id_pedido);
            }

            // Buscar pagamento
            let pagamento = null;
            try {
                const pagResponse = await fetch(`${API_BASE}/pagamento/${pedido.id_pedido}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                if (pagResponse.ok) {
                    pagamento = await pagResponse.json();
                }
            } catch (e) {
                console.warn('Não foi possível carregar pagamento do pedido', pedido.id_pedido);
            }

            // Calcular total
            const total = itens.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0);

            // Formatar data
            const data = new Date(pedido.data_pedido).toLocaleDateString('pt-BR');

            // Criar card do pedido
            const card = document.createElement('div');
            card.className = 'pedido-card';
            
            // Usar status_pedido do banco (não mais baseado em pagamento)
            const statusPedido = (pedido.status_pedido || 'pendente').toLowerCase();
            const isPago = statusPedido === 'pago';
            
            // Botão de pagar (só aparece se status é 'pendente')
            const botaoPagar = !isPago 
                ? `<button class="btn-pagar" onclick="pagarPedido(${pedido.id_pedido}, ${total})">💳 Pagar Agora</button>`
                : '';
            
            card.innerHTML = `
                <div class="pedido-header">
                    <span class="pedido-numero">Pedido #${pedido.id_pedido}</span>
                    <span class="pedido-data">${data}</span>
                    <span class="pedido-status ${isPago ? 'status-pago' : 'status-pendente'}">
                        ${isPago ? '✅ Pago' : '⏳ Aguardando Pagamento'}
                    </span>
                </div>
                <div class="pedido-itens">
                    <h4>Itens:</h4>
                    <ul>
                        ${itens.length > 0 
                            ? itens.map(item => `<li>${item.nome_produto || 'Produto'} - ${item.quantidade} un. x R$ ${parseFloat(item.preco_unitario).toFixed(2)}</li>`).join('')
                            : '<li>Carregando itens...</li>'
                        }
                    </ul>
                </div>
                <div class="pedido-footer">
                    <div class="pedido-total">
                        Total: R$ ${total.toFixed(2)}
                    </div>
                    ${botaoPagar}
                </div>
            `;

            container.appendChild(card);
        }

    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        container.innerHTML = `
            <div class="sem-pedidos">
                <p>Erro ao carregar pedidos. Tente novamente.</p>
            </div>
        `;
    }
}

/**
 * Redireciona para a página de pagamento de um pedido pendente
 * @param {number} idPedido - ID do pedido
 * @param {number} valorTotal - Valor total do pedido
 */
function pagarPedido(idPedido, valorTotal) {
    // Salvar dados do pedido no sessionStorage para a página de pagamento
    const dadosPagamento = {
        id_pedido: idPedido,
        valor_total: valorTotal,
        cliente_cpf: cpfCliente
    };
    sessionStorage.setItem('dadosPagamento', JSON.stringify(dadosPagamento));
    
    // Redirecionar para página de pagamento
    window.location.href = '../pagamento/pagamento.html';
}
