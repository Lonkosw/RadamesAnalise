/**
 * Script para Repopular Dados de Teste
 * Adiciona pessoas, clientes e funcionários com senhas testáveis
 */
const db = require('../database.js');
const bcrypt = require('bcrypt');

async function repopularDados() {
  console.log('🔄 Iniciando repopulação de dados de teste...\n');
  
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Senha padrão para testes: 123456
    const senhaHash = await bcrypt.hash('123456', 10);
    
    // =====================================================
    // 1. INSERIR PESSOAS
    // =====================================================
    console.log('👤 Inserindo pessoas...');
    
    const pessoas = [
      { cpf: '11111111111', nome: 'João Silva', email: 'joao@email.com' },
      { cpf: '22222222222', nome: 'Maria Souza', email: 'maria@email.com' },
      { cpf: '33333333333', nome: 'Carlos Pereira', email: 'carlos@email.com' },
      { cpf: '44444444444', nome: 'Ana Lima', email: 'ana@email.com' },
      { cpf: '55555555555', nome: 'Lucas Mendes', email: 'lucas@email.com' },
      { cpf: '66666666666', nome: 'Fernanda Costa', email: 'fernanda@email.com' },
      { cpf: '77777777777', nome: 'Ricardo Alves', email: 'ricardo@email.com' },
      { cpf: '88888888888', nome: 'Patrícia Gomes', email: 'patricia@email.com' },
      { cpf: '99999999999', nome: 'Marcos Rocha', email: 'marcos@email.com' },
      { cpf: '10101010101', nome: 'Juliana Dias', email: 'juliana@email.com' },
    ];
    
    for (const p of pessoas) {
      await client.query(`
        INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, data_nascimento_pessoa, endereco_pessoa)
        VALUES ($1, $2, $3, $4, '1990-01-01', 'Endereço padrão')
        ON CONFLICT (cpf_pessoa) DO UPDATE SET
          nome_pessoa = EXCLUDED.nome_pessoa,
          email_pessoa = EXCLUDED.email_pessoa,
          senha_pessoa = EXCLUDED.senha_pessoa
      `, [p.cpf, p.nome, p.email, senhaHash]);
      console.log(`   ✅ ${p.nome} (${p.cpf})`);
    }
    
    // Atualizar senha do master
    await client.query(`
      UPDATE pessoa SET senha_pessoa = $1 WHERE cpf_pessoa = '00000000000'
    `, [senhaHash]);
    console.log('   ✅ Master (00000000000) - senha atualizada');
    
    // =====================================================
    // 2. INSERIR FUNCIONÁRIOS
    // =====================================================
    console.log('\n👔 Inserindo funcionários...');
    
    const funcionarios = [
      { cpf: '22222222222', salario: 3000, cargo: 2, comissao: 10 },  // Gerente
      { cpf: '33333333333', salario: 1500, cargo: 3, comissao: 3 },   // Caixa
      { cpf: '44444444444', salario: 2500, cargo: 4, comissao: 6 },   // Supervisor
      { cpf: '55555555555', salario: 1800, cargo: 5, comissao: 4 },   // Atendente
      { cpf: '66666666666', salario: 1600, cargo: 6, comissao: 2 },   // Repositor
      { cpf: '77777777777', salario: 2200, cargo: 7, comissao: 5 },   // Conferente
      { cpf: '88888888888', salario: 1900, cargo: 8, comissao: 3 },   // Assistente
      { cpf: '99999999999', salario: 2800, cargo: 9, comissao: 7 },   // Auxiliar
      { cpf: '10101010101', salario: 5000, cargo: 2, comissao: 15 },  // Gerente
    ];
    
    for (const f of funcionarios) {
      await client.query(`
        INSERT INTO funcionario (pessoa_cpf_pessoa, salario_funcionario, cargo_id_cargo, porcentagem_comissao_funcionario)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (pessoa_cpf_pessoa) DO UPDATE SET
          salario_funcionario = EXCLUDED.salario_funcionario,
          cargo_id_cargo = EXCLUDED.cargo_id_cargo
      `, [f.cpf, f.salario, f.cargo, f.comissao]);
      console.log(`   ✅ Funcionário ${f.cpf}`);
    }
    
    // =====================================================
    // 3. INSERIR CLIENTES
    // =====================================================
    console.log('\n🛒 Inserindo clientes...');
    
    const clientes = [
      { cpf: '11111111111', renda: 2500 },
      { cpf: '22222222222', renda: 3200 },
      { cpf: '33333333333', renda: 1800 },
      { cpf: '44444444444', renda: 4000 },
      { cpf: '55555555555', renda: 2100 },
      { cpf: '66666666666', renda: 3500 },
      { cpf: '77777777777', renda: 2700 },
      { cpf: '88888888888', renda: 5000 },
      { cpf: '99999999999', renda: 3800 },
      { cpf: '10101010101', renda: 4500 },
    ];
    
    for (const c of clientes) {
      await client.query(`
        INSERT INTO cliente (pessoa_cpf_pessoa, renda_cliente, data_cadastro_cliente)
        VALUES ($1, $2, CURRENT_DATE)
        ON CONFLICT (pessoa_cpf_pessoa) DO UPDATE SET
          renda_cliente = EXCLUDED.renda_cliente
      `, [c.cpf, c.renda]);
      console.log(`   ✅ Cliente ${c.cpf}`);
    }
    
    // =====================================================
    // 4. INSERIR PRODUTOS (se não existirem)
    // =====================================================
    console.log('\n🧴 Verificando produtos...');
    
    const produtosExistentes = await client.query('SELECT COUNT(*) as total FROM produto');
    if (parseInt(produtosExistentes.rows[0].total) < 5) {
      console.log('   Inserindo produtos de teste...');
      const produtos = [
        { nome: 'Eternity', marca: 'Calvin Klein', volume: 100, preco: 350.00 },
        { nome: '212 VIP', marca: 'Carolina Herrera', volume: 100, preco: 420.00 },
        { nome: 'La Vie Est Belle', marca: 'Lancôme', volume: 75, preco: 500.00 },
        { nome: 'Invictus', marca: 'Paco Rabanne', volume: 100, preco: 390.00 },
        { nome: 'Light Blue', marca: 'Dolce & Gabbana', volume: 100, preco: 330.00 },
      ];
      
      for (const p of produtos) {
        await client.query(`
          INSERT INTO produto (nome_produto, marca_produto, volume_ml, concentracao, descricao_produto, preco_produto, quantidade_estoque)
          VALUES ($1, $2, $3, 'Eau de Parfum', 'Perfume premium', $4, 50)
          ON CONFLICT DO NOTHING
        `, [p.nome, p.marca, p.volume, p.preco]);
      }
      console.log('   ✅ Produtos inseridos');
    } else {
      console.log(`   ✅ ${produtosExistentes.rows[0].total} produtos já existem`);
    }
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ DADOS REPOPULADOS COM SUCESSO!');
    console.log('='.repeat(50));
    console.log('\n📋 Credenciais de teste:');
    console.log('   Cliente: joao@email.com / 123456');
    console.log('   Gerente: maria@email.com / 123456');
    console.log('   Master:  master@habib.com / 123456');
    console.log('\n');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', err.message);
    throw err;
  } finally {
    client.release();
  }
  
  process.exit(0);
}

repopularDados().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
