const { query } = require('../database');
const path = require('path');
const bcrypt = require('bcryptjs');

// Definição de gerente master imutável
const GERENTE_MASTER_CPF = process.env.GERENTE_MASTER_CPF || '00000000000'; // ajustar CPF real depois

// Abre a página do CRUD no frontend
exports.abrirCrudFuncionario = (req, res) => {
  console.log('funcionarioController - abrindo CRUD Funcionário (novo layout)');
  res.sendFile(path.join(__dirname, '../../frontend/funcionario/funcionario.html'));
};

// Lista funcionários (com filtro opcional por q: cpf/nome/cargo/email)
exports.listarFuncionario = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    let where = '';
    const params = [];
    if (q) { where = 'WHERE (cpf::text ILIKE $1 OR nome ILIKE $1 OR cargo ILIKE $1 OR email ILIKE $1)'; params.push(`%${q}%`); }
  const result = await query(`SELECT TRIM(cpf) AS cpf, nome, cargo, salario, porcentagem_comissao, email FROM funcionario ${where} ORDER BY nome`, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar funcionario:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Cria um novo funcionário (cpf, nome, cargo, salario?, porcentagem_comissao?, email, senha)
exports.criarFuncionario = async (req, res) => {
  try {
  const { cpf, nome, cargo, salario, porcentagem_comissao, email, senha } = req.body || {};
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

    const duplCpf = await query('SELECT 1 FROM funcionario WHERE cpf=$1', [cpfStr]);
    if (duplCpf.rowCount) return res.status(400).json({ error: 'CPF já cadastrado' });
    const duplEmail = await query('SELECT 1 FROM funcionario WHERE email=$1', [email]);
    if (duplEmail.rowCount) return res.status(400).json({ error: 'Email já cadastrado' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);

    const result = await query(
      'INSERT INTO funcionario (cpf, nome, cargo, salario, porcentagem_comissao, email, senha) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING cpf, nome, cargo, salario, porcentagem_comissao, email',
      [cpfStr, nome, cargo, salarioNum, comissaoNum, email, hash]
    );
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

// Obtém um funcionário por CPF (param :cpf)
exports.obterFuncionario = async (req, res) => {
  try {
    const cpf = String(req.params.cpf || '').replace(/\D/g,'').trim();
    if (!/^\d{11}$/.test(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos' });
    }

  const result = await query('SELECT cpf, nome, cargo, salario, porcentagem_comissao, email FROM funcionario WHERE cpf = $1', [cpf]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter funcionario:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualiza dados do funcionário (param :cpf)
exports.atualizarFuncionario = async (req, res) => {
  try {
    const cpf = String(req.params.cpf || '').replace(/\D/g,'').trim();
  const { nome, cargo, salario, porcentagem_comissao, email, senha } = req.body || {};
  const novoCpfRaw = req.body?.novo_cpf;

    if (!/^\d{11}$/.test(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Use 11 dígitos' });
    }

    // Verifica existência
    const existing = await query('SELECT * FROM funcionario WHERE cpf = $1', [cpf]);
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

    const updated = {
      nome: nome !== undefined ? nome : current.nome,
      cargo: cargo !== undefined ? cargo : current.cargo,
      salario: salarioNum,
      porcentagem_comissao: comissaoNum,
    };

    // Somente o Master pode alterar seus próprios dados
    if (cpf === GERENTE_MASTER_CPF && requester.cpf !== GERENTE_MASTER_CPF) {
      return res.status(403).json({ error: 'Somente o Gerente Master pode alterar seus próprios dados' });
    }

    // email único
    if (email !== undefined && email !== current.email) {
      const dupl = await query('SELECT 1 FROM funcionario WHERE email=$1 AND cpf<>$2', [email, cpf]);
      if (dupl.rowCount) return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Preparar atualização dinâmica
    const sets = ['nome=$1', 'cargo=$2', 'salario=$3', 'porcentagem_comissao=$4'];
    const params = [updated.nome, updated.cargo, updated.salario, updated.porcentagem_comissao];
    let idx = params.length;

    if (email !== undefined) { idx += 1; sets.push(`email=$${idx}`); params.push(email); }

    if (senha && String(senha).trim()) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(senha, salt);
      idx += 1; sets.push(`senha=$${idx}`); params.push(hash);
    }

    // Alteração de CPF (primary key)
    if (novoCpfRaw !== undefined && novoCpfRaw !== null) {
      const novoCpf = String(novoCpfRaw).replace(/\D/g,'').trim();
      if (!/^\d{11}$/.test(novoCpf)) return res.status(400).json({ error: 'novo_cpf deve conter exatamente 11 dígitos numéricos' });
      if (novoCpf !== cpf) {
        // Master não pode ter CPF alterado
        if (cpf === GERENTE_MASTER_CPF) {
          return res.status(400).json({ error: 'O CPF do Gerente Master não pode ser alterado' });
        }
        const duplCpf = await query('SELECT 1 FROM funcionario WHERE cpf=$1', [novoCpf]);
        if (duplCpf.rowCount) return res.status(400).json({ error: 'CPF já cadastrado' });
        idx += 1; sets.push(`cpf=$${idx}`); params.push(novoCpf);
      }
    }

    const whereIndex = params.length + 1;
    const sql = `UPDATE funcionario SET ${sets.join(', ')} WHERE cpf=$${whereIndex} RETURNING cpf, nome, cargo, salario, porcentagem_comissao, email`;
    params.push(cpf);
    const updateResult = await query(sql, params);

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar funcionario:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deleta um funcionário (param :cpf)
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

    await query('DELETE FROM funcionario WHERE cpf = $1', [cpf]);
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar funcionario:', error);
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Não é possível deletar: há dependências relacionadas' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
