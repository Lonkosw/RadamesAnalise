const { query, transaction } = require('../database');
const path = require('path');

const isCpf = (v) => typeof v === 'string' && /^\d{11}$/.test(String(v).trim());
const normCpf = (v) => String(v || '').trim();
const toInt = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };

// GET /pedido (apenas funcionários) -> lista todos os pedidos
exports.listarTodosPedidos = async (req, res) => {
  try {
    const r = await query('SELECT * FROM pedido ORDER BY id_pedido DESC');
    console.log('[pedidoController] listarTodosPedidos ->', r.rowCount, 'registros');
    res.json(r.rows);
  } catch (error) {
    console.error('Erro ao listar todos os pedidos:', error);
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

// GET /pedido/:id
exports.obterPedido = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const ped = await query('SELECT * FROM pedido WHERE id_pedido = $1', [id]);
    if (ped.rowCount === 0) return res.status(404).json({ error: 'Pedido não encontrado' });

    const itens = await query(
      `SELECT php.pedido_id_pedido, php.produto_id_produto, php.quantidade, php.preco_unitario,
              pr.nome_produto
         FROM pedido_has_produto php
         JOIN produto pr ON pr.id_produto = php.produto_id_produto
        WHERE php.pedido_id_pedido = $1
        ORDER BY pr.nome_produto`,
      [id]
    );

    res.json({ pedido: ped.rows[0], itens: itens.rows });
  } catch (error) {
    console.error('Erro ao obter pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// GET /pedido/cliente/:cpf
exports.listarPedidosPorCliente = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    if (!isCpf(cpf)) return res.status(400).json({ error: 'CPF inválido' });
    const r = await query('SELECT * FROM pedido WHERE cliente_cpf = $1 ORDER BY id_pedido DESC', [cpf]);
    res.json(r.rows);
  } catch (error) {
    console.error('Erro ao listar pedidos do cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Fluxos de carrinho/pagamento removidos no modelo B

// Abrir página do CRUD (lista), não o detalhe
exports.abrirCrudPedido = (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/pedido/lista.html'));
};
