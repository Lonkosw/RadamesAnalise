/**
 * pessoaController.js - MODELO DO PROFESSOR (CRUD UNIFICADO)
 * 
 * Gerencia pessoa + cliente + funcionário em um único CRUD
 * pessoa é a tabela central com cpf_pessoa como PRIMARY KEY
 * cliente e funcionário são especializações de pessoa
 */
const { query } = require('../database');
const path = require('path');
const bcrypt = require('bcryptjs');

// ============================================================================
// ABRIR CRUD PESSOA (GESTÃO DE PESSOAS)
// ============================================================================
exports.abrirCrudPessoa = (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/pessoa/pessoa.html'));
};

// ============================================================================
// LISTAR TODAS AS PESSOAS (com tipo: cliente ou funcionário)
// ============================================================================
exports.listarPessoas = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        p.cpf_pessoa,
        p.nome_pessoa,
        p.email_pessoa,
        p.data_nascimento_pessoa,
        p.endereco_pessoa,
        CASE 
          WHEN f.pessoa_cpf_pessoa IS NOT NULL THEN 'funcionario'
          WHEN c.pessoa_cpf_pessoa IS NOT NULL THEN 'cliente'
          ELSE 'pessoa'
        END AS tipo,
        -- Dados de funcionário
        f.salario_funcionario,
        f.cargo_id_cargo,
        f.porcentagem_comissao_funcionario,
        cg.nome_cargo,
        -- Dados de cliente
        c.renda_cliente,
        c.data_cadastro_cliente
      FROM pessoa p
      LEFT JOIN funcionario f ON p.cpf_pessoa = f.pessoa_cpf_pessoa
      LEFT JOIN cliente c ON p.cpf_pessoa = c.pessoa_cpf_pessoa
      LEFT JOIN cargo cg ON f.cargo_id_cargo = cg.id_cargo
      ORDER BY p.nome_pessoa
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar pessoas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// CRIAR PESSOA (+ CLIENTE OU FUNCIONÁRIO)
// ============================================================================
exports.criarPessoa = async (req, res) => {
  try {
    const { 
      cpf_pessoa, 
      nome_pessoa, 
      email_pessoa, 
      senha_pessoa, 
      data_nascimento_pessoa,
      endereco_pessoa,
      telefone,
      tipo, // 'cliente' ou 'funcionario'
      // Dados específicos de cliente
      renda_cliente,
      // Dados específicos de funcionário
      cargo_id_cargo,
      salario_funcionario,
      porcentagem_comissao_funcionario
    } = req.body;

    // Validação básica
    if (!cpf_pessoa || !nome_pessoa || !email_pessoa || !senha_pessoa) {
      return res.status(400).json({
        error: 'CPF, nome, email e senha são obrigatórios'
      });
    }

    if (!tipo || !['cliente', 'funcionario'].includes(tipo)) {
      return res.status(400).json({
        error: 'Tipo deve ser "cliente" ou "funcionario"'
      });
    }

    // Validação de CPF (11 dígitos)
    const cpfLimpo = cpf_pessoa.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return res.status(400).json({ error: 'CPF deve ter 11 dígitos' });
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email_pessoa)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha_pessoa, salt);

    // 1. CRIAR PESSOA
    const pessoaResult = await query(`
      INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, data_nascimento_pessoa, endereco_pessoa)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [cpfLimpo, nome_pessoa, email_pessoa, senhaHash, data_nascimento_pessoa || null, endereco_pessoa || null]);

    const pessoa = pessoaResult.rows[0];

    // 2. CRIAR REGISTRO ESPECÍFICO (cliente ou funcionário)
    if (tipo === 'cliente') {
      await query(`
        INSERT INTO cliente (pessoa_cpf_pessoa, renda_cliente, data_cadastro_cliente)
        VALUES ($1, $2, CURRENT_DATE)
      `, [cpfLimpo, renda_cliente || 0]);

    } else if (tipo === 'funcionario') {
      // Validar cargo
      if (!cargo_id_cargo) {
        // Rollback: deletar pessoa criada
        await query('DELETE FROM pessoa WHERE cpf_pessoa = $1', [cpfLimpo]);
        return res.status(400).json({ error: 'Cargo é obrigatório para funcionário' });
      }

      await query(`
        INSERT INTO funcionario (pessoa_cpf_pessoa, salario_funcionario, cargo_id_cargo, porcentagem_comissao_funcionario)
        VALUES ($1, $2, $3, $4)
      `, [cpfLimpo, salario_funcionario || 0, cargo_id_cargo, porcentagem_comissao_funcionario || 0]);
    }

    // 3. RETORNAR PESSOA COMPLETA
    const resultadoFinal = await obterPessoaCompleta(cpfLimpo);
    res.status(201).json(resultadoFinal);

  } catch (error) {
    console.error('Erro ao criar pessoa:', error);
    if (error.code === '23505') {
      if (error.constraint?.includes('email')) {
        return res.status(400).json({ error: 'Email já está em uso' });
      }
      return res.status(400).json({ error: 'CPF já cadastrado' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Cargo não encontrado' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// OBTER PESSOA POR CPF (com dados de cliente/funcionário)
// ============================================================================
exports.obterPessoa = async (req, res) => {
  try {
    const cpf = req.params.id || req.params.cpf;
    const cpfLimpo = String(cpf).replace(/\D/g, '');

    const pessoa = await obterPessoaCompleta(cpfLimpo);

    if (!pessoa) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    res.json(pessoa);
  } catch (error) {
    console.error('Erro ao obter pessoa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// ATUALIZAR PESSOA (+ CLIENTE OU FUNCIONÁRIO)
// ============================================================================
exports.atualizarPessoa = async (req, res) => {
  try {
    const cpf = req.params.id || req.params.cpf;
    const cpfLimpo = String(cpf).replace(/\D/g, '');
    
    const { 
      nome_pessoa, 
      email_pessoa, 
      senha_pessoa, 
      data_nascimento_pessoa, 
      endereco_pessoa,
      tipo, // Novo tipo (pode mudar de cliente para funcionário)
      // Dados de cliente
      renda_cliente,
      // Dados de funcionário
      cargo_id_cargo,
      salario_funcionario,
      porcentagem_comissao_funcionario
    } = req.body;

    // Verificar se pessoa existe
    const existing = await query('SELECT * FROM pessoa WHERE cpf_pessoa = $1', [cpfLimpo]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    const current = existing.rows[0];

    // Preparar dados atualizados
    const updatedNome = nome_pessoa !== undefined ? nome_pessoa : current.nome_pessoa;
    const updatedEmail = email_pessoa !== undefined ? email_pessoa : current.email_pessoa;
    const updatedDataNasc = data_nascimento_pessoa !== undefined ? data_nascimento_pessoa : current.data_nascimento_pessoa;
    const updatedEndereco = endereco_pessoa !== undefined ? endereco_pessoa : current.endereco_pessoa;

    // Hash da senha se fornecida
    let updatedSenha = current.senha_pessoa;
    if (senha_pessoa && senha_pessoa.trim()) {
      const salt = await bcrypt.genSalt(10);
      updatedSenha = await bcrypt.hash(senha_pessoa, salt);
    }

    // 1. ATUALIZAR PESSOA
    await query(`
      UPDATE pessoa SET 
        nome_pessoa = $1, 
        email_pessoa = $2, 
        senha_pessoa = $3, 
        data_nascimento_pessoa = $4,
        endereco_pessoa = $5
      WHERE cpf_pessoa = $6
    `, [updatedNome, updatedEmail, updatedSenha, updatedDataNasc, updatedEndereco, cpfLimpo]);

    // 2. GERENCIAR TIPO (cliente/funcionário)
    if (tipo) {
      // Verificar estado atual
      const isCliente = (await query('SELECT 1 FROM cliente WHERE pessoa_cpf_pessoa = $1', [cpfLimpo])).rows.length > 0;
      const isFuncionario = (await query('SELECT 1 FROM funcionario WHERE pessoa_cpf_pessoa = $1', [cpfLimpo])).rows.length > 0;

      if (tipo === 'cliente') {
        // Se era funcionário, remover
        if (isFuncionario) {
          await query('DELETE FROM funcionario WHERE pessoa_cpf_pessoa = $1', [cpfLimpo]);
        }
        // Se já é cliente, atualizar; senão criar
        if (isCliente) {
          await query(`
            UPDATE cliente SET renda_cliente = $1 WHERE pessoa_cpf_pessoa = $2
          `, [renda_cliente || 0, cpfLimpo]);
        } else {
          await query(`
            INSERT INTO cliente (pessoa_cpf_pessoa, renda_cliente, data_cadastro_cliente)
            VALUES ($1, $2, CURRENT_DATE)
          `, [cpfLimpo, renda_cliente || 0]);
        }
      } else if (tipo === 'funcionario') {
        // Se era cliente, remover
        if (isCliente) {
          await query('DELETE FROM cliente WHERE pessoa_cpf_pessoa = $1', [cpfLimpo]);
        }
        // Se já é funcionário, atualizar; senão criar
        if (isFuncionario) {
          await query(`
            UPDATE funcionario SET 
              salario_funcionario = $1, 
              cargo_id_cargo = $2, 
              porcentagem_comissao_funcionario = $3
            WHERE pessoa_cpf_pessoa = $4
          `, [salario_funcionario || 0, cargo_id_cargo, porcentagem_comissao_funcionario || 0, cpfLimpo]);
        } else {
          if (!cargo_id_cargo) {
            return res.status(400).json({ error: 'Cargo é obrigatório para funcionário' });
          }
          await query(`
            INSERT INTO funcionario (pessoa_cpf_pessoa, salario_funcionario, cargo_id_cargo, porcentagem_comissao_funcionario)
            VALUES ($1, $2, $3, $4)
          `, [cpfLimpo, salario_funcionario || 0, cargo_id_cargo, porcentagem_comissao_funcionario || 0]);
        }
      }
    } else {
      // Sem mudança de tipo - apenas atualizar dados específicos se existirem
      const isCliente = (await query('SELECT 1 FROM cliente WHERE pessoa_cpf_pessoa = $1', [cpfLimpo])).rows.length > 0;
      const isFuncionario = (await query('SELECT 1 FROM funcionario WHERE pessoa_cpf_pessoa = $1', [cpfLimpo])).rows.length > 0;

      if (isCliente && renda_cliente !== undefined) {
        await query('UPDATE cliente SET renda_cliente = $1 WHERE pessoa_cpf_pessoa = $2', [renda_cliente, cpfLimpo]);
      }

      if (isFuncionario) {
        const updates = [];
        const values = [];
        let paramCount = 0;

        if (salario_funcionario !== undefined) {
          updates.push(`salario_funcionario = $${++paramCount}`);
          values.push(salario_funcionario);
        }
        if (cargo_id_cargo !== undefined) {
          updates.push(`cargo_id_cargo = $${++paramCount}`);
          values.push(cargo_id_cargo);
        }
        if (porcentagem_comissao_funcionario !== undefined) {
          updates.push(`porcentagem_comissao_funcionario = $${++paramCount}`);
          values.push(porcentagem_comissao_funcionario);
        }

        if (updates.length > 0) {
          values.push(cpfLimpo);
          await query(`UPDATE funcionario SET ${updates.join(', ')} WHERE pessoa_cpf_pessoa = $${++paramCount}`, values);
        }
      }
    }

    // 3. RETORNAR PESSOA ATUALIZADA
    const resultado = await obterPessoaCompleta(cpfLimpo);
    res.json(resultado);

  } catch (error) {
    console.error('Erro ao atualizar pessoa:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email já está em uso' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Cargo não encontrado' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// DELETAR PESSOA (com CASCADE para cliente/funcionário)
// ============================================================================
exports.deletarPessoa = async (req, res) => {
  try {
    const cpf = req.params.id || req.params.cpf;
    const cpfLimpo = String(cpf).replace(/\D/g, '');

    // Verificar se existe
    const existing = await query('SELECT 1 FROM pessoa WHERE cpf_pessoa = $1', [cpfLimpo]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    // Deletar registros filhos primeiro (CASCADE manual)
    // Ignorar erros de tabelas inexistentes com try-catch individual
    
    // 1. Deletar itens de pedidos do cliente (tabela pode ser item_pedido ou pedido_has_produto)
    try {
      await query(`
        DELETE FROM pedido_has_produto 
        WHERE pedido_id_pedido IN (
          SELECT id_pedido FROM pedido WHERE cliente_pessoa_cpf_pessoa = $1
        )
      `, [cpfLimpo]);
    } catch (e) { /* tabela pode não existir */ }

    try {
      await query(`
        DELETE FROM item_pedido 
        WHERE pedido_id_pedido IN (
          SELECT id_pedido FROM pedido WHERE cliente_pessoa_cpf_pessoa = $1
        )
      `, [cpfLimpo]);
    } catch (e) { /* tabela pode não existir */ }
    
    // 2. Deletar pedidos do cliente
    try {
      await query('DELETE FROM pedido WHERE cliente_pessoa_cpf_pessoa = $1', [cpfLimpo]);
    } catch (e) { /* tabela pode não existir */ }
    
    // 3. Deletar carrinho e itens do carrinho (se existirem)
    try {
      await query(`
        DELETE FROM item_carrinho 
        WHERE carrinho_id_carrinho IN (
          SELECT id_carrinho FROM carrinho WHERE cliente_pessoa_cpf_pessoa = $1
        )
      `, [cpfLimpo]);
    } catch (e) { /* tabela pode não existir */ }
    
    try {
      await query('DELETE FROM carrinho WHERE cliente_pessoa_cpf_pessoa = $1', [cpfLimpo]);
    } catch (e) { /* tabela pode não existir */ }
    
    // 4. Deletar cliente/funcionario
    await query('DELETE FROM cliente WHERE pessoa_cpf_pessoa = $1', [cpfLimpo]);
    await query('DELETE FROM funcionario WHERE pessoa_cpf_pessoa = $1', [cpfLimpo]);

    // Deletar pessoa
    const result = await query('DELETE FROM pessoa WHERE cpf_pessoa = $1 RETURNING *', [cpfLimpo]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar pessoa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// OBTER PESSOA POR EMAIL
// ============================================================================
exports.obterPessoaPorEmail = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const result = await query(`
      SELECT cpf_pessoa FROM pessoa WHERE email_pessoa = $1
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    const pessoa = await obterPessoaCompleta(result.rows[0].cpf_pessoa);
    res.json(pessoa);
  } catch (error) {
    console.error('Erro ao obter pessoa por email:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// ATUALIZAR SENHA
// ============================================================================
exports.atualizarSenha = async (req, res) => {
  try {
    const cpf = req.params.id || req.params.cpf;
    const cpfLimpo = String(cpf).replace(/\D/g, '');
    const { senha_atual, nova_senha } = req.body;

    if (!senha_atual || !nova_senha) {
      return res.status(400).json({
        error: 'Senha atual e nova senha são obrigatórias'
      });
    }

    const personResult = await query('SELECT * FROM pessoa WHERE cpf_pessoa = $1', [cpfLimpo]);

    if (personResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    const person = personResult.rows[0];

    const senhaValida = await bcrypt.compare(senha_atual, person.senha_pessoa);
    if (!senhaValida) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    const salt = await bcrypt.genSalt(10);
    const novaSenhaHash = await bcrypt.hash(nova_senha, salt);

    await query('UPDATE pessoa SET senha_pessoa = $1 WHERE cpf_pessoa = $2', [novaSenhaHash, cpfLimpo]);

    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================================
// FUNÇÃO AUXILIAR: OBTER PESSOA COMPLETA
// ============================================================================
async function obterPessoaCompleta(cpf) {
  const result = await query(`
    SELECT 
      p.cpf_pessoa,
      p.nome_pessoa,
      p.email_pessoa,
      p.data_nascimento_pessoa,
      p.endereco_pessoa,
      CASE 
        WHEN f.pessoa_cpf_pessoa IS NOT NULL THEN 'funcionario'
        WHEN c.pessoa_cpf_pessoa IS NOT NULL THEN 'cliente'
        ELSE 'pessoa'
      END AS tipo,
      -- Dados de funcionário
      f.salario_funcionario,
      f.cargo_id_cargo,
      f.porcentagem_comissao_funcionario,
      cg.nome_cargo,
      -- Dados de cliente
      c.renda_cliente,
      c.data_cadastro_cliente
    FROM pessoa p
    LEFT JOIN funcionario f ON p.cpf_pessoa = f.pessoa_cpf_pessoa
    LEFT JOIN cliente c ON p.cpf_pessoa = c.pessoa_cpf_pessoa
    LEFT JOIN cargo cg ON f.cargo_id_cargo = cg.id_cargo
    WHERE p.cpf_pessoa = $1
  `, [cpf]);

  return result.rows[0] || null;
}
