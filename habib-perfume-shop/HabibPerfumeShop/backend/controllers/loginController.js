const db = require('../database.js');
const bcrypt = require('bcryptjs');

// Garantia de existência do gerente master (imutável via controller)
const GERENTE_MASTER_CPF = process.env.GERENTE_MASTER_CPF || '00000000000';
const GERENTE_MASTER_EMAIL = process.env.GERENTE_MASTER_EMAIL || 'master@habib.com';
const GERENTE_MASTER_NOME = process.env.GERENTE_MASTER_NOME || 'Master Gerente';
const GERENTE_MASTER_CARGO = process.env.GERENTE_MASTER_CARGO || 'Gerente Master';
const GERENTE_MASTER_SENHA = process.env.GERENTE_MASTER_SENHA || 'master123';

(async ()=>{
  try {
    const r = await db.query('SELECT 1 FROM funcionario WHERE cpf = $1', [GERENTE_MASTER_CPF]);
    if (r.rowCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(GERENTE_MASTER_SENHA, salt);
      await db.query('INSERT INTO funcionario (cpf, nome, cargo, email, senha, salario, porcentagem_comissao) VALUES ($1,$2,$3,$4,$5,$6,$7)', [GERENTE_MASTER_CPF, GERENTE_MASTER_NOME, GERENTE_MASTER_CARGO, GERENTE_MASTER_EMAIL, hash, 0, 0]);
      console.log('[loginController] Gerente master criado automaticamente');
    }
  } catch (e){ console.error('Falha ao garantir gerente master', e); }
})();

// Ajustes de cookie para ambiente Live Server (porta 5500) chamando backend (3001)
const cookieOpts = {
  httpOnly: true,
  sameSite: 'Lax', // permite navegação do 127.0.0.1:5500 -> 127.0.0.1:3001 sem exigir https
  secure: false,
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
};

// POST /login/verificarEmail  (cliente)
exports.verificarEmail = async (req, res) => {
  const { email } = req.body || {};
  try {
    const r = await db.query('SELECT nome FROM cliente WHERE email = $1', [email]);
    if (r.rows.length > 0) return res.json({ status: 'existe', nome: r.rows[0].nome });
    return res.json({ status: 'nao_encontrado' });
  } catch (err) {
    console.error('Erro em verificarEmail:', err);
    res.status(500).json({ status: 'erro', mensagem: err.message });
  }
};

// POST /login/verificarSenha  (cliente) - legado (agora suporta hash)
exports.verificarSenha = async (req, res) => {
  const { email, senha } = req.body || {};
  try {
    const r = await db.query('SELECT cpf, nome, email, senha FROM cliente WHERE email = $1', [email]);
    if (r.rows.length === 0) return res.json({ status: 'senha_incorreta' });
    const user = r.rows[0];
    let ok = false;
    if (user.senha && user.senha.startsWith('$2')) ok = await bcrypt.compare(senha, user.senha); else ok = (user.senha === senha);
    if (!ok) return res.json({ status: 'senha_incorreta' });
    res.cookie('usuario', JSON.stringify({ tipo: 'cliente', cpf: user.cpf, nome: user.nome, email: user.email }), cookieOpts);
    return res.json({ status: 'ok', tipo: 'cliente', nome: user.nome, cpf: user.cpf });
  } catch (err) {
    console.error('Erro ao verificar senha (cliente):', err);
    return res.status(500).json({ status: 'erro', mensagem: err.message });
  }
};

// POST /login/cliente  (login direto email+senha) com hash
exports.loginCliente = async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ status: 'erro', mensagem: 'Email e senha são obrigatórios' });
  try {
    const r = await db.query('SELECT cpf, nome, email, senha FROM cliente WHERE email = $1', [email]);
    if (r.rows.length === 0) return res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas' });
    const u = r.rows[0];
    let senhaValida = false;
    if (u.senha && u.senha.startsWith('$2')) senhaValida = await bcrypt.compare(senha, u.senha); else senhaValida = (u.senha === senha);
    if (!senhaValida) return res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas' });
    const usuario = { tipo: 'cliente', cpf: u.cpf, nome: u.nome, email: u.email };
    res.cookie('usuario', JSON.stringify(usuario), cookieOpts);
    return res.json({ status: 'ok', usuario });
  } catch (err) {
    console.error('Erro no loginCliente:', err);
    return res.status(500).json({ status: 'erro', mensagem: 'Falha interna no login' });
  }
};

// POST /login/funcionario  (cpf ou email + senha) com hash
exports.loginFuncionario = async (req, res) => {
  const { cpf, email, senha } = req.body || {};
  if ((!cpf && !email) || !senha) return res.status(400).json({ status: 'erro', mensagem: 'Informe cpf ou email e a senha' });
  try {
    const query = email ? 'SELECT cpf, nome, cargo, email, senha FROM funcionario WHERE email = $1' : 'SELECT cpf, nome, cargo, email, senha FROM funcionario WHERE cpf = $1';
    const valor = email ? email : cpf;
    const r = await db.query(query, [valor]);
    if (r.rows.length === 0) return res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas' });
    const f = r.rows[0];
    let senhaValida = false;
    if (f.senha && f.senha.startsWith('$2')) senhaValida = await bcrypt.compare(senha, f.senha); else senhaValida = (f.senha === senha);
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

// POST /login/universal  (email + senha) - funciona para cliente ou funcionario (hash aware)
exports.loginUniversal = async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ status: 'erro', mensagem: 'Email e senha são obrigatórios' });
  try {
    // Cliente
    const rCliente = await db.query('SELECT cpf, nome, email, senha FROM cliente WHERE email = $1', [email]);
    if (rCliente.rows.length === 1) {
      const c = rCliente.rows[0];
      let ok = false;
      if (c.senha && c.senha.startsWith('$2')) ok = await bcrypt.compare(senha, c.senha); else ok = (c.senha === senha);
      if (ok) {
        const usuario = { tipo: 'cliente', cpf: c.cpf, nome: c.nome, email: c.email };
        res.cookie('usuario', JSON.stringify(usuario), cookieOpts);
        return res.json({ status: 'ok', usuario });
      }
    }
    // Funcionario
    const rFunc = await db.query('SELECT cpf, nome, cargo, email, senha FROM funcionario WHERE email = $1', [email]);
    if (rFunc.rows.length === 1) {
      const f = rFunc.rows[0];
      let ok = false;
      if (f.senha && f.senha.startsWith('$2')) ok = await bcrypt.compare(senha, f.senha); else ok = (f.senha === senha);
      if (ok) {
        const isGerente = f.cargo && f.cargo.toLowerCase().includes('gerente');
        const usuario = { tipo: 'funcionario', cpf: f.cpf, nome: f.nome, cargo: f.cargo, gerente: isGerente, email: f.email };
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


// GET /login/status
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

// POST /login/cadastrarCliente (agora armazena hash)
exports.criarCliente = async (req, res) => {
  const { cpf, nome, email, senha } = req.body || {};
  if (!cpf || !nome || !email || !senha) return res.status(400).json({ status: 'erro', mensagem: 'Todos os campos são obrigatórios: cpf, nome, email, senha' });
  if (cpf.length !== 11 || !/^\d{11}$/.test(cpf)) return res.status(400).json({ status: 'erro', mensagem: 'CPF deve ter 11 dígitos numéricos' });
  try {
    const existingCpf = await db.query('SELECT 1 FROM cliente WHERE cpf = $1', [cpf]);
    if (existingCpf.rows.length > 0) return res.status(400).json({ status: 'erro', mensagem: 'CPF já cadastrado' });
    const existingEmail = await db.query('SELECT 1 FROM cliente WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) return res.status(400).json({ status: 'erro', mensagem: 'Email já cadastrado' });
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);
    await db.query('INSERT INTO cliente (cpf, nome, email, senha) VALUES ($1, $2, $3, $4)', [cpf, nome, email, hash]);
    const usuario = { tipo: 'cliente', cpf, nome, email };
    res.cookie('usuario', JSON.stringify(usuario), cookieOpts);
    return res.json({ status: 'ok', usuario });
  } catch (err) {
    console.error('Erro ao cadastrar cliente:', err);
    res.status(500).json({ status: 'erro', mensagem: err.message });
  }
};

// POST /login/logout
exports.logout = (req, res) => {
  res.clearCookie('usuario', { path: '/' });
  res.json({ status: 'deslogado' });
};

// POST /login/alterarSenha  (requer cookie e senha atual) - funciona para cliente ou funcionario
exports.alterarSenha = async (req, res) => {
  try {
    const raw = req.cookies?.usuario;
    if (!raw) return res.status(401).json({ status: 'erro', mensagem: 'Nao autenticado' });
    let usuario;
    try { usuario = JSON.parse(raw); } catch { return res.status(401).json({ status: 'erro', mensagem: 'Sessao invalida' }); }
    const { senhaAtual, novaSenha } = req.body || {};
    if (!senhaAtual || !novaSenha) return res.status(400).json({ status: 'erro', mensagem: 'Campos obrigatorios' });
    if (novaSenha.length < 4) return res.status(400).json({ status: 'erro', mensagem: 'Nova senha muito curta' });
    const tabela = usuario.tipo === 'funcionario' ? 'funcionario' : 'cliente';
    const col = 'cpf';
    const r = await db.query(`SELECT senha FROM ${tabela} WHERE ${col} = $1`, [usuario.cpf]);
    if (r.rows.length === 0) return res.status(404).json({ status: 'erro', mensagem: 'Usuario não encontrado' });
    const atualHash = r.rows[0].senha || '';
    let confere = false;
    if (atualHash.startsWith('$2')) confere = await bcrypt.compare(senhaAtual, atualHash); else confere = (atualHash === senhaAtual);
    if (!confere) return res.status(401).json({ status: 'erro', mensagem: 'Senha atual incorreta' });
    const salt = await bcrypt.genSalt(10);
    const novoHash = await bcrypt.hash(novaSenha, salt);
    await db.query(`UPDATE ${tabela} SET senha = $1 WHERE ${col} = $2`, [novoHash, usuario.cpf]);
    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('Erro alterarSenha:', err);
    return res.status(500).json({ status: 'erro', mensagem: 'Falha interna' });
  }
};

