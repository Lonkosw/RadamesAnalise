// ============================================================================
// pedidoRoutes.js - MODELO SIMPLIFICADO (igual professor)
// ============================================================================
const express = require('express');
const router = express.Router();
const path = require('path');

const pedidoController = require('../controllers/pedidoController');
const { ensureAuth, ensureFuncionario } = require('../middleware/auth');

// Diagnóstico básico
router.use((req,res,next)=>{ console.log(`[pedidoRoutes] ${req.method} ${req.originalUrl}`); next(); });

// ============================================================================
// ARQUIVOS ESTÁTICOS DO CRUD PEDIDO (igual modelo professor)
// ============================================================================
router.get('/pedido.css', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/pedido/pedido.css'));
});
router.get('/pedido.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/pedido/pedido.js'));
});
router.get('/pesquisaDinamicaCliente.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/pedido/pesquisaDinamicaCliente.js'));
});
router.get('/pesquisaDinamicaStyle.css', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/pedido/pesquisaDinamicaStyle.css'));
});

// ============================================================================
// ROTAS DO MODELO DO PROFESSOR
// ============================================================================

// Abrir CRUD de pedidos (página HTML)
router.get('/abrirCrudPedido', pedidoController.abrirCrudPedido);

// Abrir carrinho do gerente (página HTML)
router.get('/abrirCarrinhoGerente', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/carrinho/carrinho.html'));
});

// Página do carrinho (ANTES de /:id para não conflitar)
router.get('/carrinho', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/carrinho/carrinho.html'));
});

// Arquivos estáticos do carrinho
router.get('/carrinho.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/carrinho/carrinho.html'));
});
router.get('/carrinho.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/carrinho/carrinho.js'));
});

// Finalizar carrinho
router.post('/carrinho/finalizar', ensureAuth, pedidoController.finalizarCarrinho);

// Listar todos os pedidos - GET /pedido
router.get('/', pedidoController.listarPedidos);

// Obter próximo ID sequencial - GET /pedido/proximo-id
// DEVE VIR ANTES de /:id para não conflitar
router.get('/proximo-id', pedidoController.obterProximoId);

// Rota para pedidos normais/físicos (ex: feitos por um funcionário) - POST /pedido/gerente
// MODELO DO PROFESSOR: Sem autenticação para facilitar operação do CRUD
router.post('/gerente', pedidoController.criarPedido);

// Rota exclusiva para pedidos online (e-commerce) - POST /pedido/online
router.post('/online', ensureAuth, pedidoController.criarPedidoOnline); 

// Obter pedido por ID - GET /pedido/:id
router.get('/:id', pedidoController.obterPedido);

// Alterar status do pedido - PUT /pedido/:id/status
// Permite gerente alternar entre 'pendente' e 'pago'
router.put('/:id/status', pedidoController.alterarStatusPedido);

// Atualizar pedido - PUT /pedido/:id
router.put('/:id', pedidoController.atualizarPedido);

// Deletar pedido - DELETE /pedido/:id
router.delete('/:id', pedidoController.deletarPedido);

// ============================================================================
// ROTAS LEGADAS (mantidas para compatibilidade com frontend existente)
// ============================================================================

// Compra direta
router.post('/comprar', ensureAuth, pedidoController.comprarDireto);

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
