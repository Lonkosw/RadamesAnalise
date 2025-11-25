const { query } = require('../database');
const path = require('path');

const isCpf = (v) => typeof v === 'string' && /^\d{11}$/.test(v.trim());
const normCpf = (v) => String(v || '').trim();
const isEmail = (v) => typeof v === 'string' && /.+@.+\..+/.test(v);

// Lista clientes com filtros básicos e paginação
exports.listarClientes = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
    const offset = (page - 1) * limit;
    const q = (req.query.q || '').trim();

    const where = [];
    const params = [];
    let i = 1;

    if (q) {
      where.push(`(nome ILIKE $${i} OR email ILIKE $${i})`);
      params.push(`%${q}%`);
      i++;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit, offset);

    const sql = `
      SELECT cpf, nome, email
      FROM cliente
      ${whereSql}
      ORDER BY nome
      LIMIT $${i} OFFSET $${i + 1}
    `;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Obtém cliente por CPF
exports.obterCliente = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    if (!isCpf(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos.' });
    }
    const result = await query('SELECT cpf, nome, email FROM cliente WHERE cpf = $1', [cpf]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Cria novo cliente (senha armazenada com hash)
exports.criarCliente = async (req, res) => {
  try {
    const { cpf, nome, email, senha } = req.body || {};
    const cpfStr = normCpf(cpf);
    if (!isCpf(cpfStr) || !nome || !isEmail(email) || !senha) {
      return res.status(400).json({ error: 'cpf (11 dígitos), nome, email válido e senha são obrigatórios' });
    }
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(String(senha), salt);
    const result = await query(
      'INSERT INTO cliente (cpf, nome, email, senha) VALUES ($1, $2, $3, $4) RETURNING cpf, nome, email',
      [cpfStr, nome.trim(), email.trim(), hash]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    if (error.code === '23505') return res.status(400).json({ error: 'CPF ou e-mail já cadastrado' });
    if (error.code === '23502') return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualiza cliente (hash de nova senha se enviada)
exports.atualizarCliente = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    if (!isCpf(cpf)) return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos.' });
    const existing = await query('SELECT * FROM cliente WHERE cpf = $1', [cpf]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Cliente não encontrado' });
    const current = existing.rows[0];
    const { nome, email, senha } = req.body || {};
    const updated = {
      nome: nome !== undefined ? String(nome).trim() : current.nome,
      email: email !== undefined ? String(email).trim() : current.email,
      senha: current.senha
    };
    if (!isEmail(updated.email)) return res.status(400).json({ error: 'E-mail inválido' });
    if (senha && String(senha).trim()) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      updated.senha = await bcrypt.hash(String(senha), salt);
    }
    const upd = await query('UPDATE cliente SET nome=$1, email=$2, senha=$3 WHERE cpf=$4 RETURNING cpf, nome, email',[updated.nome, updated.email, updated.senha, cpf]);
    res.json(upd.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    if (error.code === '23505') return res.status(400).json({ error: 'E-mail já cadastrado' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deleta cliente
exports.deletarCliente = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    if (!isCpf(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos.' });
    }
    const existing = await query('SELECT 1 FROM cliente WHERE cpf = $1', [cpf]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    await query('DELETE FROM cliente WHERE cpf = $1', [cpf]);
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Não é possível deletar: há dependências relacionadas' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Abrir página do CRUD
exports.abrirCrudCliente = (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/cliente/cliente.html'));
};
