const { Pool } = require('pg');

const SOURCE_URL = process.env.DATABASE_URL;
const TARGET_URL = 'postgresql://neondb_owner:npg_A6ZOS2tVfNiQ@ep-billowing-fire-anct7mfk-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const FETCH_BATCH = 2000;
const INSERT_BATCH = 500;

const sourcePool = new Pool({ connectionString: SOURCE_URL });
const targetPool = new Pool({ 
  connectionString: TARGET_URL,
  ssl: { rejectUnauthorized: false }
});

// Helper to ensure search_path is set
async function ensureSearchPath(client) {
  await client.query("SET search_path TO public");
}

async function bulkInsert(targetClient, tableName, columns, rows) {
  if (rows.length === 0) return 0;
  const colList = columns.map(c => `"${c}"`).join(', ');
  let paramIdx = 1;
  const rowPlaceholders = rows.map(() => {
    const placeholders = columns.map(() => `$${paramIdx++}`).join(', ');
    return `(${placeholders})`;
  }).join(', ');
  const values = rows.flatMap(row => columns.map(c => row[c]));
  try {
    const result = await targetClient.query(
      `INSERT INTO "${tableName}" (${colList}) VALUES ${rowPlaceholders} ON CONFLICT DO NOTHING`,
      values
    );
    return result.rowCount || 0;
  } catch (err) {
    let inserted = 0;
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    for (const row of rows) {
      try {
        const r = await targetClient.query(
          `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          columns.map(c => row[c])
        );
        inserted += r.rowCount || 0;
      } catch (e) {}
    }
    return inserted;
  }
}

async function copyLargeTable(sourceClient, targetClient, tableName) {
  const countRes = await sourceClient.query(`SELECT COUNT(*) FROM "${tableName}"`);
  const total = parseInt(countRes.rows[0].count);

  const schemaRes = await sourceClient.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  const columns = schemaRes.rows.map(r => r.column_name);
  const colList = columns.map(c => `"${c}"`).join(', ');

  // Check how many already exist in target
  const existingRes = await targetClient.query(`SELECT COUNT(*) FROM "${tableName}"`);
  const existing = parseInt(existingRes.rows[0].count);
  
  console.log(`\n📋 ${tableName}: ${total} total, ${existing} déjà en cible`);
  if (existing >= total) {
    console.log(`   ✅ Déjà complet, ignorée`);
    return existing;
  }

  let offset = existing; // resume from where we left off
  let transferred = existing;
  const t0 = Date.now();

  while (offset < total) {
    const res = await sourceClient.query(
      `SELECT ${colList} FROM "${tableName}" ORDER BY 1 LIMIT $1 OFFSET $2`,
      [FETCH_BATCH, offset]
    );

    if (res.rows.length === 0) break;

    for (let i = 0; i < res.rows.length; i += INSERT_BATCH) {
      const batch = res.rows.slice(i, i + INSERT_BATCH);
      transferred += await bulkInsert(targetClient, tableName, columns, batch);
    }

    offset += res.rows.length;
    const elapsed = Math.round((Date.now() - t0) / 1000);
    const rate = Math.round((offset - existing) / elapsed);
    const remaining = Math.round((total - offset) / rate);
    process.stdout.write(`\r   ${offset}/${total} (${Math.round(offset/total*100)}%) | ${rate} rows/s | ~${remaining}s restant`);
  }

  console.log(`\n   ✅ ${transferred} lignes en cible`);
  return transferred;
}

async function main() {
  const tableName = process.argv[2] || 'transactions';
  console.log(`\n🚀 Migration de la table: ${tableName}`);
  const t0 = Date.now();

  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();

  try {
    await ensureSearchPath(sourceClient);
    await ensureSearchPath(targetClient);
    await copyLargeTable(sourceClient, targetClient, tableName);

    const elapsed = Math.round((Date.now() - t0) / 1000);
    console.log(`\n⏱️  Terminé en ${elapsed}s`);

    // Sync sequences
    const seqRes = await sourceClient.query(`SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'`);
    for (const { sequencename } of seqRes.rows) {
      try {
        const lastValRes = await sourceClient.query(`SELECT last_value, is_called FROM "${sequencename}"`);
        const { last_value, is_called } = lastValRes.rows[0];
        await targetClient.query(`SELECT setval('${sequencename}', ${last_value}, ${is_called})`);
      } catch (err) {}
    }

    // Final verification
    const src = await sourceClient.query(`SELECT COUNT(*) FROM "${tableName}"`);
    const tgt = await targetClient.query(`SELECT COUNT(*) FROM "${tableName}"`);
    console.log(`\n📊 ${tableName}: source=${src.rows[0].count}, cible=${tgt.rows[0].count}`);

  } finally {
    sourceClient.release();
    targetClient.release();
    await sourcePool.end();
    await targetPool.end();
  }
}

main().catch(err => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
