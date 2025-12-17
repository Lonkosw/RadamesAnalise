// ============================================================================
// relatorioController.js - RELATÓRIOS DO GERENTE
// Compatível com estrutura atual do banco
// ============================================================================
const db = require('../database.js');
const path = require('path');

// =============================================================================
// PÁGINA DE RELATÓRIOS
// =============================================================================
exports.abrirRelatorios = (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/relatorios/relatorios.html'));
};

// =============================================================================
// UTILITÁRIOS
// =============================================================================
function obterNomeMes(mes) {
  if (mes === null || mes === undefined) return 'N/A';
  
  const meses = {
    1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
    5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
    9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
  };
  
  const mesNum = parseInt(mes);
  return meses[mesNum] || `Mês ${mes}`;
}

// =============================================================================
// RELATÓRIO: VENDAS POR PERÍODO
// =============================================================================
exports.relatorioVendasPorPeriodo = async (req, res) => {
  try {
    const { mes, ano } = req.query;
    
    // Usa mês/ano atual se não fornecido
    const dataAtual = new Date();
    const mesNum = parseInt(mes) || (dataAtual.getMonth() + 1);
    const anoNum = parseInt(ano) || dataAtual.getFullYear();
    
    // Construir intervalo do mês
    const dataInicio = `${anoNum}-${String(mesNum).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
    const dataFim = `${anoNum}-${String(mesNum).padStart(2, '0')}-${ultimoDia}`;
    
    // Query: Resumo geral do período
    const queryResumo = `
      SELECT 
        COUNT(DISTINCT p.id_pedido) as total_pedidos,
        COUNT(DISTINCT CASE WHEN p.status_pedido = 'Pago' THEN p.id_pedido END) as pedidos_pagos,
        COUNT(DISTINCT p.cliente_cpf) as clientes_distintos,
        COALESCE(SUM(php.quantidade * php.preco_unitario), 0) as valor_total_arrecadado
      FROM pedido p
      LEFT JOIN pedido_has_produto php ON php.pedido_id_pedido = p.id_pedido
      WHERE p.data_pedido BETWEEN $1 AND $2
    `;
    
    // Query: Vendas por dia
    const queryPorDia = `
      SELECT 
        DATE(p.data_pedido) as dia,
        COUNT(DISTINCT p.id_pedido) as qtd_pedidos,
        COALESCE(SUM(php.quantidade * php.preco_unitario), 0) as valor_dia
      FROM pedido p
      LEFT JOIN pedido_has_produto php ON php.pedido_id_pedido = p.id_pedido
      WHERE p.data_pedido BETWEEN $1 AND $2
      GROUP BY DATE(p.data_pedido)
      ORDER BY dia ASC
    `;
    
    // Query: Detalhes dos pedidos
    // cliente.pessoa_cpf_pessoa -> pessoa.cpf_pessoa -> pessoa.nome_pessoa
    const queryDetalhes = `
      SELECT 
        p.id_pedido,
        p.data_pedido,
        COALESCE(pe.nome_pessoa, 'Cliente não identificado') as nome_cliente,
        p.cliente_cpf as cpf_cliente,
        COALESCE(SUM(php.quantidade * php.preco_unitario), 0) as valor_total,
        COALESCE(p.status_pedido, 'Pendente') as status_pagamento
      FROM pedido p
      LEFT JOIN cliente c ON c.pessoa_cpf_pessoa = p.cliente_cpf
      LEFT JOIN pessoa pe ON pe.cpf_pessoa = c.pessoa_cpf_pessoa
      LEFT JOIN pedido_has_produto php ON php.pedido_id_pedido = p.id_pedido
      WHERE p.data_pedido BETWEEN $1 AND $2
      GROUP BY p.id_pedido, p.data_pedido, pe.nome_pessoa, p.cliente_cpf, p.status_pedido
      ORDER BY p.data_pedido DESC
    `;
    
    const [resumoResult, porDiaResult, detalhesResult] = await Promise.all([
      db.query(queryResumo, [dataInicio, dataFim]),
      db.query(queryPorDia, [dataInicio, dataFim]),
      db.query(queryDetalhes, [dataInicio, dataFim])
    ]);
    
    const resumo = resumoResult.rows[0] || {
      total_pedidos: 0,
      pedidos_pagos: 0,
      clientes_distintos: 0,
      valor_total_arrecadado: 0
    };
    
    res.json({
      success: true,
      periodo: {
        mes: mesNum,
        ano: anoNum,
        nome_mes: obterNomeMes(mesNum)
      },
      resumo: {
        total_pedidos: parseInt(resumo.total_pedidos) || 0,
        pedidos_pagos: parseInt(resumo.pedidos_pagos) || 0,
        clientes_distintos: parseInt(resumo.clientes_distintos) || 0,
        valor_total_arrecadado: parseFloat(resumo.valor_total_arrecadado) || 0
      },
      vendas_por_dia: porDiaResult.rows.map(row => ({
        dia: row.dia,
        qtd_pedidos: parseInt(row.qtd_pedidos) || 0,
        valor_dia: parseFloat(row.valor_dia) || 0
      })),
      detalhes: detalhesResult.rows.map(row => ({
        id_pedido: row.id_pedido,
        data_pedido: row.data_pedido,
        nome_cliente: row.nome_cliente,
        cpf_cliente: row.cpf_cliente,
        valor_total: parseFloat(row.valor_total) || 0,
        status_pagamento: row.status_pagamento
      })),
      gerado_em: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro no relatório de vendas por período:', err);
    res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// RELATÓRIO: PRODUTOS MAIS VENDIDOS
// =============================================================================
exports.relatorioProdutosMaisVendidos = async (req, res) => {
  try {
    const { limite, periodo } = req.query;
    const lim = parseInt(limite) || 10;
    
    // Calcular período se fornecido
    let whereClause = '';
    const params = [lim];
    let periodoTexto = 'Todos os tempos';
    
    if (periodo) {
      const dias = parseInt(periodo);
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - dias);
      whereClause = `WHERE p.data_pedido >= $2`;
      params.push(dataLimite.toISOString().split('T')[0]);
      
      if (dias === 7) periodoTexto = 'Últimos 7 dias';
      else if (dias === 30) periodoTexto = 'Últimos 30 dias';
      else if (dias === 90) periodoTexto = 'Últimos 90 dias';
      else if (dias === 365) periodoTexto = 'Último ano';
      else periodoTexto = `Últimos ${dias} dias`;
    }
    
    // Query: Ranking de produtos mais vendidos
    const queryRanking = `
      SELECT 
        pr.id_produto,
        pr.nome_produto,
        pr.marca_produto,
        pr.preco_produto,
        pr.quantidade_estoque as estoque_atual,
        COALESCE(SUM(php.quantidade), 0) as total_vendido,
        COALESCE(SUM(php.quantidade * php.preco_unitario), 0) as faturamento_total,
        COALESCE(AVG(php.preco_unitario), pr.preco_produto) as preco_medio_venda
      FROM produto pr
      LEFT JOIN pedido_has_produto php ON php.produto_id_produto = pr.id_produto
      LEFT JOIN pedido p ON p.id_pedido = php.pedido_id_pedido ${whereClause ? 'AND ' + whereClause.replace('WHERE ', '') : ''}
      GROUP BY pr.id_produto, pr.nome_produto, pr.marca_produto, pr.preco_produto, pr.quantidade_estoque
      HAVING COALESCE(SUM(php.quantidade), 0) > 0
      ORDER BY total_vendido DESC
      LIMIT $1
    `;
    
    // Query: Produtos sem vendas
    const querySemVenda = `
      SELECT 
        pr.id_produto,
        pr.nome_produto,
        pr.marca_produto,
        pr.preco_produto,
        pr.quantidade_estoque
      FROM produto pr
      LEFT JOIN pedido_has_produto php ON php.produto_id_produto = pr.id_produto
      WHERE php.produto_id_produto IS NULL
      ORDER BY pr.nome_produto
      LIMIT 20
    `;
    
    // Query: Resumo geral
    const queryResumo = `
      SELECT 
        COUNT(DISTINCT php.produto_id_produto) as produtos_vendidos,
        COALESCE(SUM(php.quantidade), 0) as unidades_vendidas,
        COUNT(DISTINCT php.pedido_id_pedido) as total_pedidos,
        COALESCE(SUM(php.quantidade * php.preco_unitario), 0) as faturamento_total
      FROM pedido_has_produto php
      LEFT JOIN pedido p ON p.id_pedido = php.pedido_id_pedido
      ${whereClause}
    `;
    
    const [rankingResult, semVendaResult, resumoResult] = await Promise.all([
      db.query(queryRanking, params),
      db.query(querySemVenda),
      db.query(queryResumo, params.slice(1)) // Remove o limite para resumo
    ]);
    
    const resumo = resumoResult.rows[0] || {
      produtos_vendidos: 0,
      unidades_vendidas: 0,
      total_pedidos: 0,
      faturamento_total: 0
    };
    
    res.json({
      success: true,
      periodo: periodoTexto,
      limite: lim,
      resumo: {
        produtos_vendidos: parseInt(resumo.produtos_vendidos) || 0,
        unidades_vendidas: parseInt(resumo.unidades_vendidas) || 0,
        total_pedidos: parseInt(resumo.total_pedidos) || 0,
        faturamento_total: parseFloat(resumo.faturamento_total) || 0
      },
      ranking: rankingResult.rows.map(row => ({
        id_produto: row.id_produto,
        nome_produto: row.nome_produto || 'Produto sem nome',
        marca_produto: row.marca_produto,
        preco_produto: parseFloat(row.preco_produto) || 0,
        estoque_atual: parseInt(row.estoque_atual) || 0,
        total_vendido: parseInt(row.total_vendido) || 0,
        faturamento_total: parseFloat(row.faturamento_total) || 0,
        preco_medio_venda: parseFloat(row.preco_medio_venda) || 0
      })),
      produtos_sem_venda: semVendaResult.rows.map(row => ({
        id_produto: row.id_produto,
        nome_produto: row.nome_produto || 'Produto sem nome',
        marca_produto: row.marca_produto,
        preco_produto: parseFloat(row.preco_produto) || 0,
        quantidade_estoque: parseInt(row.quantidade_estoque) || 0
      })),
      gerado_em: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro no relatório de produtos mais vendidos:', err);
    res.status(500).json({ error: err.message });
  }
};
