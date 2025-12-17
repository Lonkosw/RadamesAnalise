// ============================================================================
// marcaRoutes.js - Rotas de Marcas
// HabibPerfumeShop
// ============================================================================

const express = require('express');
const router = express.Router();
const path = require('path');
const marcaController = require('../controllers/marcaController');

// ============================================
// ROTA PARA SERVIR A PÁGINA DO CRUD
// ============================================
router.get('/abrirCrudMarca', (req, res) => {
    console.log('marcaRoutes - Abrindo CRUD de Marca');
    res.sendFile(path.join(__dirname, '../../frontend/marca/marca.html'));
});

// Servir arquivos estáticos do CRUD
router.get('/marca.css', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/marca/marca.css'));
});

router.get('/marca.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/marca/marca.js'));
});

// ============================================
// ROTAS DA API
// ============================================

// GET /marca - Lista todas as marcas
router.get('/', marcaController.listar);

// GET /marca/buscar?nome=xxx - Busca por nome
router.get('/buscar', marcaController.buscarPorNome);

// GET /marca/estatisticas - Conta produtos por marca
router.get('/estatisticas', marcaController.contarProdutosPorMarca);

// GET /marca/:id - Busca uma marca por ID
router.get('/:id', marcaController.buscarPorId);

// POST /marca - Cria nova marca
router.post('/', marcaController.criar);

// PUT /marca/:id - Atualiza marca
router.put('/:id', marcaController.atualizar);

// DELETE /marca/:id - Remove marca
router.delete('/:id', marcaController.remover);

module.exports = router;
