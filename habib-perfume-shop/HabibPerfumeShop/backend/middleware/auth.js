// Middleware para extrair usuário do cookie 'usuario' e helpers de autorização

function parseUser(req, _res, next) {
  const raw = req.cookies?.usuario;
  if (raw) {
    try { req.usuario = JSON.parse(raw); } catch { req.usuario = undefined; }
  }
  next();
}

function ensureAuth(req, res, next) {
  if (!req.usuario) return res.status(401).json({ status: 'erro', mensagem: 'Nao autenticado' });
  next();
}

function ensureFuncionario(req, res, next) {
  if (!req.usuario || req.usuario.tipo !== 'funcionario') {
    return res.status(403).json({ status: 'erro', mensagem: 'Acesso restrito a funcionarios' });
  }
  next();
}

function ensureGerente(req, res, next) {
  if (!req.usuario || req.usuario.tipo !== 'funcionario') {
    return res.status(403).json({ status: 'erro', mensagem: 'Apenas gerente' });
  }
  const cargo = (req.usuario.cargo || '').toLowerCase();
  if (!(req.usuario.gerente || cargo.includes('gerente'))) {
    return res.status(403).json({ status: 'erro', mensagem: 'Apenas gerente' });
  }
  next();
}

module.exports = { parseUser, ensureAuth, ensureFuncionario, ensureGerente };
