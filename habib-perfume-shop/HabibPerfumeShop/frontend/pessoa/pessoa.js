/**
 * pessoa.js - CRUD UNIFICADO DE PESSOAS
 * Gerencia Cliente e Funcionário em um único formulário
 */

const API_BASE_URL = 'http://localhost:3001';

// Estado
let operacao = null; // 'incluir' | 'alterar'
let cpfAtual = null;
let cargosCache = [];

// Elementos DOM
const form = document.getElementById('pessoaForm');
const formFields = document.getElementById('formFields');
const searchCpf = document.getElementById('searchCpf');

// Botões
const btnBuscar = document.getElementById('btnBuscar');
const btnNovo = document.getElementById('btnNovo');
const btnSalvar = document.getElementById('btnSalvar');
const btnAlterar = document.getElementById('btnAlterar');
const btnExcluir = document.getElementById('btnExcluir');
const btnCancelar = document.getElementById('btnCancelar');

// Campos condicionais
const tipoSelect = document.getElementById('tipo');
const camposCliente = document.getElementById('camposCliente');
const camposFuncionario = document.getElementById('camposFuncionario');

// Tabela
const pessoasTableBody = document.getElementById('pessoasTableBody');

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    await carregarCargos();
    await carregarPessoas();
    setupEventListeners();
    resetarEstado();
});

function setupEventListeners() {
    btnBuscar.addEventListener('click', buscarPessoa);
    btnNovo.addEventListener('click', novaPessoa);
    btnSalvar.addEventListener('click', salvarPessoa);
    btnAlterar.addEventListener('click', habilitarAlteracao);
    btnExcluir.addEventListener('click', excluirPessoa);
    btnCancelar.addEventListener('click', cancelarOperacao);

    // Mudança de tipo
    tipoSelect.addEventListener('change', atualizarCamposCondicionais);

    // Máscara de CPF
    searchCpf.addEventListener('input', aplicarMascaraCpf);
    document.getElementById('cpf_pessoa').addEventListener('input', aplicarMascaraCpf);

    // Enter para buscar
    searchCpf.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarPessoa();
        }
    });
}

// ============================================================================
// MÁSCARAS E FORMATAÇÃO
// ============================================================================
function aplicarMascaraCpf(e) {
    let valor = e.target.value.replace(/\D/g, '');
    if (valor.length > 11) valor = valor.slice(0, 11);
    
    if (valor.length > 9) {
        valor = valor.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (valor.length > 6) {
        valor = valor.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (valor.length > 3) {
        valor = valor.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    e.target.value = valor;
}

function limparCpf(cpf) {
    return (cpf || '').replace(/\D/g, '');
}

function formatarCpf(cpf) {
    const limpo = limparCpf(cpf);
    if (limpo.length !== 11) return limpo;
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarData(dataString) {
    if (!dataString) return '-';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ============================================================================
// CARREGAR DADOS
// ============================================================================
async function carregarCargos() {
    try {
        const response = await fetch(`${API_BASE_URL}/cargo`);
        if (response.ok) {
            cargosCache = await response.json();
            popularSelectCargos();
        }
    } catch (error) {
        console.error('Erro ao carregar cargos:', error);
    }
}

function popularSelectCargos() {
    const select = document.getElementById('cargo_id_cargo');
    select.innerHTML = '<option value="">Selecione o cargo</option>';
    cargosCache.forEach(cargo => {
        select.innerHTML += `<option value="${cargo.id_cargo}">${cargo.nome_cargo}</option>`;
    });
}

async function carregarPessoas() {
    try {
        const response = await fetch(`${API_BASE_URL}/pessoa`);
        if (!response.ok) throw new Error('Erro ao carregar pessoas');
        
        const pessoas = await response.json();
        renderizarTabela(pessoas);
    } catch (error) {
        console.error('Erro:', error);
        pessoasTableBody.innerHTML = '<tr><td colspan="5" class="error">Erro ao carregar dados</td></tr>';
    }
}

function renderizarTabela(pessoas) {
    if (!pessoas || pessoas.length === 0) {
        pessoasTableBody.innerHTML = '<tr><td colspan="5" class="empty">Nenhuma pessoa cadastrada</td></tr>';
        return;
    }

    pessoasTableBody.innerHTML = pessoas.map(p => {
        const tipoLabel = p.tipo === 'funcionario' ? '👔 Funcionário' : 
                          p.tipo === 'cliente' ? '👤 Cliente' : '👥 Pessoa';
        
        let infoExtra = '-';
        if (p.tipo === 'funcionario') {
            infoExtra = p.nome_cargo || 'Sem cargo';
        } else if (p.tipo === 'cliente') {
            infoExtra = formatarMoeda(p.renda_cliente);
        }

        return `
            <tr onclick="selecionarPessoa('${p.cpf_pessoa}')" style="cursor: pointer;">
                <td><code>${formatarCpf(p.cpf_pessoa)}</code></td>
                <td>${p.nome_pessoa || '-'}</td>
                <td>${p.email_pessoa || '-'}</td>
                <td><span class="badge badge-${p.tipo}">${tipoLabel}</span></td>
                <td>${infoExtra}</td>
            </tr>
        `;
    }).join('');
}

// ============================================================================
// OPERAÇÕES CRUD
// ============================================================================
async function buscarPessoa() {
    const cpf = limparCpf(searchCpf.value);
    
    if (!cpf || cpf.length !== 11) {
        toast('Digite um CPF válido com 11 dígitos', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/pessoa/${cpf}`);
        
        if (response.ok) {
            const pessoa = await response.json();
            preencherFormulario(pessoa);
            cpfAtual = cpf;
            
            formFields.disabled = true;
            mostrarBotoes(['btnAlterar', 'btnExcluir', 'btnCancelar']);
            toast('Pessoa encontrada!', 'success');
            
        } else if (response.status === 404) {
            limparFormulario();
            document.getElementById('cpf_pessoa').value = formatarCpf(cpf);
            toast('CPF não encontrado. Clique em "Novo" para cadastrar.', 'info');
            mostrarBotoes(['btnNovo', 'btnCancelar']);
        } else {
            throw new Error('Erro na busca');
        }
    } catch (error) {
        console.error('Erro:', error);
        toast('Erro ao buscar pessoa', 'danger');
    }
}

function novaPessoa() {
    limparFormulario();
    operacao = 'incluir';
    cpfAtual = null;
    
    // Se já tem CPF na busca, usar
    const cpfBusca = limparCpf(searchCpf.value);
    if (cpfBusca.length === 11) {
        document.getElementById('cpf_pessoa').value = formatarCpf(cpfBusca);
    }
    
    formFields.disabled = false;
    document.getElementById('cpf_pessoa').disabled = false; // Habilitar CPF para nova pessoa
    document.getElementById('cpf_pessoa').focus();
    mostrarBotoes(['btnSalvar', 'btnCancelar']);
    toast('Preencha os dados da nova pessoa', 'info');
}

function habilitarAlteracao() {
    operacao = 'alterar';
    formFields.disabled = false;
    document.getElementById('cpf_pessoa').disabled = true; // CPF não pode mudar
    document.getElementById('nome_pessoa').focus();
    mostrarBotoes(['btnSalvar', 'btnCancelar']);
    toast('Editando dados...', 'info');
}

async function salvarPessoa() {
    // Validações
    const cpf = limparCpf(document.getElementById('cpf_pessoa').value);
    const nome = document.getElementById('nome_pessoa').value.trim();
    const email = document.getElementById('email_pessoa').value.trim();
    const senha = document.getElementById('senha_pessoa').value;
    const tipo = document.getElementById('tipo').value;

    if (!cpf || cpf.length !== 11) {
        toast('CPF inválido (11 dígitos)', 'warning');
        return;
    }
    if (!nome) {
        toast('Nome é obrigatório', 'warning');
        return;
    }
    if (!email) {
        toast('Email é obrigatório', 'warning');
        return;
    }
    if (operacao === 'incluir' && !senha) {
        toast('Senha é obrigatória para novo cadastro', 'warning');
        return;
    }
    if (!tipo) {
        toast('Selecione o tipo (Cliente ou Funcionário)', 'warning');
        return;
    }

    // Montar dados
    const dados = {
        cpf_pessoa: cpf,
        nome_pessoa: nome,
        email_pessoa: email,
        data_nascimento_pessoa: document.getElementById('data_nascimento_pessoa').value || null,
        endereco_pessoa: document.getElementById('endereco_pessoa').value || null,
        tipo: tipo
    };

    // Senha (só incluir se preenchida)
    if (senha) {
        dados.senha_pessoa = senha;
    }

    // Dados específicos de tipo
    if (tipo === 'cliente') {
        dados.renda_cliente = parseFloat(document.getElementById('renda_cliente').value) || 0;
    } else if (tipo === 'funcionario') {
        const cargo = document.getElementById('cargo_id_cargo').value;
        if (!cargo) {
            toast('Cargo é obrigatório para funcionário', 'warning');
            return;
        }
        dados.cargo_id_cargo = parseInt(cargo);
        dados.salario_funcionario = parseFloat(document.getElementById('salario_funcionario').value) || 0;
        dados.porcentagem_comissao_funcionario = parseFloat(document.getElementById('porcentagem_comissao_funcionario').value) || 0;
    }

    try {
        let response;
        
        if (operacao === 'incluir') {
            response = await fetch(`${API_BASE_URL}/pessoa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
        } else {
            response = await fetch(`${API_BASE_URL}/pessoa/${cpfAtual || cpf}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
        }

        if (response.ok) {
            const resultado = await response.json();
            toast(operacao === 'incluir' ? '✅ Pessoa cadastrada!' : '✅ Dados atualizados!', 'success');
            await carregarPessoas();
            resetarEstado();
        } else {
            const error = await response.json();
            toast(error.error || 'Erro ao salvar', 'danger');
        }
    } catch (error) {
        console.error('Erro:', error);
        toast('Erro de conexão', 'danger');
    }
}

async function excluirPessoa() {
    if (!cpfAtual) {
        toast('Nenhuma pessoa selecionada', 'warning');
        return;
    }

    if (!confirm(`Deseja realmente excluir a pessoa com CPF ${formatarCpf(cpfAtual)}?\n\nIsso também excluirá os dados de cliente/funcionário associados.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/pessoa/${cpfAtual}`, {
            method: 'DELETE'
        });

        if (response.ok || response.status === 204) {
            toast('✅ Pessoa excluída!', 'success');
            await carregarPessoas();
            resetarEstado();
        } else {
            const error = await response.json();
            toast(error.error || 'Erro ao excluir', 'danger');
        }
    } catch (error) {
        console.error('Erro:', error);
        toast('Erro de conexão', 'danger');
    }
}

function cancelarOperacao() {
    resetarEstado();
    toast('Operação cancelada', 'info');
}

// ============================================================================
// AUXILIARES
// ============================================================================
function preencherFormulario(pessoa) {
    document.getElementById('cpf_pessoa').value = formatarCpf(pessoa.cpf_pessoa);
    document.getElementById('nome_pessoa').value = pessoa.nome_pessoa || '';
    document.getElementById('email_pessoa').value = pessoa.email_pessoa || '';
    document.getElementById('senha_pessoa').value = ''; // Nunca preencher senha
    document.getElementById('endereco_pessoa').value = pessoa.endereco_pessoa || '';
    
    if (pessoa.data_nascimento_pessoa) {
        const data = new Date(pessoa.data_nascimento_pessoa);
        document.getElementById('data_nascimento_pessoa').value = data.toISOString().split('T')[0];
    } else {
        document.getElementById('data_nascimento_pessoa').value = '';
    }

    // Tipo
    document.getElementById('tipo').value = pessoa.tipo || '';
    atualizarCamposCondicionais();

    // Dados de cliente
    if (pessoa.tipo === 'cliente') {
        document.getElementById('renda_cliente').value = pessoa.renda_cliente || 0;
        document.getElementById('data_cadastro_cliente').value = formatarData(pessoa.data_cadastro_cliente);
    }

    // Dados de funcionário
    if (pessoa.tipo === 'funcionario') {
        document.getElementById('cargo_id_cargo').value = pessoa.cargo_id_cargo || '';
        document.getElementById('salario_funcionario').value = pessoa.salario_funcionario || 0;
        document.getElementById('porcentagem_comissao_funcionario').value = pessoa.porcentagem_comissao_funcionario || 0;
    }
}

function limparFormulario() {
    form.reset();
    document.getElementById('data_cadastro_cliente').value = '';
    atualizarCamposCondicionais();
}

function resetarEstado() {
    limparFormulario();
    searchCpf.value = '';
    operacao = null;
    cpfAtual = null;
    formFields.disabled = true;
    document.getElementById('cpf_pessoa').disabled = false; // Resetar estado do CPF
    mostrarBotoes(['btnBuscar', 'btnNovo']);
    searchCpf.focus();
}

function atualizarCamposCondicionais() {
    const tipo = tipoSelect.value;
    
    camposCliente.style.display = tipo === 'cliente' ? 'block' : 'none';
    camposFuncionario.style.display = tipo === 'funcionario' ? 'block' : 'none';
    
    // Required nos campos condicionais
    document.getElementById('renda_cliente').required = (tipo === 'cliente');
    document.getElementById('cargo_id_cargo').required = (tipo === 'funcionario');
}

function mostrarBotoes(visibles) {
    const allBtns = ['btnBuscar', 'btnNovo', 'btnSalvar', 'btnAlterar', 'btnExcluir', 'btnCancelar'];
    allBtns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = visibles.includes(id) ? 'inline-block' : 'none';
    });
}

// Função global para clique na tabela
window.selecionarPessoa = function(cpf) {
    searchCpf.value = formatarCpf(cpf);
    buscarPessoa();
};

// ============================================================================
// TOAST
// ============================================================================
function toast(msg, type = 'info') {
    let box = document.getElementById('toast-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'toast-box';
        document.body.appendChild(box);
    }
    
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    box.appendChild(el);
    
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

// ============================================================================
// LOGOUT
// ============================================================================
function logout() {
    document.cookie = 'usuario=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login/login.html';
}
