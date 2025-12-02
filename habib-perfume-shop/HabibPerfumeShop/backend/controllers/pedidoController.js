// ============================================================================
// pedidoController.js - COMPATÍVEL COM ESTRUTURA ATUAL DO BANCO
// Tabela pedido tem: id_pedido, data_pedido, cliente_cpf
// Total do pedido é calculado a partir dos itens em pedido_has_produto
// ============================================================================
const db = require('../database.js');
const path = require('path');

// =============================================================================
// ABRE CRUD DE PEDIDOS (página HTML)
// =============================================================================
exports.abrirCrudPedido = (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/pedido/pedido.html'));
};

// =============================================================================
// LISTAR PEDIDOS - GET /pedido
// =============================================================================
exports.listarPedidos = async (req, res) => {
  try {
    // Query compatível com estrutura atual do banco
    // Usa v_cliente_compat para obter nome do cliente
    const result = await db.query(`
      SELECT 
        p.id_pedido,
        p.data_pedido,
        p.cliente_cpf,
        c.nome AS cliente_nome,
        COALESCE(SUM(php.quantidade * php.preco_unitario), 0) AS total_pedido
      FROM pedido p
      LEFT JOIN v_cliente_compat c ON c.cpf = p.cliente_cpf
      LEFT JOIN pedido_has_produto php ON php.pedido_id_pedido = p.id_pedido
      GROUP BY p.id_pedido, p.data_pedido, p.cliente_cpf, c.nome
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
// =============================================================================
exports.obterPedido = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Busca pedido básico usando v_cliente_compat
    const pedidoResult = await db.query(`
      SELECT 
        p.id_pedido,
        p.data_pedido,
        p.cliente_cpf,
        c.nome AS cliente_nome
      FROM pedido p
      LEFT JOIN v_cliente_compat c ON c.cpf = p.cliente_cpf
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
// =============================================================================
exports.criarPedido = async (req, res) => {
  try {
    const { cliente_cpf, data_pedido } = req.body;
    
    if (!cliente_cpf) {
      return res.status(400).json({ error: 'CPF do cliente é obrigatório' });
    }
    
    // Verifica se cliente existe
    const clienteCheck = await db.query('SELECT cpf FROM cliente WHERE cpf = $1', [cliente_cpf]);
    if (clienteCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Cliente não encontrado' });
    }
    
    // Cria pedido (apenas com cliente_cpf)
    const result = await db.query(`
      INSERT INTO pedido (cliente_cpf, data_pedido)
      VALUES ($1, $2)
      RETURNING *
    `, [cliente_cpf, data_pedido || new Date()]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar pedido:', err);
    res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// CRIAR PEDIDO ONLINE - POST /pedido/online
// =============================================================================
exports.criarPedidoOnline = async (req, res) => {
  try {
    const { cliente_cpf, itens, data_pedido } = req.body;
    
    if (!cliente_cpf) {
      return res.status(400).json({ error: 'CPF do cliente é obrigatório' });
    }
    
    // Verifica se o cliente existe
    const clienteCheck = await db.query(`
      SELECT cpf FROM cliente WHERE cpf = $1
    `, [cliente_cpf]);
    
    if (clienteCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Cliente não encontrado' });
    }
    
    // Cria o pedido
    const result = await db.query(`
      INSERT INTO pedido (cliente_cpf, data_pedido)
      VALUES ($1, $2)
      RETURNING *
    `, [cliente_cpf, data_pedido || new Date()]);
    
    const pedido = result.rows[0];
    
    // Se tiver itens, insere na tabela pedido_has_produto
    if (itens && Array.isArray(itens) && itens.length > 0) {
      for (const item of itens) {
        await db.query(`
          INSERT INTO pedido_has_produto (
            pedido_id_pedido,
            produto_id_produto,
            quantidade,
            preco_unitario
          ) VALUES ($1, $2, $3, $4)
        `, [
          pedido.id_pedido,
          item.produto_id || item.id_produto,
          item.quantidade || 1,
          item.preco || item.preco_unitario || 0
        ]);
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Pedido criado com sucesso',
      pedido: pedido
    });
  } catch (err) {
    console.error('Erro ao criar pedido online:', err);
    res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// ATUALIZAR PEDIDO - PUT /pedido/:id
// =============================================================================
exports.atualizarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_cpf, data_pedido } = req.body;
    
    const result = await db.query(`
      UPDATE pedido SET
        cliente_cpf = COALESCE($1, cliente_cpf),
        data_pedido = COALESCE($2, data_pedido)
      WHERE id_pedido = $3
      RETURNING *
    `, [cliente_cpf, data_pedido, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar pedido:', err);
    res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// DELETAR PEDIDO - DELETE /pedido/:id
// =============================================================================
exports.deletarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Remove itens do pedido primeiro
    await db.query('DELETE FROM pedido_has_produto WHERE pedido_id_pedido = $1', [id]);
    
    // Remove o pedido
    const result = await db.query('DELETE FROM pedido WHERE id_pedido = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    res.json({ success: true, message: 'Pedido deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar pedido:', err);
    res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// COMPRAR DIRETO - POST /pedido/comprar
// =============================================================================
exports.comprarDireto = async (req, res) => {
  try {
    const usuario = req.usuario;
    if (!usuario || usuario.tipo !== 'cliente') {
      return res.status(401).json({ error: 'Necessário estar logado como cliente' });
    }
    
    const { produto_id, quantidade, preco } = req.body;
    
    if (!produto_id) {
      return res.status(400).json({ error: 'ID do produto é obrigatório' });
    }
    
    // Cria pedido
    const pedidoResult = await db.query(`
      INSERT INTO pedido (cliente_cpf, data_pedido)
      VALUES ($1, NOW())
      RETURNING *
    `, [usuario.cpf]);
    
    const pedido = pedidoResult.rows[0];
    
    // Insere item
    await db.query(`
      INSERT INTO pedido_has_produto (
        pedido_id_pedido,
        produto_id_produto,
        quantidade,
        preco_unitario
      ) VALUES ($1, $2, $3, $4)
    `, [pedido.id_pedido, produto_id, quantidade || 1, preco || 0]);
    
    res.status(201).json({
      success: true,
      pedido: pedido
    });
  } catch (err) {
    console.error('Erro ao comprar direto:', err);
    res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// FINALIZAR CARRINHO - POST /pedido/carrinho/finalizar
// =============================================================================
exports.finalizarCarrinho = async (req, res) => {
  try {
    const usuario = req.usuario;
    if (!usuario || usuario.tipo !== 'cliente') {
      return res.status(401).json({ error: 'Necessário estar logado como cliente' });
    }
    
    const { itens } = req.body;
    
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio' });
    }
    
    // Cria pedido
    const pedidoResult = await db.query(`
      INSERT INTO pedido (cliente_cpf, data_pedido)
      VALUES ($1, NOW())
      RETURNING *
    `, [usuario.cpf]);
    
    const pedido = pedidoResult.rows[0];
    
    // Insere todos os itens
    for (const item of itens) {
      await db.query(`
        INSERT INTO pedido_has_produto (
          pedido_id_pedido,
          produto_id_produto,
          quantidade,
          preco_unitario
        ) VALUES ($1, $2, $3, $4)
      `, [
        pedido.id_pedido,
        item.produto_id || item.id_produto,
        item.quantidade || 1,
        item.preco || item.preco_unitario || 0
      ]);
    }
    
    res.status(201).json({
      success: true,
      message: 'Pedido finalizado com sucesso',
      pedido: pedido
    });
  } catch (err) {
    console.error('Erro ao finalizar carrinho:', err);
    res.status(500).json({ error: err.message });
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
// =============================================================================
exports.listarPedidosPorCliente = async (req, res) => {
  try {
    const { cpf } = req.params;
    
    const result = await db.query(`
      SELECT 
        p.id_pedido,
        p.data_pedido,
        p.cliente_cpf,
        COALESCE(SUM(php.quantidade * php.preco_unitario), 0) AS total_pedido
      FROM pedido p
      LEFT JOIN pedido_has_produto php ON php.pedido_id_pedido = p.id_pedido
      WHERE p.cliente_cpf = $1
      GROUP BY p.id_pedido, p.data_pedido, p.cliente_cpf
      ORDER BY p.id_pedido DESC
    `, [cpf]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar pedidos do cliente:', err);
    res.status(500).json({ error: err.message });
  }
};
