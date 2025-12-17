/**
 * Teste do fluxo de pagamento completo com controle de estoque
 */

const pool = require('../database');

async function testarPagamentoCompleto() {
    console.log('=== TESTE: Fluxo de Pagamento Completo com Estoque ===\n');
    
    try {
        // 1. Verificar estoque atual do produto 13
        console.log('📦 1. Estoque ATUAL do produto 13:');
        const estoqueAntes = await pool.query('SELECT id_produto, nome, quantidade_estoque FROM produto WHERE id_produto = 13');
        console.log(`   Produto: ${estoqueAntes.rows[0].nome}`);
        console.log(`   Estoque: ${estoqueAntes.rows[0].quantidade_estoque}\n`);
        
        // 2. Verificar pedido 130 e seus itens
        console.log('📋 2. Verificando pedido #130:');
        const pedido130 = await pool.query('SELECT * FROM pedido WHERE id_pedido = 130');
        if (pedido130.rows.length > 0) {
            console.log(`   Status: ${pedido130.rows[0].status_pedido}`);
            
            const itens130 = await pool.query(`
                SELECT php.*, pr.nome, pr.quantidade_estoque 
                FROM pedido_has_produto php 
                JOIN produto pr ON php.fk_produto = pr.id_produto 
                WHERE php.fk_pedido = 130
            `);
            console.log(`   Itens do pedido:`);
            itens130.rows.forEach(item => {
                console.log(`     - ${item.nome}: ${item.quantidade} unidades (estoque atual: ${item.quantidade_estoque})`);
            });
        } else {
            console.log('   Pedido 130 não encontrado');
        }
        
        // 3. Verificar pagamentos do pedido 130
        console.log('\n💳 3. Pagamentos do pedido #130:');
        const pagamentos130 = await pool.query('SELECT * FROM pagamento WHERE fk_pedido = 130');
        console.log(`   Total de pagamentos: ${pagamentos130.rows.length}`);
        pagamentos130.rows.forEach(pag => {
            console.log(`   - Pagamento ID: ${pag.id_pagamento}, Data: ${pag.data_pagamento}`);
        });
        
        // 4. Calcular quanto estoque deveria ter sido reduzido (pedidos pagos)
        console.log('\n📊 4. Análise de pedidos PAGOS para produto 13:');
        const pedidosPagos = await pool.query(`
            SELECT p.id_pedido, p.status_pedido, php.quantidade
            FROM pedido p
            JOIN pedido_has_produto php ON p.id_pedido = php.fk_pedido
            WHERE php.fk_produto = 13 AND p.status_pedido = 'pago'
        `);
        
        let totalVendido = 0;
        pedidosPagos.rows.forEach(row => {
            console.log(`   Pedido #${row.id_pedido}: ${row.quantidade} unidades`);
            totalVendido += row.quantidade;
        });
        console.log(`   TOTAL vendido (pedidos pagos): ${totalVendido} unidades`);
        
        // 5. Verificar se o estoque está correto
        const estoqueEsperado = 49 - totalVendido; // Assumindo 49 como o valor antes da correção
        console.log(`\n✅ 5. Verificação:`);
        console.log(`   Se o estoque era 49 antes do pedido 130 ser pago...`);
        console.log(`   E o pedido 130 tinha 10 unidades...`);
        console.log(`   Estoque deveria ser: 39 (49 - 10)`);
        console.log(`   Estoque atual: ${estoqueAntes.rows[0].quantidade_estoque}`);
        
        if (estoqueAntes.rows[0].quantidade_estoque === 39) {
            console.log('   ✅ ESTOQUE CORRETO!');
        } else {
            console.log('   ❌ ESTOQUE NÃO FOI ATUALIZADO PELO PEDIDO ANTERIOR');
            console.log('\n🔧 6. Corrigindo estoque manualmente para o pedido 130 (já pago antes da correção):');
            
            // Verificar se devemos corrigir
            const resposta = await pool.query(`
                SELECT SUM(php.quantidade) as total
                FROM pedido p
                JOIN pedido_has_produto php ON p.id_pedido = php.fk_pedido
                WHERE p.status_pedido = 'pago' AND php.fk_produto = 13
            `);
            
            const totalQueDeveSerReduzido = parseInt(resposta.rows[0].total || 0);
            console.log(`   Total que deveria ser reduzido: ${totalQueDeveSerReduzido}`);
            
            // Atualizar o estoque
            await pool.query(`
                UPDATE produto 
                SET quantidade_estoque = 59 - $1 
                WHERE id_produto = 13
            `, [totalQueDeveSerReduzido]);
            
            // Verificar novo estoque
            const novoEstoque = await pool.query('SELECT quantidade_estoque FROM produto WHERE id_produto = 13');
            console.log(`   Novo estoque após correção: ${novoEstoque.rows[0].quantidade_estoque}`);
        }
        
        console.log('\n=== PRÓXIMO PASSO: Teste com novo pedido ===');
        console.log('Para testar se a correção funciona, crie um novo pedido e pague via frontend.');
        console.log('O estoque deve diminuir automaticamente após o pagamento.\n');
        
    } catch (error) {
        console.error('Erro:', error.message);
    } finally {
        await pool.end();
    }
}

testarPagamentoCompleto();
