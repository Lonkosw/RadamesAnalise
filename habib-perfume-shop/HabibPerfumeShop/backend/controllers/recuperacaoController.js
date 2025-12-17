// ============================================================================
// recuperacaoController.js - Controller de Recuperação de Senha
// HabibPerfumeShop
// ============================================================================

const db = require('../database');
const bcrypt = require('bcrypt');
const { enviarCodigoRecuperacao } = require('../services/emailService');

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Gera código numérico de 6 dígitos
 */
function gerarCodigo6Digitos() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calcula a data de expiração (NOW + 5 minutos)
 */
function calcularExpiracao() {
  const agora = new Date();
  agora.setMinutes(agora.getMinutes() + 5);
  return agora;
}

// ============================================================================
// ROTA 1: POST /recuperar/iniciar
// Inicia o processo de recuperação de senha
// ============================================================================
exports.iniciarRecuperacao = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        mensagem: 'E-mail é obrigatório'
      });
    }

    // Buscar pessoa pelo email
    const queryPessoa = `
      SELECT cpf_pessoa, nome_pessoa, email_pessoa 
      FROM pessoa 
      WHERE LOWER(email_pessoa) = LOWER($1)
    `;
    const resultPessoa = await db.query(queryPessoa, [email.trim()]);

    if (resultPessoa.rows.length === 0) {
      // Por segurança, não revelamos se o email existe ou não
      return res.status(200).json({
        success: true,
        mensagem: 'Se o e-mail estiver cadastrado, você receberá um código de recuperação.'
      });
    }

    const pessoa = resultPessoa.rows[0];
    const cpf = pessoa.cpf_pessoa.trim();
    const nome = pessoa.nome_pessoa;

    // Gerar código de 6 dígitos
    const codigo = gerarCodigo6Digitos();
    const expiracao = calcularExpiracao();

    // Invalidar códigos anteriores do mesmo CPF
    await db.query(`
      UPDATE recuperacao_senha 
      SET usado = TRUE 
      WHERE cpf = $1 AND usado = FALSE
    `, [cpf]);

    // Inserir novo código na tabela
    await db.query(`
      INSERT INTO recuperacao_senha (cpf, codigo, expiracao, usado) 
      VALUES ($1, $2, $3, FALSE)
    `, [cpf, codigo, expiracao]);

    // Enviar email com o código
    const resultadoEmail = await enviarCodigoRecuperacao(email, nome, codigo);

    if (!resultadoEmail.success) {
      console.error('Erro ao enviar email:', resultadoEmail.error);
      // Mesmo com erro no email, não revelamos detalhes por segurança
    }

    console.log(`📧 Código de recuperação gerado para ${email}: ${codigo}`);

    res.json({
      success: true,
      mensagem: 'Se o e-mail estiver cadastrado, você receberá um código de recuperação.',
      // Em desenvolvimento, retornamos o código para facilitar testes
      ...(process.env.NODE_ENV === 'development' && { 
        debug: { 
          codigo, 
          cpf: cpf.substring(0, 3) + '****' + cpf.substring(7),
          expiracao: expiracao.toISOString() 
        } 
      })
    });

  } catch (error) {
    console.error('Erro ao iniciar recuperação:', error);
    res.status(500).json({
      success: false,
      mensagem: 'Erro interno ao processar solicitação'
    });
  }
};

// ============================================================================
// ROTA 2: POST /recuperar/validar-codigo
// Valida o código de recuperação
// ============================================================================
exports.validarCodigo = async (req, res) => {
  try {
    const { cpf, codigo } = req.body;

    if (!cpf || !codigo) {
      return res.status(400).json({
        success: false,
        autorizado: false,
        mensagem: 'CPF e código são obrigatórios'
      });
    }

    // Limpar CPF (remover pontos e traços)
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (cpfLimpo.length !== 11) {
      return res.status(400).json({
        success: false,
        autorizado: false,
        mensagem: 'CPF inválido'
      });
    }

    if (!/^\d{6}$/.test(codigo)) {
      return res.status(400).json({
        success: false,
        autorizado: false,
        mensagem: 'Código deve ter 6 dígitos numéricos'
      });
    }

    // Buscar código válido
    const query = `
      SELECT id, cpf, codigo, expiracao, usado 
      FROM recuperacao_senha 
      WHERE cpf = $1 AND codigo = $2
      ORDER BY criado_em DESC
      LIMIT 1
    `;
    const result = await db.query(query, [cpfLimpo, codigo]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        autorizado: false,
        mensagem: 'Código inválido ou não encontrado'
      });
    }

    const registro = result.rows[0];

    // Verificar se já foi usado
    if (registro.usado) {
      return res.status(400).json({
        success: false,
        autorizado: false,
        mensagem: 'Este código já foi utilizado'
      });
    }

    // Verificar se expirou
    const agora = new Date();
    const expiracao = new Date(registro.expiracao);

    if (agora > expiracao) {
      return res.status(400).json({
        success: false,
        autorizado: false,
        mensagem: 'Código expirado. Solicite um novo código.'
      });
    }

    // Código válido!
    res.json({
      success: true,
      autorizado: true,
      mensagem: 'Código validado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao validar código:', error);
    res.status(500).json({
      success: false,
      autorizado: false,
      mensagem: 'Erro interno ao validar código'
    });
  }
};

// ============================================================================
// ROTA 3: POST /recuperar/redefinir
// Redefine a senha do usuário
// ============================================================================
exports.redefinirSenha = async (req, res) => {
  try {
    const { cpf, codigo, novaSenha } = req.body;

    if (!cpf || !codigo || !novaSenha) {
      return res.status(400).json({
        success: false,
        mensagem: 'CPF, código e nova senha são obrigatórios'
      });
    }

    // Limpar CPF
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (cpfLimpo.length !== 11) {
      return res.status(400).json({
        success: false,
        mensagem: 'CPF inválido'
      });
    }

    if (novaSenha.length < 4) {
      return res.status(400).json({
        success: false,
        mensagem: 'Senha deve ter pelo menos 4 caracteres'
      });
    }

    // Validar código novamente (segurança)
    const queryValidar = `
      SELECT id, cpf, codigo, expiracao, usado 
      FROM recuperacao_senha 
      WHERE cpf = $1 AND codigo = $2 AND usado = FALSE
      ORDER BY criado_em DESC
      LIMIT 1
    `;
    const resultValidar = await db.query(queryValidar, [cpfLimpo, codigo]);

    if (resultValidar.rows.length === 0) {
      return res.status(400).json({
        success: false,
        mensagem: 'Código inválido ou já utilizado'
      });
    }

    const registro = resultValidar.rows[0];
    const agora = new Date();
    const expiracao = new Date(registro.expiracao);

    if (agora > expiracao) {
      return res.status(400).json({
        success: false,
        mensagem: 'Código expirado. Solicite um novo código.'
      });
    }

    // Criptografar nova senha com bcrypt
    const saltRounds = 10;
    const senhaCriptografada = await bcrypt.hash(novaSenha, saltRounds);

    // Atualizar senha na tabela pessoa
    await db.query(`
      UPDATE pessoa 
      SET senha_pessoa = $1 
      WHERE cpf_pessoa = $2
    `, [senhaCriptografada, cpfLimpo]);

    // Marcar código como usado
    await db.query(`
      UPDATE recuperacao_senha 
      SET usado = TRUE 
      WHERE id = $1
    `, [registro.id]);

    console.log(`🔐 Senha redefinida com sucesso para CPF: ${cpfLimpo.substring(0, 3)}****${cpfLimpo.substring(7)}`);

    res.json({
      success: true,
      mensagem: 'Senha redefinida com sucesso! Você já pode fazer login.'
    });

  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({
      success: false,
      mensagem: 'Erro interno ao redefinir senha'
    });
  }
};

// ============================================================================
// ROTA 4: GET /recuperar/buscar-cpf-por-email
// Busca CPF pelo email (para preencher automaticamente)
// ============================================================================
exports.buscarCpfPorEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        mensagem: 'E-mail é obrigatório'
      });
    }

    const query = `
      SELECT cpf_pessoa 
      FROM pessoa 
      WHERE LOWER(email_pessoa) = LOWER($1)
    `;
    const result = await db.query(query, [email.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensagem: 'E-mail não encontrado'
      });
    }

    res.json({
      success: true,
      cpf: result.rows[0].cpf_pessoa.trim()
    });

  } catch (error) {
    console.error('Erro ao buscar CPF:', error);
    res.status(500).json({
      success: false,
      mensagem: 'Erro interno'
    });
  }
};
