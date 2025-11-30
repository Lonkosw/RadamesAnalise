const express = require('express');
const router = express.Router();
const path = require('path');
const produtoController = require('../controllers/produtoController');

// Rotas conforme modelo B
router.get('/abrirCrudProduto', produtoController.abrirCrudProduto);
router.get('/', produtoController.listarProdutos);
// HEAD para verificação rápida de disponibilidade da rota em ferramentas externas
router.head('/', (req, res) => res.status(200).end());
// Ping simples de diagnóstico
router.get('/ping', (req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

// IMPORTANTE: Servir arquivos estáticos do CRUD ANTES da rota :id para evitar conflito
// Quando o HTML carrega "./produto.js", ele vira "/produto/produto.js"
// Sem essa rota específica, o Express interpreta "produto.js" como :id e retorna 400
router.get('/produto.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/produto/produto.js'));
});
router.get('/produto.css', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/produto/produto.css'));
});

router.post('/', produtoController.criarProduto);
router.get('/:id', produtoController.obterProduto);
router.put('/:id', produtoController.atualizarProduto);
router.delete('/:id', produtoController.deletarProduto);

module.exports = router;
