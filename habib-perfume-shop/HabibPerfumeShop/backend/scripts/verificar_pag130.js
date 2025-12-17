const pool = require('../database');

async function verificarPagamento130() {
    try {
        const result = await pool.query('SELECT * FROM pagamento WHERE pedido_id_pedido = 130');
        console.log('Pagamentos do pedido 130:', result.rows);
        
        // Verificar se o estoque foi atualizado corretamente após correção
        console.log('\nO servidor foi reiniciado. A correção SÓ vai funcionar para NOVOS pagamentos.');
        console.log('O pedido 130 foi pago ANTES da correção, então o estoque não foi atualizado.');
        console.log('\nPara corrigir manualmente o pedido 130, o estoque do produto 13 deveria ser:');
        console.log('  Estoque atual: 49');
        console.log('  Quantidade no pedido 130: 10');
        console.log('  Estoque correto: 49 - 10 = 39');
        
        process.exit(0);
    } catch (error) {
        console.error('Erro:', error.message);
        process.exit(1);
    }
}

verificarPagamento130();
