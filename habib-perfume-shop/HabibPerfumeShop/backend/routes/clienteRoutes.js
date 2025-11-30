const express = require('express');
const router = express.Router();
const path = require('path');
const clienteController = require('../controllers/clienteController');
const { ensureFuncionario } = require('../middleware/auth');

// Aliases para abrir CRUD (compatibilidade com produto pattern)
router.get(['/crud','/abrirCrudCliente'], clienteController.abrirCrudCliente);

// IMPORTANTE: Servir arquivos estáticos do CRUD ANTES da rota :cpf para evitar conflito
// Quando o HTML carrega "./cliente.js", ele vira "/cliente/cliente.js"
// Sem essa rota específica, o Express interpreta "cliente.js" como :cpf e retorna 400
router.get('/cliente.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/cliente/cliente.js'));
});
router.get('/cliente.css', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/cliente/cliente.css'));
});

// Diagnóstico rápido
router.head('/', (req,res)=> res.status(200).end());
router.get('/ping', (req,res)=> res.json({ ok:true, recurso:'cliente', timestamp: new Date().toISOString() }));

// CRUD principal
router.get('/', clienteController.listarClientes);
router.get('/:cpf', clienteController.obterCliente);
router.post('/', ensureFuncionario, clienteController.criarCliente);
router.put('/:cpf', ensureFuncionario, clienteController.atualizarCliente);
router.delete('/:cpf', ensureFuncionario, clienteController.deletarCliente);

module.exports = router;
