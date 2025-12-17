const { query, pool } = require('../database');
const path = require('path');

// =============================================================================
// FUNÇÕES AUXILIARES DE ESTOQUE
// =============================================================================

/**
 * Verifica se há estoque suficiente para um produto
 * @returns {object} { disponivel: boolean, estoqueAtual: number, nomeProduto: string }
 */
async function verificarEstoque(produtoId, quantidadeDesejada, client = null) {
  const queryFn = client ? client.query.bind(client) : query;
  const result = await queryFn(
    'SELECT id_produto, nome_produto, quantidade_estoque FROM produto WHERE id_produto = $1',
    [produtoId]
  );
  
  if (result.rows.length === 0) {
    return { disponivel: false, estoqueAtual: 0, nomeProduto: null, erro: 'Produto não encontrado' };
  }
  
  const produto = result.rows[0];
  const estoqueAtual = parseInt(produto.quantidade_estoque) || 0;
  
  return {
    disponivel: estoqueAtual >= quantidadeDesejada,
    estoqueAtual,
    nomeProduto: produto.nome_produto,
    erro: estoqueAtual < quantidadeDesejada 
      ? `Estoque insuficiente para "${produto.nome_produto}" (ID ${produtoId}). Disponível: ${estoqueAtual}, Solicitado: ${quantidadeDesejada}`
      : null
  };
}

/**
 * Reduz o estoque de um produto
 * @returns {number} Novo estoque após redução
 */
async function reduzirEstoque(produtoId, quantidade, client = null) {
  const queryFn = client ? client.query.bind(client) : query;
  const result = await queryFn(
    'UPDATE produto SET quantidade_estoque = quantidade_estoque - $1 WHERE id_produto = $2 RETURNING quantidade_estoque',
    [quantidade, produtoId]
  );
  return result.rows[0]?.quantidade_estoque || 0;
}

/**
 * Restaura o estoque de um produto (devolução)
 * @returns {number} Novo estoque após restauração
 */
async function restaurarEstoque(produtoId, quantidade, client = null) {
  const queryFn = client ? client.query.bind(client) : query;
  const result = await queryFn(
    'UPDATE produto SET quantidade_estoque = quantidade_estoque + $1 WHERE id_produto = $2 RETURNING quantidade_estoque',
    [quantidade, produtoId]
  );
  return result.rows[0]?.quantidade_estoque || 0;
}

// Função auxiliar para atualizar o total do pedido
async function atualizarTotalPedido(idPedido, client = null) {
  try {
    const queryFn = client ? client.query.bind(client) : query;
    await queryFn(`
      UPDATE pedido 
      SET valor_pedido = COALESCE(
        (SELECT SUM(quantidade * preco_unitario) 
         FROM pedido_has_produto 
         WHERE pedido_id_pedido = $1), 
        0
      )
      WHERE id_pedido = $1
    `, [idPedido]);
    
    // Retorna o novo total
    const result = await queryFn('SELECT valor_pedido FROM pedido WHERE id_pedido = $1', [idPedido]);
    return result.rows[0]?.valor_pedido || 0;
  } catch (error) {
    console.error('Erro ao atualizar total do pedido:', error);
    return 0;
  }
}

// Exporta funções de estoque para uso em outros controllers
exports.verificarEstoque = verificarEstoque;
exports.reduzirEstoque = reduzirEstoque;
exports.restaurarEstoque = restaurarEstoque;

exports.abrirCrudPedido_has_produto = (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/pedido_has_produto/pedido_has_produto.html'));
};

exports.listarPedido_has_produtos = async (_req, res) => {
  try {
    const result = await query('SELECT * FROM pedido_has_produto ORDER BY pedido_id_pedido');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar pedido_has_produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.obterItensDeUmPedido_has_produto = async (req, res) => {
  try {
    const { idPedido } = req.params;
    const result = await query(
      'SELECT php.pedido_id_pedido, php.produto_id_produto, p.nome_produto, php.quantidade, php.preco_unitario ' +
      'FROM pedido_has_produto php, produto p ' +
      'WHERE php.pedido_id_pedido = $1 AND php.produto_id_produto = p.id_produto ORDER BY php.produto_id_produto;',
      [idPedido]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Nenhum item encontrado para este pedido.' });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao obter itens do pedido:', error);
    res.status(500).json({ message: 'Erro ao processar a requisição.', error: error.message });
  }
};

exports.obterPedido_has_produto = async (req, res) => {
  try {
    const { id_pedido, id_produto } = req.params;
    const result = await query(
      'SELECT * FROM pedido_has_produto WHERE pedido_id_pedido = $1 AND produto_id_produto = $2',
      [id_pedido, id_produto]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter item:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.criarPedido_has_produto = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { pedido_id_pedido, produto_id_produto, quantidade, preco_unitario } = req.body;
    const qtd = parseInt(quantidade) || 1;
    const produtoId = parseInt(produto_id_produto);
    const pedidoId = parseInt(pedido_id_pedido);
    
    await client.query('BEGIN');
    
    // 1. Verificar status do pedido
    const pedidoResult = await client.query(
      'SELECT status_pedido FROM pedido WHERE id_pedido = $1',
      [pedidoId]
    );
    
    if (pedidoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    const statusPedido = pedidoResult.rows[0].status_pedido || 'pendente';
    const pedidoPago = statusPedido === 'pago';
    
    // 2. Verificar se o produto já existe no pedido
    const itemExistente = await client.query(
      'SELECT quantidade FROM pedido_has_produto WHERE pedido_id_pedido = $1 AND produto_id_produto = $2',
      [pedidoId, produtoId]
    );
    
    // 3. Verificar estoque disponível
    const estoqueResult = await client.query(
      'SELECT quantidade_estoque, nome_produto FROM produto WHERE id_produto = $1',
      [produtoId]
    );
    
    if (estoqueResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    const estoqueAtual = parseInt(estoqueResult.rows[0].quantidade_estoque) || 0;
    const nomeProduto = estoqueResult.rows[0].nome_produto;
    
    // Calcular quantidade adicional (diferença entre nova quantidade e existente)
    const qtdExistente = itemExistente.rows.length > 0 ? parseInt(itemExistente.rows[0].quantidade) : 0;
    const qtdAdicional = qtd - qtdExistente;
    
    // Se pedido PAGO, verificar estoque para a quantidade adicional
    // Se pedido PENDENTE, também verificar para validação (mas só subtrai quando pagar)
    if (qtdAdicional > 0 && qtdAdicional > estoqueAtual) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Estoque insuficiente para "${nomeProduto}". Disponível: ${estoqueAtual}, Solicitado: ${qtdAdicional}` 
      });
    }
    
    let result;
    let mensagemEstoque = '';
    
    if (itemExistente.rows.length > 0) {
      // UPSERT: Atualizar quantidade se já existir
      result = await client.query(
        'UPDATE pedido_has_produto SET quantidade = $1, preco_unitario = $2 WHERE pedido_id_pedido = $3 AND produto_id_produto = $4 RETURNING *',
        [qtd, preco_unitario, pedidoId, produtoId]
      );
    } else {
      // Inserir novo item
      result = await client.query(
        'INSERT INTO pedido_has_produto (pedido_id_pedido, produto_id_produto, quantidade, preco_unitario) VALUES ($1,$2,$3,$4) RETURNING *',
        [pedidoId, produtoId, qtd, preco_unitario]
      );
    }
    
    // SE PEDIDO PAGO: Ajustar estoque imediatamente pela diferença
    if (pedidoPago && qtdAdicional !== 0) {
      console.log(`\n📦 [criarItem] Pedido #${pedidoId} (PAGO) - Produto ${produtoId}`);
      console.log(`   Quantidade anterior: ${qtdExistente}, Nova: ${qtd}, Diferença: ${qtdAdicional}`);
      
      if (qtdAdicional > 0) {
        // Aumentou quantidade = REDUZIR estoque
        const novoEstoque = await reduzirEstoque(produtoId, qtdAdicional, client);
        console.log(`   📦 Estoque REDUZIDO: -${qtdAdicional} - Novo: ${novoEstoque}`);
        mensagemEstoque = `Estoque reduzido em ${qtdAdicional} unidade(s)`;
      } else {
        // Diminuiu quantidade = RESTAURAR estoque
        const novoEstoque = await restaurarEstoque(produtoId, Math.abs(qtdAdicional), client);
        console.log(`   📦 Estoque RESTAURADO: +${Math.abs(qtdAdicional)} - Novo: ${novoEstoque}`);
        mensagemEstoque = `Estoque restaurado em ${Math.abs(qtdAdicional)} unidade(s)`;
      }
    }
    
    // Atualizar total do pedido
    const novoTotal = await atualizarTotalPedido(pedidoId, client);
    
    await client.query('COMMIT');
    
    res.status(201).json({
      ...result.rows[0],
      total_pedido: novoTotal,
      status_pedido: statusPedido,
      mensagem_estoque: mensagemEstoque,
      message: pedidoPago 
        ? (itemExistente.rows.length > 0 ? 'Item atualizado e estoque ajustado.' : 'Item adicionado e estoque reduzido.')
        : (itemExistente.rows.length > 0 ? 'Item atualizado. Estoque será ajustado quando o pedido for pago.' : 'Item adicionado. Estoque será ajustado quando o pedido for pago.')
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar/atualizar item:', error);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  } finally {
    client.release();
  }
};

exports.criarItensPedidoEmLote = async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Aceita {itens: [...]} ou array diretamente [...]
    let itens = req.body?.itens || req.body;
    if (!Array.isArray(itens)) {
      itens = [];
    }
    
    if (itens.length === 0) {
      return res.status(400).json({ error: 'Nenhum item enviado' });
    }
    
    await client.query('BEGIN');
    
    // Preparar itens para inserção (SEM verificar/alterar estoque)
    const itensParaInserir = [];
    for (const it of itens) {
      const pedidoId = it.pedido_id_pedido || it.id_pedido;
      const produtoId = it.produto_id_produto || it.id_produto;
      const quantidade = parseInt(it.quantidade) || 1;
      const precoUnit = parseFloat(it.preco_unitario || it.preco) || 0;
      
      if (!pedidoId || !produtoId || !quantidade || !precoUnit) {
        console.error('Item inválido:', it);
        continue;
      }
      
      itensParaInserir.push({ pedidoId, produtoId, quantidade, precoUnit });
    }
    
    if (itensParaInserir.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Nenhum item válido para inserir' });
    }
    
    // Inserir todos os itens (sem alterar estoque - só altera quando status = pago)
    const values = [];
    const params = [];
    let i = 1;
    
    for (const item of itensParaInserir) {
      params.push(item.pedidoId, item.produtoId, item.quantidade, item.precoUnit);
      values.push(`($${i++}, $${i++}, $${i++}, $${i++})`);
    }
    
    const sql = 'INSERT INTO pedido_has_produto (pedido_id_pedido, produto_id_produto, quantidade, preco_unitario) VALUES ' + values.join(', ') + ' RETURNING *';
    const result = await client.query(sql, params);
    
    // Atualizar total do pedido (usa o primeiro pedido)
    if (itensParaInserir.length > 0) {
      await atualizarTotalPedido(itensParaInserir[0].pedidoId, client);
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      itens: result.rows,
      mensagem: `${result.rows.length} itens inseridos. Estoque será atualizado quando o pedido for marcado como pago.`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar itens em lote:', error);
    res.status(500).json({ error: 'Erro interno do servidor', detalhes: error.message });
  } finally {
    client.release();
  }
};

exports.atualizarPedido_has_produto = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id_pedido, id_produto } = req.params;
    const { quantidade, preco_unitario } = req.body;
    const novaQuantidade = parseInt(quantidade) || 1;
    
    await client.query('BEGIN');
    
    // Buscar quantidade anterior e status do pedido
    const itemAtual = await client.query(
      'SELECT quantidade FROM pedido_has_produto WHERE pedido_id_pedido = $1 AND produto_id_produto = $2',
      [id_pedido, id_produto]
    );
    
    if (itemAtual.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item não encontrado' });
    }
    
    const quantidadeAnterior = parseInt(itemAtual.rows[0].quantidade) || 0;
    const diferenca = novaQuantidade - quantidadeAnterior;
    
    // Verificar status do pedido
    const pedidoResult = await client.query(
      'SELECT status_pedido FROM pedido WHERE id_pedido = $1',
      [id_pedido]
    );
    const statusPedido = pedidoResult.rows[0]?.status_pedido || 'pendente';
    
    let mensagemEstoque = '';
    
    // Se o pedido está PAGO, ajustar estoque pela diferença
    if (statusPedido === 'pago' && diferenca !== 0) {
      console.log(`\n📦 [atualizarItem] Pedido #${id_pedido} (PAGO) - Produto ${id_produto}`);
      console.log(`   Quantidade anterior: ${quantidadeAnterior}, Nova: ${novaQuantidade}, Diferença: ${diferenca}`);
      
      if (diferenca > 0) {
        // Aumentou quantidade = REDUZIR estoque
        const estoqueInfo = await verificarEstoque(id_produto, diferenca, client);
        if (!estoqueInfo.disponivel) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            error: `Estoque insuficiente. ${estoqueInfo.erro}`,
            estoqueDisponivel: estoqueInfo.estoqueAtual
          });
        }
        const novoEstoque = await reduzirEstoque(id_produto, diferenca, client);
        console.log(`   📦 Estoque REDUZIDO: -${diferenca} - Novo: ${novoEstoque}`);
        mensagemEstoque = `Estoque reduzido em ${diferenca} unidade(s)`;
      } else {
        // Diminuiu quantidade = RESTAURAR estoque
        const novoEstoque = await restaurarEstoque(id_produto, Math.abs(diferenca), client);
        console.log(`   📦 Estoque RESTAURADO: +${Math.abs(diferenca)} - Novo: ${novoEstoque}`);
        mensagemEstoque = `Estoque restaurado em ${Math.abs(diferenca)} unidade(s)`;
      }
    }
    
    // Atualizar item
    const result = await client.query(
      'UPDATE pedido_has_produto SET quantidade=$1, preco_unitario=$2 WHERE pedido_id_pedido=$3 AND produto_id_produto=$4 RETURNING *',
      [novaQuantidade, preco_unitario, id_pedido, id_produto]
    );
    
    // Atualizar total do pedido
    const novoTotal = await atualizarTotalPedido(id_pedido, client);
    
    await client.query('COMMIT');
    
    res.json({
      ...result.rows[0],
      total_pedido: novoTotal,
      mensagem_estoque: mensagemEstoque || (statusPedido === 'pago' ? 'Quantidade não alterada' : 'Pedido pendente - estoque será ajustado ao pagar'),
      status_pedido: statusPedido
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar item:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

exports.deletarPedido_has_produto = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id_pedido, id_produto } = req.params;
    
    await client.query('BEGIN');
    
    // Buscar item e status do pedido
    const itemResult = await client.query(
      'SELECT quantidade FROM pedido_has_produto WHERE pedido_id_pedido = $1 AND produto_id_produto = $2',
      [id_pedido, id_produto]
    );
    
    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item não encontrado' });
    }
    
    const quantidadeItem = parseInt(itemResult.rows[0].quantidade) || 0;
    
    // Verificar status do pedido
    const pedidoResult = await client.query(
      'SELECT status_pedido FROM pedido WHERE id_pedido = $1',
      [id_pedido]
    );
    const statusPedido = pedidoResult.rows[0]?.status_pedido || 'pendente';
    
    let mensagemEstoque = '';
    
    // SOMENTE restaurar estoque se o pedido estiver PAGO
    // Porque o estoque só é subtraído quando o pedido é marcado como pago
    if (statusPedido === 'pago' && quantidadeItem > 0) {
      console.log(`\n📦 [deletarItem] Pedido #${id_pedido} (PAGO) - Removendo produto ${id_produto}`);
      const novoEstoque = await restaurarEstoque(id_produto, quantidadeItem, client);
      console.log(`   📦 Estoque RESTAURADO: +${quantidadeItem} - Novo: ${novoEstoque}`);
      mensagemEstoque = `Estoque restaurado em ${quantidadeItem} unidade(s)`;
    }
    
    // Deletar item
    await client.query(
      'DELETE FROM pedido_has_produto WHERE pedido_id_pedido = $1 AND produto_id_produto = $2',
      [id_pedido, id_produto]
    );
    
    // Atualizar total do pedido
    const novoTotal = await atualizarTotalPedido(id_pedido, client);
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: statusPedido === 'pago' 
        ? `Item removido e estoque restaurado (+${quantidadeItem})`
        : 'Item removido (pedido pendente - estoque não alterado)',
      mensagem_estoque: mensagemEstoque,
      total_pedido: novoTotal,
      status_pedido: statusPedido
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar item:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};
