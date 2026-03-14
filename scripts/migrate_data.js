const { Pool } = require('pg');

const SOURCE_URL = process.env.DATABASE_URL;
const TARGET_URL = 'postgresql://neondb_owner:npg_A6ZOS2tVfNiQ@ep-billowing-fire-anct7mfk-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const BATCH_SIZE = 1000;

const sourcePool = new Pool({ connectionString: SOURCE_URL, ssl: { rejectUnauthorized: false } });
const targetPool = new Pool({ connectionString: TARGET_URL, ssl: { rejectUnauthorized: false } });

const ORDERED_TABLES = [
  'sessions',
  'app_settings',
  'users',
  'sentences',
  'account_status',
  'bank_cards',
  'bkapay_payments',
  'notifications',
  'referrals',
  'support_messages',
  'transactions',
  'withdrawals',
  'work_progress',
  'corrections',
  'user_sentence_assignments',
  'identity_verification',
];

async function copyTable(sourceClient, targetClient, tableName) {
  const countRes = await sourceClient.query(`SELECT COUNT(*) FROM "${tableName}"`);
  const total = parseInt(countRes.rows[0].count);
  console.log(`\n📋 ${tableName}: ${total} rows`);

  if (total === 0) {
    console.log(`   ⏭️  Empty, skipping`);
    return 0;
  }

  const schemaRes = await sourceClient.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  const columns = schemaRes.rows.map(r => r.column_name);
  const colList = columns.map(c => `"${c}"`).join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

  let offset = 0;
  let transferred = 0;
  let errors = 0;

  while (offset < total) {
    const res = await sourceClient.query(
      `SELECT ${colList} FROM "${tableName}" LIMIT $1 OFFSET $2`,
      [BATCH_SIZE, offset]
    );

    if (res.rows.length === 0) break;

    for (const row of res.rows) {
      const values = columns.map(c => row[c]);
      try {
        await targetClient.query(
          `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
        transferred++;
      } catch (err) {
        errors++;
        if (errors <= 3) {
          console.log(`\n   ⚠️  ${err.message.substring(0, 120)}`);
        }
      }
    }

    offset += res.rows.length;
    process.stdout.write(`\r   ${transferred}/${total} (${Math.round(transferred/total*100)}%) | errors: ${errors}`);
  }

  console.log(`\n   ✅ ${transferred} transférées, ${errors} erreurs`);
  return transferred;
}

async function main() {
  console.log('🚀 Démarrage de la migration des données...\n');

  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();

  try {
    console.log('🔓 Désactivation temporaire des contraintes FK...');
    await targetClient.query('SET session_replication_role = replica');

    const tablesRes = await sourceClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const existingTables = new Set(tablesRes.rows.map(r => r.table_name));

    const tablesToMigrate = [
      ...ORDERED_TABLES.filter(t => existingTables.has(t)),
      ...[...existingTables].filter(t => !ORDERED_TABLES.includes(t))
    ];

    let grandTotal = 0;
    for (const table of tablesToMigrate) {
      grandTotal += await copyTable(sourceClient, targetClient, table);
    }

    console.log('\n🔄 Réinitialisation des séquences...');
    const seqRes = await sourceClient.query(`
      SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    `);

    for (const { sequencename } of seqRes.rows) {
      try {
        const lastValRes = await sourceClient.query(`SELECT last_value, is_called FROM "${sequencename}"`);
        const { last_value, is_called } = lastValRes.rows[0];
        await targetClient.query(`SELECT setval('${sequencename}', ${last_value}, ${is_called})`);
        console.log(`   ✅ ${sequencename} → ${last_value}`);
      } catch (err) {
        console.log(`   ⚠️  ${sequencename}: ${err.message.substring(0, 60)}`);
      }
    }

    console.log('\n🔒 Réactivation des contraintes FK...');
    await targetClient.query('SET session_replication_role = DEFAULT');

    console.log('\n📊 Vérification finale:');
    for (const table of tablesToMigrate) {
      const src = await sourceClient.query(`SELECT COUNT(*) FROM "${table}"`);
      const tgt = await targetClient.query(`SELECT COUNT(*) FROM "${table}"`);
      const srcCount = src.rows[0].count;
      const tgtCount = tgt.rows[0].count;
      const ok = srcCount === tgtCount ? '✅' : '⚠️ ';
      console.log(`   ${ok} ${table}: source=${srcCount}, cible=${tgtCount}`);
    }

    console.log(`\n✅ Migration terminée! Total: ${grandTotal} lignes transférées`);

  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    await targetClient.query('SET session_replication_role = DEFAULT').catch(() => {});
    throw err;
  } finally {
    sourceClient.release();
    targetClient.release();
    await sourcePool.end();
    await targetPool.end();
  }
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
