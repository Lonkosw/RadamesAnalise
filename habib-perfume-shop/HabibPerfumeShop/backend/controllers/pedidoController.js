// ============================================================================
// pedidoController.js - MODELO DO PROFESSOR (CandyShop)
// Adaptado para HabibPerfumeShop
// ============================================================================
const { query } = require('../database');
const path = require('path');

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================
const isCpf = (v) => typeof v === 'string' && /^\d{11}$/.test(String(v).trim());
const normCpf = (v) => String(v || '').trim();
const toInt = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };

// ============================================================================
// ABRIR CRUD PEDIDO (página HTML)
// ============================================================================
exports.abrirCrudPedido = (req, res) => {
  const usuario = req.cookies.usuarioLogado || req.cookies.usuario;
  
  if (usuario) {
    res.sendFile(path.join(__dirname, '../../frontend/pedido/pedido.html'));   
  } else {
    res.redirect('/login');
  }
};

// ============================================================================
// LISTAR TODOS OS PEDIDOS - GET /pedido
// ============================================================================
exports.listarPedidos = async (req, res) => {
  try {
    const result = await query('SELECT * FROM pedido ORDER BY id_pedido');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Alias para compatibilidade
exports.listarTodosPedidos = exports.listarPedidos;

// ============================================================================
// CRIAR PEDIDO GERENTE - POST /pedido/gerente
// Usado pelo funcionário/gerente para criar pedidos manualmente
// TABELA: pedido(id_pedido, data_pedido, cliente_cpf)
// ============================================================================
exports.criarPedido = async (req, res) => {
  console.log('Criando pedido visao gerente com dados:', req.body);
  try {
    // Aceita múltiplos nomes de campo
    const data_pedido = req.body.data_pedido || new Date().toISOString().split('T')[0];
    const cliente_cpf = req.body.cliente_cpf || req.body.cliente_pessoa_cpf_pessoa;

    if (!cliente_cpf) {
      return res.status(400).json({ error: 'CPF do cliente é obrigatório' });
    }

    const result = await query(
      'INSERT INTO pedido (data_pedido, cliente_cpf) VALUES ($1, $2) RETURNING *',
      [data_pedido, cliente_cpf]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar pedido:', error);

    if (error.code === '23502') {
      return res.status(400).json({
        error: 'Dados obrigatórios não fornecidos'
      });
    }
    
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'CPF do cliente não encontrado'
      });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// CRIAR PEDIDO ONLINE - POST /pedido/online
// Usado pelo cliente no e-commerce
// TABELA: pedido(id_pedido, data_pedido, cliente_cpf)
// ============================================================================
exports.criarPedidoOnline = async (req, res) => {
  console.log('Criando pedido ONLINE com dados:', req.body);
  
  try {
    // Aceita múltiplos nomes de campo para compatibilidade
    const data_pedido = req.body.data_pedido || new Date().toISOString().split('T')[0];
    const cliente_cpf = req.body.cliente_cpf || req.body.cliente_pessoa_cpf_pessoa;

    if (!cliente_cpf) {
      return res.status(400).json({ error: 'CPF do cliente é obrigatório' });
    }

    // Tabela real: pedido(id_pedido, data_pedido, cliente_cpf)
    const sql = 'INSERT INTO pedido (data_pedido, cliente_cpf) VALUES ($1, $2) RETURNING *';

    console.log('SQL a ser executado:', sql);
    console.log('Valores:', [data_pedido, cliente_cpf]);

    const result = await query(sql, [data_pedido, cliente_cpf]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar pedido (online):', error);

    if (error.code === '23502') {
      return res.status(400).json({
        error: 'Dados obrigatórios não fornecidos'
      });
    }
    
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'CPF do cliente não encontrado. Verifique se o cliente existe.'
      });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// OBTER PEDIDO POR ID - GET /pedido/:id
// ============================================================================
exports.obterPedido = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID deve ser um número válido' });
    }

    const result = await query(
      'SELECT * FROM pedido WHERE id_pedido = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// ATUALIZAR PEDIDO - PUT /pedido/:id
// ============================================================================
exports.atualizarPedido = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    // Aceita múltiplos nomes de campo
    const data_pedido = req.body.data_pedido;
    const cliente_cpf = req.body.cliente_cpf || req.body.cliente_pessoa_cpf_pessoa;

    // Verifica se o pedido existe
    const existing = await query('SELECT * FROM pedido WHERE id_pedido = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const sql = `
      UPDATE pedido
      SET data_pedido = COALESCE($1, data_pedido),
          cliente_cpf = COALESCE($2, cliente_cpf)
      WHERE id_pedido = $3
      RETURNING *
    `;
    const values = [data_pedido, cliente_cpf, id];

    const updateResult = await query(sql, values);
    return res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// DELETAR PEDIDO - DELETE /pedido/:id
// ============================================================================
exports.deletarPedido = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const existingResult = await query(
      'SELECT * FROM pedido WHERE id_pedido = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    await query(
      'DELETE FROM pedido WHERE id_pedido = $1',
      [id]
    );

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar pedido:', error);

    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Não é possível deletar pedido com dependências associadas'
      });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// GET /pedido/_count (apenas funcionários)
exports.contarPedidos = async (_req, res) => {
  try {
    const r = await query('SELECT COUNT(*)::int AS count FROM pedido');
    res.json({ count: r.rows[0]?.count ?? 0 });
  } catch (error) {
    console.error('Erro ao contar pedidos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// GET /pedido/cliente/:cpf
exports.listarPedidosPorCliente = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    if (!isCpf(cpf)) return res.status(400).json({ error: 'CPF inválido' });
    
    // Tabela real: pedido.cliente_cpf
    const r = await query('SELECT * FROM pedido WHERE cliente_cpf = $1 ORDER BY id_pedido DESC', [cpf]);
    res.json(r.rows);
  } catch (error) {
    console.error('Erro ao listar pedidos do cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// FUNÇÕES LEGADAS (mantidas para retrocompatibilidade com frontend existente)
// ============================================================================

// Compra direta (mantida para compatibilidade com frontend existente)
exports.comprarDireto = async (req, res) => {
  try {
    const usuario = req.usuario;
    if (!usuario) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { id_produto, quantidade = 1 } = req.body || {};
    const idProd = toInt(id_produto);
    const qtd = toInt(quantidade);

    if (!idProd || idProd <= 0) {
      return res.status(400).json({ error: 'id_produto inválido' });
    }
    if (!qtd || qtd <= 0) {
      return res.status(400).json({ error: 'quantidade deve ser maior que 0' });
    }

    // Verificar produto
    const prodRes = await query('SELECT id_produto, nome_produto, preco_produto, quantidade_estoque FROM produto WHERE id_produto = $1', [idProd]);
    if (prodRes.rowCount === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    const produto = prodRes.rows[0];
    if (produto.quantidade_estoque < qtd) {
      return res.status(400).json({ error: `Estoque insuficiente. Disponível: ${produto.quantidade_estoque}` });
    }

    let clienteCpf = usuario.cpf;
    if (usuario.tipo === 'funcionario') {
      return res.status(400).json({ error: 'Funcionários devem usar o CRUD de pedidos para criar pedidos' });
    }

    const precoUnit = Number(produto.preco_produto);
    const total = precoUnit * qtd;

    // Criar pedido - TABELA REAL: pedido(id_pedido, data_pedido, cliente_cpf)
    const pedidoRes = await query(
      'INSERT INTO pedido (data_pedido, cliente_cpf) VALUES (NOW(), $1) RETURNING id_pedido, data_pedido',
      [clienteCpf]
    );
    const pedido = pedidoRes.rows[0];

    await query(
      'INSERT INTO pedido_has_produto (pedido_id_pedido, produto_id_produto, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)',
      [pedido.id_pedido, idProd, qtd, precoUnit]
    );

    await query(
      'UPDATE produto SET quantidade_estoque = quantidade_estoque - $1 WHERE id_produto = $2',
      [qtd, idProd]
    );

    res.status(201).json({
      success: true,
      message: 'Compra realizada com sucesso',
      id_pedido: pedido.id_pedido,
      data_pedido: pedido.data_pedido,
      total: total.toFixed(2),
      itens: [{
        id_produto: idProd,
        nome_produto: produto.nome_produto,
        quantidade: qtd,
        preco_unitario: precoUnit.toFixed(2)
      }]
    });

  } catch (error) {
    console.error('Erro ao comprar direto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Finalizar carrinho (mantida para compatibilidade)
exports.finalizarCarrinho = async (req, res) => {
  try {
    const usuario = req.usuario;
    if (!usuario) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { itens } = req.body || {};
    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio' });
    }

    if (usuario.tipo === 'funcionario') {
      return res.status(400).json({ error: 'Funcionários devem usar o CRUD de pedidos' });
    }

    const clienteCpf = usuario.cpf;

    // Validar itens
    const itensValidados = [];
    for (const item of itens) {
      const idProd = toInt(item.id_produto);
      const qtd = toInt(item.quantidade);
      
      if (!idProd || idProd <= 0) {
        return res.status(400).json({ error: `id_produto inválido: ${item.id_produto}` });
      }
      if (!qtd || qtd <= 0) {
        return res.status(400).json({ error: `quantidade inválida para produto ${idProd}` });
      }

      const prodRes = await query(
        'SELECT id_produto, nome_produto, preco_produto, quantidade_estoque FROM produto WHERE id_produto = $1',
        [idProd]
      );
      if (prodRes.rowCount === 0) {
        return res.status(404).json({ error: `Produto ${idProd} não encontrado` });
      }

      const produto = prodRes.rows[0];
      if (produto.quantidade_estoque < qtd) {
        return res.status(400).json({ 
          error: `Estoque insuficiente para "${produto.nome_produto}". Disponível: ${produto.quantidade_estoque}` 
        });
      }

      itensValidados.push({
        id_produto: idProd,
        nome_produto: produto.nome_produto,
        quantidade: qtd,
        preco_unitario: Number(produto.preco_produto)
      });
    }

    // Criar pedido - TABELA REAL: pedido(id_pedido, data_pedido, cliente_cpf)
    const pedidoRes = await query(
      'INSERT INTO pedido (data_pedido, cliente_cpf) VALUES (NOW(), $1) RETURNING id_pedido, data_pedido',
      [clienteCpf]
    );
    const pedido = pedidoRes.rows[0];

    let total = 0;
    for (const item of itensValidados) {
      await query(
        'INSERT INTO pedido_has_produto (pedido_id_pedido, produto_id_produto, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)',
        [pedido.id_pedido, item.id_produto, item.quantidade, item.preco_unitario]
      );

      await query(
        'UPDATE produto SET quantidade_estoque = quantidade_estoque - $1 WHERE id_produto = $2',
        [item.quantidade, item.id_produto]
      );

      total += item.quantidade * item.preco_unitario;
    }

    res.status(201).json({
      success: true,
      message: 'Pedido criado com sucesso',
      id_pedido: pedido.id_pedido,
      data_pedido: pedido.data_pedido,
      total: total.toFixed(2),
      qtd_itens: itensValidados.length
    });

  } catch (error) {
    console.error('Erro ao finalizar carrinho:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
