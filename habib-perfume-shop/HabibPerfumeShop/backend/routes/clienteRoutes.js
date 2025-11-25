const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { ensureFuncionario } = require('../middleware/auth');

// Aliases para abrir CRUD (compatibilidade com produto pattern)
router.get(['/crud','/abrirCrudCliente'], clienteController.abrirCrudCliente);

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
