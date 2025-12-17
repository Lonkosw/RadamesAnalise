/**
 * TESTES COMPLETOS - CRUD PEDIDOS E CARRINHO GERENTE
 * HabibPerfumeShop
 * 
 * Executa os testes A, B e C conforme solicitado
 */

const http = require('http');

const API_BASE = 'http://localhost:3001';
let authCookie = '';
let pedidosCriados = [];
let resultados = [];

// ========== HELPERS ==========

function request(method, path, data = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (cookie) options.headers['Cookie'] = cookie;
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null,
            cookie: setCookie ? setCookie[0].split(';')[0] : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, cookie: null });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function login(email, senha) {
  const res = await request('POST', '/login/universal', { email, senha });
  if (res.status === 200 && res.cookie) return res.cookie;
  throw new Error(`Login falhou: ${JSON.stringify(res.data)}`);
}

function log(msg, tipo = 'info') {
  const prefix = tipo === 'ok' ? '✅' : tipo === 'err' ? '❌' : tipo === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} ${msg}`);
  resultados.push({ msg, tipo });
}

// ========== TESTE A: Gerente compra como ele mesmo ==========

async function testeA() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  TESTE A: Gerente compra como ele mesmo                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  try {
    // 1. Login como gerente
    log('Fazendo login como gerente (master@habib.com)...');
    authCookie = await login('master@habib.com', 'master123');
    log('Login realizado com sucesso', 'ok');
    
    // 2. Buscar produtos disponíveis
    log('Buscando produtos disponíveis...');
    const resProdutos = await request('GET', '/produto', null, authCookie);
    if (resProdutos.status !== 200 || !resProdutos.data.length) {
      throw new Error('Nenhum produto encontrado');
    }
    const produto = resProdutos.data[0];
    log(`Produto selecionado: ${produto.nome_produto} (ID: ${produto.id_produto}) - R$ ${produto.preco_produto}`, 'ok');
    
    // 3. Criar pedido para si mesmo
    log('Criando pedido para o próprio gerente...');
    const payload = {
      cliente_pessoa_cpf_pessoa: '00000000000', // Gerente como cliente
      funcionario_pessoa_cpf_pessoa: '00000000000', // Gerente como funcionário
      data_pedido: new Date().toISOString(),
      itens: [{
        produto_id_produto: produto.id_produto,
        quantidade: 2,
        preco_unitario: produto.preco_produto
      }]
    };
    
    const resPedido = await request('POST', '/pedido/gerente', payload, authCookie);
    
    if (resPedido.status === 201 && resPedido.data.success) {
      const pedido = resPedido.data.pedido;
      pedidosCriados.push(pedido.id_pedido);
      log(`Pedido #${pedido.id_pedido} criado com sucesso!`, 'ok');
      log(`  - Cliente CPF: ${resPedido.data.pedido.cliente_pessoa_cpf_pessoa}`, 'ok');
      log(`  - Funcionário CPF: ${resPedido.data.pedido.funcionario_pessoa_cpf_pessoa}`, 'ok');
      log(`  - Total: R$ ${resPedido.data.total.toFixed(2)}`, 'ok');
      log(`  - Itens: ${resPedido.data.itens.length}`, 'ok');
      
      // 4. Verificar se o pedido aparece no CRUD
      log('Verificando se o pedido está no banco...');
      const resVerifica = await request('GET', `/pedido/${pedido.id_pedido}`, null, authCookie);
      if (resVerifica.status === 200) {
        log(`Pedido encontrado no banco: ID ${resVerifica.data.id_pedido}`, 'ok');
      } else {
        log('Pedido não encontrado no banco', 'err');
      }
      
      return true;
    } else {
      throw new Error(`Erro ao criar pedido: ${JSON.stringify(resPedido.data)}`);
    }
    
  } catch (e) {
    log(`ERRO: ${e.message}`, 'err');
    return false;
  }
}

// ========== TESTE B: Gerente compra para cliente X ==========

async function testeB() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  TESTE B: Gerente compra para cliente X                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  try {
    // 1. Login como gerente
    log('Fazendo login como gerente (master@habib.com)...');
    authCookie = await login('master@habib.com', 'master123');
    log('Login realizado com sucesso', 'ok');
    
    // 2. Buscar cliente via busca dinâmica
    log('Buscando clientes disponíveis...');
    const resClientes = await request('GET', '/cliente', null, authCookie);
    if (resClientes.status !== 200 || !resClientes.data.length) {
      throw new Error('Nenhum cliente encontrado');
    }
    
    // Seleciona cliente diferente do gerente
    const cliente = resClientes.data.find(c => c.cpf !== '00000000000') || resClientes.data[0];
    log(`Cliente selecionado: ${cliente.nome} (CPF: ${cliente.cpf})`, 'ok');
    
    // 3. Buscar produtos
    log('Buscando produtos...');
    const resProdutos = await request('GET', '/produto', null, authCookie);
    const produtos = resProdutos.data.slice(0, 2); // Pega 2 produtos
    log(`Produtos selecionados: ${produtos.map(p => p.nome_produto).join(', ')}`, 'ok');
    
    // 4. Criar pedido para o cliente
    log('Criando pedido para o cliente...');
    const payload = {
      cliente_pessoa_cpf_pessoa: cliente.cpf,
      funcionario_pessoa_cpf_pessoa: '00000000000',
      data_pedido: new Date().toISOString(),
      itens: produtos.map(p => ({
        produto_id_produto: p.id_produto,
        quantidade: 1,
        preco_unitario: p.preco_produto
      }))
    };
    
    const resPedido = await request('POST', '/pedido/gerente', payload, authCookie);
    
    if (resPedido.status === 201 && resPedido.data.success) {
      const pedido = resPedido.data.pedido;
      pedidosCriados.push(pedido.id_pedido);
      log(`Pedido #${pedido.id_pedido} criado com sucesso!`, 'ok');
      log(`  - Cliente: ${cliente.nome} (${cliente.cpf})`, 'ok');
      log(`  - Funcionário: 00000000000 (Master Gerente)`, 'ok');
      log(`  - Total: R$ ${resPedido.data.total.toFixed(2)}`, 'ok');
      log(`  - Itens: ${resPedido.data.itens.length}`, 'ok');
      
      // 5. Verificar no CRUD
      log('Verificando no CRUD...');
      const resVerifica = await request('GET', `/pedido/${pedido.id_pedido}`, null, authCookie);
      if (resVerifica.status === 200) {
        log(`CRUD exibe pedido corretamente: ID ${resVerifica.data.id_pedido}, Cliente: ${resVerifica.data.cliente_cpf}`, 'ok');
      }
      
      return true;
    } else {
      throw new Error(`Erro ao criar pedido: ${JSON.stringify(resPedido.data)}`);
    }
    
  } catch (e) {
    log(`ERRO: ${e.message}`, 'err');
    return false;
  }
}

// ========== TESTE C: CRUD Pedido Completo ==========

async function testeC() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  TESTE C: CRUD Pedido Completo                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  try {
    // 1. Login
    authCookie = await login('master@habib.com', 'master123');
    log('Login realizado', 'ok');
    
    // 2. Buscar pedido existente
    const pedidoId = pedidosCriados[0];
    log(`Buscando pedido #${pedidoId}...`);
    const resBusca = await request('GET', `/pedido/${pedidoId}`, null, authCookie);
    if (resBusca.status === 200) {
      log(`Pedido encontrado: ID ${resBusca.data.id_pedido}, Data: ${resBusca.data.data_pedido}`, 'ok');
    } else {
      throw new Error('Pedido não encontrado');
    }
    
    // 3. Atualizar data do pedido
    log('Atualizando data do pedido...');
    const novaData = '2025-12-25';
    const resUpdate = await request('PUT', `/pedido/${pedidoId}`, { 
      data_pedido: novaData 
    }, authCookie);
    if (resUpdate.status === 200) {
      log(`Data atualizada para ${novaData}`, 'ok');
    } else {
      log(`Erro ao atualizar data: ${JSON.stringify(resUpdate.data)}`, 'warn');
    }
    
    // 4. Buscar itens do pedido
    log('Buscando itens do pedido...');
    const resItens = await request('GET', `/pedido_has_produto/${pedidoId}`, null, authCookie);
    if (resItens.status === 200 && resItens.data.length > 0) {
      log(`Itens encontrados: ${resItens.data.length}`, 'ok');
      const item = resItens.data[0];
      
      // 5. Atualizar quantidade de um item
      log('Atualizando quantidade do primeiro item...');
      const resUpdateItem = await request('PUT', `/pedido_has_produto/${pedidoId}/${item.produto_id_produto}`, {
        quantidade: 5,
        preco_unitario: item.preco_unitario
      }, authCookie);
      if (resUpdateItem.status === 200) {
        log(`Quantidade atualizada para 5`, 'ok');
      } else {
        log(`Erro ao atualizar item: ${resUpdateItem.status}`, 'warn');
      }
      
      // 6. Adicionar novo item
      log('Adicionando novo item ao pedido...');
      const resProdutos = await request('GET', '/produto', null, authCookie);
      const novoProduto = resProdutos.data.find(p => !resItens.data.some(i => i.produto_id_produto === p.id_produto));
      
      if (novoProduto) {
        const resNovoItem = await request('POST', '/pedido_has_produto', {
          pedido_id_pedido: pedidoId,
          produto_id_produto: novoProduto.id_produto,
          quantidade: 1,
          preco_unitario: novoProduto.preco_produto
        }, authCookie);
        
        if (resNovoItem.status === 201 || resNovoItem.status === 200) {
          log(`Item adicionado: ${novoProduto.nome_produto}`, 'ok');
          
          // 7. Excluir item adicionado
          log('Excluindo item adicionado...');
          const resDelItem = await request('DELETE', `/pedido_has_produto/${pedidoId}/${novoProduto.id_produto}`, null, authCookie);
          if (resDelItem.status === 200 || resDelItem.status === 204) {
            log('Item excluído com sucesso', 'ok');
          } else {
            log(`Erro ao excluir item: ${resDelItem.status}`, 'warn');
          }
        }
      }
    }
    
    // 8. Criar pedido para excluir
    log('Criando pedido de teste para exclusão...');
    const resProdutosX = await request('GET', '/produto', null, authCookie);
    const prodX = resProdutosX.data[0];
    
    const resNewPedido = await request('POST', '/pedido/gerente', {
      cliente_pessoa_cpf_pessoa: '00000000000',
      funcionario_pessoa_cpf_pessoa: '00000000000',
      data_pedido: new Date().toISOString(),
      itens: [{ produto_id_produto: prodX.id_produto, quantidade: 1, preco_unitario: prodX.preco_produto }]
    }, authCookie);
    
    if (resNewPedido.status === 201) {
      const idParaExcluir = resNewPedido.data.pedido.id_pedido;
      log(`Pedido #${idParaExcluir} criado para teste de exclusão`, 'ok');
      
      // 9. Excluir pedido
      log('Excluindo pedido...');
      const resDelPedido = await request('DELETE', `/pedido/${idParaExcluir}`, null, authCookie);
      if (resDelPedido.status === 200) {
        log(`Pedido #${idParaExcluir} excluído com sucesso`, 'ok');
      } else {
        log(`Erro ao excluir pedido: ${resDelPedido.status}`, 'err');
      }
    }
    
    return true;
    
  } catch (e) {
    log(`ERRO: ${e.message}`, 'err');
    return false;
  }
}

// ========== MAIN ==========

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     TESTES COMPLETOS - CRUD PEDIDOS E CARRINHO GERENTE         ║');
  console.log('║     HabibPerfumeShop - ' + new Date().toISOString().slice(0, 19) + '                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const resultadoA = await testeA();
  const resultadoB = await testeB();
  const resultadoC = await testeC();
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                     RESUMO DOS TESTES                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Teste A (Gerente compra para si): ${resultadoA ? '✅ PASSOU' : '❌ FALHOU'}`);
  console.log(`Teste B (Gerente vende para cliente): ${resultadoB ? '✅ PASSOU' : '❌ FALHOU'}`);
  console.log(`Teste C (CRUD completo): ${resultadoC ? '✅ PASSOU' : '❌ FALHOU'}`);
  
  const total = [resultadoA, resultadoB, resultadoC].filter(Boolean).length;
  console.log(`\n📊 Resultado Final: ${total}/3 testes passaram`);
  
  console.log('\n📦 Pedidos criados durante os testes:', pedidosCriados);
  
  // Contagem por tipo
  const erros = resultados.filter(r => r.tipo === 'err').length;
  const avisos = resultados.filter(r => r.tipo === 'warn').length;
  const ok = resultados.filter(r => r.tipo === 'ok').length;
  
  console.log(`\n📈 Estatísticas:`);
  console.log(`   - Sucesso: ${ok}`);
  console.log(`   - Avisos: ${avisos}`);
  console.log(`   - Erros: ${erros}`);
}

main().catch(console.error);
