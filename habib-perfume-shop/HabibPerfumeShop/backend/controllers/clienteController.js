/**
 * clienteController.js - MODELO EXATO DO PROFESSOR
 * 
 * ESTRUTURA:
 * pessoa: cpf_pessoa (PK), nome_pessoa, email_pessoa, senha_pessoa, data_nascimento_pessoa, endereco_pessoa
 * cliente: pessoa_cpf_pessoa (PK/FK → pessoa), renda_cliente, data_cadastro_cliente
 * 
 * Cliente herda de Pessoa via pessoa_cpf_pessoa
 */
const { query, transaction } = require('../database');
const path = require('path');
const bcrypt = require('bcryptjs');

const isCpf = (v) => typeof v === 'string' && /^\d{11}$/.test(v.replace(/\D/g, ''));
const normCpf = (v) => String(v || '').replace(/\D/g, '');
const isEmail = (v) => typeof v === 'string' && /.+@.+\..+/.test(v);

// =============================================================================
// LISTAR CLIENTES
// =============================================================================
exports.listarClientes = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
    const offset = (page - 1) * limit;
    const q = (req.query.q || '').trim();

    let whereSql = '';
    const params = [];
    let i = 1;

    if (q) {
      whereSql = `WHERE (p.nome_pessoa ILIKE $${i} OR p.email_pessoa ILIKE $${i})`;
      params.push(`%${q}%`);
      i++;
    }

    params.push(limit, offset);

    // JOIN pessoa + cliente
    const sql = `
      SELECT 
        c.pessoa_cpf_pessoa AS cpf,
        p.nome_pessoa AS nome,
        p.email_pessoa AS email,
        p.data_nascimento_pessoa AS data_nascimento,
        p.endereco_pessoa AS endereco,
        c.renda_cliente,
        c.data_cadastro_cliente
      FROM cliente c
      INNER JOIN pessoa p ON c.pessoa_cpf_pessoa = p.cpf_pessoa
      ${whereSql}
      ORDER BY p.nome_pessoa
      LIMIT $${i} OFFSET $${i + 1}
    `;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// =============================================================================
// OBTER CLIENTE POR CPF
// =============================================================================
exports.obterCliente = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    if (!isCpf(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos.' });
    }
    
    const result = await query(`
      SELECT 
        c.pessoa_cpf_pessoa AS cpf,
        p.nome_pessoa AS nome,
        p.email_pessoa AS email,
        p.data_nascimento_pessoa AS data_nascimento,
        p.endereco_pessoa AS endereco,
        c.renda_cliente,
        c.data_cadastro_cliente
      FROM cliente c
      INNER JOIN pessoa p ON c.pessoa_cpf_pessoa = p.cpf_pessoa
      WHERE c.pessoa_cpf_pessoa = $1
    `, [cpf]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// =============================================================================
// CRIAR CLIENTE (Modelo do Professor: pessoa + cliente)
// =============================================================================
exports.criarCliente = async (req, res) => {
  try {
    const { cpf, nome, email, senha, renda_cliente, data_nascimento, endereco } = req.body || {};
    const cpfStr = normCpf(cpf);
    
    if (!isCpf(cpfStr) || !nome || !isEmail(email) || !senha) {
      return res.status(400).json({ error: 'cpf (11 dígitos), nome, email válido e senha são obrigatórios' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(String(senha), salt);
    
    // 1. Inserir/Atualizar em PESSOA
    await query(`
      INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, data_nascimento_pessoa, endereco_pessoa)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (cpf_pessoa) DO UPDATE SET
        nome_pessoa = EXCLUDED.nome_pessoa,
        email_pessoa = EXCLUDED.email_pessoa,
        senha_pessoa = EXCLUDED.senha_pessoa,
        data_nascimento_pessoa = EXCLUDED.data_nascimento_pessoa,
        endereco_pessoa = EXCLUDED.endereco_pessoa
    `, [cpfStr, nome.trim(), email.trim(), hash, data_nascimento || null, endereco || null]);
    
    // 2. Inserir em CLIENTE (pessoa_cpf_pessoa como PK)
    await query(`
      INSERT INTO cliente (pessoa_cpf_pessoa, renda_cliente, data_cadastro_cliente)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
    `, [cpfStr, renda_cliente || null]);
    
    // Retorna dados
    const result = await query(`
      SELECT 
        c.pessoa_cpf_pessoa AS cpf,
        p.nome_pessoa AS nome,
        p.email_pessoa AS email
      FROM cliente c
      INNER JOIN pessoa p ON c.pessoa_cpf_pessoa = p.cpf_pessoa
      WHERE c.pessoa_cpf_pessoa = $1
    `, [cpfStr]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    if (error.code === '23505') return res.status(400).json({ error: 'CPF ou e-mail já cadastrado' });
    if (error.code === '23502') return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// =============================================================================
// ATUALIZAR CLIENTE
// =============================================================================
exports.atualizarCliente = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    if (!isCpf(cpf)) return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos.' });
    
    // Verifica existência
    const existing = await query(`
      SELECT 
        c.pessoa_cpf_pessoa AS cpf,
        p.nome_pessoa AS nome,
        p.email_pessoa AS email,
        p.data_nascimento_pessoa AS data_nascimento,
        p.endereco_pessoa AS endereco,
        c.renda_cliente
      FROM cliente c
      INNER JOIN pessoa p ON c.pessoa_cpf_pessoa = p.cpf_pessoa
      WHERE c.pessoa_cpf_pessoa = $1
    `, [cpf]);
    
    if (!existing.rows.length) return res.status(404).json({ error: 'Cliente não encontrado' });
    
    const current = existing.rows[0];
    const { nome, email, senha, renda_cliente, data_nascimento, endereco } = req.body || {};
    
    const updatedNome = nome !== undefined ? String(nome).trim() : current.nome;
    const updatedEmail = email !== undefined ? String(email).trim() : current.email;
    const updatedDataNasc = data_nascimento !== undefined ? data_nascimento : current.data_nascimento;
    const updatedEndereco = endereco !== undefined ? endereco : current.endereco;
    
    if (!isEmail(updatedEmail)) return res.status(400).json({ error: 'E-mail inválido' });
    
    // Hash da senha se fornecida
    let senhaHash = null;
    if (senha && String(senha).trim()) {
      const salt = await bcrypt.genSalt(10);
      senhaHash = await bcrypt.hash(String(senha), salt);
    }
    
    // 1. Atualizar PESSOA
    if (senhaHash) {
      await query(`
        UPDATE pessoa SET 
          nome_pessoa = $1, 
          email_pessoa = $2, 
          senha_pessoa = $3, 
          data_nascimento_pessoa = $4,
          endereco_pessoa = $5
        WHERE cpf_pessoa = $6
      `, [updatedNome, updatedEmail, senhaHash, updatedDataNasc, updatedEndereco, cpf]);
    } else {
      await query(`
        UPDATE pessoa SET 
          nome_pessoa = $1, 
          email_pessoa = $2, 
          data_nascimento_pessoa = $3,
          endereco_pessoa = $4
        WHERE cpf_pessoa = $5
      `, [updatedNome, updatedEmail, updatedDataNasc, updatedEndereco, cpf]);
    }
    
    // 2. Atualizar CLIENTE (apenas campos específicos)
    if (renda_cliente !== undefined) {
      await query('UPDATE cliente SET renda_cliente = $1 WHERE pessoa_cpf_pessoa = $2', [renda_cliente, cpf]);
    }
    
    // Retorna dados atualizados
    const result = await query(`
      SELECT 
        c.pessoa_cpf_pessoa AS cpf,
        p.nome_pessoa AS nome,
        p.email_pessoa AS email,
        c.renda_cliente
      FROM cliente c
      INNER JOIN pessoa p ON c.pessoa_cpf_pessoa = p.cpf_pessoa
      WHERE c.pessoa_cpf_pessoa = $1
    `, [cpf]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    if (error.code === '23505') return res.status(400).json({ error: 'E-mail já cadastrado' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// =============================================================================
// DELETAR CLIENTE
// =============================================================================
exports.deletarCliente = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    if (!isCpf(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos.' });
    }
    
    const existing = await query('SELECT 1 FROM cliente WHERE pessoa_cpf_pessoa = $1', [cpf]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // 1. Deleta de cliente
    await query('DELETE FROM cliente WHERE pessoa_cpf_pessoa = $1', [cpf]);
    
    // 2. Se não for funcionário, deleta também de pessoa
    const isFuncionario = await query('SELECT 1 FROM funcionario WHERE pessoa_cpf_pessoa = $1', [cpf]);
    if (isFuncionario.rows.length === 0) {
      await query('DELETE FROM pessoa WHERE cpf_pessoa = $1', [cpf]);
    }
    
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
