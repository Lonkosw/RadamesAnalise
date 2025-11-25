const express = require('express');
const router = express.Router();

const pedidoController = require('../controllers/pedidoController');
const { ensureAuth } = require('../middleware/auth');
// Diagnóstico básico: log de requisições que chegam neste router
router.use((req,res,next)=>{ console.log(`[pedidoRoutes] ${req.method} ${req.originalUrl}`); next(); });

function ensureClienteMesmoOuFuncionario(req, res, next){
	if(!req.usuario) return res.status(401).json({error:'Nao autenticado'});
	// funcionario pode tudo
	if(req.usuario.tipo === 'funcionario') return next();
	// cliente só pode acessar seu próprio
	if(req.usuario.tipo === 'cliente'){
		if(req.params.cpf && req.params.cpf === req.usuario.cpf) return next();
		if(req.params.id){
			// Para rota /:id poderíamos fazer uma verificação posterior (simplificação: permitir e controller poderia validar se pertence)
			return next();
		}
	}
	return res.status(403).json({error:'Acesso negado'});
}

// Diagnostics
router.get('/_ping', (req, res) => res.json({ ok: true }));

// Abrir página do CRUD
router.get('/crud', pedidoController.abrirCrudPedido);

// Lista todos os pedidos (apenas para funcionarios)
router.get('/', ensureAuth, (req, res, next)=>{
	if(req.usuario && req.usuario.tipo==='funcionario') return next();
	return res.status(403).json({ error: 'Acesso restrito' });
}, pedidoController.listarTodosPedidos);

// Contagem de pedidos (apenas funcionarios)
router.get('/_count', ensureAuth, (req,res,next)=>{
	if(req.usuario && req.usuario.tipo==='funcionario') return next();
	return res.status(403).json({ error: 'Acesso restrito' });
}, pedidoController.contarPedidos);


// Listar pedidos por cliente (colocar antes de /:id para não conflitar com literal 'cliente')
router.get('/cliente/:cpf', ensureAuth, ensureClienteMesmoOuFuncionario, pedidoController.listarPedidosPorCliente);

// Obter pedido por ID
router.get('/:id', ensureAuth, ensureClienteMesmoOuFuncionario, pedidoController.obterPedido);

module.exports = router;
