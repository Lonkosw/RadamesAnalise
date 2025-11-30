// ============================================================================
// relatorioRoutes.js - ROTAS DOS RELATÓRIOS DO GERENTE
// ============================================================================
const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');

// Página principal de relatórios
router.get('/', relatorioController.abrirRelatorios);

// Relatório 1: Vendas por Período
router.get('/vendas-periodo', relatorioController.relatorioVendasPorPeriodo);

// Relatório 2: Produtos Mais Vendidos
router.get('/produtos-mais-vendidos', relatorioController.relatorioProdutosMaisVendidos);

module.exports = router;
