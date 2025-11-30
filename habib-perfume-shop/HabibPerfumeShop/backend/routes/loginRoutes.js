// ============================================================================
// loginRoutes.js - MODELO DO PROFESSOR adaptado
// ============================================================================
const express = require('express');
const router = express.Router();
const path = require('path');
const loginController = require('../controllers/loginController');

// ============================================================================
// ROTAS DE PÁGINAS (modelo do professor)
// ============================================================================

// Tela de login
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/login/login.html'));
});

// Visão do cliente
router.get('/visaocliente', (req, res) => {
    const usuario = req.cookies.usuarioLogado || req.cookies.usuario;
    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/visaoCliente/index.html'));
    } else {
        res.redirect('/login');
    }
});

router.get('/visaoclientecarrinho', (req, res) => {
    const usuario = req.cookies.usuarioLogado || req.cookies.usuario;
    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/visaoCliente/carrinho/carrinho.html'));
    } else {
        res.redirect('/login');
    }
});

router.get('/visaoclientefinalizar', (req, res) => {
    const usuario = req.cookies.usuarioLogado || req.cookies.usuario;
    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/visaoCliente/finalizar/finalizar.html'));
    } else {
        res.redirect('/login');
    }
});

router.get('/visaoclientepagamento', (req, res) => {
    const usuario = req.cookies.usuarioLogado || req.cookies.usuario;
    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/visaoCliente/pagamento/pagamento.html'));
    } else {
        res.redirect('/login');
    }
});

// ============================================================================
// ROTAS DE API
// ============================================================================

// Login cliente (2 etapas) e status
router.post('/verificarEmail', loginController.verificarEmail);
router.post('/verificarSenha', loginController.verificarSenha);
router.post('/cadastrarCliente', loginController.criarCliente);
router.post('/cliente', loginController.loginCliente);
router.post('/funcionario', loginController.loginFuncionario);
router.post('/universal', loginController.loginUniversal);
router.get('/status', loginController.verificaSeUsuarioEstaLogado);
router.get('/verificaSeUsuarioEstaLogado', loginController.verificaSeUsuarioEstaLogado);
router.post('/logout', loginController.logout);
router.get('/logout', loginController.logout); // GET também para compatibilidade
router.post('/alterarSenha', loginController.alterarSenha);

module.exports = router;
