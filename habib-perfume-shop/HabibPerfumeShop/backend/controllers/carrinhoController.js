const { query, transaction } = require('../database');

const isCpf = (v) => typeof v === 'string' && /^\d{11}$/.test(v.trim());
const normCpf = (v) => String(v || '').trim();
const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

async function ensureCliente(cpf) {
  const r = await query('SELECT 1 FROM cliente WHERE cpf = $1', [cpf]);
  return r.rowCount > 0;
}

async function getOrCreateCarrinho(cpf, client) {
  const q = async (c) => c || query;
  const exec = client ? client.query.bind(client) : query;
  const sel = await exec('SELECT * FROM carrinho WHERE cliente_cpf = $1', [cpf]);
  if (sel.rowCount > 0) return sel.rows[0];
  const ins = await exec('INSERT INTO carrinho (cliente_cpf) VALUES ($1) RETURNING *', [cpf]);
  return ins.rows[0];
}

// GET /carrinho/:cpf → retorna carrinho (cria se não existir) e itens
exports.obterCarrinho = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    if (!isCpf(cpf)) return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos.' });

    if (!(await ensureCliente(cpf))) return res.status(404).json({ error: 'Cliente não encontrado' });

    const carrinho = await getOrCreateCarrinho(cpf);
    const itens = await query(
      `SELECT ic.id_item_carrinho, ic.id_perfume, ic.quantidade,
              p.nome AS perfume_nome, p.preco AS perfume_preco, p.quantidade_estoque, p.imagem_ext
         FROM item_carrinho ic
         JOIN perfume p ON p.id_perfume = ic.id_perfume
        WHERE ic.id_carrinho = $1
        ORDER BY ic.id_item_carrinho`,
      [carrinho.id_carrinho]
    );

    res.json({ carrinho, itens: itens.rows });
  } catch (error) {
    console.error('Erro ao obter carrinho:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// POST /carrinho/:cpf/items { id_perfume, quantidade }
exports.adicionarItem = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    if (!isCpf(cpf)) return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos.' });

  const { id_perfume, quantidade } = req.body || {};
  const idPerf = toInt(id_perfume);
  const qtd = toInt(quantidade); // tratado como incremento
  if (!idPerf || !qtd || qtd <= 0) return res.status(400).json({ error: 'id_perfume e quantidade (>0) são obrigatórios' });

    const result = await transaction(async (client) => {
      if (!(await ensureCliente(cpf))) throw new Error('404:cliente');

      const car = await getOrCreateCarrinho(cpf, client);

      const p = await client.query('SELECT id_perfume, quantidade_estoque FROM perfume WHERE id_perfume = $1', [idPerf]);
      if (p.rowCount === 0) throw new Error('404:perfume');
      const estoque = p.rows[0].quantidade_estoque;
      if (qtd > estoque) throw new Error('400:estoque');

      const exists = await client.query('SELECT * FROM item_carrinho WHERE id_carrinho = $1 AND id_perfume = $2 FOR UPDATE', [car.id_carrinho, idPerf]);
      let item;
      if (exists.rowCount > 0) {
        const atual = exists.rows[0];
        const novaQuantidade = atual.quantidade + qtd;
        if (novaQuantidade > estoque) throw new Error('400:estoque');
        item = await client.query(
          'UPDATE item_carrinho SET quantidade = $1 WHERE id_item_carrinho = $2 RETURNING *',
          [novaQuantidade, atual.id_item_carrinho]
        );
      } else {
        if (qtd > estoque) throw new Error('400:estoque');
        item = await client.query(
          'INSERT INTO item_carrinho (id_carrinho, id_perfume, quantidade) VALUES ($1, $2, $3) RETURNING *',
          [car.id_carrinho, idPerf, qtd]
        );
      }
      return { car, item: item.rows[0] };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Erro ao adicionar item:', error);
    const msg = String(error.message || '');
    if (msg.startsWith('404:cliente')) return res.status(404).json({ error: 'Cliente não encontrado' });
    if (msg.startsWith('404:perfume')) return res.status(404).json({ error: 'Perfume não encontrado' });
    if (msg.startsWith('400:estoque')) return res.status(400).json({ error: 'Quantidade maior que estoque disponível' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// PUT /carrinho/:cpf/items/:id_item_carrinho { quantidade }
exports.atualizarItem = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    const idItem = toInt(req.params.id_item_carrinho);
    const qtd = toInt((req.body || {}).quantidade);
    if (!isCpf(cpf) || !idItem) return res.status(400).json({ error: 'Parâmetros inválidos' });
    if (!qtd || qtd <= 0) return res.status(400).json({ error: 'quantidade deve ser > 0' });

    const result = await transaction(async (client) => {
      if (!(await ensureCliente(cpf))) throw new Error('404:cliente');
      const car = await getOrCreateCarrinho(cpf, client);
      const it = await client.query('SELECT * FROM item_carrinho WHERE id_item_carrinho = $1 AND id_carrinho = $2', [idItem, car.id_carrinho]);
      if (it.rowCount === 0) throw new Error('404:item');

      const p = await client.query('SELECT quantidade_estoque FROM perfume WHERE id_perfume = $1', [it.rows[0].id_perfume]);
      if (p.rowCount === 0) throw new Error('404:perfume');
      if (qtd > p.rows[0].quantidade_estoque) throw new Error('400:estoque');

      const upd = await client.query('UPDATE item_carrinho SET quantidade = $1 WHERE id_item_carrinho = $2 RETURNING *', [qtd, idItem]);
      return upd.rows[0];
    });

    res.json(result);
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    const msg = String(error.message || '');
    if (msg.startsWith('404:cliente')) return res.status(404).json({ error: 'Cliente não encontrado' });
    if (msg.startsWith('404:item')) return res.status(404).json({ error: 'Item não encontrado' });
    if (msg.startsWith('404:perfume')) return res.status(404).json({ error: 'Perfume não encontrado' });
    if (msg.startsWith('400:estoque')) return res.status(400).json({ error: 'Quantidade maior que estoque disponível' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// DELETE /carrinho/:cpf/items/:id_item_carrinho
exports.removerItem = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    const idItem = toInt(req.params.id_item_carrinho);
    if (!isCpf(cpf) || !idItem) return res.status(400).json({ error: 'Parâmetros inválidos' });

    await transaction(async (client) => {
      if (!(await ensureCliente(cpf))) throw new Error('404:cliente');
      const car = await getOrCreateCarrinho(cpf, client);
      const it = await client.query('SELECT 1 FROM item_carrinho WHERE id_item_carrinho = $1 AND id_carrinho = $2', [idItem, car.id_carrinho]);
      if (it.rowCount === 0) throw new Error('404:item');
      await client.query('DELETE FROM item_carrinho WHERE id_item_carrinho = $1', [idItem]);
    });

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover item:', error);
    const msg = String(error.message || '');
    if (msg.startsWith('404:cliente')) return res.status(404).json({ error: 'Cliente não encontrado' });
    if (msg.startsWith('404:item')) return res.status(404).json({ error: 'Item não encontrado' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// DELETE /carrinho/:cpf/items → limpa todos os itens
exports.limparCarrinho = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    if (!isCpf(cpf)) return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos.' });

    await transaction(async (client) => {
      if (!(await ensureCliente(cpf))) throw new Error('404:cliente');
      const car = await getOrCreateCarrinho(cpf, client);
      await client.query('DELETE FROM item_carrinho WHERE id_carrinho = $1', [car.id_carrinho]);
    });

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao limpar carrinho:', error);
    const msg = String(error.message || '');
    if (msg.startsWith('404:cliente')) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
