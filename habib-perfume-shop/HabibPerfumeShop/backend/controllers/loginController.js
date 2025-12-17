/**
 * loginController.js - MODELO EXATO DO PROFESSOR
 * 
 * ESTRUTURA:
 * pessoa: cpf_pessoa (PK), nome_pessoa, email_pessoa, senha_pessoa, data_nascimento_pessoa, endereco_pessoa
 * cliente: pessoa_cpf_pessoa (PK/FK → pessoa), renda_cliente, data_cadastro_cliente
 * funcionario: pessoa_cpf_pessoa (PK/FK → pessoa), salario_funcionario, cargo_id_cargo, porcentagem_comissao_funcionario
 * cargo: id_cargo (PK), nome_cargo
 */
const db = require('../database.js');
const bcrypt = require('bcryptjs');

// Configuração do gerente master
const GERENTE_MASTER_CPF = process.env.GERENTE_MASTER_CPF || '00000000000';
const GERENTE_MASTER_EMAIL = process.env.GERENTE_MASTER_EMAIL || 'master@habib.com';
const GERENTE_MASTER_NOME = process.env.GERENTE_MASTER_NOME || 'Master Gerente';
const GERENTE_MASTER_SENHA = process.env.GERENTE_MASTER_SENHA || 'master123';

// Garante existência do gerente master
(async () => {
  try {
    const r = await db.query('SELECT 1 FROM funcionario WHERE pessoa_cpf_pessoa = $1', [GERENTE_MASTER_CPF]);
    if (r.rowCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(GERENTE_MASTER_SENHA, salt);
      
      // 1. Insere em PESSOA
      await db.query(`
        INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (cpf_pessoa) DO UPDATE SET
          nome_pessoa = EXCLUDED.nome_pessoa,
          email_pessoa = EXCLUDED.email_pessoa,
          senha_pessoa = EXCLUDED.senha_pessoa
      `, [GERENTE_MASTER_CPF, GERENTE_MASTER_NOME, GERENTE_MASTER_EMAIL, hash]);
      
      // Buscar cargo de Gerente
      let cargoId = null;
      const cargoRes = await db.query('SELECT id_cargo FROM cargo WHERE LOWER(nome_cargo) LIKE $1', ['%gerente%']);
      if (cargoRes.rows.length > 0) cargoId = cargoRes.rows[0].id_cargo;
      
      // 2. Insere em FUNCIONARIO
      await db.query(`
        INSERT INTO funcionario (pessoa_cpf_pessoa, salario_funcionario, cargo_id_cargo, porcentagem_comissao_funcionario)
        VALUES ($1, $2, $3, $4)
      `, [GERENTE_MASTER_CPF, 0, cargoId, 0]);
      
      console.log('[loginController] Gerente master criado automaticamente');
    }
  } catch (e) { 
    console.error('Falha ao garantir gerente master', e); 
  }
})();

// Configurações de cookie
const cookieOpts = {
  httpOnly: false,  // Permite JS ler o cookie para fallback
  sameSite: 'Lax',
  secure: false,
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
};

// =============================================================================
// VERIFICAR EMAIL (cliente)
// =============================================================================
exports.verificarEmail = async (req, res) => {
  const { email } = req.body || {};
  try {
    const r = await db.query(`
      SELECT p.nome_pessoa AS nome 
      FROM cliente c 
      INNER JOIN pessoa p ON c.pessoa_cpf_pessoa = p.cpf_pessoa 
      WHERE p.email_pessoa = $1
    `, [email]);
    if (r.rows.length > 0) return res.json({ status: 'existe', nome: r.rows[0].nome });
    return res.json({ status: 'nao_encontrado' });
  } catch (err) {
    console.error('Erro em verificarEmail:', err);
    res.status(500).json({ status: 'erro', mensagem: err.message });
  }
};

// =============================================================================
// VERIFICAR SENHA (cliente)
// =============================================================================
exports.verificarSenha = async (req, res) => {
  const { email, senha } = req.body || {};
  try {
    const r = await db.query(`
      SELECT c.pessoa_cpf_pessoa AS cpf, p.nome_pessoa AS nome, p.email_pessoa AS email
      FROM cliente c 
      INNER JOIN pessoa p ON c.pessoa_cpf_pessoa = p.cpf_pessoa 
      WHERE p.email_pessoa = $1
    `, [email]);
    if (r.rows.length === 0) return res.json({ status: 'senha_incorreta' });
    const user = r.rows[0];
    
    // Busca senha em pessoa
    const pSenha = await db.query('SELECT senha_pessoa FROM pessoa WHERE cpf_pessoa = $1', [user.cpf]);
    const senhaHash = pSenha.rows[0]?.senha_pessoa || '';
    
    let ok = false;
    if (senhaHash.startsWith('$2')) ok = await bcrypt.compare(senha, senhaHash); 
    else ok = (senhaHash === senha);
    if (!ok) return res.json({ status: 'senha_incorreta' });
    
    res.cookie('usuario', JSON.stringify({ tipo: 'cliente', cpf: user.cpf, nome: user.nome, email: user.email }), cookieOpts);
    return res.json({ status: 'ok', tipo: 'cliente', nome: user.nome, cpf: user.cpf });
  } catch (err) {
    console.error('Erro ao verificar senha (cliente):', err);
    return res.status(500).json({ status: 'erro', mensagem: err.message });
  }
};

// =============================================================================
// LOGIN CLIENTE (email + senha)
// =============================================================================
exports.loginCliente = async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ status: 'erro', mensagem: 'Email e senha são obrigatórios' });
  try {
    const r = await db.query(`
      SELECT c.pessoa_cpf_pessoa AS cpf, p.nome_pessoa AS nome, p.email_pessoa AS email
      FROM cliente c 
      INNER JOIN pessoa p ON c.pessoa_cpf_pessoa = p.cpf_pessoa 
      WHERE p.email_pessoa = $1
    `, [email]);
    if (r.rows.length === 0) return res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas' });
    const u = r.rows[0];
    
    // Busca senha em pessoa
    const pSenha = await db.query('SELECT senha_pessoa FROM pessoa WHERE cpf_pessoa = $1', [u.cpf]);
    const senhaHash = pSenha.rows[0]?.senha_pessoa || '';
    
    let senhaValida = false;
    if (senhaHash.startsWith('$2')) senhaValida = await bcrypt.compare(senha, senhaHash); 
    else senhaValida = (senhaHash === senha);
    if (!senhaValida) return res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas' });
    
    const usuario = { tipo: 'cliente', cpf: u.cpf, nome: u.nome, email: u.email };
    res.cookie('usuario', JSON.stringify(usuario), cookieOpts);
    return res.json({ status: 'ok', usuario });
  } catch (err) {
    console.error('Erro no loginCliente:', err);
    return res.status(500).json({ status: 'erro', mensagem: 'Falha interna no login' });
  }
};

// =============================================================================
// LOGIN FUNCIONÁRIO (cpf ou email + senha)
// =============================================================================
exports.loginFuncionario = async (req, res) => {
  const { cpf, email, senha } = req.body || {};
  if ((!cpf && !email) || !senha) return res.status(400).json({ status: 'erro', mensagem: 'Informe cpf ou email e a senha' });
  try {
    let queryStr, valor;
    if (email) {
      queryStr = `
        SELECT f.pessoa_cpf_pessoa AS cpf, p.nome_pessoa AS nome, c.nome_cargo AS cargo, p.email_pessoa AS email
        FROM funcionario f
        INNER JOIN pessoa p ON f.pessoa_cpf_pessoa = p.cpf_pessoa
        LEFT JOIN cargo c ON f.cargo_id_cargo = c.id_cargo
        WHERE p.email_pessoa = $1
      `;
      valor = email;
    } else {
      queryStr = `
        SELECT f.pessoa_cpf_pessoa AS cpf, p.nome_pessoa AS nome, c.nome_cargo AS cargo, p.email_pessoa AS email
        FROM funcionario f
        INNER JOIN pessoa p ON f.pessoa_cpf_pessoa = p.cpf_pessoa
        LEFT JOIN cargo c ON f.cargo_id_cargo = c.id_cargo
        WHERE f.pessoa_cpf_pessoa = $1
      `;
      valor = cpf;
    }
    
    const r = await db.query(queryStr, [valor]);
    if (r.rows.length === 0) return res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas' });
    const f = r.rows[0];
    
    // Busca senha em pessoa
    const pSenha = await db.query('SELECT senha_pessoa FROM pessoa WHERE cpf_pessoa = $1', [f.cpf]);
    const senhaHash = pSenha.rows[0]?.senha_pessoa || '';
    
    let senhaValida = false;
    if (senhaHash.startsWith('$2')) senhaValida = await bcrypt.compare(senha, senhaHash); 
    else senhaValida = (senhaHash === senha);
    if (!senhaValida) return res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas' });
    
    const isGerente = f.cargo && f.cargo.toLowerCase().includes('gerente');
    const usuario = { tipo: 'funcionario', cpf: f.cpf, nome: f.nome, cargo: f.cargo, gerente: isGerente, email: f.email };
    res.cookie('usuario', JSON.stringify(usuario), cookieOpts);
    return res.json({ status: 'ok', usuario });
  } catch (err) {
    console.error('Erro no loginFuncionario:', err);
    return res.status(500).json({ status: 'erro', mensagem: 'Falha interna no login de funcionario' });
  }
};

// =============================================================================
// LOGIN UNIVERSAL (email + senha) - tenta funcionário PRIMEIRO, depois cliente
// Prioridade: funcionário > cliente (evita conflito quando CPF está em ambas)
// =============================================================================
exports.loginUniversal = async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ status: 'erro', mensagem: 'Email e senha são obrigatórios' });
  try {
    // PRIMEIRO tenta funcionário (prioridade para funcionários que também são clientes)
    const rFunc = await db.query(`
      SELECT f.pessoa_cpf_pessoa AS cpf, p.nome_pessoa AS nome, c.nome_cargo AS cargo, p.email_pessoa AS email
      FROM funcionario f
      INNER JOIN pessoa p ON f.pessoa_cpf_pessoa = p.cpf_pessoa
      LEFT JOIN cargo c ON f.cargo_id_cargo = c.id_cargo
      WHERE p.email_pessoa = $1
    `, [email]);
    if (rFunc.rows.length === 1) {
      const f = rFunc.rows[0];
      const pSenha = await db.query('SELECT senha_pessoa FROM pessoa WHERE cpf_pessoa = $1', [f.cpf]);
      const senhaHash = pSenha.rows[0]?.senha_pessoa || '';
      let ok = false;
      if (senhaHash.startsWith('$2')) ok = await bcrypt.compare(senha, senhaHash); 
      else ok = (senhaHash === senha);
      if (ok) {
        const isGerente = f.cargo && f.cargo.toLowerCase().includes('gerente');
        const usuario = { tipo: 'funcionario', cpf: f.cpf, nome: f.nome, cargo: f.cargo, gerente: isGerente, email: f.email };
        res.cookie('usuario', JSON.stringify(usuario), cookieOpts);
        return res.json({ status: 'ok', usuario });
      }
    }
    
    // DEPOIS tenta cliente (somente se não for funcionário)
    const rCliente = await db.query(`
      SELECT c.pessoa_cpf_pessoa AS cpf, p.nome_pessoa AS nome, p.email_pessoa AS email
      FROM cliente c 
      INNER JOIN pessoa p ON c.pessoa_cpf_pessoa = p.cpf_pessoa 
      WHERE p.email_pessoa = $1
    `, [email]);
    if (rCliente.rows.length === 1) {
      const c = rCliente.rows[0];
      const pSenha = await db.query('SELECT senha_pessoa FROM pessoa WHERE cpf_pessoa = $1', [c.cpf]);
      const senhaHash = pSenha.rows[0]?.senha_pessoa || '';
      let ok = false;
      if (senhaHash.startsWith('$2')) ok = await bcrypt.compare(senha, senhaHash); 
      else ok = (senhaHash === senha);
      if (ok) {
        const usuario = { tipo: 'cliente', cpf: c.cpf, nome: c.nome, email: c.email };
        res.cookie('usuario', JSON.stringify(usuario), cookieOpts);
        return res.json({ status: 'ok', usuario });
      }
    }
    
    return res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas' });
  } catch (err) {
    console.error('Erro no loginUniversal:', err);
    return res.status(500).json({ status: 'erro', mensagem: 'Falha interna no login' });
  }
};

// =============================================================================
// VERIFICA SE USUÁRIO ESTÁ LOGADO
// =============================================================================
exports.verificaSeUsuarioEstaLogado = (req, res) => {
  try {
    const raw = req.cookies?.usuario;
    if (!raw) return res.json({ status: 'nao_logado' });
    let usuario;
    try { usuario = JSON.parse(raw); } catch { return res.json({ status: 'nao_logado' }); }
    return res.json({ status: 'ok', usuario });
  } catch (err) {
    console.error('Erro ao verificar status de login:', err);
    res.status(500).json({ status: 'erro' });
  }
};

// =============================================================================
// CADASTRAR CLIENTE (registro)
// =============================================================================
exports.criarCliente = async (req, res) => {
  const { cpf, nome, email, senha, data_nascimento, endereco } = req.body || {};
  if (!cpf || !nome || !email || !senha) {
    return res.status(400).json({ status: 'erro', mensagem: 'Todos os campos são obrigatórios: cpf, nome, email, senha' });
  }
  
  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) {
    return res.status(400).json({ status: 'erro', mensagem: 'CPF deve ter 11 dígitos numéricos' });
  }
  
  try {
    // Verifica duplicidade
    const existingCpf = await db.query('SELECT 1 FROM pessoa WHERE cpf_pessoa = $1', [cpfLimpo]);
    if (existingCpf.rows.length > 0) return res.status(400).json({ status: 'erro', mensagem: 'CPF já cadastrado' });
    const existingEmail = await db.query('SELECT 1 FROM pessoa WHERE email_pessoa = $1', [email]);
    if (existingEmail.rows.length > 0) return res.status(400).json({ status: 'erro', mensagem: 'Email já cadastrado' });
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);
    
    // 1. Grava em PESSOA
    await db.query(`
      INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, data_nascimento_pessoa, endereco_pessoa)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [cpfLimpo, nome, email, hash, data_nascimento || null, endereco || null]);
    
    // 2. Grava em CLIENTE
    await db.query(`
      INSERT INTO cliente (pessoa_cpf_pessoa, data_cadastro_cliente)
      VALUES ($1, CURRENT_TIMESTAMP)
    `, [cpfLimpo]);
    
    const usuario = { tipo: 'cliente', cpf: cpfLimpo, nome, email };
    res.cookie('usuario', JSON.stringify(usuario), cookieOpts);
    return res.json({ status: 'ok', usuario });
  } catch (err) {
    console.error('Erro ao cadastrar cliente:', err);
    res.status(500).json({ status: 'erro', mensagem: err.message });
  }
};

// =============================================================================
// LOGOUT
// =============================================================================
exports.logout = (req, res) => {
  res.clearCookie('usuario', { path: '/' });
  res.json({ status: 'deslogado' });
};

// =============================================================================
// ALTERAR SENHA
// =============================================================================
exports.alterarSenha = async (req, res) => {
  try {
    const raw = req.cookies?.usuario;
    if (!raw) return res.status(401).json({ status: 'erro', mensagem: 'Nao autenticado' });
    let usuario;
    try { usuario = JSON.parse(raw); } catch { return res.status(401).json({ status: 'erro', mensagem: 'Sessao invalida' }); }
    
    const { senhaAtual, novaSenha } = req.body || {};
    if (!senhaAtual || !novaSenha) return res.status(400).json({ status: 'erro', mensagem: 'Campos obrigatorios' });
    if (novaSenha.length < 4) return res.status(400).json({ status: 'erro', mensagem: 'Nova senha muito curta' });
    
    // Busca senha atual em pessoa
    const r = await db.query('SELECT senha_pessoa FROM pessoa WHERE cpf_pessoa = $1', [usuario.cpf]);
    if (r.rows.length === 0) return res.status(404).json({ status: 'erro', mensagem: 'Usuario não encontrado' });
    const atualHash = r.rows[0].senha_pessoa || '';
    
    let confere = false;
    if (atualHash.startsWith('$2')) confere = await bcrypt.compare(senhaAtual, atualHash); 
    else confere = (atualHash === senhaAtual);
    if (!confere) return res.status(401).json({ status: 'erro', mensagem: 'Senha atual incorreta' });
    
    const salt = await bcrypt.genSalt(10);
    const novoHash = await bcrypt.hash(novaSenha, salt);
    
    // Atualiza senha em pessoa
    await db.query('UPDATE pessoa SET senha_pessoa = $1 WHERE cpf_pessoa = $2', [novoHash, usuario.cpf]);
    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('Erro alterarSenha:', err);
    return res.status(500).json({ status: 'erro', mensagem: 'Falha interna' });
  }
};

