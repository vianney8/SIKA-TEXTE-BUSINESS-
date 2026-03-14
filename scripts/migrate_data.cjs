const { Pool } = require('pg');

const SOURCE_URL = process.env.DATABASE_URL;
const TARGET_URL = 'postgresql://neondb_owner:npg_A6ZOS2tVfNiQ@ep-billowing-fire-anct7mfk-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const FETCH_BATCH = 1000;
const INSERT_BATCH = 200;

const sourcePool = new Pool({ connectionString: SOURCE_URL });
const targetPool = new Pool({ connectionString: TARGET_URL });

async function bulkInsert(targetClient, tableName, columns, rows) {
  if (rows.length === 0) return 0;
  const colList = columns.map(c => `"${c}"`).join(', ');
  let paramIdx = 1;
  const rowPlaceholders = rows.map(row => {
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
    // fallback: insert row by row
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    let inserted = 0;
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

async function copyTable(sourceClient, targetClient, tableName, options) {
  const excludeColumns = (options && options.excludeColumns) || [];

  const countRes = await sourceClient.query(`SELECT COUNT(*) FROM "${tableName}"`);
  const total = parseInt(countRes.rows[0].count);
  console.log(`\n📋 ${tableName}: ${total} rows`);

  if (total === 0) {
    console.log(`   ⏭️  Vide, ignorée`);
    return 0;
  }

  const schemaRes = await sourceClient.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  const allColumns = schemaRes.rows.map(r => r.column_name);
  const columns = allColumns.filter(c => !excludeColumns.includes(c));
  const allColList = allColumns.map(c => `"${c}"`).join(', ');

  let offset = 0;
  let transferred = 0;

  while (offset < total) {
    const res = await sourceClient.query(
      `SELECT ${allColList} FROM "${tableName}" LIMIT $1 OFFSET $2`,
      [FETCH_BATCH, offset]
    );

    if (res.rows.length === 0) break;

    for (let i = 0; i < res.rows.length; i += INSERT_BATCH) {
      const batch = res.rows.slice(i, i + INSERT_BATCH);
      transferred += await bulkInsert(targetClient, tableName, columns, batch);
    }

    offset += res.rows.length;
    process.stdout.write(`\r   ${offset}/${total} (${Math.round(offset/total*100)}%)`);
  }

  console.log(`\n   ✅ ~${transferred} insérées`);
  return transferred;
}

async function updateColumn(sourceClient, targetClient, tableName, pkCol, updateCol) {
  console.log(`\n🔄 Mise à jour ${tableName}.${updateCol}...`);
  const res = await sourceClient.query(
    `SELECT "${pkCol}", "${updateCol}" FROM "${tableName}" WHERE "${updateCol}" IS NOT NULL`
  );
  let updated = 0;
  for (const row of res.rows) {
    try {
      await targetClient.query(
        `UPDATE "${tableName}" SET "${updateCol}" = $1 WHERE "${pkCol}" = $2`,
        [row[updateCol], row[pkCol]]
      );
      updated++;
    } catch (err) {}
  }
  console.log(`   ✅ ${updated} mis à jour`);
}

async function main() {
  console.log('🚀 Migration des données (bulk insert)...\n');
  const t0 = Date.now();

  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();

  try {
    let grandTotal = 0;

    console.log('=== ÉTAPE 1: Tables sans dépendances ===');
    grandTotal += await copyTable(sourceClient, targetClient, 'sessions');
    grandTotal += await copyTable(sourceClient, targetClient, 'app_settings');
    grandTotal += await copyTable(sourceClient, targetClient, 'sentences');

    console.log('\n=== ÉTAPE 2: Utilisateurs (sans referredBy) ===');
    grandTotal += await copyTable(sourceClient, targetClient, 'users', { excludeColumns: ['referredBy'] });

    console.log('\n=== ÉTAPE 3: Mise à jour referredBy ===');
    await updateColumn(sourceClient, targetClient, 'users', 'id', 'referredBy');

    console.log('\n=== ÉTAPE 4: Tables dépendantes des utilisateurs ===');
    grandTotal += await copyTable(sourceClient, targetClient, 'account_status');
    grandTotal += await copyTable(sourceClient, targetClient, 'bank_cards');
    grandTotal += await copyTable(sourceClient, targetClient, 'bkapay_payments');
    grandTotal += await copyTable(sourceClient, targetClient, 'notifications');
    grandTotal += await copyTable(sourceClient, targetClient, 'referrals');
    grandTotal += await copyTable(sourceClient, targetClient, 'support_messages');
    grandTotal += await copyTable(sourceClient, targetClient, 'transactions');
    grandTotal += await copyTable(sourceClient, targetClient, 'withdrawals');
    grandTotal += await copyTable(sourceClient, targetClient, 'work_progress');
    grandTotal += await copyTable(sourceClient, targetClient, 'identity_verification');

    console.log('\n=== ÉTAPE 5: Tables volumineuses ===');
    grandTotal += await copyTable(sourceClient, targetClient, 'corrections');
    grandTotal += await copyTable(sourceClient, targetClient, 'user_sentence_assignments');

    console.log('\n🔄 Réinitialisation des séquences...');
    const seqRes = await sourceClient.query(`SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'`);
    for (const { sequencename } of seqRes.rows) {
      try {
        const lastValRes = await sourceClient.query(`SELECT last_value, is_called FROM "${sequencename}"`);
        const { last_value, is_called } = lastValRes.rows[0];
        await targetClient.query(`SELECT setval('${sequencename}', ${last_value}, ${is_called})`);
        console.log(`   ✅ ${sequencename} → ${last_value}`);
      } catch (err) {
        console.log(`   ⚠️  ${sequencename}: ${err.message.substring(0, 80)}`);
      }
    }

    const elapsed = Math.round((Date.now() - t0) / 1000);
    const allTables = ['sessions','app_settings','sentences','users','account_status','bank_cards','bkapay_payments','notifications','referrals','support_messages','transactions','withdrawals','work_progress','identity_verification','corrections','user_sentence_assignments'];

    console.log('\n📊 Vérification finale:');
    let allOk = true;
    for (const table of allTables) {
      const src = await sourceClient.query(`SELECT COUNT(*) FROM "${table}"`);
      const tgt = await targetClient.query(`SELECT COUNT(*) FROM "${table}"`);
      const srcCount = src.rows[0].count;
      const tgtCount = tgt.rows[0].count;
      const ok = srcCount === tgtCount ? '✅' : '⚠️ ';
      if (srcCount !== tgtCount) allOk = false;
      console.log(`   ${ok} ${table}: source=${srcCount}, cible=${tgtCount}`);
    }

    console.log(`\n${allOk ? '🎉' : '⚠️ '} Migration terminée en ${elapsed}s! ~${grandTotal} lignes transférées`);

  } catch (err) {
    console.error('\n❌ Erreur fatale:', err.message);
    process.exit(1);
  } finally {
    sourceClient.release();
    targetClient.release();
    await sourcePool.end();
    await targetPool.end();
  }
}

main().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
