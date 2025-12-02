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
    const { data_inicio, data_fim } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (data_inicio && data_fim) {
      whereClause = 'WHERE p.data_pedido BETWEEN $1 AND $2';
      params.push(data_inicio, data_fim);
    } else if (data_inicio) {
      whereClause = 'WHERE p.data_pedido >= $1';
      params.push(data_inicio);
    } else if (data_fim) {
      whereClause = 'WHERE p.data_pedido <= $1';
      params.push(data_fim);
    }
    
    // Query compatível - total calculado de pedido_has_produto
    const query = `
      SELECT 
        EXTRACT(YEAR FROM p.data_pedido) as ano,
        EXTRACT(MONTH FROM p.data_pedido) as mes,
        COUNT(DISTINCT p.id_pedido) as total_pedidos,
        COALESCE(SUM(php.quantidade * php.preco_unitario), 0) as total_vendas
      FROM pedido p
      LEFT JOIN pedido_has_produto php ON php.pedido_id_pedido = p.id_pedido
      ${whereClause}
      GROUP BY EXTRACT(YEAR FROM p.data_pedido), EXTRACT(MONTH FROM p.data_pedido)
      ORDER BY ano DESC, mes DESC
    `;
    
    const result = await db.query(query, params);
    
    // Formata os dados com nome do mês
    const dados = result.rows.map(row => {
      const mesValue = row.mes !== undefined ? row.mes : row.month;
      const anoValue = row.ano !== undefined ? row.ano : row.year;
      
      return {
        ano: anoValue,
        mes: mesValue,
        nome_mes: obterNomeMes(mesValue),
        total_pedidos: parseInt(row.total_pedidos) || 0,
        total_vendas: parseFloat(row.total_vendas) || 0
      };
    });
    
    res.json({
      success: true,
      filtros: { data_inicio, data_fim },
      dados: dados
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
    const { limite } = req.query;
    const lim = parseInt(limite) || 10;
    
    const query = `
      SELECT 
        pr.id_produto,
        pr.nome_produto,
        pr.preco_produto,
        COALESCE(SUM(php.quantidade), 0) as total_vendido,
        COALESCE(SUM(php.quantidade * php.preco_unitario), 0) as receita_total
      FROM produto pr
      LEFT JOIN pedido_has_produto php ON php.produto_id_produto = pr.id_produto
      GROUP BY pr.id_produto, pr.nome_produto, pr.preco_produto
      ORDER BY total_vendido DESC
      LIMIT $1
    `;
    
    const result = await db.query(query, [lim]);
    
    const dados = result.rows.map(row => ({
      id_produto: row.id_produto,
      nome_produto: row.nome_produto || 'Produto sem nome',
      preco_produto: parseFloat(row.preco_produto) || 0,
      total_vendido: parseInt(row.total_vendido) || 0,
      receita_total: parseFloat(row.receita_total) || 0
    }));
    
    res.json({
      success: true,
      limite: lim,
      dados: dados
    });
  } catch (err) {
    console.error('Erro no relatório de produtos mais vendidos:', err);
    res.status(500).json({ error: err.message });
  }
};
