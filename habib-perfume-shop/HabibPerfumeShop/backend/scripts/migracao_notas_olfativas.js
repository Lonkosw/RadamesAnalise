const db = require('../database');

async function main() {
  console.log('=== MIGRAÇÃO: Adicionar coluna notas_olfativas_imagem ===\n');
  
  try {
    // 1. Verificar se coluna já existe
    const check = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'produto' AND column_name = 'notas_olfativas_imagem'
    `);
    
    if (check.rows.length > 0) {
      console.log('✅ Coluna notas_olfativas_imagem já existe.');
    } else {
      // 2. Adicionar coluna
      await db.query(`
        ALTER TABLE produto 
        ADD COLUMN notas_olfativas_imagem VARCHAR(255)
      `);
      console.log('✅ Coluna notas_olfativas_imagem adicionada com sucesso!');
    }
    
    // 3. Mostrar resultado
    const result = await db.query(`
      SELECT id_produto, nome_produto, notas_olfativas_imagem 
      FROM produto ORDER BY id_produto
    `);
    console.log('\n📦 Produtos no banco:');
    console.table(result.rows);
    
    console.log('\n✅ Migração concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
  } finally {
    process.exit();
  }
}

main();
