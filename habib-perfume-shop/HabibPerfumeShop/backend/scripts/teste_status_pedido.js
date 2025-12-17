/**
 * teste_status_pedido.js - Testa se o status do pedido é retornado corretamente
 */

const http = require('http');

const API_BASE = 'http://localhost:3001';

function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 80,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ 
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        json: () => Promise.resolve(JSON.parse(data)),
                        text: () => Promise.resolve(data)
                    });
                } catch (e) {
                    resolve({ ok: false, status: res.statusCode, text: () => Promise.resolve(data) });
                }
            });
        });

        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

async function main() {
    console.log('='.repeat(60));
    console.log('TESTE: Status do Pedido (pendente vs pago)');
    console.log('='.repeat(60));
    
    try {
        // 1. Listar pedidos e verificar se tem status_pedido
        console.log('\n1. Listando pedidos...');
        const res = await fetch(`${API_BASE}/pedido`);
        
        if (!res.ok) {
            console.log('❌ Erro ao listar pedidos:', res.status);
            return;
        }
        
        const pedidos = await res.json();
        console.log(`   Total de pedidos: ${pedidos.length}`);
        
        if (pedidos.length === 0) {
            console.log('   Nenhum pedido encontrado');
            return;
        }
        
        // Mostrar primeiros pedidos com status
        console.log('\n2. Verificando campo status_pedido:');
        console.log('-'.repeat(60));
        console.log('ID\t| Cliente\t\t| Total\t\t| Status');
        console.log('-'.repeat(60));
        
        let temPago = false;
        let temPendente = false;
        
        pedidos.slice(0, 10).forEach(p => {
            const nome = (p.cliente_nome || 'N/A').substring(0, 15).padEnd(15);
            const total = `R$ ${parseFloat(p.total_pedido || 0).toFixed(2)}`.padEnd(12);
            const status = p.status_pedido || 'undefined';
            
            if (status === 'pago') temPago = true;
            if (status === 'pendente') temPendente = true;
            
            const statusIcon = status === 'pago' ? '✅' : status === 'pendente' ? '⏳' : '❓';
            console.log(`${p.id_pedido}\t| ${nome}\t| ${total}\t| ${statusIcon} ${status}`);
        });
        
        console.log('-'.repeat(60));
        
        // 3. Verificar estrutura
        console.log('\n3. Verificando estrutura dos dados:');
        const sample = pedidos[0];
        console.log('   Campos retornados:', Object.keys(sample).join(', '));
        
        if ('status_pedido' in sample) {
            console.log('   ✅ Campo status_pedido PRESENTE!');
        } else {
            console.log('   ❌ Campo status_pedido AUSENTE!');
        }
        
        // 4. Resumo
        console.log('\n4. Resumo:');
        if (temPago) console.log('   ✅ Existem pedidos com status "pago"');
        if (temPendente) console.log('   ⏳ Existem pedidos com status "pendente"');
        
        if (temPago || temPendente) {
            console.log('\n✅ TESTE PASSOU! O status do pedido está sendo retornado corretamente.');
        } else {
            console.log('\n⚠️ ATENÇÃO: Nenhum pedido com status definido encontrado.');
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.log('\n   Certifique-se de que o servidor está rodando em http://localhost:3001');
    }
    
    console.log('\n' + '='.repeat(60));
}

main();
