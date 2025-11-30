const { query, transaction } = require('../database');
const path = require('path');
const bcrypt = require('bcryptjs');

const isCpf = (v) => typeof v === 'string' && /^\d{11}$/.test(v.trim());
const normCpf = (v) => String(v || '').trim();
const isEmail = (v) => typeof v === 'string' && /.+@.+\..+/.test(v);

// =============================================================================
// FASE 5 - MODELO FINAL DO PROFESSOR
// pessoa: cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, data_nascimento
// cliente: cpf (PK), pessoa_cpf_pessoa (FK), renda_cliente, data_cadastro_cliente
// Colunas nome, email, senha REMOVIDAS de cliente (existem apenas em pessoa)
// =============================================================================

// Lista clientes com filtros básicos e paginação
// USA VIEW DE COMPATIBILIDADE para manter resposta igual
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

    // USA VIEW v_cliente_compat - retorna cpf, nome, email (formato antigo)
    const sql = `
      SELECT cpf, nome, email, renda_cliente, data_cadastro_cliente
      FROM v_cliente_compat
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
// USA VIEW DE COMPATIBILIDADE
exports.obterCliente = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    if (!isCpf(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos.' });
    }
    // USA VIEW v_cliente_compat
    const result = await query(
      'SELECT cpf, nome, email, renda_cliente, data_cadastro_cliente, data_nascimento FROM v_cliente_compat WHERE cpf = $1', 
      [cpf]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Cria novo cliente - MODELO FINAL
// Grava em PESSOA + CLIENTE (sem duplicação de colunas)
exports.criarCliente = async (req, res) => {
  try {
    const { cpf, nome, email, senha, renda_cliente, data_nascimento } = req.body || {};
    const cpfStr = normCpf(cpf);
    if (!isCpf(cpfStr) || !nome || !isEmail(email) || !senha) {
      return res.status(400).json({ error: 'cpf (11 dígitos), nome, email válido e senha são obrigatórios' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(String(senha), salt);
    
    // 1. Inserir em PESSOA (dados pessoais: nome, email, senha)
    await query(
      `INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, primeiro_acesso_pessoa, data_nascimento)
       VALUES ($1, $2, $3, $4, false, $5)
       ON CONFLICT (cpf_pessoa) DO UPDATE SET
         nome_pessoa = EXCLUDED.nome_pessoa,
         email_pessoa = EXCLUDED.email_pessoa,
         senha_pessoa = EXCLUDED.senha_pessoa,
         data_nascimento = EXCLUDED.data_nascimento`,
      [cpfStr, nome.trim(), email.trim(), hash, data_nascimento || null]
    );
    
    // 2. Inserir em CLIENTE (apenas campos específicos de cliente)
    await query(
      `INSERT INTO cliente (cpf, pessoa_cpf_pessoa, renda_cliente, data_cadastro_cliente)
       VALUES ($1, $2, $3, now())`,
      [cpfStr, cpfStr, renda_cliente || null]
    );
    
    // Retorna dados via view para manter formato de resposta
    const result = await query('SELECT cpf, nome, email FROM v_cliente_compat WHERE cpf = $1', [cpfStr]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    if (error.code === '23505') return res.status(400).json({ error: 'CPF ou e-mail já cadastrado' });
    if (error.code === '23502') return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualiza cliente - MODELO FINAL
// Atualiza PESSOA (nome, email, senha) + CLIENTE (renda_cliente)
exports.atualizarCliente = async (req, res) => {
  try {
    const cpf = normCpf(req.params.cpf);
    if (!isCpf(cpf)) return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos.' });
    
    // Verifica existência via view
    const existing = await query('SELECT * FROM v_cliente_compat WHERE cpf = $1', [cpf]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Cliente não encontrado' });
    
    const current = existing.rows[0];
    const { nome, email, senha, renda_cliente, data_nascimento } = req.body || {};
    
    const updatedNome = nome !== undefined ? String(nome).trim() : current.nome;
    const updatedEmail = email !== undefined ? String(email).trim() : current.email;
    
    if (!isEmail(updatedEmail)) return res.status(400).json({ error: 'E-mail inválido' });
    
    // Hash da senha se fornecida
    let senhaHash = null;
    if (senha && String(senha).trim()) {
      const salt = await bcrypt.genSalt(10);
      senhaHash = await bcrypt.hash(String(senha), salt);
    }
    
    // 1. Atualizar PESSOA (dados pessoais)
    if (senhaHash) {
      await query(
        `UPDATE pessoa SET nome_pessoa=$1, email_pessoa=$2, senha_pessoa=$3, data_nascimento=$4
         WHERE cpf_pessoa=$5`,
        [updatedNome, updatedEmail, senhaHash, data_nascimento !== undefined ? data_nascimento : current.data_nascimento, cpf]
      );
    } else {
      await query(
        `UPDATE pessoa SET nome_pessoa=$1, email_pessoa=$2, data_nascimento=$3
         WHERE cpf_pessoa=$4`,
        [updatedNome, updatedEmail, data_nascimento !== undefined ? data_nascimento : current.data_nascimento, cpf]
      );
    }
    
    // 2. Atualizar CLIENTE (apenas campos específicos)
    if (renda_cliente !== undefined) {
      await query('UPDATE cliente SET renda_cliente=$1 WHERE cpf=$2', [renda_cliente, cpf]);
    }
    
    // Retorna dados via view
    const result = await query('SELECT cpf, nome, email, renda_cliente FROM v_cliente_compat WHERE cpf = $1', [cpf]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    if (error.code === '23505') return res.status(400).json({ error: 'E-mail já cadastrado' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deleta cliente - MODELO FINAL
// Deleta de CLIENTE e opcionalmente de PESSOA
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
    
    // 1. Deleta de cliente
    await query('DELETE FROM cliente WHERE cpf = $1', [cpf]);
    
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
