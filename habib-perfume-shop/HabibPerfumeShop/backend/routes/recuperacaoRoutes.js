// ============================================================================
// recuperacaoRoutes.js - Rotas de Recuperação de Senha
// HabibPerfumeShop
// ============================================================================

const express = require('express');
const router = express.Router();
const recuperacaoController = require('../controllers/recuperacaoController');

// ============================================================================
// ROTAS
// ============================================================================

/**
 * POST /recuperar/iniciar
 * Inicia o processo de recuperação - envia código por email
 * Body: { email: "user@email.com" }
 */
router.post('/iniciar', recuperacaoController.iniciarRecuperacao);

/**
 * POST /recuperar/validar-codigo
 * Valida o código de recuperação
 * Body: { cpf: "11111111111", codigo: "123456" }
 */
router.post('/validar-codigo', recuperacaoController.validarCodigo);

/**
 * POST /recuperar/redefinir
 * Redefine a senha do usuário
 * Body: { cpf: "...", codigo: "...", novaSenha: "..." }
 */
router.post('/redefinir', recuperacaoController.redefinirSenha);

/**
 * GET /recuperar/buscar-cpf-por-email
 * Busca o CPF associado a um email
 * Query: ?email=user@email.com
 */
router.get('/buscar-cpf-por-email', recuperacaoController.buscarCpfPorEmail);

module.exports = router;
