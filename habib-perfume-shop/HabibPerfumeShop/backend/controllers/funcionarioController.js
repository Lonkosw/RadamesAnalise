/**
 * funcionarioController.js - MODELO EXATO DO PROFESSOR
 * 
 * ESTRUTURA:
 * pessoa: cpf_pessoa (PK), nome_pessoa, email_pessoa, senha_pessoa, data_nascimento_pessoa, endereco_pessoa
 * cargo: id_cargo (PK), nome_cargo
 * funcionario: pessoa_cpf_pessoa (PK/FK → pessoa), salario_funcionario, cargo_id_cargo (FK → cargo), porcentagem_comissao_funcionario
 * 
 * Funcionário herda de Pessoa via pessoa_cpf_pessoa
 */
const { query } = require('../database');
const path = require('path');
const bcrypt = require('bcryptjs');

// Definição de gerente master imutável
const GERENTE_MASTER_CPF = process.env.GERENTE_MASTER_CPF || '00000000000';

// =============================================================================
// ABRIR CRUD
// =============================================================================
exports.abrirCrudFuncionario = (req, res) => {
  console.log('funcionarioController - abrindo CRUD Funcionário');
  res.sendFile(path.join(__dirname, '../../frontend/funcionario/funcionario.html'));
};

// =============================================================================
// LISTAR FUNCIONÁRIOS
// =============================================================================
exports.listarFuncionario = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    let whereSql = '';
    const params = [];
    
    if (q) { 
      whereSql = 'WHERE (p.cpf_pessoa::text ILIKE $1 OR p.nome_pessoa ILIKE $1 OR c.nome_cargo ILIKE $1 OR p.email_pessoa ILIKE $1)'; 
      params.push(`%${q}%`); 
    }
    
    // JOIN pessoa + funcionario + cargo
    const result = await query(`
      SELECT 
        f.pessoa_cpf_pessoa AS cpf,
        p.nome_pessoa AS nome,
        c.nome_cargo AS cargo,
        f.salario_funcionario AS salario,
        f.porcentagem_comissao_funcionario AS porcentagem_comissao,
        p.email_pessoa AS email,
        f.cargo_id_cargo,
        c.nome_cargo
      FROM funcionario f
      INNER JOIN pessoa p ON f.pessoa_cpf_pessoa = p.cpf_pessoa
      LEFT JOIN cargo c ON f.cargo_id_cargo = c.id_cargo
      ${whereSql}
      ORDER BY p.nome_pessoa
    `, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar funcionario:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// =============================================================================
// CRIAR FUNCIONÁRIO (Modelo do Professor: pessoa + funcionario)
// =============================================================================
exports.criarFuncionario = async (req, res) => {
  try {
    const { cpf, nome, cargo_id_cargo, salario, porcentagem_comissao, email, senha, data_nascimento, endereco } = req.body || {};
    
    if (!cpf || !nome || !email || !senha) {
      return res.status(400).json({ error: 'cpf, nome, email e senha são obrigatórios' });
    }
    
    const cpfStr = String(cpf).replace(/\D/g, '').trim();
    if (!/^\d{11}$/.test(cpfStr)) {
      return res.status(400).json({ error: 'cpf deve conter exatamente 11 dígitos numéricos' });
    }
    
    const salarioNum = (salario === undefined || salario === null || String(salario).trim() === '') 
      ? null 
      : Number(salario);
    const comissaoNum = (porcentagem_comissao === undefined || porcentagem_comissao === null || String(porcentagem_comissao).trim() === '') 
      ? null 
      : Number(porcentagem_comissao);

    if (salarioNum !== null) {
      if (!Number.isFinite(salarioNum)) return res.status(400).json({ error: 'salário inválido' });
      if (salarioNum < 0 || salarioNum > 99999999.99) return res.status(400).json({ error: 'salário deve estar entre 0 e 99.999.999,99' });
    }
    if (comissaoNum !== null) {
      if (!Number.isFinite(comissaoNum)) return res.status(400).json({ error: 'comissão inválida' });
      if (comissaoNum < 0 || comissaoNum > 100) return res.status(400).json({ error: 'comissão deve estar entre 0 e 100' });
    }

    // Verifica duplicidade
    const duplCpf = await query('SELECT 1 FROM funcionario WHERE pessoa_cpf_pessoa = $1', [cpfStr]);
    if (duplCpf.rowCount) return res.status(400).json({ error: 'CPF já cadastrado como funcionário' });
    
    const duplEmail = await query('SELECT 1 FROM pessoa WHERE email_pessoa = $1 AND cpf_pessoa != $2', [email, cpfStr]);
    if (duplEmail.rowCount) return res.status(400).json({ error: 'Email já cadastrado' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);

    // 1. Grava em PESSOA
    await query(`
      INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, data_nascimento_pessoa, endereco_pessoa)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (cpf_pessoa) DO UPDATE SET
        nome_pessoa = EXCLUDED.nome_pessoa,
        email_pessoa = EXCLUDED.email_pessoa,
        senha_pessoa = EXCLUDED.senha_pessoa,
        data_nascimento_pessoa = EXCLUDED.data_nascimento_pessoa,
        endereco_pessoa = EXCLUDED.endereco_pessoa
    `, [cpfStr, nome, email, hash, data_nascimento || null, endereco || null]);

    // 2. Grava em FUNCIONARIO (modelo do professor)
    await query(`
      INSERT INTO funcionario (pessoa_cpf_pessoa, salario_funcionario, cargo_id_cargo, porcentagem_comissao_funcionario)
      VALUES ($1, $2, $3, $4)
    `, [cpfStr, salarioNum, cargo_id_cargo || null, comissaoNum]);
    
    // Retorna dados
    const result = await query(`
      SELECT 
        f.pessoa_cpf_pessoa AS cpf,
        p.nome_pessoa AS nome,
        c.nome_cargo AS cargo,
        f.salario_funcionario AS salario,
        f.porcentagem_comissao_funcionario AS porcentagem_comissao,
        p.email_pessoa AS email,
        f.cargo_id_cargo
      FROM funcionario f
      INNER JOIN pessoa p ON f.pessoa_cpf_pessoa = p.cpf_pessoa
      LEFT JOIN cargo c ON f.cargo_id_cargo = c.id_cargo
      WHERE f.pessoa_cpf_pessoa = $1
    `, [cpfStr]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar funcionario:', error);
    if (error.code === '23505') return res.status(400).json({ error: 'Registro duplicado' });
    if (error.code === '23502') {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// =============================================================================
// OBTER FUNCIONÁRIO POR CPF
// =============================================================================
exports.obterFuncionario = async (req, res) => {
  try {
    const cpf = String(req.params.cpf || '').replace(/\D/g, '').trim();
    if (!/^\d{11}$/.test(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos' });
    }

    const result = await query(`
      SELECT 
        f.pessoa_cpf_pessoa AS cpf,
        p.nome_pessoa AS nome,
        c.nome_cargo AS cargo,
        f.salario_funcionario AS salario,
        f.porcentagem_comissao_funcionario AS porcentagem_comissao,
        p.email_pessoa AS email,
        p.data_nascimento_pessoa AS data_nascimento,
        p.endereco_pessoa AS endereco,
        f.cargo_id_cargo,
        c.nome_cargo
      FROM funcionario f
      INNER JOIN pessoa p ON f.pessoa_cpf_pessoa = p.cpf_pessoa
      LEFT JOIN cargo c ON f.cargo_id_cargo = c.id_cargo
      WHERE f.pessoa_cpf_pessoa = $1
    `, [cpf]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter funcionario:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// =============================================================================
// ATUALIZAR FUNCIONÁRIO
// =============================================================================
exports.atualizarFuncionario = async (req, res) => {
  try {
    const cpf = String(req.params.cpf || '').replace(/\D/g, '').trim();
    const { nome, cargo_id_cargo, salario, porcentagem_comissao, email, senha, data_nascimento, endereco } = req.body || {};

    if (!/^\d{11}$/.test(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos' });
    }

    // Verifica existência
    const existing = await query(`
      SELECT 
        f.pessoa_cpf_pessoa AS cpf,
        p.nome_pessoa AS nome,
        f.salario_funcionario AS salario,
        f.porcentagem_comissao_funcionario AS porcentagem_comissao,
        p.email_pessoa AS email,
        p.data_nascimento_pessoa AS data_nascimento,
        p.endereco_pessoa AS endereco,
        f.cargo_id_cargo
      FROM funcionario f
      INNER JOIN pessoa p ON f.pessoa_cpf_pessoa = p.cpf_pessoa
      WHERE f.pessoa_cpf_pessoa = $1
    `, [cpf]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    const current = existing.rows[0];
    const requester = req.usuario || {};
    
    const salarioNum = (salario === undefined) 
      ? current.salario 
      : (String(salario).trim() === '' ? null : Number(salario));
    const comissaoNum = (porcentagem_comissao === undefined) 
      ? current.porcentagem_comissao 
      : (String(porcentagem_comissao).trim() === '' ? null : Number(porcentagem_comissao));

    if (salario !== undefined && String(salario).trim() !== '') {
      if (!Number.isFinite(salarioNum)) return res.status(400).json({ error: 'salário inválido' });
      if (salarioNum < 0 || salarioNum > 99999999.99) return res.status(400).json({ error: 'salário deve estar entre 0 e 99.999.999,99' });
    }
    if (porcentagem_comissao !== undefined && String(porcentagem_comissao).trim() !== '') {
      if (!Number.isFinite(comissaoNum)) return res.status(400).json({ error: 'comissão inválida' });
      if (comissaoNum < 0 || comissaoNum > 100) return res.status(400).json({ error: 'comissão deve estar entre 0 e 100' });
    }

    const updatedNome = nome !== undefined ? nome : current.nome;
    const updatedEmail = email !== undefined ? email : current.email;
    const updatedDataNasc = data_nascimento !== undefined ? data_nascimento : current.data_nascimento;
    const updatedEndereco = endereco !== undefined ? endereco : current.endereco;
    const updatedCargoId = cargo_id_cargo !== undefined ? cargo_id_cargo : current.cargo_id_cargo;

    // Somente o Master pode alterar seus próprios dados
    if (cpf === GERENTE_MASTER_CPF && requester.cpf !== GERENTE_MASTER_CPF) {
      return res.status(403).json({ error: 'Somente o Gerente Master pode alterar seus próprios dados' });
    }

    // email único
    if (email !== undefined && email !== current.email) {
      const duplPessoa = await query('SELECT 1 FROM pessoa WHERE email_pessoa = $1 AND cpf_pessoa != $2', [email, cpf]);
      if (duplPessoa.rowCount) return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha se fornecida
    let hash = null;
    if (senha && String(senha).trim()) {
      const salt = await bcrypt.genSalt(10);
      hash = await bcrypt.hash(senha, salt);
    }

    // 1. Atualiza PESSOA
    if (hash) {
      await query(`
        UPDATE pessoa SET 
          nome_pessoa = $1, 
          email_pessoa = $2, 
          senha_pessoa = $3, 
          data_nascimento_pessoa = $4,
          endereco_pessoa = $5
        WHERE cpf_pessoa = $6
      `, [updatedNome, updatedEmail, hash, updatedDataNasc, updatedEndereco, cpf]);
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

    // 2. Atualiza FUNCIONARIO
    await query(`
      UPDATE funcionario SET 
        salario_funcionario = $1, 
        cargo_id_cargo = $2, 
        porcentagem_comissao_funcionario = $3
      WHERE pessoa_cpf_pessoa = $4
    `, [salarioNum, updatedCargoId, comissaoNum, cpf]);

    // Retorna dados atualizados
    const result = await query(`
      SELECT 
        f.pessoa_cpf_pessoa AS cpf,
        p.nome_pessoa AS nome,
        c.nome_cargo AS cargo,
        f.salario_funcionario AS salario,
        f.porcentagem_comissao_funcionario AS porcentagem_comissao,
        p.email_pessoa AS email,
        f.cargo_id_cargo
      FROM funcionario f
      INNER JOIN pessoa p ON f.pessoa_cpf_pessoa = p.cpf_pessoa
      LEFT JOIN cargo c ON f.cargo_id_cargo = c.id_cargo
      WHERE f.pessoa_cpf_pessoa = $1
    `, [cpf]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar funcionario:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// =============================================================================
// DELETAR FUNCIONÁRIO
// =============================================================================
exports.deletarFuncionario = async (req, res) => {
  try {
    const cpf = String(req.params.cpf || '').replace(/\D/g, '').trim();
    if (!/^\d{11}$/.test(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos' });
    }

    const existing = await query('SELECT 1 FROM funcionario WHERE pessoa_cpf_pessoa = $1', [cpf]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    if (cpf === GERENTE_MASTER_CPF) {
      return res.status(400).json({ error: 'Gerente master não pode ser removido' });
    }

    // 1. Deleta de funcionario primeiro
    await query('DELETE FROM funcionario WHERE pessoa_cpf_pessoa = $1', [cpf]);
    
    // 2. Verifica se não é também cliente antes de deletar pessoa
    const isCliente = await query('SELECT 1 FROM cliente WHERE pessoa_cpf_pessoa = $1', [cpf]);
    if (isCliente.rows.length === 0) {
      // Só deleta de pessoa se não for cliente também
      await query('DELETE FROM pessoa WHERE cpf_pessoa = $1', [cpf]);
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar funcionario:', error);
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Não é possível deletar: há dependências relacionadas' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
