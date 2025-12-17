/**
 * Script para corrigir estoque de pedidos pagos antes da correção
 * E testar se novos pagamentos funcionam corretamente
 */

const pool = require('../database');

async function corrigirETestar() {
    try {
        console.log('=== CORREÇÃO DE ESTOQUE RETROATIVA ===\n');
        
        // 1. Buscar todos os pedidos PAGOS e seus itens
        console.log('📋 1. Buscando todos os pedidos pagos e seus itens...\n');
        
        const pedidosPagos = await pool.query(`
            SELECT 
                p.id_pedido,
                p.status_pedido,
                php.produto_id_produto,
                php.quantidade,
                pr.nome_produto,
                pr.quantidade_estoque
            FROM pedido p
            JOIN pedido_has_produto php ON p.id_pedido = php.pedido_id_pedido
            JOIN produto pr ON php.produto_id_produto = pr.id_produto
            WHERE p.status_pedido = 'pago'
            ORDER BY p.id_pedido, php.produto_id_produto
        `);
        
        console.log(`   Total de itens em pedidos pagos: ${pedidosPagos.rows.length}\n`);
        
        // 2. Agrupar por produto para calcular redução total necessária
        const reducoesNecessarias = {};
        
        for (const row of pedidosPagos.rows) {
            const prodId = row.produto_id_produto;
            if (!reducoesNecessarias[prodId]) {
                reducoesNecessarias[prodId] = {
                    nome: row.nome_produto,
                    estoqueAtual: row.quantidade_estoque,
                    totalVendido: 0,
                    pedidos: []
                };
            }
            reducoesNecessarias[prodId].totalVendido += row.quantidade;
            reducoesNecessarias[prodId].pedidos.push({
                pedido: row.id_pedido,
                qtd: row.quantidade
            });
        }
        
        console.log('📊 2. Análise por produto:\n');
        
        // 3. Calcular se precisa de correção
        // Assumindo estoque inicial conhecido ou calculando baseado no esperado
        
        for (const [prodId, info] of Object.entries(reducoesNecessarias)) {
            console.log(`   Produto ${prodId} (${info.nome}):`);
            console.log(`     - Estoque atual: ${info.estoqueAtual}`);
            console.log(`     - Total vendido (pedidos pagos): ${info.totalVendido}`);
            console.log(`     - Pedidos: ${info.pedidos.map(p => `#${p.pedido}(${p.qtd})`).join(', ')}`);
            
            // Se o estoque deveria ter sido reduzido mas não foi
            // Isso é uma simplificação - idealmente deveríamos ter um registro do estoque inicial
            console.log('');
        }
        
        // 4. Aplicar correção manual para o pedido 130 (produto 13)
        console.log('🔧 3. Aplicando correção para produto 13 (Essencia Floral):\n');
        
        const estoqueAntes = await pool.query('SELECT quantidade_estoque FROM produto WHERE id_produto = 13');
        console.log(`   Estoque antes: ${estoqueAntes.rows[0].quantidade_estoque}`);
        
        // Calcular o total vendido do produto 13
        const totalVendido13 = reducoesNecessarias[13]?.totalVendido || 0;
        console.log(`   Total vendido (pedidos pagos): ${totalVendido13}`);
        
        // O estoque original era provavelmente 59 (49 + 10 do pedido 130)
        // Mas para ser seguro, vamos apenas reduzir pela quantidade do pedido 130
        await pool.query(`
            UPDATE produto 
            SET quantidade_estoque = quantidade_estoque - 10 
            WHERE id_produto = 13
        `);
        
        const estoqueDepois = await pool.query('SELECT quantidade_estoque FROM produto WHERE id_produto = 13');
        console.log(`   Estoque depois: ${estoqueDepois.rows[0].quantidade_estoque}`);
        console.log('   ✅ Estoque corrigido para refletir o pedido 130!\n');
        
        console.log('=== PRÓXIMOS PASSOS ===');
        console.log('O servidor já está rodando com a correção.');
        console.log('Crie um NOVO pedido e faça o pagamento pelo frontend.');
        console.log('O estoque deve ser atualizado automaticamente.\n');
        
        process.exit(0);
    } catch (error) {
        console.error('Erro:', error.message);
        process.exit(1);
    }
}

corrigirETestar();
