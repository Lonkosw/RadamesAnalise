/**
 * pesquisaDinamicaCliente.js - Busca dinâmica de clientes
 * HabibPerfumeShop - Adaptado do modelo do professor
 */
"use strict";

const API_BASE_URL_BUSCA = 'http://localhost:3001';
const atributosParaPesquisar = ['cpf', 'nome'];
let dadosParaFiltrar = [];

// Carregar clientes do backend
async function carregarClientes() {
    try {
        const response = await fetch(`${API_BASE_URL_BUSCA}/cliente`);
        if (!response.ok) {
            throw new Error('Erro ao buscar clientes');
        }
        
        const data = await response.json();
        
        // Mapeia os dados para o formato esperado
        // O backend retorna: cpf, nome, email...
        window.osClientes = data.map(item => ({
            cpf: item.cpf || item.pessoa_cpf_pessoa,
            nome: item.nome || item.nome_pessoa
        }));
        
        dadosParaFiltrar = window.osClientes;
        console.log('Clientes carregados:', dadosParaFiltrar.length);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        window.osClientes = [];
        dadosParaFiltrar = [];
    }
}

// Carrega clientes ao iniciar
carregarClientes();

/**
 * Cria a busca dinâmica com seleção
 */
function createBuscaDinamica({ 
    searchTypeId = 'searchType', 
    searchInputId = 'cliente_cpf', 
    resultsListId = 'resultsList', 
    atributosParaPesquisar, 
    dadosParaFiltrar 
}) {
    const searchTypeElement = document.getElementById(searchTypeId);
    const searchInputElement = document.getElementById(searchInputId);
    const resultsList = document.getElementById(resultsListId);

    if (!searchTypeElement || !searchInputElement || !resultsList) {
        console.error('Elementos da busca dinâmica não encontrados');
        return null;
    }

    let currentResolve = null;

    function hideList() {
        resultsList.classList.remove('show');
        resultsList.innerHTML = '';
    }

    function renderList(filtered) {
        resultsList.innerHTML = '';
        
        if (!filtered.length) {
            hideList();
            return;
        }

        filtered.forEach(dado => {
            const li = document.createElement('li');
            li.className = 'result-item';
            li.innerHTML = `
                <span class="result-main">${dado.nome}</span>
                <span class="result-type">(${dado.cpf})</span>
            `;

            li.addEventListener('click', () => {
                const resp = {};
                atributosParaPesquisar.forEach(attr => { 
                    resp[attr] = dado[attr]; 
                });

                hideList();
                searchInputElement.value = dado.cpf;
                searchInputElement.blur();

                if (currentResolve) {
                    currentResolve(resp);
                    currentResolve = null;
                }
            });

            resultsList.appendChild(li);
        });

        resultsList.classList.add('show');
    }

    function filterBase() {
        const query = searchInputElement.value.trim().toLowerCase();
        const type = searchTypeElement.value;
        
        if (query.length === 0) {
            hideList();
            return;
        }

        const filtered = dadosParaFiltrar.filter(dado => {
            const valor = String(dado[type] || '').toLowerCase();
            return valor.includes(query);
        });

        renderList(filtered);
    }

    // Event listeners
    searchInputElement.addEventListener('input', filterBase);
    searchInputElement.addEventListener('focus', filterBase);

    // Fechar ao clicar fora
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.search-bar-container')) {
            if (currentResolve) {
                currentResolve(null);
                currentResolve = null;
            }
            hideList();
        }
    });

    return {
        waitForSelection() {
            return new Promise(resolve => {
                currentResolve = resolve;
            });
        }
    };
}

/**
 * Função chamada pelo onfocus do input
 */
async function buscaDinamica() {
    console.log('Busca dinâmica iniciada...');
    
    // Atualiza dados se necessário
    if (dadosParaFiltrar.length === 0) {
        await carregarClientes();
    }
    
    window.bdBusca = createBuscaDinamica({ 
        atributosParaPesquisar, 
        dadosParaFiltrar 
    });

    if (!window.bdBusca) {
        console.error('Erro: bdBusca não inicializado.');
        return;
    }

    const resposta = await window.bdBusca.waitForSelection();

    if (!resposta) {
        console.log('Busca cancelada.');
        return;
    }

    console.log('Cliente selecionado:', JSON.stringify(resposta));
    document.getElementById('cliente_cpf').value = resposta.cpf || '';
    document.getElementById('searchType').value = 'cpf';
}
