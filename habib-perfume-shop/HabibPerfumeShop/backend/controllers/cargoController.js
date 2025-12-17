const { query } = require('../database');
const path = require('path');

exports.abrirCrudCargo = (req, res) => {
  // Verifica cookie 'usuario' (usado pelo sistema de login)
  const usuario = req.cookies.usuario;
  if (usuario) {
    res.sendFile(path.join(__dirname, '../../frontend/cargo/cargo.html'));
  } else {
    res.redirect('/login/login.html');
  }
};

exports.listarCargos = async (_req, res) => {
  try {
    const result = await query('SELECT * FROM cargo ORDER BY id_cargo');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar cargos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.criarCargo = async (req, res) => {
  try {
    const { nome_cargo } = req.body || {};
    if (!nome_cargo) return res.status(400).json({ error: 'nome_cargo é obrigatório' });
    const result = await query('INSERT INTO cargo (nome_cargo) VALUES ($1) RETURNING *', [nome_cargo]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar cargo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.obterCargo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const result = await query('SELECT * FROM cargo WHERE id_cargo = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cargo não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter cargo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.atualizarCargo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nome_cargo } = req.body || {};
    const result = await query('UPDATE cargo SET nome_cargo = $1 WHERE id_cargo = $2 RETURNING *', [nome_cargo, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cargo não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar cargo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.deletarCargo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await query('DELETE FROM cargo WHERE id_cargo = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cargo não encontrado' });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar cargo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
