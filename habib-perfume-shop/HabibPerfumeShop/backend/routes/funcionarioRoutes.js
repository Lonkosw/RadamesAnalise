const express = require('express');
const router = express.Router();
const funcionarioController = require('../controllers/funcionarioController');
const { ensureGerente } = require('../middleware/auth');

// Aliases para abrir CRUD
router.get(['/crud','/abrirCrudFuncionario'], ensureGerente, funcionarioController.abrirCrudFuncionario);

// Diagnóstico rápido
router.head('/', (req,res)=> res.status(200).end());
router.get('/ping', (req,res)=> res.json({ ok:true, recurso:'funcionario', timestamp: new Date().toISOString() }));

// CRUD principal
router.get('/', funcionarioController.listarFuncionario);
router.post('/', ensureGerente, funcionarioController.criarFuncionario);
router.get('/:cpf', funcionarioController.obterFuncionario);
router.put('/:cpf', ensureGerente, funcionarioController.atualizarFuncionario);
router.delete('/:cpf', ensureGerente, funcionarioController.deletarFuncionario);

module.exports = router;
