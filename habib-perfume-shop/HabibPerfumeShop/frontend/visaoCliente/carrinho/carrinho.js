// ============================================================================
// carrinho.js - Script do Carrinho - Habib Perfume Shop
// Modelo do Professor adaptado para perfumes (unidades, não gramas)
// ============================================================================

const API_BASE = 'http://localhost:3001';

function formatarPreco(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function carregarCarrinho() {
    const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || [];
    const corpo = document.getElementById('corpo-tabela');
    const totalGeral = document.getElementById('total-geral');
    corpo.innerHTML = '';
    let total = 0;

    if (carrinho.length === 0) {
        corpo.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">🛒 Seu carrinho está vazio.</td></tr>`;
        document.getElementById('btn-finalizar').disabled = true;
        document.getElementById('btn-limpar').disabled = true;
        totalGeral.textContent = 'Total: R$ 0,00';
        return;
    }

    carrinho.forEach((item, index) => {
        // Suporta ambas as estruturas: {id, nome, preco} ou {id_produto, nome_produto, preco_unitario}
        const id = item.id || item.id_produto || item.codigo || '?';
        const nome = item.nome || item.nome_produto || 'Produto';
        const preco = Number(item.preco || item.preco_unitario || 0);
        const quantidade = item.quantidade || 1;
        
        const subtotal = preco * quantidade;
        total += subtotal;

        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td>${id}</td>
            <td>${nome}</td>
            <td>
                <input type="number" min="1" step="1" value="${quantidade}" 
                       onchange="atualizarQuantidade(${index}, this.value)">
            </td>
            <td>${formatarPreco(preco)}</td>
            <td>${formatarPreco(subtotal)}</td>
            <td><button class="btn-remover" onclick="removerItem(${index})">Remover</button></td>
        `;
        corpo.appendChild(linha);
    });

    totalGeral.textContent = `Total: ${formatarPreco(total)}`;
    document.getElementById('btn-finalizar').disabled = false;
    document.getElementById('btn-limpar').disabled = false;
}

function removerItem(index) {
    const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || [];
    carrinho.splice(index, 1);
    sessionStorage.setItem('carrinho', JSON.stringify(carrinho));
    carregarCarrinho();
}

function atualizarQuantidade(index, novaQtd) {
    const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || [];
    const qtd = parseInt(novaQtd);
    if (qtd < 1) {
        alert('Quantidade mínima é 1');
        carregarCarrinho();
        return;
    }
    carrinho[index].quantidade = qtd;
    sessionStorage.setItem('carrinho', JSON.stringify(carrinho));
    carregarCarrinho();
}

function limparCarrinho() {
    if (confirm("Tem certeza que deseja limpar todo o carrinho?")) {
        sessionStorage.removeItem('carrinho');
        carregarCarrinho();
    }
}

function finalizarPedido() {
    const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || [];
    if (carrinho.length === 0) {
        alert("Seu carrinho está vazio.");
        return;
    }
    window.location.href = "../finalizar/finalizar.html";
}

// Event listeners
document.getElementById('btn-finalizar').addEventListener('click', finalizarPedido);
document.getElementById('btn-limpar').addEventListener('click', limparCarrinho);
window.onload = carregarCarrinho;
