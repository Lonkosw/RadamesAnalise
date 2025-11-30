// ============================================================================
// pagamentoRoutes.js - MODELO DO PROFESSOR (CandyShop)
// Adaptado para HabibPerfumeShop
// ============================================================================
const express = require('express');
const router = express.Router();
const pagamentoController = require('../controllers/pagamentoController');

// Diagnóstico
router.use((req,res,next)=>{ console.log(`[pagamentoRoutes] ${req.method} ${req.originalUrl}`); next(); });

// ============================================================================
// ROTAS DO MODELO DO PROFESSOR
// ============================================================================

// Abrir CRUD de pagamentos (gerente)
router.get('/abrirCrudPagamento', pagamentoController.abrirCrudPagamento);

// Abrir tela de pagamento (cliente)
router.get('/abrirTelaPagamento', pagamentoController.abrirTelaPagamento);

// Listar todos os pagamentos
router.get('/', pagamentoController.listarPagamentos);

// Criar pagamento simples
router.post('/', pagamentoController.criarPagamento);

// Criar pagamento completo (com formas de pagamento)
router.post('/completo', pagamentoController.criarPagamentoCompleto);

// Obter pagamento por ID do pedido
router.get('/:id', pagamentoController.obterPagamento);

// Atualizar pagamento
router.put('/:id', pagamentoController.atualizarPagamento);

// Deletar pagamento
router.delete('/:id', pagamentoController.deletarPagamento);

// ============================================================================
// ROTAS PARA FORMAS DE PAGAMENTO DE UM PEDIDO
// ============================================================================

// Listar formas de pagamento de um pedido
router.get('/:id/formas', pagamentoController.listarFormasPagamentoDoPedido);

// Adicionar forma de pagamento a um pedido
router.post('/:id/formas', pagamentoController.adicionarFormaPagamento);

// Atualizar forma de pagamento de um pedido
router.put('/:idPedido/formas/:idForma', pagamentoController.atualizarFormaPagamentoDoPedido);

// Remover forma de pagamento de um pedido
router.delete('/:idPedido/formas/:idForma', pagamentoController.removerFormaPagamentoDoPedido);

module.exports = router;
