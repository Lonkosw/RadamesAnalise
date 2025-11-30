// ============================================================================
// finalizar.js - Script de Finalização - Habib Perfume Shop
// Modelo do Professor adaptado
// ============================================================================

const API_BASE = 'http://localhost:3001';
let valorTotal = 0;
let cpfCliente = null;

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
            cpfCliente = data.usuario.cpf;
            console.log('Cliente logado:', data.usuario.nome, 'CPF:', cpfCliente);
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
    const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || [];

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
        const carrinhoData = JSON.parse(sessionStorage.getItem('carrinho')) || [];
        
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
async function enviarPedido() {
    const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || [];

    if (carrinho.length === 0) {
        alert("O carrinho está vazio.");
        return;
    }

    if (!cpfCliente) {
        alert("Você precisa estar logado.");
        window.location.href = '/login/login.html';
        return;
    }

    // Monta o pedido no formato do professor
    const pedido = {
        data_pedido: new Date().toISOString().split('T')[0], // Formato DATE
        cliente_pessoa_cpf_pessoa: cpfCliente
    };

    try {
        // 1. Criar o pedido via POST /pedido/online
        const resposta = await fetch(`${API_BASE}/pedido/online`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(pedido)
        });

        if (!resposta.ok) {
            const erro = await resposta.json();
            throw new Error(erro.error || 'Falha ao criar pedido na API.');
        }

        const dadosPedido = await resposta.json();
        console.log('✅ Pedido criado:', dadosPedido);

        // 2. Preparar itens para inserção em lote
        // FORMATO CORRETO DO BACKEND: {itens: [{pedido_id_pedido, produto_id_produto, quantidade, preco_unitario}]}
        const itensParaEnvio = {
            itens: carrinho.map(item => ({
                pedido_id_pedido: dadosPedido.id_pedido,
                produto_id_produto: item.id || item.codigo || item.id_produto,
                quantidade: item.quantidade,
                preco_unitario: item.preco || item.preco_unitario
            }))
        };

        console.log('Itens para envio:', itensParaEnvio);

        // 3. Enviar itens para pedido_has_produto/lote
        const respostaLote = await fetch(`${API_BASE}/pedido_has_produto/lote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(itensParaEnvio)
        });

        if (!respostaLote.ok) {
            const erroLote = await respostaLote.json();
            console.error('Erro ao inserir itens:', erroLote);
            throw new Error(erroLote.error || 'Erro ao inserir itens do pedido');
        } else {
            const dadosLote = await respostaLote.json();
            console.log('✅ Itens inseridos:', dadosLote);
        }

        // 4. Armazenar dados para página de pagamento
        const dadosPagamento = {
            id_pedido: dadosPedido.id_pedido,
            valor_total: valorTotal,
            cliente_cpf: cpfCliente
        };
        sessionStorage.setItem('dadosPagamento', JSON.stringify(dadosPagamento));

        // 5. Limpar carrinho após sucesso
        sessionStorage.removeItem('carrinho');

        // 6. Mostrar resumo e redirecionar
        let resumo = `Pedido #${dadosPedido.id_pedido} criado com sucesso!\n\nItens:\n`;
        carrinho.forEach(item => {
            const nome = item.nome || item.nome_produto || 'Produto';
            const preco = item.preco || item.preco_unitario || 0;
            resumo += `- ${nome}: ${item.quantidade} un. x R$ ${Number(preco).toFixed(2)}\n`;
        });
        resumo += `\nTotal: R$ ${valorTotal.toFixed(2)}`;

        alert(resumo);

        // 7. Redirecionar para pagamento
        window.location.href = '../pagamento/pagamento.html';

    } catch (erro) {
        console.error('❌ Erro ao enviar pedido:', erro);
        alert('Ocorreu um erro ao finalizar o pedido. Tente novamente.\n' + erro.message);
    }
}

// Event listener
document.getElementById('btn-finalizar').addEventListener('click', enviarPedido);
