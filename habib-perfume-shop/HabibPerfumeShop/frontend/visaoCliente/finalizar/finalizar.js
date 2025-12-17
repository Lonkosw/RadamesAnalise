// ============================================================================
// finalizar.js - Script de Finalização - Habib Perfume Shop
// Modelo do Professor adaptado
// ============================================================================

const API_BASE = 'http://localhost:3001';
let valorTotal = 0;
let cpfUsuario = null;
let tipoUsuario = null; // 'cliente' ou 'funcionario'

// Ao carregar página
document.addEventListener('DOMContentLoaded', async () => {
    await obterDadosUsuario();
    carregarFinalizar();
});

async function obterDadosUsuario() {
    try {
        const response = await fetch(`${API_BASE}/login/status`, {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.status === 'ok' && data.usuario) {
            cpfUsuario = data.usuario.cpf;
            tipoUsuario = data.usuario.tipo; // 'cliente' ou 'funcionario'
            console.log('Usuário logado:', data.usuario.nome, 'CPF:', cpfUsuario, 'Tipo:', tipoUsuario);
        } else {
            alert('Você precisa estar logado para finalizar a compra.');
            window.location.href = '/login/login.html';
        }
    } catch (error) {
        console.error('Erro ao obter dados do usuário:', error);
    }
}

function carregarFinalizar() {
    const tbodyLista = document.getElementById('listaFinalizar');
    const totalFinal = document.getElementById('total-final');
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

    tbodyLista.innerHTML = '';
    let total = 0;

    if (carrinho.length === 0) {
        tbodyLista.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem;">Carrinho vazio. Volte e adicione itens.</td></tr>`;
        document.getElementById('btn-finalizar').disabled = true;
        document.getElementById('total-final').textContent = 'Total Final: R$ 0,00';
        return;
    }

    document.getElementById('btn-finalizar').disabled = false;

    carrinho.forEach(prod => {
        // Suporta ambas as estruturas: {id, nome, preco} ou {id_produto, nome_produto, preco_unitario}
        const codigo = prod.id || prod.id_produto || prod.codigo || '?';
        const nome = prod.nome || prod.nome_produto || 'Produto';
        const preco = Number(prod.preco || prod.preco_unitario || 0);
        const quantidade = prod.quantidade || 1;
        
        const subtotal = preco * quantidade;
        total += subtotal;

        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td>${codigo}</td>
            <td>${nome}</td>
            <td>R$ ${preco.toFixed(2)}</td>
            <td>${quantidade} un.</td>
            <td>R$ ${subtotal.toFixed(2)}</td>
        `;
        tbodyLista.appendChild(linha);
    });

    document.getElementById('total-final').textContent = `Total Final: R$ ${total.toFixed(2)}`;
    valorTotal = total;
}

function obterCarrinhoParaEnvio(idPedido) {
    try {
        const carrinhoData = JSON.parse(localStorage.getItem('carrinho')) || [];
        
        return carrinhoData.map(item => ({
            id_pedido: idPedido,
            id_produto: item.id || item.codigo,
            nome_produto: item.nome,
            preco: item.preco,
            quantidade: item.quantidade
        }));
    } catch (error) {
        console.error('Erro ao processar carrinho:', error);
        return [];
    }
}

// Envia o pedido ao backend (modelo do professor)
// CORRIGIDO: Agora envia os itens junto com o pedido
// ATUALIZADO: Suporta tanto cliente quanto funcionário
async function enviarPedido() {
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

    if (carrinho.length === 0) {
        alert("O carrinho está vazio.");
        return;
    }

    if (!cpfUsuario) {
        alert("Você precisa estar logado.");
        window.location.href = '/login/login.html';
        return;
    }

    // Monta o pedido com os itens
    // Se for funcionário, usa a rota /pedido/gerente
    // Se for cliente, usa a rota /pedido/online
    const pedido = {
        data_pedido: new Date().toISOString().split('T')[0],
        cliente_cpf: cpfUsuario, // Tanto cliente quanto funcionário usam seu próprio CPF
        itens: carrinho.map(item => ({
            produto_id: item.id || item.id_produto || item.codigo,
            id_produto: item.id || item.id_produto || item.codigo,
            quantidade: item.quantidade || 1,
            preco: item.preco || item.preco_unitario || 0,
            preco_unitario: item.preco || item.preco_unitario || 0
        }))
    };

    // Se for funcionário, adiciona funcionario_cpf
    if (tipoUsuario === 'funcionario') {
        pedido.funcionario_cpf = cpfUsuario;
    }

    console.log('📦 Enviando pedido:', pedido, 'Tipo usuário:', tipoUsuario);

    try {
        // Escolhe a rota baseado no tipo de usuário
        const rota = tipoUsuario === 'funcionario' ? '/pedido/gerente' : '/pedido/online';
        
        const resposta = await fetch(`${API_BASE}${rota}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(pedido)
        });

        const dadosPedido = await resposta.json();
        
        if (!resposta.ok) {
            throw new Error(dadosPedido.error || 'Falha ao criar pedido na API.');
        }

        console.log('✅ Pedido criado:', dadosPedido);

        // Extrair o ID do pedido
        const idPedido = dadosPedido.id_pedido || dadosPedido.pedido?.id_pedido;
        const totalPedido = dadosPedido.total || valorTotal;
        
        if (!idPedido) {
            throw new Error('ID do pedido não retornado pelo servidor');
        }

        // Armazenar dados para página de pagamento
        const dadosPagamento = {
            id_pedido: idPedido,
            valor_total: totalPedido,
            cliente_cpf: cpfUsuario
        };
        sessionStorage.setItem('dadosPagamento', JSON.stringify(dadosPagamento));

        // Limpar carrinho após sucesso
        localStorage.removeItem('carrinho');

        // Mostrar resumo e redirecionar
        let resumo = `Pedido #${idPedido} criado com sucesso!\n\nItens:\n`;
        carrinho.forEach(item => {
            const nome = item.nome || item.nome_produto || 'Produto';
            const preco = item.preco || item.preco_unitario || 0;
            resumo += `- ${nome}: ${item.quantidade} un. x R$ ${Number(preco).toFixed(2)}\n`;
        });
        resumo += `\nTotal: R$ ${totalPedido.toFixed(2)}`;

        alert(resumo);

        // Redirecionar para pagamento
        window.location.href = '../pagamento/pagamento.html';

    } catch (erro) {
        console.error('❌ Erro ao enviar pedido:', erro);
        alert('Ocorreu um erro ao finalizar o pedido. Tente novamente.\n' + erro.message);
    }
}

// Event listener
document.getElementById('btn-finalizar').addEventListener('click', enviarPedido);
