const { query } = require('../database');
const path = require('path');

exports.abrirCrudPedido_has_produto = (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/pedido_has_produto/pedido_has_produto.html'));
};

exports.listarPedido_has_produtos = async (_req, res) => {
  try {
    const result = await query('SELECT * FROM pedido_has_produto ORDER BY pedido_id_pedido');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar pedido_has_produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.obterItensDeUmPedido_has_produto = async (req, res) => {
  try {
    const { idPedido } = req.params;
    const result = await query(
      'SELECT php.pedido_id_pedido, php.produto_id_produto, p.nome_produto, php.quantidade, php.preco_unitario ' +
      'FROM pedido_has_produto php, produto p ' +
      'WHERE php.pedido_id_pedido = $1 AND php.produto_id_produto = p.id_produto ORDER BY php.produto_id_produto;',
      [idPedido]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Nenhum item encontrado para este pedido.' });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao obter itens do pedido:', error);
    res.status(500).json({ message: 'Erro ao processar a requisição.', error: error.message });
  }
};

exports.obterPedido_has_produto = async (req, res) => {
  try {
    const { id_pedido, id_produto } = req.params;
    const result = await query(
      'SELECT * FROM pedido_has_produto WHERE pedido_id_pedido = $1 AND produto_id_produto = $2',
      [id_pedido, id_produto]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter item:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.criarPedido_has_produto = async (req, res) => {
  try {
    const { pedido_id_pedido, produto_id_produto, quantidade, preco_unitario } = req.body;
    const result = await query(
      'INSERT INTO pedido_has_produto (pedido_id_pedido, produto_id_produto, quantidade, preco_unitario) VALUES ($1,$2,$3,$4) RETURNING *',
      [pedido_id_pedido, produto_id_produto, quantidade, preco_unitario]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar item:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.criarItensPedidoEmLote = async (req, res) => {
  try {
    const itens = req.body?.itens || [];
    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'Nenhum item enviado' });
    }
    const values = [];
    const params = [];
    let i = 1;
    for (const it of itens) {
      params.push(it.pedido_id_pedido, it.produto_id_produto, it.quantidade, it.preco_unitario);
      values.push(`($${i++}, $${i++}, $${i++}, $${i++})`);
    }
    const sql = 'INSERT INTO pedido_has_produto (pedido_id_pedido, produto_id_produto, quantidade, preco_unitario) VALUES ' + values.join(', ') + ' RETURNING *';
    const result = await query(sql, params);
    res.status(201).json(result.rows);
  } catch (error) {
    console.error('Erro ao criar itens em lote:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.atualizarPedido_has_produto = async (req, res) => {
  try {
    const { id_pedido, id_produto } = req.params;
    const { quantidade, preco_unitario } = req.body;
    const result = await query(
      'UPDATE pedido_has_produto SET quantidade=$1, preco_unitario=$2 WHERE pedido_id_pedido=$3 AND produto_id_produto=$4 RETURNING *',
      [quantidade, preco_unitario, id_pedido, id_produto]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.deletarPedido_has_produto = async (req, res) => {
  try {
    const { id_pedido, id_produto } = req.params;
    const result = await query(
      'DELETE FROM pedido_has_produto WHERE pedido_id_pedido = $1 AND produto_id_produto = $2 RETURNING *',
      [id_pedido, id_produto]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar item:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
