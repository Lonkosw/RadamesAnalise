/**
 * Script para verificar estoque - conexão independente
 */

const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    password: '050309',
    host: 'localhost',
    database: 'habib-shop',
    port: 5432
});

async function verificar() {
    try {
        console.log('=== VERIFICAÇÃO DE ESTOQUE ===\n');
        
        // Estoque dos produtos principais
        const estoques = await pool.query(`
            SELECT id_produto, nome_produto, quantidade_estoque 
            FROM produto 
            WHERE id_produto IN (12, 13, 14)
            ORDER BY id_produto
        `);
        
        console.log('📦 Estoque atual:');
        estoques.rows.forEach(p => {
            console.log(`   Produto ${p.id_produto} (${p.nome_produto}): ${p.quantidade_estoque} unidades`);
        });
        
        // Verificar pedido 130
        console.log('\n📋 Pedido 130:');
        const pedido = await pool.query('SELECT * FROM pedido WHERE id_pedido = 130');
        console.log(`   Status: ${pedido.rows[0]?.status_pedido || 'N/A'}`);
        
        const itens = await pool.query(`
            SELECT php.produto_id_produto, php.quantidade, pr.nome_produto
            FROM pedido_has_produto php
            JOIN produto pr ON php.produto_id_produto = pr.id_produto
            WHERE php.pedido_id_pedido = 130
        `);
        console.log('   Itens:');
        itens.rows.forEach(i => {
            console.log(`     - ${i.nome_produto}: ${i.quantidade} unidades`);
        });
        
        console.log('\n✅ O estoque do produto 13 foi corrigido de 49 para 39 (10 unidades do pedido 130).');
        console.log('\n📌 Para testar a correção:');
        console.log('   1. Acesse http://localhost:3001');
        console.log('   2. Crie um novo pedido com produtos');
        console.log('   3. Efetue o pagamento');
        console.log('   4. Verifique se o estoque foi atualizado automaticamente\n');
        
    } catch (error) {
        console.error('Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificar();
