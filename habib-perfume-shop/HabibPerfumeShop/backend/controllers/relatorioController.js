// ============================================================================
// relatorioController.js - RELATÓRIOS DO GERENTE
// Requisito obrigatório: 2 relatórios com formato para impressão
// ============================================================================
const db = require('../database');
const path = require('path');

// Cache para nome da coluna de cliente no pedido
let clienteCpfColumn = null;

// Detecta qual coluna de CPF do cliente existe na tabela pedido
async function getClienteCpfColumn() {
  if (clienteCpfColumn) return clienteCpfColumn;
  
  try {
    const result = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pedido' 
        AND column_name IN ('cliente_pessoa_cpf_pessoa', 'cliente_cpf')
      ORDER BY column_name DESC
      LIMIT 1
    `);
    clienteCpfColumn = result.rows[0]?.column_name || 'cliente_cpf';
  } catch (e) {
    clienteCpfColumn = 'cliente_cpf';
  }
  return clienteCpfColumn;
}

// ============================================================================
// RELATÓRIO 1 - VENDAS POR PERÍODO
// GET /relatorio/vendas-periodo?mes=12&ano=2025
// Retorna total de vendas em um mês específico
// ============================================================================
exports.relatorioVendasPorPeriodo = async (req, res) => {
  try {
    const { mes, ano, formato } = req.query;
    
    // Se não informar mês/ano, usa o mês atual
    const dataAtual = new Date();
    let mesQuery = mes ? parseInt(mes, 10) : (dataAtual.getMonth() + 1);
    let anoQuery = ano ? parseInt(ano, 10) : dataAtual.getFullYear();
    
    // Validar mês e ano
    if (isNaN(mesQuery) || mesQuery < 1 || mesQuery > 12) {
      mesQuery = dataAtual.getMonth() + 1;
    }
    if (isNaN(anoQuery) || anoQuery < 2000 || anoQuery > 2100) {
      anoQuery = dataAtual.getFullYear();
    }

    // Detecta nome da coluna de cliente dinamicamente
    const cpfCol = await getClienteCpfColumn();

    // Query principal - vendas do período
    // Usa v_cliente_compat ou acessa pessoa diretamente se a view não existir
    const sqlVendas = `
      SELECT 
        p.id_pedido,
        p.data_pedido,
        COALESCE(
          (SELECT pe.nome_pessoa FROM pessoa pe WHERE pe.cpf_pessoa = p.${cpfCol}),
          'Cliente ' || p.${cpfCol}
        ) as nome_cliente,
        p.${cpfCol} as cpf_cliente,
        COALESCE(
          (SELECT SUM(php.quantidade * php.preco_unitario) 
           FROM pedido_has_produto php 
           WHERE php.pedido_id_pedido = p.id_pedido),
          0
        ) as valor_total,
        CASE WHEN EXISTS (SELECT 1 FROM pagamento pag WHERE pag.pedido_id_pedido = p.id_pedido) 
             THEN 'Pago' ELSE 'Pendente' END as status_pagamento
      FROM pedido p
      WHERE EXTRACT(MONTH FROM p.data_pedido) = $1
        AND EXTRACT(YEAR FROM p.data_pedido) = $2
      ORDER BY p.data_pedido DESC
    `;

    const resultVendas = await db.query(sqlVendas, [mesQuery, anoQuery]);

    // Query de resumo
    const sqlResumo = `
      SELECT 
        COUNT(DISTINCT p.id_pedido) as total_pedidos,
        COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM pagamento pag WHERE pag.pedido_id_pedido = p.id_pedido) THEN p.id_pedido END) as pedidos_pagos,
        COALESCE(
          (SELECT SUM(php.quantidade * php.preco_unitario) 
           FROM pedido_has_produto php 
           JOIN pedido pd ON pd.id_pedido = php.pedido_id_pedido
           WHERE EXTRACT(MONTH FROM pd.data_pedido) = $1
             AND EXTRACT(YEAR FROM pd.data_pedido) = $2
             AND EXISTS (SELECT 1 FROM pagamento pag WHERE pag.pedido_id_pedido = pd.id_pedido)),
          0
        ) as valor_total_arrecadado,
        COUNT(DISTINCT p.${cpfCol}) as clientes_distintos
      FROM pedido p
      WHERE EXTRACT(MONTH FROM p.data_pedido) = $1
        AND EXTRACT(YEAR FROM p.data_pedido) = $2
    `;

    const resultResumo = await db.query(sqlResumo, [mesQuery, anoQuery]);

    // Query de vendas por dia
    const sqlPorDia = `
      SELECT 
        DATE(p.data_pedido) as dia,
        COUNT(p.id_pedido) as qtd_pedidos,
        COALESCE(SUM(
          (SELECT SUM(php.quantidade * php.preco_unitario) 
           FROM pedido_has_produto php 
           WHERE php.pedido_id_pedido = p.id_pedido)
        ), 0) as valor_dia
      FROM pedido p
      WHERE EXTRACT(MONTH FROM p.data_pedido) = $1
        AND EXTRACT(YEAR FROM p.data_pedido) = $2
      GROUP BY DATE(p.data_pedido)
      ORDER BY dia
    `;

    const resultPorDia = await db.query(sqlPorDia, [mesQuery, anoQuery]);

    // Se formato = html, retorna página para impressão
    if (formato === 'html') {
      return res.sendFile(path.join(__dirname, '../../frontend/relatorios/vendas-periodo.html'));
    }

    // Retorna JSON
    res.json({
      periodo: {
        mes: mesQuery,
        ano: anoQuery,
        nome_mes: obterNomeMes(mesQuery)
      },
      resumo: resultResumo.rows[0] || {
        total_pedidos: 0,
        pedidos_pagos: 0,
        valor_total_arrecadado: 0,
        clientes_distintos: 0
      },
      vendas_por_dia: resultPorDia.rows,
      detalhes: resultVendas.rows,
      gerado_em: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de vendas:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório', detalhes: error.message });
  }
};

// ============================================================================
// RELATÓRIO 2 - PRODUTOS MAIS VENDIDOS
// GET /relatorio/produtos-mais-vendidos?limite=10
// Retorna ranking dos produtos mais vendidos
// ============================================================================
exports.relatorioProdutosMaisVendidos = async (req, res) => {
  try {
    const { limite, formato, periodo } = req.query;
    const limiteQuery = limite ? parseInt(limite) : 10;

    // Filtro de período opcional (últimos N dias)
    let wherePeriodo = '';
    const params = [limiteQuery];
    
    if (periodo) {
      const dias = parseInt(periodo);
      wherePeriodo = `WHERE p.data_pedido >= NOW() - INTERVAL '${dias} days'`;
    }

    // Query principal - ranking de produtos
    const sqlProdutos = `
      SELECT 
        pr.id_produto,
        pr.nome_produto,
        pr.marca_produto,
        pr.preco_produto as preco_atual,
        COALESCE(SUM(php.quantidade), 0) as total_vendido,
        COALESCE(SUM(php.quantidade * php.preco_unitario), 0) as faturamento_total,
        COUNT(DISTINCT php.pedido_id_pedido) as qtd_pedidos,
        COALESCE(AVG(php.preco_unitario), pr.preco_produto) as preco_medio_venda,
        pr.quantidade_estoque as estoque_atual
      FROM produto pr
      LEFT JOIN pedido_has_produto php ON php.produto_id_produto = pr.id_produto
      LEFT JOIN pedido p ON p.id_pedido = php.pedido_id_pedido
      ${wherePeriodo}
      GROUP BY pr.id_produto, pr.nome_produto, pr.marca_produto, pr.preco_produto, pr.quantidade_estoque
      ORDER BY total_vendido DESC
      LIMIT $1
    `;

    const resultProdutos = await db.query(sqlProdutos, params);

    // Query de resumo geral
    const sqlResumo = `
      SELECT 
        COUNT(DISTINCT php.produto_id_produto) as produtos_vendidos,
        COALESCE(SUM(php.quantidade), 0) as unidades_vendidas,
        COALESCE(SUM(php.quantidade * php.preco_unitario), 0) as faturamento_total,
        COUNT(DISTINCT php.pedido_id_pedido) as total_pedidos
      FROM pedido_has_produto php
      LEFT JOIN pedido p ON p.id_pedido = php.pedido_id_pedido
      ${wherePeriodo}
    `;

    const resultResumo = await db.query(sqlResumo.replace('$1', ''));

    // Query de produtos sem venda
    const sqlSemVenda = `
      SELECT 
        pr.id_produto,
        pr.nome_produto,
        pr.marca_produto,
        pr.quantidade_estoque,
        pr.preco_produto
      FROM produto pr
      WHERE NOT EXISTS (
        SELECT 1 FROM pedido_has_produto php 
        WHERE php.produto_id_produto = pr.id_produto
      )
      ORDER BY pr.nome_produto
      LIMIT 20
    `;

    const resultSemVenda = await db.query(sqlSemVenda);

    // Se formato = html, retorna página para impressão
    if (formato === 'html') {
      return res.sendFile(path.join(__dirname, '../../frontend/relatorios/produtos-mais-vendidos.html'));
    }

    // Retorna JSON
    res.json({
      periodo: periodo ? `Últimos ${periodo} dias` : 'Todos os tempos',
      limite: limiteQuery,
      resumo: resultResumo.rows[0] || {
        produtos_vendidos: 0,
        unidades_vendidas: 0,
        faturamento_total: 0,
        total_pedidos: 0
      },
      ranking: resultProdutos.rows,
      produtos_sem_venda: resultSemVenda.rows,
      gerado_em: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de produtos:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório', detalhes: error.message });
  }
};

// ============================================================================
// ABRIR PÁGINA DE RELATÓRIOS (menu)
// GET /relatorio
// ============================================================================
exports.abrirRelatorios = (req, res) => {
  const usuario = req.cookies.usuarioLogado || req.cookies.usuario;
  
  if (usuario) {
    res.sendFile(path.join(__dirname, '../../frontend/relatorios/index.html'));
  } else {
    res.redirect('/login');
  }
};

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================
function obterNomeMes(mes) {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mesNum = parseInt(mes, 10);
  if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
    return 'Mês Inválido';
  }
  return meses[mesNum - 1];
}
