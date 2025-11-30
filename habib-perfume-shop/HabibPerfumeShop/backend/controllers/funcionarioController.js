const { query } = require('../database');
const path = require('path');
const bcrypt = require('bcryptjs');

// =============================================================================
// FASE 5 - MODELO FINAL DO PROFESSOR
// pessoa: cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, data_nascimento
// funcionario: cpf (PK), pessoa_cpf_pessoa (FK), cargo, salario, porcentagem_comissao, cargo_id_cargo
// Colunas nome, email, senha REMOVIDAS de funcionario (existem apenas em pessoa)
// =============================================================================

// Definição de gerente master imutável
const GERENTE_MASTER_CPF = process.env.GERENTE_MASTER_CPF || '00000000000';

// Abre a página do CRUD no frontend
exports.abrirCrudFuncionario = (req, res) => {
  console.log('funcionarioController - abrindo CRUD Funcionário (novo layout)');
  res.sendFile(path.join(__dirname, '../../frontend/funcionario/funcionario.html'));
};

// Lista funcionários - USA VIEW DE COMPATIBILIDADE
exports.listarFuncionario = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    let where = '';
    const params = [];
    if (q) { 
      where = 'WHERE (cpf::text ILIKE $1 OR nome ILIKE $1 OR cargo ILIKE $1 OR email ILIKE $1)'; 
      params.push(`%${q}%`); 
    }
    // USA VIEW v_funcionario_compat - retorna campos no formato antigo
    const result = await query(
      `SELECT TRIM(cpf) AS cpf, nome, cargo, salario, porcentagem_comissao, email, cargo_id_cargo, nome_cargo
       FROM v_funcionario_compat ${where} ORDER BY nome`, 
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar funcionario:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Cria um novo funcionário - MODELO FINAL
// Grava em PESSOA (nome, email, senha) + FUNCIONARIO (cargo, salario, comissao)
exports.criarFuncionario = async (req, res) => {
  try {
    const { cpf, nome, cargo, salario, porcentagem_comissao, email, senha, cargo_id_cargo, data_nascimento } = req.body || {};
    if (!cpf || !nome || !cargo || !email || !senha) return res.status(400).json({ error: 'cpf, nome, cargo, email e senha são obrigatórios' });
    const cpfStr = String(cpf).replace(/\D/g,'').trim();
    if (!/^\d{11}$/.test(cpfStr)) return res.status(400).json({ error: 'cpf deve conter exatamente 11 dígitos numéricos' });
    
    const salarioNum = (salario === undefined || salario === null || String(salario).trim()==='') ? null : Number(salario);
    const comissaoNum = (porcentagem_comissao === undefined || porcentagem_comissao === null || String(porcentagem_comissao).trim()==='') ? null : Number(porcentagem_comissao);

    if (salarioNum !== null) {
      if (!Number.isFinite(salarioNum)) return res.status(400).json({ error: 'salário inválido' });
      if (salarioNum < 0 || salarioNum > 99999999.99) return res.status(400).json({ error: 'salário deve estar entre 0 e 99.999.999,99' });
    }
    if (comissaoNum !== null) {
      if (!Number.isFinite(comissaoNum)) return res.status(400).json({ error: 'comissão inválida' });
      if (comissaoNum < 0 || comissaoNum > 100) return res.status(400).json({ error: 'comissão deve estar entre 0 e 100' });
    }

    // Verifica duplicidade em pessoa (email) e funcionario (cpf)
    const duplCpf = await query('SELECT 1 FROM funcionario WHERE cpf=$1', [cpfStr]);
    if (duplCpf.rowCount) return res.status(400).json({ error: 'CPF já cadastrado' });
    const duplEmail = await query('SELECT 1 FROM pessoa WHERE email_pessoa=$1', [email]);
    if (duplEmail.rowCount) return res.status(400).json({ error: 'Email já cadastrado' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);

    // 1. Grava em PESSOA (dados pessoais: nome, email, senha)
    await query(
      `INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, primeiro_acesso_pessoa, data_nascimento)
       VALUES ($1, $2, $3, $4, false, $5)
       ON CONFLICT (cpf_pessoa) DO UPDATE SET
         nome_pessoa = EXCLUDED.nome_pessoa,
         email_pessoa = EXCLUDED.email_pessoa,
         senha_pessoa = EXCLUDED.senha_pessoa,
         data_nascimento = EXCLUDED.data_nascimento`,
      [cpfStr, nome, email, hash, data_nascimento || null]
    );

    // Buscar cargo_id_cargo se não fornecido
    let cargoIdFinal = cargo_id_cargo || null;
    if (!cargoIdFinal && cargo) {
      const cargoRes = await query('SELECT id_cargo FROM cargo WHERE LOWER(nome_cargo) = LOWER($1)', [cargo]);
      if (cargoRes.rows.length > 0) {
        cargoIdFinal = cargoRes.rows[0].id_cargo;
      }
    }

    // 2. Grava em FUNCIONARIO (apenas campos específicos)
    await query(
      `INSERT INTO funcionario (cpf, cargo, salario, porcentagem_comissao, pessoa_cpf_pessoa, cargo_id_cargo) 
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [cpfStr, cargo, salarioNum, comissaoNum, cpfStr, cargoIdFinal]
    );
    
    // Retorna via view para manter formato de resposta
    const result = await query('SELECT cpf, nome, cargo, salario, porcentagem_comissao, email FROM v_funcionario_compat WHERE cpf = $1', [cpfStr]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar funcionario:', error);
    if (error.code === '23505') return res.status(400).json({ error: 'Registro duplicado' });
    if (error.code === '23502') {
      const coluna = error.column || (error.constraint ? String(error.constraint).replace(/.*_(.*)_not_null.*/,'$1') : undefined);
      return res.status(400).json({ error: coluna ? `Campo obrigatório ausente: ${coluna}` : 'Dados obrigatórios não fornecidos' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Obtém um funcionário por CPF - USA VIEW DE COMPATIBILIDADE
exports.obterFuncionario = async (req, res) => {
  try {
    const cpf = String(req.params.cpf || '').replace(/\D/g,'').trim();
    if (!/^\d{11}$/.test(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos' });
    }

    // USA VIEW v_funcionario_compat
    const result = await query(
      `SELECT cpf, nome, cargo, salario, porcentagem_comissao, email, cargo_id_cargo, nome_cargo, data_nascimento
       FROM v_funcionario_compat WHERE cpf = $1`, 
      [cpf]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter funcionario:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualiza dados do funcionário (param :cpf) - MODELO FINAL
// Atualiza PESSOA (nome, email, senha) + FUNCIONARIO (cargo, salario, comissao)
exports.atualizarFuncionario = async (req, res) => {
  try {
    const cpf = String(req.params.cpf || '').replace(/\D/g,'').trim();
    const { nome, cargo, salario, porcentagem_comissao, email, senha, data_nascimento, cargo_id_cargo } = req.body || {};
    const novoCpfRaw = req.body?.novo_cpf;

    if (!/^\d{11}$/.test(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos' });
    }

    // Verifica existência via view
    const existing = await query('SELECT * FROM v_funcionario_compat WHERE cpf = $1', [cpf]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    const current = existing.rows[0];
    const requester = req.usuario || {};
    const salarioNum = (salario === undefined ? current.salario : (String(salario).trim()==='' ? null : Number(salario)));
    const comissaoNum = (porcentagem_comissao === undefined ? current.porcentagem_comissao : (String(porcentagem_comissao).trim()==='' ? null : Number(porcentagem_comissao)));

    if (salario !== undefined && String(salario).trim()!=='') {
      if (!Number.isFinite(salarioNum)) return res.status(400).json({ error: 'salário inválido' });
      if (salarioNum < 0 || salarioNum > 99999999.99) return res.status(400).json({ error: 'salário deve estar entre 0 e 99.999.999,99' });
    }
    if (porcentagem_comissao !== undefined && String(porcentagem_comissao).trim()!=='') {
      if (!Number.isFinite(comissaoNum)) return res.status(400).json({ error: 'comissão inválida' });
      if (comissaoNum < 0 || comissaoNum > 100) return res.status(400).json({ error: 'comissão deve estar entre 0 e 100' });
    }

    const updatedNome = nome !== undefined ? nome : current.nome;
    const updatedCargo = cargo !== undefined ? cargo : current.cargo;
    const updatedEmail = email !== undefined ? email : current.email;

    // Somente o Master pode alterar seus próprios dados
    if (cpf === GERENTE_MASTER_CPF && requester.cpf !== GERENTE_MASTER_CPF) {
      return res.status(403).json({ error: 'Somente o Gerente Master pode alterar seus próprios dados' });
    }

    // email único (verifica em pessoa)
    if (email !== undefined && email !== current.email) {
      const duplPessoa = await query('SELECT 1 FROM pessoa WHERE email_pessoa=$1 AND cpf_pessoa<>$2', [email, cpf]);
      if (duplPessoa.rowCount) return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Atualiza cargo_id_cargo se fornecido cargo por nome
    let cargoIdFinal = cargo_id_cargo !== undefined ? cargo_id_cargo : current.cargo_id_cargo;
    if (cargo && cargo !== current.cargo && !cargo_id_cargo) {
      const cargoRes = await query('SELECT id_cargo FROM cargo WHERE LOWER(nome_cargo) = LOWER($1)', [cargo]);
      if (cargoRes.rows.length > 0) {
        cargoIdFinal = cargoRes.rows[0].id_cargo;
      }
    }

    // Hash da senha se fornecida
    let hash = null;
    if (senha && String(senha).trim()) {
      const salt = await bcrypt.genSalt(10);
      hash = await bcrypt.hash(senha, salt);
    }

    // Alteração de CPF (primary key) - valida antes
    let novoCpf = cpf;
    if (novoCpfRaw !== undefined && novoCpfRaw !== null) {
      novoCpf = String(novoCpfRaw).replace(/\D/g,'').trim();
      if (!/^\d{11}$/.test(novoCpf)) return res.status(400).json({ error: 'novo_cpf deve conter exatamente 11 dígitos numéricos' });
      if (novoCpf !== cpf) {
        if (cpf === GERENTE_MASTER_CPF) {
          return res.status(400).json({ error: 'O CPF do Gerente Master não pode ser alterado' });
        }
        const duplCpfPessoa = await query('SELECT 1 FROM pessoa WHERE cpf_pessoa=$1', [novoCpf]);
        if (duplCpfPessoa.rowCount) return res.status(400).json({ error: 'CPF já cadastrado' });
      }
    }

    // 1. Atualiza PESSOA (dados pessoais: nome, email, senha)
    const pessoaSets = [];
    const pessoaParams = [];
    let pIdx = 0;
    
    if (nome !== undefined) { pIdx++; pessoaSets.push(`nome_pessoa=$${pIdx}`); pessoaParams.push(updatedNome); }
    if (email !== undefined) { pIdx++; pessoaSets.push(`email_pessoa=$${pIdx}`); pessoaParams.push(updatedEmail); }
    if (hash) { pIdx++; pessoaSets.push(`senha_pessoa=$${pIdx}`); pessoaParams.push(hash); }
    if (data_nascimento !== undefined) { pIdx++; pessoaSets.push(`data_nascimento=$${pIdx}`); pessoaParams.push(data_nascimento || null); }
    if (novoCpf !== cpf) { pIdx++; pessoaSets.push(`cpf_pessoa=$${pIdx}`); pessoaParams.push(novoCpf); }
    
    if (pessoaSets.length > 0) {
      pIdx++;
      pessoaParams.push(cpf);
      await query(`UPDATE pessoa SET ${pessoaSets.join(', ')} WHERE cpf_pessoa=$${pIdx}`, pessoaParams);
    }

    // 2. Atualiza FUNCIONARIO (apenas campos específicos)
    const funcSets = [];
    const funcParams = [];
    let fIdx = 0;
    
    if (cargo !== undefined) { fIdx++; funcSets.push(`cargo=$${fIdx}`); funcParams.push(updatedCargo); }
    if (salario !== undefined) { fIdx++; funcSets.push(`salario=$${fIdx}`); funcParams.push(salarioNum); }
    if (porcentagem_comissao !== undefined) { fIdx++; funcSets.push(`porcentagem_comissao=$${fIdx}`); funcParams.push(comissaoNum); }
    if (cargoIdFinal !== undefined) { fIdx++; funcSets.push(`cargo_id_cargo=$${fIdx}`); funcParams.push(cargoIdFinal); }
    if (novoCpf !== cpf) { 
      fIdx++; funcSets.push(`cpf=$${fIdx}`); funcParams.push(novoCpf);
      fIdx++; funcSets.push(`pessoa_cpf_pessoa=$${fIdx}`); funcParams.push(novoCpf);
    }

    if (funcSets.length > 0) {
      fIdx++;
      funcParams.push(cpf);
      await query(`UPDATE funcionario SET ${funcSets.join(', ')} WHERE cpf=$${fIdx}`, funcParams);
    }

    // Retorna via view
    const result = await query('SELECT cpf, nome, cargo, salario, porcentagem_comissao, email FROM v_funcionario_compat WHERE cpf = $1', [novoCpf]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar funcionario:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deleta um funcionário (param :cpf) - MODELO FINAL
exports.deletarFuncionario = async (req, res) => {
  try {
    const cpf = String(req.params.cpf || '').replace(/\D/g,'').trim();
    if (!/^\d{11}$/.test(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos' });
    }

    const existing = await query('SELECT 1 FROM funcionario WHERE cpf = $1', [cpf]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    if (cpf === GERENTE_MASTER_CPF) {
      return res.status(400).json({ error: 'Gerente master não pode ser removido' });
    }

    // 1. Deleta de funcionario primeiro
    await query('DELETE FROM funcionario WHERE cpf = $1', [cpf]);
    
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
