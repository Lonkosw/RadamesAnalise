const express = require('express');
const router = express.Router();
const path = require('path');
const cargoController = require('../controllers/cargoController');

// Servir arquivos estáticos do CRUD de cargo ANTES das rotas dinâmicas
router.get('/cargo.css', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/cargo/cargo.css'));
});
router.get('/cargo.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/cargo/cargo.js'));
});

router.get('/abrirCrudCargo', cargoController.abrirCrudCargo);
router.get('/', cargoController.listarCargos);
router.post('/', cargoController.criarCargo);

// Rotas com :id - validação feita no controller
router.get('/:id', cargoController.obterCargo);
router.put('/:id', cargoController.atualizarCargo);
router.delete('/:id', cargoController.deletarCargo);

module.exports = router;
