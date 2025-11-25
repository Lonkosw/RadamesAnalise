const db = require('../database');

(async () => {
  try {
    console.log('[estoque-demo] Ajustando estoque para produtos com estoque nulo/<=0...');
    const r = await db.query('UPDATE produto SET quantidade_estoque = 10 WHERE quantidade_estoque IS NULL OR quantidade_estoque <= 0');
    console.log(`[estoque-demo] Linhas afetadas: ${r.rowCount}`);
  } catch (e) {
    console.error('[estoque-demo] Falha ao ajustar estoque:', e);
    process.exitCode = 1;
  } finally {
    try { await db.pool.end(); } catch {}
  }
})();
