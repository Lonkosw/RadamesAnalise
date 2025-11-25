const express = require('express');
const router = express.Router();
const produtoController = require('../controllers/produtoController');

// Rotas conforme modelo B
router.get('/abrirCrudProduto', produtoController.abrirCrudProduto);
router.get('/', produtoController.listarProdutos);
// HEAD para verificação rápida de disponibilidade da rota em ferramentas externas
router.head('/', (req, res) => res.status(200).end());
// Ping simples de diagnóstico
router.get('/ping', (req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));
router.post('/', produtoController.criarProduto);
router.get('/:id', produtoController.obterProduto);
router.put('/:id', produtoController.atualizarProduto);
router.delete('/:id', produtoController.deletarProduto);

module.exports = router;
