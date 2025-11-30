// ============================================================================
// pagamento.js - Script da Tela de Pagamento - Habib Perfume Shop
// Modelo do Professor adaptado
// ============================================================================

const API_BASE = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', function () {
    // Recupera dados do pedido do sessionStorage
    const dadosDoPedido = sessionStorage.getItem('dadosPagamento');
    
    if (!dadosDoPedido) {
        alert('Nenhum pedido encontrado. Redirecionando...');
        window.location.href = '../carrinho/carrinho.html';
        return;
    }

    const objetoDadosPedido = JSON.parse(dadosDoPedido);
    const valorTotal = objetoDadosPedido ? parseFloat(objetoDadosPedido.valor_total) : 0;
    const idPedido = objetoDadosPedido ? objetoDadosPedido.id_pedido : null;
    let valorRestante = valorTotal;
    let formasPagamento = [];

    // Elementos da DOM
    const elementoNumeroPedido = document.getElementById('numero-pedido');
    const elementoValorTotal = document.getElementById('valor-total');
    const elementoValorRestante = document.getElementById('valor-restante');
    const selectFormaPagamento = document.getElementById('forma-pagamento');
    const btnAdicionar = document.getElementById('btn-adicionar');
    const containerFormas = document.getElementById('formas-adicionadas');
    const formPagamento = document.getElementById('form-pagamento');
    const btnFinalizar = document.getElementById('btn-finalizar');

    // Exibir número do pedido
    elementoNumeroPedido.textContent = `#${idPedido}`;

    // Atualiza os valores na página
    function atualizarValores() {
        elementoValorTotal.textContent = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
        elementoValorRestante.textContent = `R$ ${valorRestante.toFixed(2).replace('.', ',')}`;

        // Atualiza cor do valor restante
        if (valorRestante <= 0) {
            elementoValorRestante.classList.add('pago');
            elementoValorRestante.style.color = '#28a745';
        } else {
            elementoValorRestante.classList.remove('pago');
            elementoValorRestante.style.color = '#dc3545';
        }

        // Habilita/desabilita botão finalizar
        btnFinalizar.disabled = valorRestante > 0.01; // Tolerância de 1 centavo
    }

    // Inicializa valores
    atualizarValores();

    // Carrega formas de pagamento do backend
    popularFormasPagamento();

    // Adiciona forma de pagamento
    btnAdicionar.addEventListener('click', function () {
        const selectEl = document.getElementById('forma-pagamento');
        const idForma = selectEl.value;
        const nomeForma = selectEl.options[selectEl.selectedIndex].text;

        if (!idForma) {
            alert('Por favor, selecione uma forma de pagamento.');
            return;
        }

        if (valorRestante <= 0) {
            alert('O valor total já foi distribuído entre as formas de pagamento.');
            return;
        }

        // Verificar se já foi adicionada
        if (formasPagamento.find(f => f.idForma == idForma)) {
            alert('Esta forma de pagamento já foi adicionada.');
            return;
        }

        adicionarFormaPagamento(idForma, nomeForma);
        selectEl.value = '';
    });

    // Adiciona uma nova forma de pagamento
    function adicionarFormaPagamento(idForma, nomeForma) {
        const id = Date.now();
        const valorSugerido = valorRestante;

        formasPagamento.push({
            id: id,
            idForma: idForma,
            nome: nomeForma,
            valor: valorSugerido
        });

        // Cria o elemento HTML
        const formaElement = document.createElement('div');
        formaElement.className = 'forma-pagamento-item';
        formaElement.id = `forma-${id}`;
        formaElement.innerHTML = `
            <div class="cabecalho-forma">
                <span class="tipo-pagamento">${nomeForma}</span>
                <button type="button" class="btn-remover" data-id="${id}">Remover</button>
            </div>
            <div class="campo-valor">
                <label for="valor-${id}">Valor (R$):</label>
                <input type="number" id="valor-${id}" min="0.01" max="${valorRestante}" step="0.01" value="${valorSugerido.toFixed(2)}" placeholder="0,00">
                <div class="erro" id="erro-${id}">Valor inválido</div>
            </div>
        `;

        containerFormas.appendChild(formaElement);

        // Adiciona evento para atualizar valor
        const inputValor = document.getElementById(`valor-${id}`);
        inputValor.addEventListener('input', function () {
            atualizarValorForma(id, parseFloat(this.value) || 0);
        });

        // Adiciona evento para remover forma
        const btnRemover = formaElement.querySelector('.btn-remover');
        btnRemover.addEventListener('click', function () {
            removerFormaPagamento(id);
        });

        // Recalcula valores
        valorRestante = valorTotal - formasPagamento.reduce((sum, f) => sum + f.valor, 0);
        atualizarValores();
    }

    // Atualiza o valor de uma forma de pagamento
    function atualizarValorForma(id, novoValor) {
        const forma = formasPagamento.find(f => f.id === id);
        const inputValor = document.getElementById(`valor-${id}`);
        const erroElement = document.getElementById(`erro-${id}`);

        if (!forma) return;

        if (novoValor < 0.01) {
            erroElement.style.display = 'block';
            inputValor.style.borderColor = '#dc3545';
            return;
        }

        forma.valor = novoValor;
        
        // Recalcula valor restante
        valorRestante = valorTotal - formasPagamento.reduce((sum, f) => sum + f.valor, 0);

        erroElement.style.display = 'none';
        inputValor.style.borderColor = '#ddd';
        atualizarValores();
    }

    // Remove uma forma de pagamento
    function removerFormaPagamento(id) {
        formasPagamento = formasPagamento.filter(f => f.id !== id);
        const formaElement = document.getElementById(`forma-${id}`);
        if (formaElement) {
            formaElement.remove();
        }

        valorRestante = valorTotal - formasPagamento.reduce((sum, f) => sum + f.valor, 0);
        atualizarValores();
    }

    // Envia o pagamento ao backend
    formPagamento.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (valorRestante > 0.01) {
            alert(`Ainda falta distribuir R$ ${valorRestante.toFixed(2).replace('.', ',')} entre as formas de pagamento.`);
            return;
        }

        // Preparar dados para envio
        const dadosPagamento = {
            pedido_id_pedido: idPedido,
            valor_total: valorTotal,
            formas: formasPagamento.map(forma => ({
                id_forma: forma.idForma,
                valor: forma.valor
            }))
        };

        console.log('Enviando pagamento:', dadosPagamento);

        try {
            // Usar a rota /pagamento/completo
            const response = await fetch(`${API_BASE}/pagamento/completo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(dadosPagamento)
            });

            if (!response.ok) {
                const erro = await response.json();
                throw new Error(erro.error || 'Erro no processamento do pagamento');
            }

            const resultado = await response.json();
            console.log('✅ Pagamento registrado:', resultado);

            // Limpar carrinho
            sessionStorage.removeItem('carrinho');
            sessionStorage.removeItem('dadosPagamento');

            alert(`✅ Pagamento realizado com sucesso!\n\nPedido #${idPedido}\nValor: R$ ${valorTotal.toFixed(2)}`);
            
            // Redirecionar para página de pedidos
            window.location.href = '../pedidos/pedidos.html';

        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            alert('Erro ao processar pagamento: ' + error.message);
        }
    });

    // Popular select de formas de pagamento
    async function popularFormasPagamento() {
        try {
            const response = await fetch(`${API_BASE}/forma_pagamento`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar formas de pagamento');
            }

            const data = await response.json();

            // Limpa e popula o select
            while (selectFormaPagamento.options.length > 1) {
                selectFormaPagamento.remove(1);
            }

            data.forEach(forma => {
                const option = document.createElement('option');
                option.value = forma.id_forma_pagamento;
                option.textContent = forma.nome_forma || forma.nome_forma_pagamento;
                selectFormaPagamento.appendChild(option);
            });

            console.log('Formas de pagamento carregadas:', data.length);

        } catch (error) {
            console.error('Erro ao carregar formas de pagamento:', error);
            // Adicionar opções padrão em caso de erro
            const opcoesPadrao = ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Boleto'];
            opcoesPadrao.forEach((nome, index) => {
                const option = document.createElement('option');
                option.value = index + 1;
                option.textContent = nome;
                selectFormaPagamento.appendChild(option);
            });
        }
    }
});
