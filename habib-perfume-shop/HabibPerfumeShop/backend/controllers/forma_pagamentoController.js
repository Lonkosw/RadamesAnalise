const { query } = require('../database');
const path = require('path');

// GET /forma_pagamento (modelo B)
exports.listarForma_pagamento = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const where = [];
    const params = [];
    let i = 1;

    if (q) {
      where.push(`nome_forma ILIKE $${i}`);
      params.push(`%${q}%`);
      i++;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const r = await query(`SELECT * FROM forma_pagamento ${whereSql} ORDER BY id_forma_pagamento`, params);
    res.json(r.rows);
  } catch (error) {
    console.error('Erro ao listar forma_pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.obterForma_pagamento = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const r = await query('SELECT * FROM forma_pagamento WHERE id_forma_pagamento = $1', [id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Forma_pagamento não encontrada' });
    }

    res.json(r.rows[0]);
  } catch (error) {
    console.error('Erro ao obter forma_pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.criarForma_pagamento = async (req, res) => {
  try {
    const { nome_forma } = req.body;

    if (!nome_forma || typeof nome_forma !== 'string' || nome_forma.trim().length === 0) {
      return res.status(400).json({ error: 'Campo obrigatório: nome_forma' });
    }

    const r = await query('INSERT INTO forma_pagamento (nome_forma) VALUES ($1) RETURNING *', [nome_forma.trim()]);

    res.status(201).json(r.rows[0]);
  } catch (error) {
    console.error('Erro ao criar forma_pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.atualizarForma_pagamento = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { nome_forma } = req.body;
    if (!nome_forma || typeof nome_forma !== 'string' || nome_forma.trim().length === 0) {
      return res.status(400).json({ error: 'Campo obrigatório: nome_forma' });
    }

    const r = await query('UPDATE forma_pagamento SET nome_forma = $1 WHERE id_forma_pagamento = $2 RETURNING *', [nome_forma.trim(), id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Forma_pagamento não encontrada' });
    }

    res.json(r.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar forma_pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.deletarForma_pagamento = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const r = await query('DELETE FROM forma_pagamento WHERE id_forma_pagamento = $1 RETURNING *', [id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Forma_pagamento não encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar forma_pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Abrir página do CRUD
exports.abrirCrudForma_pagamento = (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/formaPagamento/formaPagamento.html'));
};
