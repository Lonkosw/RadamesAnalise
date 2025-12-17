const { query } = require('../database');
const path = require('path');
const { deletarImagemAntiga } = require('./imageController');

// Abre página do CRUD/lista de Produto (modelo B)
exports.abrirCrudProduto = (req, res) => {
  console.log('produtoController - Rota /abrirCrudProduto - abrir a página de Produto');
  res.sendFile(path.join(__dirname, '../../frontend/produto/produto.html'));
};

// Helpers
const toInt = (v, d = null) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};
const toNum = (v, d = null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// GET /produto - filtro textual + faixa de preço (min_preco/max_preco) sem gerar 400 se inválidos
exports.listarProdutos = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const minPrecoRaw = (req.query.min_preco || '').replace(',', '.').trim();
    const maxPrecoRaw = (req.query.max_preco || '').replace(',', '.').trim();
    const minPreco = minPrecoRaw !== '' && !isNaN(Number(minPrecoRaw)) ? Number(minPrecoRaw) : null;
    const maxPreco = maxPrecoRaw !== '' && !isNaN(Number(maxPrecoRaw)) ? Number(maxPrecoRaw) : null;
    const marcaId = req.query.marca_id ? parseInt(req.query.marca_id) : null;

    const whereParts = ['p.ativo = TRUE'];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      whereParts.push(`(p.nome_produto ILIKE $${params.length} OR p.marca_produto ILIKE $${params.length} OR p.descricao_produto ILIKE $${params.length} OR m.nome_marca ILIKE $${params.length})`);
    }
    if (minPreco != null) {
      params.push(minPreco);
      whereParts.push(`p.preco_produto >= $${params.length}`);
    }
    if (maxPreco != null) {
      params.push(maxPreco);
      whereParts.push(`p.preco_produto <= $${params.length}`);
    }
    if (marcaId) {
      params.push(marcaId);
      whereParts.push(`p.marca_id_marca = $${params.length}`);
    }

    const whereSql = whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : '';
    const sql = `
      SELECT p.id_produto, p.nome_produto, p.marca_produto, p.volume_ml, p.concentracao, 
             p.descricao_produto, p.preco_produto, p.quantidade_estoque, p.imagem_produto, 
             p.notas_olfativas_imagem, p.marca_id_marca, m.nome_marca
      FROM produto p
      LEFT JOIN marca m ON m.id_marca = p.marca_id_marca
      ${whereSql} 
      ORDER BY p.nome_produto
    `;
    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// GET /produto/:id
exports.obterProduto = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const result = await query(`
      SELECT p.*, m.nome_marca 
      FROM produto p 
      LEFT JOIN marca m ON m.id_marca = p.marca_id_marca 
      WHERE p.id_produto = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// POST /produto - validações similares ao criarFuncionario
exports.criarProduto = async (req, res) => {
  try {
    const { nome, marca, volume_ml, concentracao, descricao, preco, quantidade_estoque, marca_id_marca } = req.body || {};
    const nomeStr = nome && String(nome).trim();
    const precoRaw = preco != null ? String(preco).replace(',', '.').trim() : '';
    const qtdRaw = quantidade_estoque != null ? String(quantidade_estoque).trim() : '';
    if (!nomeStr) return res.status(400).json({ error: 'nome é obrigatório' });
    if (precoRaw === '' || isNaN(Number(precoRaw))) return res.status(400).json({ error: 'preco inválido' });
    if (qtdRaw === '' || isNaN(Number(qtdRaw))) return res.status(400).json({ error: 'quantidade_estoque inválida' });
    const precoNum = Number(precoRaw);
    const qtdNum = Number(qtdRaw);
    if (precoNum < 0) return res.status(400).json({ error: 'preco não pode ser negativo' });
    if (!Number.isInteger(qtdNum) || qtdNum < 0) return res.status(400).json({ error: 'quantidade_estoque deve ser inteiro >= 0' });
    const volNum = volume_ml != null && String(volume_ml).trim() !== '' ? toInt(volume_ml) : null;
    if (volNum != null && (!Number.isInteger(volNum) || volNum < 0)) return res.status(400).json({ error: 'volume_ml deve ser inteiro >= 0' });
    const marcaIdNum = marca_id_marca ? toInt(marca_id_marca) : null;
    const result = await query(
      'INSERT INTO produto (nome_produto, marca_produto, volume_ml, concentracao, descricao_produto, preco_produto, quantidade_estoque, marca_id_marca) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_produto, nome_produto, marca_produto, volume_ml, concentracao, descricao_produto, preco_produto, quantidade_estoque, imagem_produto, notas_olfativas_imagem, marca_id_marca',
      [nomeStr, marca || null, volNum, concentracao || null, descricao || null, precoNum.toFixed(2), qtdNum, marcaIdNum]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    if (error.code === '23502') return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// PUT /produto/:id - mesma filosofia de atualização dinâmica do atualizarFuncionario
exports.atualizarProduto = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    const existing = await query('SELECT * FROM produto WHERE id_produto=$1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Produto não encontrado' });
    const cur = existing.rows[0];
    const { nome, marca, volume_ml, concentracao, descricao, preco, quantidade_estoque, marca_id_marca } = req.body || {};
    const nomeVal = nome !== undefined ? String(nome).trim() : cur.nome_produto;
    const marcaVal = marca !== undefined ? (marca || null) : cur.marca_produto;
    const concVal = concentracao !== undefined ? (concentracao || null) : cur.concentracao;
    const descVal = descricao !== undefined ? (descricao || null) : cur.descricao_produto;
    let volVal = volume_ml !== undefined ? (String(volume_ml).trim()===''? null : toInt(volume_ml)) : cur.volume_ml;
    let precoVal = preco !== undefined ? String(preco).replace(',', '.').trim() : cur.preco_produto;
    let qtdVal = quantidade_estoque !== undefined ? String(quantidade_estoque).trim() : cur.quantidade_estoque;
    let marcaIdVal = marca_id_marca !== undefined ? (marca_id_marca ? toInt(marca_id_marca) : null) : cur.marca_id_marca;
    if (volVal != null && (!Number.isInteger(volVal) || volVal < 0)) return res.status(400).json({ error: 'volume_ml deve ser inteiro >=0' });
    if (preco !== undefined) {
      if (precoVal === '' || isNaN(Number(precoVal))) return res.status(400).json({ error: 'preco inválido' });
      precoVal = Number(precoVal).toFixed(2);
    }
    if (quantidade_estoque !== undefined) {
      if (qtdVal === '' || isNaN(Number(qtdVal)) || !Number.isInteger(Number(qtdVal)) || Number(qtdVal) < 0) return res.status(400).json({ error: 'quantidade_estoque inválida' });
      qtdVal = Number(qtdVal);
    }
    const upd = await query(
      'UPDATE produto SET nome_produto=$1, marca_produto=$2, volume_ml=$3, concentracao=$4, descricao_produto=$5, preco_produto=$6, quantidade_estoque=$7, marca_id_marca=$8 WHERE id_produto=$9 RETURNING id_produto, nome_produto, marca_produto, volume_ml, concentracao, descricao_produto, preco_produto, quantidade_estoque, imagem_produto, notas_olfativas_imagem, marca_id_marca',
      [nomeVal, marcaVal, volVal, concVal, descVal, precoVal, qtdVal, marcaIdVal, id]
    );
    return res.json(upd.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// DELETE /produto/:id (Soft Delete - marca como inativo)
exports.deletarProduto = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const existing = await query('SELECT 1 FROM produto WHERE id_produto = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    // Soft delete: marca o produto como inativo ao invés de deletar
    await query('UPDATE produto SET ativo = FALSE WHERE id_produto = $1', [id]);
    console.log(`🗑️ Produto #${id} marcado como inativo (soft delete)`);
    
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao desativar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
