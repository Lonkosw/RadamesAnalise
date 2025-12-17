/**
 * Script de diagnóstico para verificar estoque no banco de dados
 */
const { query, pool } = require('../database');

async function verificarEstoque() {
  try {
    console.log('\n=== DIAGNÓSTICO DE ESTOQUE ===\n');
    
    // 1. Verificar produtos e seus estoques
    console.log('1. PRODUTOS E ESTOQUES:');
    const produtos = await query('SELECT id_produto, nome_produto, quantidade_estoque FROM produto ORDER BY id_produto');
    produtos.rows.forEach(p => {
      console.log(`   Produto #${p.id_produto}: ${p.nome_produto} - Estoque: ${p.quantidade_estoque}`);
    });
    
    // 2. Verificar pedido #130
    console.log('\n2. PEDIDO #130:');
    const pedido130 = await query('SELECT * FROM pedido WHERE id_pedido = 130');
    if (pedido130.rows.length > 0) {
      console.log('   ', pedido130.rows[0]);
    } else {
      console.log('   Pedido não encontrado');
    }
    
    // 3. Verificar itens do pedido #130
    console.log('\n3. ITENS DO PEDIDO #130:');
    const itens130 = await query('SELECT * FROM pedido_has_produto WHERE pedido_id_pedido = 130');
    itens130.rows.forEach(i => {
      console.log(`   Produto #${i.produto_id_produto}: Qtd ${i.quantidade} x R$${i.preco_unitario}`);
    });
    
    // 4. Verificar pagamento do pedido #130
    console.log('\n4. PAGAMENTO DO PEDIDO #130:');
    const pagamento130 = await query('SELECT * FROM pagamento WHERE pedido_id_pedido = 130');
    if (pagamento130.rows.length > 0) {
      console.log('   ', pagamento130.rows[0]);
    } else {
      console.log('   Pagamento não encontrado');
    }
    
    // 5. Verificar pedidos recentes pagos
    console.log('\n5. PEDIDOS RECENTES COM STATUS PAGO:');
    const pedidosPagos = await query(`
      SELECT p.id_pedido, p.status_pedido, 
             COALESCE(SUM(php.quantidade), 0) as total_itens
      FROM pedido p
      LEFT JOIN pedido_has_produto php ON php.pedido_id_pedido = p.id_pedido
      WHERE p.status_pedido = 'pago'
      GROUP BY p.id_pedido, p.status_pedido
      ORDER BY p.id_pedido DESC
      LIMIT 10
    `);
    pedidosPagos.rows.forEach(p => {
      console.log(`   Pedido #${p.id_pedido}: ${p.status_pedido} - ${p.total_itens} itens`);
    });
    
    // 6. Calcular estoque esperado baseado em pedidos pagos
    console.log('\n6. CALCULO DE ESTOQUE ESPERADO:');
    const estoqueEsperado = await query(`
      SELECT 
        pr.id_produto,
        pr.nome_produto,
        pr.quantidade_estoque as estoque_atual,
        COALESCE(SUM(
          CASE WHEN p.status_pedido = 'pago' THEN php.quantidade ELSE 0 END
        ), 0) as total_vendido
      FROM produto pr
      LEFT JOIN pedido_has_produto php ON php.produto_id_produto = pr.id_produto
      LEFT JOIN pedido p ON p.id_pedido = php.pedido_id_pedido
      GROUP BY pr.id_produto, pr.nome_produto, pr.quantidade_estoque
      ORDER BY pr.id_produto
    `);
    estoqueEsperado.rows.forEach(p => {
      console.log(`   Produto #${p.id_produto}: ${p.nome_produto}`);
      console.log(`      Estoque atual: ${p.estoque_atual}`);
      console.log(`      Total vendido (pedidos pagos): ${p.total_vendido}`);
    });
    
    console.log('\n=== FIM DO DIAGNÓSTICO ===\n');
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

verificarEstoque();
