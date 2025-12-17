/**
 * testes_fluxo_completo.js - Testes Completos de Fluxo de Compra
 * HabibPerfumeShop
 * 
 * Testes:
 * 1. Login Cliente + Adicionar ao Carrinho + Finalizar
 * 2. Login Gerente + Carrinho para si mesmo
 * 3. Login Gerente + Carrinho para cliente X
 * 4. Verificar pedidos no CRUD
 */

const http = require('http');
const https = require('https');

const API_BASE = 'http://localhost:3001';
let cookieCliente = null;
let cookieGerente = null;

// Cores para console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(msg, type = 'info') {
    const prefix = {
        success: `${colors.green}✅`,
        error: `${colors.red}❌`,
        info: `${colors.cyan}ℹ️`,
        warning: `${colors.yellow}⚠️`,
        title: `${colors.bold}${colors.cyan}`
    };
    console.log(`${prefix[type] || ''} ${msg}${colors.reset}`);
}

function header(text) {
    console.log('\n' + '═'.repeat(70));
    console.log(`${colors.bold}${colors.cyan}  ${text}${colors.reset}`);
    console.log('═'.repeat(70) + '\n');
}

// Função para fazer requests HTTP
function request(method, path, body = null, cookie = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (cookie) {
            options.headers['Cookie'] = cookie;
        }

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const setCookie = res.headers['set-cookie'];
                    resolve({
                        status: res.statusCode,
                        data: data ? JSON.parse(data) : {},
                        cookie: setCookie ? setCookie[0].split(';')[0] : null
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data,
                        cookie: null
                    });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

// ============================================================================
// TESTES
// ============================================================================

async function testeLoginCliente() {
    header('TESTE 1: Login Cliente');
    
    try {
        const res = await request('POST', '/login/universal', {
            email: 'ana.silva@email.com',
            senha: 'ana123'
        });
        
        if (res.status === 200 && res.data.sucesso) {
            cookieCliente = res.cookie;
            log(`Login OK: ${res.data.nome} (${res.data.tipo})`, 'success');
            log(`CPF: ${res.data.cpf}`, 'info');
            return res.data;
        } else {
            log(`Falha no login: ${JSON.stringify(res.data)}`, 'error');
            return null;
        }
    } catch (e) {
        log(`Erro: ${e.message}`, 'error');
        return null;
    }
}

async function testeLoginGerente() {
    header('TESTE 2: Login Gerente');
    
    try {
        const res = await request('POST', '/login/universal', {
            email: 'master@habib.com',
            senha: 'master123'
        });
        
        if (res.status === 200 && res.data.sucesso) {
            cookieGerente = res.cookie;
            log(`Login OK: ${res.data.nome} (${res.data.tipo})`, 'success');
            log(`CPF: ${res.data.cpf}`, 'info');
            return res.data;
        } else {
            log(`Falha no login: ${JSON.stringify(res.data)}`, 'error');
            return null;
        }
    } catch (e) {
        log(`Erro: ${e.message}`, 'error');
        return null;
    }
}

async function testePedidoCliente(cliente) {
    header('TESTE 3: Cliente Finaliza Pedido com Carrinho');
    
    if (!cliente || !cookieCliente) {
        log('Pulando teste - login do cliente falhou', 'warning');
        return null;
    }
    
    try {
        // Busca produtos
        const prodRes = await request('GET', '/produto');
        if (!prodRes.data || prodRes.data.length === 0) {
            log('Nenhum produto disponível', 'error');
            return null;
        }
        
        const produto1 = prodRes.data[0];
        const produto2 = prodRes.data.length > 1 ? prodRes.data[1] : prodRes.data[0];
        
        log(`Produto 1: ${produto1.nome_produto} - R$ ${produto1.preco_produto}`, 'info');
        log(`Produto 2: ${produto2.nome_produto} - R$ ${produto2.preco_produto}`, 'info');
        
        // Simula carrinho do cliente enviando pedido online
        const pedidoBody = {
            cliente_cpf: cliente.cpf,
            cliente_pessoa_cpf_pessoa: cliente.cpf,
            data_pedido: new Date().toISOString().split('T')[0],
            itens: [
                {
                    produto_id: produto1.id_produto,
                    id_produto: produto1.id_produto,
                    quantidade: 2,
                    preco: parseFloat(produto1.preco_produto),
                    preco_unitario: parseFloat(produto1.preco_produto)
                },
                {
                    produto_id: produto2.id_produto,
                    id_produto: produto2.id_produto,
                    quantidade: 1,
                    preco: parseFloat(produto2.preco_produto),
                    preco_unitario: parseFloat(produto2.preco_produto)
                }
            ]
        };
        
        log('Enviando pedido online...', 'info');
        const res = await request('POST', '/pedido/online', pedidoBody, cookieCliente);
        
        if (res.status === 201 && res.data.success) {
            const idPedido = res.data.pedido?.id_pedido || res.data.id_pedido;
            log(`Pedido #${idPedido} criado!`, 'success');
            log(`Total: R$ ${res.data.total?.toFixed(2) || 'N/A'}`, 'success');
            log(`Itens inseridos: ${res.data.itens?.length || 'N/A'}`, 'success');
            return idPedido;
        } else {
            log(`Erro ao criar pedido: ${JSON.stringify(res.data)}`, 'error');
            return null;
        }
    } catch (e) {
        log(`Erro: ${e.message}`, 'error');
        return null;
    }
}

async function testePedidoGerente(gerente) {
    header('TESTE 4: Gerente Compra para Si Mesmo');
    
    if (!gerente || !cookieGerente) {
        log('Pulando teste - login do gerente falhou', 'warning');
        return null;
    }
    
    try {
        // Busca produtos
        const prodRes = await request('GET', '/produto');
        const produto = prodRes.data[2] || prodRes.data[0];
        
        log(`Produto: ${produto.nome_produto} - R$ ${produto.preco_produto}`, 'info');
        
        // Pedido do gerente para si mesmo
        const pedidoBody = {
            cliente_pessoa_cpf_pessoa: gerente.cpf,
            funcionario_pessoa_cpf_pessoa: gerente.cpf,
            data_pedido: new Date().toISOString(),
            itens: [
                {
                    produto_id_produto: produto.id_produto,
                    quantidade: 3,
                    preco_unitario: parseFloat(produto.preco_produto)
                }
            ]
        };
        
        log('Enviando pedido gerente...', 'info');
        const res = await request('POST', '/pedido/gerente', pedidoBody, cookieGerente);
        
        if (res.status === 201 && res.data.success) {
            const idPedido = res.data.pedido?.id_pedido;
            log(`Pedido #${idPedido} criado!`, 'success');
            log(`Cliente CPF: ${gerente.cpf}`, 'success');
            log(`Funcionário CPF: ${gerente.cpf}`, 'success');
            log(`Total: R$ ${res.data.total?.toFixed(2) || 'N/A'}`, 'success');
            return idPedido;
        } else {
            log(`Erro: ${JSON.stringify(res.data)}`, 'error');
            return null;
        }
    } catch (e) {
        log(`Erro: ${e.message}`, 'error');
        return null;
    }
}

async function testePedidoGerenteParaCliente(gerente) {
    header('TESTE 5: Gerente Vende para Cliente X');
    
    if (!gerente || !cookieGerente) {
        log('Pulando teste - login do gerente falhou', 'warning');
        return null;
    }
    
    try {
        // Busca clientes
        const clienteRes = await request('GET', '/cliente');
        if (!clienteRes.data || clienteRes.data.length === 0) {
            log('Nenhum cliente disponível', 'error');
            return null;
        }
        
        const cliente = clienteRes.data[0];
        log(`Cliente selecionado: ${cliente.nome || cliente.pessoa_cpf_pessoa}`, 'info');
        
        // Busca produtos
        const prodRes = await request('GET', '/produto');
        const produto1 = prodRes.data[0];
        const produto2 = prodRes.data[1] || prodRes.data[0];
        
        const pedidoBody = {
            cliente_pessoa_cpf_pessoa: cliente.pessoa_cpf_pessoa || cliente.cpf,
            funcionario_pessoa_cpf_pessoa: gerente.cpf,
            data_pedido: new Date().toISOString(),
            itens: [
                {
                    produto_id_produto: produto1.id_produto,
                    quantidade: 2,
                    preco_unitario: parseFloat(produto1.preco_produto)
                },
                {
                    produto_id_produto: produto2.id_produto,
                    quantidade: 1,
                    preco_unitario: parseFloat(produto2.preco_produto)
                }
            ]
        };
        
        log('Enviando pedido para cliente...', 'info');
        const res = await request('POST', '/pedido/gerente', pedidoBody, cookieGerente);
        
        if (res.status === 201 && res.data.success) {
            const idPedido = res.data.pedido?.id_pedido;
            log(`Pedido #${idPedido} criado!`, 'success');
            log(`Cliente CPF: ${cliente.pessoa_cpf_pessoa || cliente.cpf}`, 'success');
            log(`Funcionário CPF: ${gerente.cpf}`, 'success');
            log(`Total: R$ ${res.data.total?.toFixed(2) || 'N/A'}`, 'success');
            return idPedido;
        } else {
            log(`Erro: ${JSON.stringify(res.data)}`, 'error');
            return null;
        }
    } catch (e) {
        log(`Erro: ${e.message}`, 'error');
        return null;
    }
}

async function testeVerificarCRUD(pedidos) {
    header('TESTE 6: Verificar Pedidos no CRUD');
    
    const pedidosValidos = pedidos.filter(p => p !== null);
    
    if (pedidosValidos.length === 0) {
        log('Nenhum pedido para verificar', 'warning');
        return false;
    }
    
    let todosOK = true;
    
    for (const idPedido of pedidosValidos) {
        try {
            const res = await request('GET', `/pedido/${idPedido}`);
            
            if (res.status === 200 && res.data.id_pedido) {
                log(`Pedido #${idPedido} encontrado no CRUD`, 'success');
                log(`  Cliente: ${res.data.cliente_cpf}`, 'info');
                log(`  Data: ${res.data.data_pedido}`, 'info');
                log(`  Itens: ${res.data.itens?.length || 0}`, 'info');
                log(`  Total: R$ ${res.data.total_pedido?.toFixed(2) || 'N/A'}`, 'info');
            } else {
                log(`Pedido #${idPedido} NÃO encontrado`, 'error');
                todosOK = false;
            }
        } catch (e) {
            log(`Erro ao verificar pedido #${idPedido}: ${e.message}`, 'error');
            todosOK = false;
        }
    }
    
    return todosOK;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║     TESTES COMPLETOS DE FLUXO DE COMPRA - HabibPerfumeShop         ║');
    console.log('║     Data: ' + new Date().toISOString().slice(0, 19) + '                               ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    
    const resultados = {
        loginCliente: false,
        loginGerente: false,
        pedidoCliente: null,
        pedidoGerente: null,
        pedidoGerenteCliente: null,
        crudOK: false
    };
    
    const pedidos = [];
    
    // Teste 1: Login Cliente
    const cliente = await testeLoginCliente();
    resultados.loginCliente = cliente !== null;
    
    // Teste 2: Login Gerente
    const gerente = await testeLoginGerente();
    resultados.loginGerente = gerente !== null;
    
    // Teste 3: Pedido Cliente
    const pedidoCliente = await testePedidoCliente(cliente);
    resultados.pedidoCliente = pedidoCliente;
    if (pedidoCliente) pedidos.push(pedidoCliente);
    
    // Teste 4: Gerente compra para si
    const pedidoGerente = await testePedidoGerente(gerente);
    resultados.pedidoGerente = pedidoGerente;
    if (pedidoGerente) pedidos.push(pedidoGerente);
    
    // Teste 5: Gerente vende para cliente
    const pedidoGerenteCliente = await testePedidoGerenteParaCliente(gerente);
    resultados.pedidoGerenteCliente = pedidoGerenteCliente;
    if (pedidoGerenteCliente) pedidos.push(pedidoGerenteCliente);
    
    // Teste 6: Verificar CRUD
    resultados.crudOK = await testeVerificarCRUD(pedidos);
    
    // Resumo Final
    header('RESUMO FINAL');
    
    console.log('');
    console.log(`  Login Cliente:              ${resultados.loginCliente ? colors.green + '✅ OK' : colors.red + '❌ FALHOU'}${colors.reset}`);
    console.log(`  Login Gerente:              ${resultados.loginGerente ? colors.green + '✅ OK' : colors.red + '❌ FALHOU'}${colors.reset}`);
    console.log(`  Pedido Cliente (online):    ${resultados.pedidoCliente ? colors.green + '✅ #' + resultados.pedidoCliente : colors.red + '❌ FALHOU'}${colors.reset}`);
    console.log(`  Pedido Gerente (para si):   ${resultados.pedidoGerente ? colors.green + '✅ #' + resultados.pedidoGerente : colors.red + '❌ FALHOU'}${colors.reset}`);
    console.log(`  Pedido Gerente (cliente X): ${resultados.pedidoGerenteCliente ? colors.green + '✅ #' + resultados.pedidoGerenteCliente : colors.red + '❌ FALHOU'}${colors.reset}`);
    console.log(`  Pedidos no CRUD:            ${resultados.crudOK ? colors.green + '✅ TODOS OK' : colors.red + '❌ PROBLEMA'}${colors.reset}`);
    console.log('');
    
    const totalTestes = 6;
    const testsPassados = [
        resultados.loginCliente,
        resultados.loginGerente,
        resultados.pedidoCliente !== null,
        resultados.pedidoGerente !== null,
        resultados.pedidoGerenteCliente !== null,
        resultados.crudOK
    ].filter(Boolean).length;
    
    console.log(`  📊 Resultado: ${testsPassados}/${totalTestes} testes passaram`);
    console.log('');
    
    if (testsPassados === totalTestes) {
        console.log(`  ${colors.green}${colors.bold}🎉 TODOS OS TESTES PASSARAM!${colors.reset}`);
    } else {
        console.log(`  ${colors.yellow}⚠️  Alguns testes falharam. Verifique os logs acima.${colors.reset}`);
    }
    
    console.log('');
    console.log('═'.repeat(70));
}

main().catch(console.error);
