// ============================================================================
// pedidoRoutes.js - MODELO DO PROFESSOR (CandyShop)
// Adaptado para HabibPerfumeShop
// ============================================================================
const express = require('express');
const router = express.Router();
const path = require('path');

const pedidoController = require('../controllers/pedidoController');
const { ensureAuth } = require('../middleware/auth');

// Diagnóstico básico
router.use((req,res,next)=>{ console.log(`[pedidoRoutes] ${req.method} ${req.originalUrl}`); next(); });

// ============================================================================
// ROTAS DO MODELO DO PROFESSOR
// ============================================================================

// Abrir CRUD de pedidos (página HTML)
router.get('/abrirCrudPedido', pedidoController.abrirCrudPedido);

// Listar todos os pedidos - GET /pedido
router.get('/', pedidoController.listarPedidos);

// Rota para pedidos normais/físicos (ex: feitos por um funcionário) - POST /pedido/gerente
router.post('/gerente', pedidoController.criarPedido);

// Rota exclusiva para pedidos online (e-commerce) - POST /pedido/online
router.post('/online', pedidoController.criarPedidoOnline); 

// Obter pedido por ID - GET /pedido/:id
router.get('/:id', pedidoController.obterPedido);

// Atualizar pedido - PUT /pedido/:id
router.put('/:id', pedidoController.atualizarPedido);

// Deletar pedido - DELETE /pedido/:id
router.delete('/:id', pedidoController.deletarPedido);

// ============================================================================
// ROTAS LEGADAS (mantidas para compatibilidade com frontend existente)
// ============================================================================

// Arquivos estáticos do carrinho
router.get('/carrinho.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/carrinho/carrinho.html'));
});
router.get('/carrinho.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/carrinho/carrinho.js'));
});

// Compra direta
router.post('/comprar', ensureAuth, pedidoController.comprarDireto);

// Finalizar carrinho
router.post('/carrinho/finalizar', ensureAuth, pedidoController.finalizarCarrinho);

// Página do carrinho
router.get('/carrinho', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/carrinho/carrinho.html'));
});

// Diagnostics
router.get('/_ping', (req, res) => res.json({ ok: true }));

// Abrir página do CRUD
router.get('/crud', pedidoController.abrirCrudPedido);

// Contagem de pedidos
router.get('/_count', ensureAuth, (req,res,next)=>{
	if(req.usuario && req.usuario.tipo==='funcionario') return next();
	return res.status(403).json({ error: 'Acesso restrito' });
}, pedidoController.contarPedidos);

// Listar pedidos por cliente
router.get('/cliente/:cpf', ensureAuth, pedidoController.listarPedidosPorCliente);

module.exports = router;
