const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

// Login cliente (2 etapas) e status
router.post('/verificarEmail', loginController.verificarEmail);
router.post('/verificarSenha', loginController.verificarSenha);
router.post('/cadastrarCliente', loginController.criarCliente);
router.post('/cliente', loginController.loginCliente);
router.post('/funcionario', loginController.loginFuncionario);
router.post('/universal', loginController.loginUniversal);
router.get('/status', loginController.verificaSeUsuarioEstaLogado);
router.post('/logout', loginController.logout);
router.post('/alterarSenha', loginController.alterarSenha);

// Login funcionário (teste por CPF)

module.exports = router;
