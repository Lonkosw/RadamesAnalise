/**
 * pedidoController.js - MODELO EXATO DO PROFESSOR
 * 
 * ESTRUTURA:
 * pessoa: cpf_pessoa (PK), nome_pessoa, email_pessoa, senha_pessoa
 * cliente: pessoa_cpf_pessoa (PK/FK → pessoa), renda_cliente, data_cadastro_cliente
 * funcionario: pessoa_cpf_pessoa (PK/FK → pessoa), salario_funcionario, cargo_id_cargo
 * pedido: id_pedido (PK), data_pedido, cliente_cpf (FK), funcionario_cpf (FK, nullable)
 * pedido_has_produto: pedido_id_pedido, produto_id_produto, quantidade, preco_unitario
 */
const db = require('../database.js');
const path = require('path');

// Importa funções de estoque do pedido_has_produtoController
const { verificarEstoque, reduzirEstoque, restaurarEstoque } = require('./pedido_has_produtoController');

// =============================================================================
// ABRE CRUD DE PEDIDOS (página HTML para gerente)
// Similar ao modelo do professor
// =============================================================================
exports.abrirCrudPedido = (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/pedido/pedido.html'));
};

// =============================================================================
// LISTAR PEDIDOS - GET /pedido
// Inclui status baseado na existência de pagamento
// =============================================================================
exports.listarPedidos = async (req, res) => {
  try {
    // JOIN pessoa + cliente + pedido - usa coluna física status_pedido
    const result = await db.query(`
      SELECT 
        p.id_pedido,
        p.data_pedido,
        p.cliente_cpf,
        COALESCE(p.funcionario_cpf, 'Não registrado') AS funcionario_cpf,
        pe.nome_pessoa AS cliente_nome,
        COALESCE(SUM(php.quantidade * php.preco_unitario), 0) AS total_pedido,
        COALESCE(p.status_pedido, 'pendente') AS status_pedido
      FROM pedido p
      LEFT JOIN cliente c ON c.pessoa_cpf_pessoa = p.cliente_cpf
      LEFT JOIN pessoa pe ON pe.cpf_pessoa = c.pessoa_cpf_pessoa
      LEFT JOIN pedido_has_produto php ON php.pedido_id_pedido = p.id_pedido
      GROUP BY p.id_pedido, p.data_pedido, p.cliente_cpf, p.funcionario_cpf, pe.nome_pessoa, p.status_pedido
      ORDER BY p.id_pedido DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// OBTER PEDIDO POR ID - GET /pedido/:id
// Inclui status baseado na existência de pagamento
// =============================================================================
exports.obterPedido = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Busca pedido básico com coluna física status_pedido
    const pedidoResult = await db.query(`
      SELECT 
        p.id_pedido,
        p.data_pedido,
        p.cliente_cpf,
        COALESCE(p.funcionario_cpf, 'Não registrado') AS funcionario_cpf,
        pe.nome_pessoa AS cliente_nome,
        COALESCE(p.status_pedido, 'pendente') AS status_pedido
      FROM pedido p
      LEFT JOIN cliente c ON c.pessoa_cpf_pessoa = p.cliente_cpf
      LEFT JOIN pessoa pe ON pe.cpf_pessoa = c.pessoa_cpf_pessoa
      WHERE p.id_pedido = $1
    `, [id]);
    
    if (pedidoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    const pedido = pedidoResult.rows[0];
    
    // Busca itens do pedido
    const itensResult = await db.query(`
      SELECT 
        php.produto_id_produto,
        php.quantidade,
        php.preco_unitario,
        pr.nome_produto
      FROM pedido_has_produto php
      LEFT JOIN produto pr ON pr.id_produto = php.produto_id_produto
      WHERE php.pedido_id_pedido = $1
    `, [id]);
    
    // Calcula total
    const total = itensResult.rows.reduce((acc, item) => 
      acc + (item.quantidade * item.preco_unitario), 0);
    
    res.json({
      ...pedido,
      total_pedido: total,
      itens: itensResult.rows
    });
  } catch (err) {
    console.error('Erro ao obter pedido:', err);
    res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// CRIAR PEDIDO (GERENTE/FUNCIONARIO) - POST /pedido/gerente
// Com TRANSAÇÃO e suporte a funcionario_cpf
// =============================================================================
exports.criarPedido = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    // MODELO PROFESSOR: Aceita requisições do CRUD sem autenticação
    // A verificação de autenticação é feita na rota, não aqui
    const usuario = req.usuario;
    
    const { 
      cliente_cpf,
      funcionario_cpf,
      data_pedido,
      itens 
    } = req.body;
    
    // CPF do cliente
    const cpfCliente = cliente_cpf;
    
    if (!cpfCliente) {
      return res.status(400).json({ error: 'CPF do cliente é obrigatório' });
    }
    
    // CPF do funcionário: usa o do body ou o do usuário logado ou null
    const cpfFuncionario = funcionario_cpf || (usuario ? usuario.cpf : null) || null;
    
    await client.query('BEGIN');
    
    // Verifica se o cliente existe
    const clienteCheck = await client.query(
      'SELECT pessoa_cpf_pessoa FROM cliente WHERE pessoa_cpf_pessoa = $1', 
      [cpfCliente]
    );
    
    // Se não existe como cliente, verifica se é funcionário comprando para si
    if (clienteCheck.rows.length === 0) {
      // Verifica se existe como pessoa (funcionário pode comprar para si)
      const pessoaCheck = await client.query(
        'SELECT cpf_pessoa FROM pessoa WHERE cpf_pessoa = $1',
        [cpfCliente]
      );
      
      if (pessoaCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'CPF do cliente não encontrado' });
      }
      
      // Se é funcionário comprando para si, cria registro em cliente automaticamente
      const funcCheck = await client.query(
        'SELECT pessoa_cpf_pessoa FROM funcionario WHERE pessoa_cpf_pessoa = $1',
        [cpfCliente]
      );
      
      if (funcCheck.rows.length > 0) {
        // Cria cliente a partir do funcionário
        await client.query(`
          INSERT INTO cliente (pessoa_cpf_pessoa, data_cadastro_cliente)
          VALUES ($1, CURRENT_TIMESTAMP)
          ON CONFLICT (pessoa_cpf_pessoa) DO NOTHING
        `, [cpfCliente]);
      } else {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'CPF não é de um cliente válido' });
      }
    }
    
    // Cria o pedido com funcionario_cpf
    const pedidoResult = await client.query(`
      INSERT INTO pedido (cliente_cpf, funcionario_cpf, data_pedido)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [cpfCliente, cpfFuncionario, data_pedido || new Date()]);
    
    const pedido = pedidoResult.rows[0];
    const itensInseridos = [];
    let totalPedido = 0;
    
    // Se tiver itens, insere todos na transação (SEM alterar estoque - só altera quando status = pago)
    if (itens && Array.isArray(itens) && itens.length > 0) {
      for (const item of itens) {
        const produtoId = item.produto_id_produto || item.produto_id || item.id_produto || item.id;
        const quantidade = parseInt(item.quantidade) || 1;
        const precoUnit = parseFloat(item.preco_unitario || item.preco) || 0;
        
        if (!produtoId) continue;
        
        // Verifica se produto existe
        const prodCheck = await client.query(
          'SELECT id_produto, nome_produto, preco_produto FROM produto WHERE id_produto = $1',
          [produtoId]
        );
        
        if (prodCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Produto ID ${produtoId} não encontrado` });
        }
        
        const preco = precoUnit || parseFloat(prodCheck.rows[0].preco_produto) || 0;
        
        await client.query(`
          INSERT INTO pedido_has_produto (pedido_id_pedido, produto_id_produto, quantidade, preco_unitario)
          VALUES ($1, $2, $3, $4)
        `, [pedido.id_pedido, produtoId, quantidade, preco]);
        
        itensInseridos.push({
          produto_id_produto: produtoId,
          nome_produto: prodCheck.rows[0].nome_produto,
          quantidade,
          preco_unitario: preco,
          subtotal: quantidade * preco
        });
        
        totalPedido += quantidade * preco;
      }
    }
    
    // ATUALIZA valor_pedido na tabela pedido
    if (totalPedido > 0) {
      await client.query(
        'UPDATE pedido SET valor_pedido = $1 WHERE id_pedido = $2',
        [totalPedido, pedido.id_pedido]
      );
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      pedido: {
        ...pedido,
        cliente_cpf: cpfCliente,
        funcionario_cpf: cpfFuncionario,
        valor_pedido: totalPedido
      },
      itens: itensInseridos,
      total: totalPedido
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar pedido (gerente):', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// =============================================================================
// CRIAR PEDIDO ONLINE - POST /pedido/online
// Com TRANSAÇÃO para garantir integridade
// =============================================================================
exports.criarPedidoOnline = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    // Aceita cliente_cpf
    const cliente_cpf = req.body.cliente_cpf;
    const { itens, data_pedido } = req.body;
    
    if (!cliente_cpf) {
      return res.status(400).json({ error: 'CPF do cliente é obrigatório' });
    }
    
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio - adicione itens ao pedido' });
    }
    
    await client.query('BEGIN');
    
    // Verifica se o cliente existe
    const clienteCheck = await client.query(
      'SELECT pessoa_cpf_pessoa FROM cliente WHERE pessoa_cpf_pessoa = $1',
      [cliente_cpf]
    );
    
    if (clienteCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cliente não encontrado' });
    }
    
    // Cria o pedido (funcionario_cpf = NULL para pedidos online)
    const pedidoResult = await client.query(`
      INSERT INTO pedido (cliente_cpf, funcionario_cpf, data_pedido)
      VALUES ($1, NULL, $2)
      RETURNING *
    `, [cliente_cpf, data_pedido || new Date()]);
    
    const pedido = pedidoResult.rows[0];
    const itensInseridos = [];
    let totalPedido = 0;
    
    // Insere todos os itens na transação (SEM alterar estoque - só altera quando status = pago)
    for (const item of itens) {
      const produtoId = item.produto_id || item.id_produto || item.produto_id_produto || item.id;
      const quantidade = parseInt(item.quantidade) || 1;
      const precoUnit = parseFloat(item.preco || item.preco_unitario) || 0;
      
      if (!produtoId) continue;
      
      // Verifica se produto existe
      const prodCheck = await client.query(
        'SELECT id_produto, nome_produto, preco_produto FROM produto WHERE id_produto = $1',
        [produtoId]
      );
      
      if (prodCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Produto ID ${produtoId} não encontrado` });
      }
      
      const preco = precoUnit || parseFloat(prodCheck.rows[0].preco_produto) || 0;
      
      await client.query(`
        INSERT INTO pedido_has_produto (pedido_id_pedido, produto_id_produto, quantidade, preco_unitario)
        VALUES ($1, $2, $3, $4)
      `, [pedido.id_pedido, produtoId, quantidade, preco]);
      
      itensInseridos.push({
        produto_id_produto: produtoId,
        nome_produto: prodCheck.rows[0].nome_produto,
        quantidade,
        preco_unitario: preco,
        subtotal: quantidade * preco
      });
      
      totalPedido += quantidade * preco;
    }
    
    // ATUALIZA valor_pedido na tabela pedido
    await client.query(
      'UPDATE pedido SET valor_pedido = $1 WHERE id_pedido = $2',
      [totalPedido, pedido.id_pedido]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Pedido criado com sucesso',
      pedido: { ...pedido, valor_pedido: totalPedido },
      itens: itensInseridos,
      total: totalPedido
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar pedido online:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// =============================================================================
// ATUALIZAR PEDIDO - PUT /pedido/:id
// =============================================================================
exports.atualizarPedido = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { id } = req.params;
    const { cliente_cpf, data_pedido, status_pedido } = req.body;
    
    // Valida status_pedido se fornecido
    if (status_pedido && !['pendente', 'pago'].includes(status_pedido.toLowerCase())) {
      return res.status(400).json({ error: "Status inválido. Use 'pendente' ou 'pago'" });
    }
    
    await client.query('BEGIN');
    
    // Busca o pedido atual para comparar status
    const pedidoAtual = await client.query(
      'SELECT id_pedido, status_pedido FROM pedido WHERE id_pedido = $1',
      [id]
    );
    
    if (pedidoAtual.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    const statusAnterior = pedidoAtual.rows[0].status_pedido || 'pendente';
    const novoStatus = status_pedido ? status_pedido.toLowerCase() : null;
    let estoqueAlterado = false;
    let mensagemEstoque = '';
    
    // Se o status está sendo alterado, controlar estoque
    if (novoStatus && novoStatus !== statusAnterior) {
      const itensResult = await client.query(
        'SELECT produto_id_produto, quantidade FROM pedido_has_produto WHERE pedido_id_pedido = $1',
        [id]
      );
      const itens = itensResult.rows;
      
      // pendente → pago: REDUZIR estoque
      if (novoStatus === 'pago' && statusAnterior !== 'pago') {
        console.log(`\n📦 [atualizarPedido] Pedido #${id}: ${statusAnterior} → ${novoStatus}`);
        
        // Verificar estoque suficiente
        for (const item of itens) {
          const estoqueInfo = await verificarEstoque(item.produto_id_produto, item.quantidade, client);
          if (!estoqueInfo.disponivel) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
              error: `Estoque insuficiente. ${estoqueInfo.erro}`,
              estoqueDisponivel: estoqueInfo.estoqueAtual,
              produtoId: item.produto_id_produto
            });
          }
        }
        
        // Reduzir estoque
        for (const item of itens) {
          const novoEstoque = await reduzirEstoque(item.produto_id_produto, item.quantidade, client);
          console.log(`   📦 Estoque REDUZIDO: Produto ${item.produto_id_produto} - Qtd: -${item.quantidade} - Novo: ${novoEstoque}`);
        }
        estoqueAlterado = true;
        mensagemEstoque = `Estoque reduzido (${itens.length} itens)`;
      }
      
      // pago → pendente: RESTAURAR estoque
      if (novoStatus === 'pendente' && statusAnterior === 'pago') {
        console.log(`\n📦 [atualizarPedido] Pedido #${id}: ${statusAnterior} → ${novoStatus}`);
        
        for (const item of itens) {
          const novoEstoque = await restaurarEstoque(item.produto_id_produto, item.quantidade, client);
          console.log(`   📦 Estoque RESTAURADO: Produto ${item.produto_id_produto} - Qtd: +${item.quantidade} - Novo: ${novoEstoque}`);
        }
        estoqueAlterado = true;
        mensagemEstoque = `Estoque restaurado (${itens.length} itens)`;
      }
    }
    
    // Atualizar o pedido
    const result = await client.query(`
      UPDATE pedido SET
        cliente_cpf = COALESCE($1, cliente_cpf),
        data_pedido = COALESCE($2, data_pedido),
        status_pedido = COALESCE($3, status_pedido)
      WHERE id_pedido = $4
      RETURNING *
    `, [cliente_cpf, data_pedido, novoStatus, id]);
    
    await client.query('COMMIT');
    
    const resposta = result.rows[0];
    if (estoqueAlterado) {
      resposta.mensagem_estoque = mensagemEstoque;
    }
    
    res.json(resposta);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar pedido:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// =============================================================================
// DELETAR PEDIDO - DELETE /pedido/:id
// Só restaura estoque se o pedido estava com status 'pago'
// =============================================================================
exports.deletarPedido = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // Busca o pedido para verificar o status
    const pedidoResult = await client.query(
      'SELECT status_pedido FROM pedido WHERE id_pedido = $1',
      [id]
    );
    
    if (pedidoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    const statusAtual = pedidoResult.rows[0].status_pedido || 'pendente';
    let itensRestaurados = 0;
    
    // Só restaura estoque se o pedido estava PAGO
    if (statusAtual === 'pago') {
      const itensResult = await client.query(
        'SELECT produto_id_produto, quantidade FROM pedido_has_produto WHERE pedido_id_pedido = $1',
        [id]
      );
      
      for (const item of itensResult.rows) {
        const novoEstoque = await restaurarEstoque(item.produto_id_produto, item.quantidade, client);
        console.log(`📦 Estoque restaurado (deletarPedido): Produto ${item.produto_id_produto} - Qtd: +${item.quantidade} - Novo: ${novoEstoque}`);
        itensRestaurados++;
      }
    }
    
    // Remove itens do pedido
    await client.query('DELETE FROM pedido_has_produto WHERE pedido_id_pedido = $1', [id]);
    
    // Remove o pedido
    await client.query('DELETE FROM pedido WHERE id_pedido = $1', [id]);
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: statusAtual === 'pago' 
        ? `Pedido deletado e estoque restaurado (${itensRestaurados} itens)`
        : 'Pedido deletado (estoque não alterado - pedido estava pendente)',
      itens_restaurados: itensRestaurados
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar pedido:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// =============================================================================
// COMPRAR DIRETO - POST /pedido/comprar
// Cria pedido com status 'pendente' - estoque só é alterado ao mudar para 'pago'
// =============================================================================
exports.comprarDireto = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const usuario = req.usuario;
    if (!usuario || usuario.tipo !== 'cliente') {
      return res.status(401).json({ error: 'Necessário estar logado como cliente' });
    }
    
    const { produto_id, quantidade, preco } = req.body;
    const qtd = parseInt(quantidade) || 1;
    
    if (!produto_id) {
      return res.status(400).json({ error: 'ID do produto é obrigatório' });
    }
    
    await client.query('BEGIN');
    
    // Verifica se produto existe
    const prodCheck = await client.query(
      'SELECT id_produto, nome_produto, preco_produto FROM produto WHERE id_produto = $1',
      [produto_id]
    );
    
    if (prodCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Produto ID ${produto_id} não encontrado` });
    }
    
    const precoFinal = preco || parseFloat(prodCheck.rows[0].preco_produto) || 0;
    
    // Cria pedido com status 'pendente' (padrão)
    const pedidoResult = await client.query(`
      INSERT INTO pedido (cliente_cpf, data_pedido, status_pedido)
      VALUES ($1, NOW(), 'pendente')
      RETURNING *
    `, [usuario.cpf]);
    
    const pedido = pedidoResult.rows[0];
    
    // Insere item (SEM alterar estoque - só altera quando status = pago)
    await client.query(`
      INSERT INTO pedido_has_produto (
        pedido_id_pedido,
        produto_id_produto,
        quantidade,
        preco_unitario
      ) VALUES ($1, $2, $3, $4)
    `, [pedido.id_pedido, produto_id, qtd, precoFinal]);
    
    // Atualiza valor_pedido
    const totalPedido = qtd * precoFinal;
    await client.query(
      'UPDATE pedido SET valor_pedido = $1 WHERE id_pedido = $2',
      [totalPedido, pedido.id_pedido]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Pedido criado com status pendente. Estoque será reduzido quando for marcado como pago.',
      pedido: { ...pedido, valor_pedido: totalPedido }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao comprar direto:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// =============================================================================
// FINALIZAR CARRINHO - POST /pedido/carrinho/finalizar
// Cria pedido com status 'pendente' - estoque só é alterado ao mudar para 'pago'
// =============================================================================
exports.finalizarCarrinho = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const usuario = req.usuario;
    if (!usuario) {
      return res.status(401).json({ error: 'Necessário estar logado' });
    }
    
    const { itens, cliente_cpf } = req.body;
    
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio' });
    }
    
    // Determina o CPF do cliente:
    // - Se funcionário: usa cliente_cpf do body ou o próprio CPF do funcionário
    // - Se cliente: usa o CPF do próprio cliente
    let cpfCliente;
    let cpfFuncionario = null;
    
    if (usuario.tipo === 'funcionario') {
      cpfCliente = cliente_cpf || usuario.cpf; // Funcionário pode comprar para si
      cpfFuncionario = usuario.cpf;
    } else {
      cpfCliente = usuario.cpf;
    }
    
    await client.query('BEGIN');
    
    // Cria pedido com status 'pendente' (padrão)
    const pedidoResult = await client.query(`
      INSERT INTO pedido (cliente_cpf, funcionario_cpf, data_pedido, status_pedido)
      VALUES ($1, $2, NOW(), 'pendente')
      RETURNING *
    `, [cpfCliente, cpfFuncionario]);
    
    const pedido = pedidoResult.rows[0];
    let totalPedido = 0;
    
    // Insere todos os itens (SEM alterar estoque - só altera quando status = pago)
    for (const item of itens) {
      const produtoId = item.produto_id || item.id_produto;
      const quantidade = parseInt(item.quantidade) || 1;
      const preco = parseFloat(item.preco || item.preco_unitario) || 0;
      
      await client.query(`
        INSERT INTO pedido_has_produto (
          pedido_id_pedido,
          produto_id_produto,
          quantidade,
          preco_unitario
        ) VALUES ($1, $2, $3, $4)
      `, [pedido.id_pedido, produtoId, quantidade, preco]);
      
      totalPedido += quantidade * preco;
    }
    
    // Atualiza valor_pedido
    await client.query(
      'UPDATE pedido SET valor_pedido = $1 WHERE id_pedido = $2',
      [totalPedido, pedido.id_pedido]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Pedido criado com status pendente. Estoque será reduzido quando for marcado como pago.',
      id_pedido: pedido.id_pedido,
      pedido: { ...pedido, valor_pedido: totalPedido },
      total: totalPedido
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao finalizar carrinho:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// =============================================================================
// CONTAR PEDIDOS - GET /pedido/_count
// =============================================================================
exports.contarPedidos = async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) as total FROM pedido');
    res.json({ total: parseInt(result.rows[0].total) });
  } catch (err) {
    console.error('Erro ao contar pedidos:', err);
    res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// LISTAR PEDIDOS POR CLIENTE - GET /pedido/cliente/:cpf
// Agora busca pedidos onde o CPF é cliente OU funcionário que processou
// =============================================================================
exports.listarPedidosPorCliente = async (req, res) => {
  try {
    const { cpf } = req.params;
    
    const result = await db.query(`
      SELECT 
        p.id_pedido,
        p.data_pedido,
        p.cliente_cpf,
        COALESCE(p.funcionario_cpf, 'Não registrado') AS funcionario_cpf,
        COALESCE(p.status_pedido, 'pendente') AS status_pedido,
        COALESCE(SUM(php.quantidade * php.preco_unitario), 0) AS total_pedido
      FROM pedido p
      LEFT JOIN pedido_has_produto php ON php.pedido_id_pedido = p.id_pedido
      WHERE p.cliente_cpf = $1 OR p.funcionario_cpf = $1
      GROUP BY p.id_pedido, p.data_pedido, p.cliente_cpf, p.funcionario_cpf, p.status_pedido
      ORDER BY p.id_pedido DESC
    `, [cpf]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar pedidos do cliente:', err);
    res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// ALTERAR STATUS DO PEDIDO - PUT /pedido/:id/status
// Controle de estoque centralizado aqui:
// - pendente → pago: REDUZ estoque
// - pago → pendente: RESTAURA estoque
// =============================================================================
exports.alterarStatusPedido = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { id } = req.params;
    const { status_pedido } = req.body;
    
    // Valida status
    if (!status_pedido || !['pendente', 'pago'].includes(status_pedido.toLowerCase())) {
      return res.status(400).json({ 
        error: "Status inválido. Use 'pendente' ou 'pago'",
        valores_validos: ['pendente', 'pago']
      });
    }
    
    const novoStatus = status_pedido.toLowerCase();
    
    await client.query('BEGIN');
    
    // Busca o status anterior do pedido
    const pedidoAtual = await client.query(
      'SELECT id_pedido, status_pedido FROM pedido WHERE id_pedido = $1',
      [id]
    );
    
    if (pedidoAtual.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    const statusAnterior = pedidoAtual.rows[0].status_pedido || 'pendente';
    
    // Se o status não mudou, apenas retorna
    if (statusAnterior === novoStatus) {
      await client.query('ROLLBACK');
      return res.json({
        success: true,
        message: `Status do pedido #${id} já está como '${novoStatus}'`,
        pedido: { id_pedido: parseInt(id), status_pedido: novoStatus }
      });
    }
    
    // Busca todos os itens do pedido
    const itensResult = await client.query(
      'SELECT produto_id_produto, quantidade FROM pedido_has_produto WHERE pedido_id_pedido = $1',
      [id]
    );
    
    const itens = itensResult.rows;
    
    // =========================================================================
    // REGRA: pendente → pago = REDUZIR ESTOQUE
    // =========================================================================
    if (novoStatus === 'pago' && statusAnterior !== 'pago') {
      console.log(`\n📦 Alterando pedido #${id}: ${statusAnterior} → ${novoStatus}`);
      
      // Primeiro, verificar se há estoque suficiente para TODOS os itens
      for (const item of itens) {
        const estoqueInfo = await verificarEstoque(item.produto_id_produto, item.quantidade, client);
        if (!estoqueInfo.disponivel) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            error: `Estoque insuficiente para confirmar pagamento. ${estoqueInfo.erro}`,
            estoqueDisponivel: estoqueInfo.estoqueAtual,
            produtoId: item.produto_id_produto
          });
        }
      }
      
      // Estoque OK - reduzir de todos os itens
      for (const item of itens) {
        const novoEstoque = await reduzirEstoque(item.produto_id_produto, item.quantidade, client);
        console.log(`   📦 Estoque REDUZIDO: Produto ${item.produto_id_produto} - Qtd: -${item.quantidade} - Novo: ${novoEstoque}`);
      }
    }
    
    // =========================================================================
    // REGRA: pago → pendente = RESTAURAR ESTOQUE
    // =========================================================================
    if (novoStatus === 'pendente' && statusAnterior === 'pago') {
      console.log(`\n📦 Alterando pedido #${id}: ${statusAnterior} → ${novoStatus}`);
      
      for (const item of itens) {
        const novoEstoque = await restaurarEstoque(item.produto_id_produto, item.quantidade, client);
        console.log(`   📦 Estoque RESTAURADO: Produto ${item.produto_id_produto} - Qtd: +${item.quantidade} - Novo: ${novoEstoque}`);
      }
    }
    
    // Atualiza o status do pedido
    await client.query(
      'UPDATE pedido SET status_pedido = $1 WHERE id_pedido = $2',
      [novoStatus, id]
    );
    
    await client.query('COMMIT');
    
    const acao = novoStatus === 'pago' ? 'Estoque reduzido' : 'Estoque restaurado';
    
    res.json({
      success: true,
      message: `Status do pedido #${id} alterado: ${statusAnterior} → ${novoStatus}. ${acao} (${itens.length} itens).`,
      pedido: { id_pedido: parseInt(id), status_pedido: novoStatus },
      statusAnterior,
      itensAfetados: itens.length
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao alterar status do pedido:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// =============================================================================
// OBTER PRÓXIMO ID - GET /pedido/proximo-id
// Retorna MAX(id_pedido) + 1 para criação manual
// =============================================================================
exports.obterProximoId = async (req, res) => {
  try {
    const result = await db.query('SELECT COALESCE(MAX(id_pedido), 0) + 1 AS proximo_id FROM pedido');
    res.json({ proximo_id: result.rows[0].proximo_id });
  } catch (err) {
    console.error('Erro ao obter próximo ID:', err);
    res.status(500).json({ error: err.message });
  }
};
