// ============================================================================
// pagamentoController.js - MODELO DO PROFESSOR (CandyShop)
// Adaptado para HabibPerfumeShop
// ============================================================================
const { query } = require('../database');
const path = require('path');

// ============================================================================
// ABRIR TELA DE PAGAMENTO (cliente) - GET /pagamento/abrirTelaPagamento
// ============================================================================
exports.abrirTelaPagamento = (req, res) => {
  const usuario = req.cookies.usuarioLogado || req.cookies.usuario;

  console.log('pagamentoController -> abrirTelaPagamento - Cookie:', usuario);

  if (usuario) {
    res.sendFile(path.join(__dirname, '../../frontend/visaoCliente/pagamento/pagamento.html'));
  } else {
    res.redirect('/login');
  }
};

// ============================================================================
// ABRIR CRUD PAGAMENTO (gerente) - GET /pagamento/abrirCrudPagamento
// ============================================================================
exports.abrirCrudPagamento = (req, res) => {
  const usuario = req.cookies.usuarioLogado || req.cookies.usuario;

  if (usuario) {
    res.sendFile(path.join(__dirname, '../../frontend/pagamento/pagamento.html'));
  } else {
    res.redirect('/login');
  }
};

// ============================================================================
// LISTAR PAGAMENTOS - GET /pagamento
// ============================================================================
exports.listarPagamentos = async (req, res) => {
  try {
    const result = await query('SELECT * FROM pagamento ORDER BY pedido_id_pedido');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar pagamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// CRIAR PAGAMENTO - POST /pagamento
// Modelo professor: PK = pedido_id_pedido
// Body: { pedido_id_pedido, data_pagamento?, valor_total_pagamento }
// ============================================================================
exports.criarPagamento = async (req, res) => {
  console.log('Criando pagamento com dados:', req.body);
  try {
    const { pedido_id_pedido, data_pagamento, valor_total_pagamento } = req.body;

    if (!pedido_id_pedido) {
      return res.status(400).json({
        error: 'O ID do pedido é obrigatório'
      });
    }

    // Verifica se o pedido existe
    const pedidoExiste = await query('SELECT id_pedido FROM pedido WHERE id_pedido = $1', [pedido_id_pedido]);
    if (pedidoExiste.rowCount === 0) {
      return res.status(400).json({
        error: 'Pedido não encontrado'
      });
    }

    // Verifica se já existe pagamento para este pedido
    const pagamentoExiste = await query('SELECT pedido_id_pedido FROM pagamento WHERE pedido_id_pedido = $1', [pedido_id_pedido]);
    if (pagamentoExiste.rowCount > 0) {
      return res.status(409).json({
        error: 'Já existe um pagamento para este pedido'
      });
    }

    const dataFinal = data_pagamento || new Date().toISOString();

    const result = await query(
      'INSERT INTO pagamento (pedido_id_pedido, data_pagamento, valor_total_pagamento) VALUES ($1, $2, $3) RETURNING *',
      [pedido_id_pedido, dataFinal, valor_total_pagamento || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);

    if (error.code === '23502') {
      return res.status(400).json({
        error: 'Dados obrigatórios não fornecidos'
      });
    }

    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Pagamento já existe para este pedido'
      });
    }

    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Pedido não encontrado'
      });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// OBTER PAGAMENTO POR ID DO PEDIDO - GET /pagamento/:id
// ============================================================================
exports.obterPagamento = async (req, res) => {
  try {
    console.log('Obtendo pagamento para pedido:', req.params.id);
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID deve ser um número válido' });
    }

    const result = await query(
      'SELECT * FROM pagamento WHERE pedido_id_pedido = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// ATUALIZAR PAGAMENTO - PUT /pagamento/:id
// ============================================================================
exports.atualizarPagamento = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { data_pagamento, valor_total_pagamento } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID deve ser um número válido' });
    }

    const existingResult = await query(
      'SELECT * FROM pagamento WHERE pedido_id_pedido = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    const current = existingResult.rows[0];
    const updatedFields = {
      data_pagamento: data_pagamento !== undefined ? data_pagamento : current.data_pagamento,
      valor_total_pagamento: valor_total_pagamento !== undefined ? valor_total_pagamento : current.valor_total_pagamento
    };

    const updateResult = await query(
      'UPDATE pagamento SET data_pagamento = $1, valor_total_pagamento = $2 WHERE pedido_id_pedido = $3 RETURNING *',
      [updatedFields.data_pagamento, updatedFields.valor_total_pagamento, id]
    );

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// DELETAR PAGAMENTO - DELETE /pagamento/:id
// ============================================================================
exports.deletarPagamento = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID deve ser um número válido' });
    }

    const existingResult = await query(
      'SELECT * FROM pagamento WHERE pedido_id_pedido = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    await query(
      'DELETE FROM pagamento WHERE pedido_id_pedido = $1',
      [id]
    );

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar pagamento:', error);

    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Não é possível deletar pagamento com dependências associadas'
      });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// PAGAMENTO_HAS_FORMA_PAGAMENTO - CRUD para formas de pagamento de um pedido
// ============================================================================

// LISTAR FORMAS DE PAGAMENTO DE UM PEDIDO - GET /pagamento/:id/formas
exports.listarFormasPagamentoDoPedido = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID deve ser um número válido' });
    }

    const result = await query(`
      SELECT phfp.*, fp.nome_forma as nome_forma_pagamento
      FROM pagamento_has_forma_pagamento phfp
      JOIN forma_pagamento fp ON fp.id_forma_pagamento = phfp.forma_pagamento_id_forma_pagamento
      WHERE phfp.pagamento_id_pedido = $1
      ORDER BY phfp.forma_pagamento_id_forma_pagamento
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar formas de pagamento do pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ADICIONAR FORMA DE PAGAMENTO A UM PEDIDO - POST /pagamento/:id/formas
exports.adicionarFormaPagamento = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { forma_pagamento_id_forma_pagamento, valor_pago } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID do pedido deve ser um número válido' });
    }

    if (!forma_pagamento_id_forma_pagamento) {
      return res.status(400).json({ error: 'ID da forma de pagamento é obrigatório' });
    }

    // Verifica se o pagamento existe
    const pagamentoExiste = await query('SELECT pedido_id_pedido FROM pagamento WHERE pedido_id_pedido = $1', [id]);
    if (pagamentoExiste.rowCount === 0) {
      return res.status(400).json({ error: 'Pagamento não encontrado. Crie o pagamento primeiro.' });
    }

    const result = await query(
      'INSERT INTO pagamento_has_forma_pagamento (pagamento_id_pedido, forma_pagamento_id_forma_pagamento, valor_pago) VALUES ($1, $2, $3) RETURNING *',
      [id, forma_pagamento_id_forma_pagamento, valor_pago || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao adicionar forma de pagamento:', error);

    if (error.code === '23505') {
      return res.status(409).json({ error: 'Esta forma de pagamento já foi adicionada a este pedido' });
    }

    if (error.code === '23503') {
      return res.status(400).json({ error: 'Pagamento ou forma de pagamento não encontrada' });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ATUALIZAR FORMA DE PAGAMENTO DE UM PEDIDO - PUT /pagamento/:idPedido/formas/:idForma
exports.atualizarFormaPagamentoDoPedido = async (req, res) => {
  try {
    const idPedido = parseInt(req.params.idPedido);
    const idForma = parseInt(req.params.idForma);
    const { valor_pago } = req.body;

    if (isNaN(idPedido) || isNaN(idForma)) {
      return res.status(400).json({ error: 'IDs devem ser números válidos' });
    }

    const result = await query(
      'UPDATE pagamento_has_forma_pagamento SET valor_pago = $1 WHERE pagamento_id_pedido = $2 AND forma_pagamento_id_forma_pagamento = $3 RETURNING *',
      [valor_pago, idPedido, idForma]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Forma de pagamento não encontrada para este pedido' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar forma de pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// REMOVER FORMA DE PAGAMENTO DE UM PEDIDO - DELETE /pagamento/:idPedido/formas/:idForma
exports.removerFormaPagamentoDoPedido = async (req, res) => {
  try {
    const idPedido = parseInt(req.params.idPedido);
    const idForma = parseInt(req.params.idForma);

    if (isNaN(idPedido) || isNaN(idForma)) {
      return res.status(400).json({ error: 'IDs devem ser números válidos' });
    }

    const result = await query(
      'DELETE FROM pagamento_has_forma_pagamento WHERE pagamento_id_pedido = $1 AND forma_pagamento_id_forma_pagamento = $2 RETURNING *',
      [idPedido, idForma]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Forma de pagamento não encontrada para este pedido' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover forma de pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// CRIAR PAGAMENTO COMPLETO (com formas de pagamento) - POST /pagamento/completo
// Recebe: { pedido_id_pedido, valor_total, formas: [{ id_forma, valor }] }
// ============================================================================
exports.criarPagamentoCompleto = async (req, res) => {
  console.log('Criando pagamento completo com dados:', req.body);
  try {
    const { pedido_id_pedido, valor_total, formas } = req.body;

    if (!pedido_id_pedido) {
      return res.status(400).json({ error: 'ID do pedido é obrigatório' });
    }

    // 1. Criar o pagamento
    const pagResult = await query(
      'INSERT INTO pagamento (pedido_id_pedido, data_pagamento, valor_total_pagamento) VALUES ($1, NOW(), $2) RETURNING *',
      [pedido_id_pedido, valor_total || 0]
    );

    const pagamento = pagResult.rows[0];

    // 2. Inserir formas de pagamento se fornecidas
    if (Array.isArray(formas) && formas.length > 0) {
      for (const forma of formas) {
        const idForma = forma.id_forma || forma.forma_pagamento_id_forma_pagamento;
        const valor = forma.valor || forma.valor_pago || 0;
        
        if (idForma) {
          await query(
            'INSERT INTO pagamento_has_forma_pagamento (pagamento_id_pedido, forma_pagamento_id_forma_pagamento, valor_pago) VALUES ($1, $2, $3)',
            [pedido_id_pedido, idForma, valor]
          );
        }
      }
    }

    // 3. Buscar formas inseridas
    const formasInseridas = await query(
      'SELECT * FROM pagamento_has_forma_pagamento WHERE pagamento_id_pedido = $1',
      [pedido_id_pedido]
    );

    res.status(201).json({
      pagamento: pagamento,
      formas_pagamento: formasInseridas.rows
    });

  } catch (error) {
    console.error('Erro ao criar pagamento completo:', error);

    if (error.code === '23505') {
      return res.status(409).json({ error: 'Pagamento já existe para este pedido' });
    }

    if (error.code === '23503') {
      return res.status(400).json({ error: 'Pedido ou forma de pagamento não encontrada' });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
