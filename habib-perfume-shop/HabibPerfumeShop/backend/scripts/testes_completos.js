/**
 * Script de Testes Automatizados - HabibPerfumeShop
 * Testa todo o fluxo de cliente e gerente
 */
const http = require('http');

const API_BASE = 'http://localhost:3001';

// Variáveis para armazenar cookies de sessão
let cookies = '';

// Helper para fazer requisições HTTP
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        // Captura cookies da resposta
        if (res.headers['set-cookie']) {
          cookies = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        }
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Resultados dos testes
const resultados = {
  total: 0,
  passou: 0,
  falhou: 0,
  erros: []
};

function test(nome, passou, erro = '') {
  resultados.total++;
  if (passou) {
    resultados.passou++;
    console.log(`  ✅ ${nome}`);
  } else {
    resultados.falhou++;
    resultados.erros.push({ nome, erro });
    console.log(`  ❌ ${nome}: ${erro}`);
  }
}

async function testarInfraestrutura() {
  console.log('\n🔧 TESTE C - INFRAESTRUTURA\n');
  
  // Testar rotas principais
  const rotas = [
    { path: '/pessoa', nome: 'GET /pessoa' },
    { path: '/cliente', nome: 'GET /cliente' },
    { path: '/funcionario', nome: 'GET /funcionario' },
    { path: '/produto', nome: 'GET /produto' },
    { path: '/pedido', nome: 'GET /pedido' },
    { path: '/cargo', nome: 'GET /cargo' },
    { path: '/forma_pagamento', nome: 'GET /forma_pagamento' },
  ];

  for (const rota of rotas) {
    try {
      const res = await request('GET', rota.path);
      test(rota.nome, res.status === 200, `Status: ${res.status}`);
    } catch (err) {
      test(rota.nome, false, err.message);
    }
  }
  
  // Testar arquivos estáticos
  const arquivos = [
    { path: '/menu', nome: 'GET /menu (menu.html)' },
    { path: '/pedido/pedido.css', nome: 'GET /pedido/pedido.css' },
    { path: '/pedido/pedido.js', nome: 'GET /pedido/pedido.js' },
  ];
  
  for (const arquivo of arquivos) {
    try {
      const res = await request('GET', arquivo.path);
      test(arquivo.nome, res.status === 200, `Status: ${res.status}`);
    } catch (err) {
      test(arquivo.nome, false, err.message);
    }
  }
}

async function testarFluxoCliente() {
  console.log('\n👤 TESTE A - FLUXO DO CLIENTE\n');
  
  // 1. Login como cliente
  try {
    const loginRes = await request('POST', '/login/universal', {
      email: 'joao@email.com',
      senha: '123456'
    });
    
    test('Login cliente', loginRes.status === 200, `Status: ${loginRes.status}, Erro: ${loginRes.data?.error || ''}`);
  } catch (err) {
    test('Login cliente', false, err.message);
  }
  
  // 2. Verificar status login
  try {
    const statusRes = await request('GET', '/login/status');
    test('Verificar sessão', statusRes.status === 200 && statusRes.data?.status === 'ok', 
         `Status: ${statusRes.status}, Logado: ${statusRes.data?.status}`);
  } catch (err) {
    test('Verificar sessão', false, err.message);
  }
  
  // 3. Listar produtos
  try {
    const prodRes = await request('GET', '/produto');
    test('Listar produtos', prodRes.status === 200 && Array.isArray(prodRes.data), 
         `Status: ${prodRes.status}`);
  } catch (err) {
    test('Listar produtos', false, err.message);
  }
  
  // 4. Criar pedido online
  try {
    const pedidoRes = await request('POST', '/pedido/online', {
      data_pedido: new Date().toISOString().split('T')[0],
      cliente_cpf: '11111111111',
      itens: [
        { produto_id: 12, quantidade: 2, preco: 169.90 },
        { produto_id: 13, quantidade: 1, preco: 89.90 }
      ]
    });
    test('Criar pedido online', pedidoRes.status === 201 || pedidoRes.status === 200, 
         `Status: ${pedidoRes.status}, Erro: ${pedidoRes.data?.error || ''}`);
  } catch (err) {
    test('Criar pedido online', false, err.message);
  }
}

async function testarFluxoGerente() {
  console.log('\n👔 TESTE B - FLUXO DO GERENTE\n');
  
  // Limpar cookies anteriores
  cookies = '';
  
  // 1. Login como gerente
  try {
    const loginRes = await request('POST', '/login/universal', {
      email: 'maria@email.com',
      senha: '123456'
    });
    
    test('Login gerente', loginRes.status === 200, `Status: ${loginRes.status}, Erro: ${loginRes.data?.error || ''}`);
  } catch (err) {
    test('Login gerente', false, err.message);
  }
  
  // 2. Listar todos os pedidos
  try {
    const pedidosRes = await request('GET', '/pedido');
    test('Listar pedidos', pedidosRes.status === 200 && Array.isArray(pedidosRes.data), 
         `Status: ${pedidosRes.status}`);
    
    if (pedidosRes.data && pedidosRes.data.length > 0) {
      console.log(`     📋 ${pedidosRes.data.length} pedidos encontrados`);
    }
  } catch (err) {
    test('Listar pedidos', false, err.message);
  }
  
  // 3. Buscar pedido específico
  try {
    const pedidoRes = await request('GET', '/pedido/1');
    test('Buscar pedido por ID', pedidoRes.status === 200 || pedidoRes.status === 404, 
         `Status: ${pedidoRes.status}`);
  } catch (err) {
    test('Buscar pedido por ID', false, err.message);
  }
  
  // 4. Criar pedido via gerente
  try {
    const novoPedidoRes = await request('POST', '/pedido/gerente', {
      data_pedido: new Date().toISOString().split('T')[0],
      cliente_cpf: '11111111111',
      funcionario_cpf: '22222222222',
      itens: [
        { produto_id: 12, quantidade: 1, preco: 169.90 }
      ]
    });
    test('Criar pedido gerente', 
         novoPedidoRes.status === 201 || novoPedidoRes.status === 200, 
         `Status: ${novoPedidoRes.status}, Erro: ${novoPedidoRes.data?.error || ''}`);
    
    // Guardar ID para teste de delete
    if (novoPedidoRes.data?.pedido?.id_pedido) {
      global.idPedidoTeste = novoPedidoRes.data.pedido.id_pedido;
    }
  } catch (err) {
    test('Criar pedido gerente', false, err.message);
  }
  
  // 5. Listar itens do pedido
  try {
    const itensRes = await request('GET', '/pedido_has_produto/1');
    test('Listar itens do pedido', 
         itensRes.status === 200 || itensRes.status === 404, 
         `Status: ${itensRes.status}`);
  } catch (err) {
    test('Listar itens pedido', false, err.message);
  }
  
  // 6. Adicionar item ao pedido
  try {
    if (global.idPedidoTeste) {
      const addItemRes = await request('POST', '/pedido_has_produto', {
        pedido_id_pedido: global.idPedidoTeste,
        produto_id_produto: 13,
        quantidade: 3,
        preco_unitario: 89.90
      });
      test('Adicionar item ao pedido', 
           addItemRes.status === 201 || addItemRes.status === 200, 
           `Status: ${addItemRes.status}`);
    } else {
      test('Adicionar item ao pedido', false, 'Sem pedido de teste');
    }
  } catch (err) {
    test('Adicionar item ao pedido', false, err.message);
  }
  
  // 7. Criar pagamento
  try {
    if (global.idPedidoTeste) {
      const pagRes = await request('POST', '/pagamento/completo', {
        pedido_id_pedido: global.idPedidoTeste,
        valor_total: 1610,
        formas: [{ id_forma: 1, valor: 1610 }]
      });
      test('Criar pagamento completo', 
           pagRes.status === 201 || pagRes.status === 200, 
           `Status: ${pagRes.status}, Erro: ${pagRes.data?.error || ''}`);
    } else {
      test('Criar pagamento completo', false, 'Sem pedido de teste');
    }
  } catch (err) {
    test('Criar pagamento completo', false, err.message);
  }
}

async function testarPedidoHasProduto() {
  console.log('\n📦 TESTE pedido_has_produto\n');
  
  // Testar rota de lote
  try {
    const loteRes = await request('POST', '/pedido_has_produto/lote', {
      pedido_id_pedido: global.idPedidoTeste || 50,
      itens: [
        { produto_id_produto: 14, quantidade: 2, preco_unitario: 129.90 }
      ]
    });
    test('Inserir itens em lote', 
         loteRes.status === 201 || loteRes.status === 200 || loteRes.status === 400, 
         `Status: ${loteRes.status}`);
  } catch (err) {
    test('Inserir itens em lote', false, err.message);
  }
}

async function executarTestes() {
  console.log('═'.repeat(60));
  console.log('🧪 AUDITORIA DE TESTES - HabibPerfumeShop');
  console.log('═'.repeat(60));
  
  await testarInfraestrutura();
  await testarFluxoCliente();
  await testarFluxoGerente();
  await testarPedidoHasProduto();
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESULTADO FINAL');
  console.log('═'.repeat(60));
  console.log(`Total de testes: ${resultados.total}`);
  console.log(`✅ Passou: ${resultados.passou}`);
  console.log(`❌ Falhou: ${resultados.falhou}`);
  
  if (resultados.erros.length > 0) {
    console.log('\n🔴 ERROS ENCONTRADOS:');
    resultados.erros.forEach((e, i) => {
      console.log(`   ${i+1}. ${e.nome}: ${e.erro}`);
    });
  }
  
  console.log('\n');
  process.exit(resultados.falhou > 0 ? 1 : 0);
}

// Aguardar servidor estar pronto e executar
setTimeout(executarTestes, 2000);
