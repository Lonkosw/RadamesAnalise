/**
 * Script de teste para CRUD Pedido
 */
const axios = require('axios');
const API = 'http://localhost:3001';

async function testar() {
    console.log('=== TESTE CRUD PEDIDO ===\n');
    
    try {
        // 1. Listar pedidos
        console.log('1. Listando pedidos...');
        const pedidos = await axios.get(`${API}/pedido`);
        console.log(`   Total: ${pedidos.data.length} pedidos`);
        if (pedidos.data.length > 0) {
            const p = pedidos.data[0];
            console.log(`   Primeiro: ID ${p.id_pedido}, cliente_cpf: ${p.cliente_cpf}, funcionario_cpf: ${p.funcionario_cpf}`);
        }

        // 2. Buscar pedido 93 (se existir)
        console.log('\n2. Buscando pedido 93...');
        try {
            const pedido93 = await axios.get(`${API}/pedido/93`);
            console.log('   Pedido 93:', JSON.stringify(pedido93.data, null, 4));
        } catch (e) {
            console.log('   Pedido 93 não encontrado');
        }

        // 3. Criar um novo pedido
        console.log('\n3. Criando novo pedido...');
        const novoPedido = {
            data_pedido: '2025-01-15',
            cliente_cpf: '00000000000',
            funcionario_cpf: '00000000000'
        };
        console.log('   Dados:', novoPedido);
        
        const criado = await axios.post(`${API}/pedido/gerente`, novoPedido);
        console.log('   Criado ID:', criado.data.pedido.id_pedido);
        console.log('   cliente_cpf:', criado.data.pedido.cliente_cpf);
        console.log('   funcionario_cpf:', criado.data.pedido.funcionario_cpf);
        
        const idCriado = criado.data.pedido.id_pedido;

        // 4. Buscar pedido criado
        console.log('\n4. Buscando pedido criado...');
        const buscado = await axios.get(`${API}/pedido/${idCriado}`);
        console.log('   funcionario_cpf retornado:', buscado.data.funcionario_cpf);

        // 5. Deletar pedido
        console.log('\n5. Deletando pedido...');
        await axios.delete(`${API}/pedido/${idCriado}`);
        console.log('   Deletado!');

        console.log('\n=== TESTES CONCLUÍDOS ===');
        
    } catch (error) {
        console.error('ERRO:', error.response?.data || error.message);
    }
}

testar();
