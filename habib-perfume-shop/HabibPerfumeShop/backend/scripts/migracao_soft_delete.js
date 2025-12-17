const db = require('../database');

async function executarMigracao() {
  try {
    await db.query(`ALTER TABLE produto ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE NOT NULL`);
    console.log('✅ Coluna ativo adicionada com sucesso!');
    
    await db.query(`CREATE INDEX IF NOT EXISTS idx_produto_ativo ON produto(ativo)`);
    console.log('✅ Índice criado com sucesso!');
    
    process.exit(0);
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
}

executarMigracao();
