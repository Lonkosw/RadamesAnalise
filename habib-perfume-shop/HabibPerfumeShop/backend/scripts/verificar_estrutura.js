/**
 * Verificar estrutura da tabela produto
 */

const pool = require('../database');

async function verificarEstrutura() {
    try {
        // Verificar colunas da tabela produto
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'produto'
            ORDER BY ordinal_position
        `);
        
        console.log('Colunas da tabela PRODUTO:');
        result.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });
        
        // Verificar dados do produto 13
        console.log('\nDados do produto 13:');
        const produto = await pool.query('SELECT * FROM produto WHERE id_produto = 13');
        console.log(produto.rows[0]);
        
        // Verificar estoque atual
        console.log('\nEstoque de alguns produtos:');
        const estoques = await pool.query('SELECT id_produto, quantidade_estoque FROM produto WHERE id_produto IN (12, 13, 14) ORDER BY id_produto');
        estoques.rows.forEach(p => {
            console.log(`  Produto ${p.id_produto}: ${p.quantidade_estoque} unidades`);
        });
        
        // Verificar pedido 130
        console.log('\nPedido 130:');
        const pedido = await pool.query('SELECT * FROM pedido WHERE id_pedido = 130');
        if (pedido.rows.length > 0) {
            console.log(`  Status: ${pedido.rows[0].status_pedido}`);
            console.log(`  Total: ${pedido.rows[0].total_pedido}`);
        }
        
        // Verificar estrutura pedido_has_produto
        console.log('\nColunas da tabela PEDIDO_HAS_PRODUTO:');
        const phpCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'pedido_has_produto'
            ORDER BY ordinal_position
        `);
        phpCols.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });

        // Itens do pedido 130
        console.log('\nItens do pedido 130:');
        const itens = await pool.query('SELECT * FROM pedido_has_produto WHERE pedido_id_pedido = 130');
        itens.rows.forEach(item => {
            console.log(`  Produto ${item.produto_id_produto}: ${item.quantidade} unidades`);
        });

        // Verificar estrutura pagamento
        console.log('\nColunas da tabela PAGAMENTO:');
        const pagCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'pagamento'
            ORDER BY ordinal_position
        `);
        pagCols.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });
        
        // Pagamentos do pedido 130
        console.log('\nPagamentos do pedido 130:');
        const pags = await pool.query('SELECT * FROM pagamento LIMIT 5');
        console.log('Amostra de pagamentos:');
        pags.rows.forEach(p => console.log('  ', p));
        
        process.exit(0);
    } catch (error) {
        console.error('Erro:', error.message);
        process.exit(1);
    }
}

verificarEstrutura();
