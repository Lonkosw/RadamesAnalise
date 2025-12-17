// ============================================================================
// pagamentoController.js - MODELO DO PROFESSOR (CandyShop)
// Adaptado para HabibPerfumeShop
// ============================================================================
const { query, pool } = require('../database');
const path = require('path');

// Importa funções de estoque
const { verificarEstoque, reduzirEstoque, restaurarEstoque } = require('./pedido_has_produtoController');

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
// Estrutura modelo professor: id_pagamento (PK), data_pagamento, pedido_id_pedido
// Body: { pedido_id_pedido, data_pagamento? }
// IMPORTANTE: Ao criar pagamento, reduz o estoque dos produtos do pedido
// ============================================================================
exports.criarPagamento = async (req, res) => {
  const client = await pool.connect();
  
  console.log('Criando pagamento com dados:', req.body);
  try {
    const { pedido_id_pedido, data_pagamento } = req.body;

    if (!pedido_id_pedido) {
      return res.status(400).json({
        error: 'O ID do pedido é obrigatório'
      });
    }

    await client.query('BEGIN');

    // Verifica se o pedido existe e seu status atual
    const pedidoExiste = await client.query(
      'SELECT id_pedido, status_pedido FROM pedido WHERE id_pedido = $1', 
      [pedido_id_pedido]
    );
    if (pedidoExiste.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Pedido não encontrado'
      });
    }

    const statusAtual = pedidoExiste.rows[0].status_pedido || 'pendente';

    // Verifica se já existe pagamento para este pedido
    const pagamentoExiste = await client.query(
      'SELECT id_pagamento FROM pagamento WHERE pedido_id_pedido = $1', 
      [pedido_id_pedido]
    );
    if (pagamentoExiste.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Já existe um pagamento para este pedido'
      });
    }

    // =========================================================================
    // CONTROLE DE ESTOQUE: Só reduz se o pedido NÃO estava pago
    // =========================================================================
    if (statusAtual !== 'pago') {
      // Busca todos os itens do pedido
      const itensResult = await client.query(
        'SELECT produto_id_produto, quantidade FROM pedido_has_produto WHERE pedido_id_pedido = $1',
        [pedido_id_pedido]
      );
      
      const itens = itensResult.rows;
      
      // Primeiro, verifica se há estoque suficiente para TODOS os itens
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
      console.log(`\n📦 Processando pagamento do pedido #${pedido_id_pedido}`);
      for (const item of itens) {
        const novoEstoque = await reduzirEstoque(item.produto_id_produto, item.quantidade, client);
        console.log(`   📦 Estoque REDUZIDO: Produto ${item.produto_id_produto} - Qtd: -${item.quantidade} - Novo: ${novoEstoque}`);
      }
    }

    // Cria o registro de pagamento
    const result = await client.query(
      'INSERT INTO pagamento (pedido_id_pedido, data_pagamento) VALUES ($1, $2) RETURNING *',
      [pedido_id_pedido, data_pagamento || new Date()]
    );

    // Atualizar status do pedido para 'pago'
    await client.query(
      "UPDATE pedido SET status_pedido = 'pago' WHERE id_pedido = $1",
      [pedido_id_pedido]
    );

    await client.query('COMMIT');
    
    console.log(`✅ Pagamento criado com sucesso para pedido #${pedido_id_pedido}`);

    res.status(201).json({
      ...result.rows[0],
      message: 'Pagamento criado e estoque atualizado com sucesso'
    });
  } catch (error) {
    await client.query('ROLLBACK');
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
  } finally {
    client.release();
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
// IMPORTANTE: Ao deletar pagamento, restaura o estoque e muda status para pendente
// ============================================================================
exports.deletarPagamento = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID deve ser um número válido' });
    }

    await client.query('BEGIN');

    const existingResult = await client.query(
      'SELECT * FROM pagamento WHERE pedido_id_pedido = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    // Verifica o status atual do pedido
    const pedidoResult = await client.query(
      'SELECT status_pedido FROM pedido WHERE id_pedido = $1',
      [id]
    );
    
    const statusAtual = pedidoResult.rows[0]?.status_pedido || 'pendente';

    // Se o pedido estava pago, restaurar estoque
    if (statusAtual === 'pago') {
      const itensResult = await client.query(
        'SELECT produto_id_produto, quantidade FROM pedido_has_produto WHERE pedido_id_pedido = $1',
        [id]
      );
      
      console.log(`\n📦 Cancelando pagamento do pedido #${id} - Restaurando estoque`);
      for (const item of itensResult.rows) {
        const novoEstoque = await restaurarEstoque(item.produto_id_produto, item.quantidade, client);
        console.log(`   📦 Estoque RESTAURADO: Produto ${item.produto_id_produto} - Qtd: +${item.quantidade} - Novo: ${novoEstoque}`);
      }
    }

    // Deletar o pagamento
    await client.query(
      'DELETE FROM pagamento WHERE pedido_id_pedido = $1',
      [id]
    );

    // Atualizar status do pedido para 'pendente'
    await client.query(
      "UPDATE pedido SET status_pedido = 'pendente' WHERE id_pedido = $1",
      [id]
    );

    await client.query('COMMIT');
    
    console.log(`✅ Pagamento deletado e estoque restaurado para pedido #${id}`);

    res.json({ 
      success: true, 
      message: 'Pagamento cancelado e estoque restaurado' 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar pagamento:', error);

    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Não é possível deletar pagamento com dependências associadas'
      });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
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
// IMPORTANTE: Ao criar pagamento, reduz o estoque dos produtos do pedido
// ============================================================================
exports.criarPagamentoCompleto = async (req, res) => {
  const client = await pool.connect();
  
  console.log('Criando pagamento completo com dados:', req.body);
  try {
    const { pedido_id_pedido, valor_total, formas } = req.body;

    if (!pedido_id_pedido) {
      return res.status(400).json({ error: 'ID do pedido é obrigatório' });
    }

    await client.query('BEGIN');

    // Verificar status atual do pedido
    const pedidoResult = await client.query(
      'SELECT id_pedido, status_pedido FROM pedido WHERE id_pedido = $1',
      [pedido_id_pedido]
    );
    
    if (pedidoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Pedido não encontrado' });
    }
    
    const statusAtual = pedidoResult.rows[0].status_pedido || 'pendente';

    // Verificar se já existe pagamento
    const pagExistente = await client.query(
      'SELECT id_pagamento FROM pagamento WHERE pedido_id_pedido = $1',
      [pedido_id_pedido]
    );
    
    if (pagExistente.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Já existe pagamento para este pedido' });
    }

    // =========================================================================
    // CONTROLE DE ESTOQUE: Só reduz se o pedido NÃO estava pago
    // =========================================================================
    if (statusAtual !== 'pago') {
      const itensResult = await client.query(
        'SELECT produto_id_produto, quantidade FROM pedido_has_produto WHERE pedido_id_pedido = $1',
        [pedido_id_pedido]
      );
      
      const itens = itensResult.rows;
      
      // Primeiro, verifica se há estoque suficiente para TODOS os itens
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
      console.log(`\n📦 Processando pagamento completo do pedido #${pedido_id_pedido}`);
      for (const item of itens) {
        const novoEstoque = await reduzirEstoque(item.produto_id_produto, item.quantidade, client);
        console.log(`   📦 Estoque REDUZIDO: Produto ${item.produto_id_produto} - Qtd: -${item.quantidade} - Novo: ${novoEstoque}`);
      }
    }

    // 1. Criar o pagamento na tabela principal
    const pagResult = await client.query(
      'INSERT INTO pagamento (pedido_id_pedido, data_pagamento) VALUES ($1, NOW()) RETURNING *',
      [pedido_id_pedido]
    );

    const pagamento = pagResult.rows[0];

    // 1.1 Atualizar status do pedido para 'pago'
    await client.query(
      "UPDATE pedido SET status_pedido = 'pago' WHERE id_pedido = $1",
      [pedido_id_pedido]
    );

    // 2. Inserir formas de pagamento em pagamento_has_forma_pagamento
    let formasInseridas = [];
    if (Array.isArray(formas) && formas.length > 0) {
      try {
        for (const forma of formas) {
          const idForma = forma.id_forma || forma.forma_pagamento_id_forma_pagamento;
          const valor = forma.valor || forma.valor_pago || 0;
          
          if (idForma) {
            await client.query(
              'INSERT INTO pagamento_has_forma_pagamento (pagamento_id_pagamento, forma_pagamento_id_forma_pagamento, valor_pago) VALUES ($1, $2, $3)',
              [pagamento.id_pagamento, idForma, valor]
            );
          }
        }
        
        // Buscar formas inseridas
        const formasResult = await client.query(
          'SELECT * FROM pagamento_has_forma_pagamento WHERE pagamento_id_pagamento = $1',
          [pagamento.id_pagamento]
        );
        formasInseridas = formasResult.rows;
      } catch (e) {
        console.log('Erro ao inserir formas de pagamento:', e.message);
      }
    }

    await client.query('COMMIT');
    
    console.log(`✅ Pagamento completo criado com sucesso para pedido #${pedido_id_pedido}`);

    res.status(201).json({
      pagamento: pagamento,
      valor_total: valor_total,
      formas_pagamento: formasInseridas,
      message: 'Pagamento criado e estoque atualizado com sucesso'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar pagamento completo:', error);

    if (error.code === '23505') {
      return res.status(409).json({ error: 'Pagamento já existe para este pedido' });
    }

    if (error.code === '23503') {
      return res.status(400).json({ error: 'Pedido ou forma de pagamento não encontrada' });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};
