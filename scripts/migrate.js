const { Pool } = require('pg');

const SOURCE_URL = process.env.DATABASE_URL;
const TARGET_URL = 'postgresql://neondb_owner:npg_A6ZOS2tVfNiQ@ep-billowing-fire-anct7mfk-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const BATCH_SIZE = 500;

const sourcePool = new Pool({ connectionString: SOURCE_URL, ssl: { rejectUnauthorized: false } });
const targetPool = new Pool({ connectionString: TARGET_URL, ssl: { rejectUnauthorized: false } });

async function getTableSchema(client, tableName) {
  const res = await client.query(`
    SELECT column_name, data_type, character_maximum_length, column_default, is_nullable, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return res.rows;
}

async function getCreateTableSQL(sourceClient, tableName) {
  const res = await sourceClient.query(`
    SELECT pg_get_tabledef('public', $1)
  `, [tableName]).catch(() => null);
  return res;
}

async function getTablesInOrder(client) {
  const res = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return res.rows.map(r => r.table_name);
}

async function getSequences(client) {
  const res = await client.query(`
    SELECT sequence_name, last_value FROM information_schema.sequences 
    WHERE sequence_schema = 'public'
  `).catch(() => ({ rows: [] }));
  return res.rows;
}

async function copyTable(sourceClient, targetClient, tableName) {
  console.log(`\n📋 Table: ${tableName}`);

  const countRes = await sourceClient.query(`SELECT COUNT(*) FROM "${tableName}"`);
  const total = parseInt(countRes.rows[0].count);
  console.log(`   Total rows: ${total}`);

  if (total === 0) {
    console.log(`   ⏭️  Empty table, skipping`);
    return;
  }

  let offset = 0;
  let transferred = 0;

  while (offset < total) {
    const res = await sourceClient.query(`SELECT * FROM "${tableName}" ORDER BY 1 LIMIT $1 OFFSET $2`, [BATCH_SIZE, offset]);
    const rows = res.rows;

    if (rows.length === 0) break;

    const columns = Object.keys(rows[0]);
    const colList = columns.map(c => `"${c}"`).join(', ');

    for (const row of rows) {
      const values = columns.map(c => row[c]);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      try {
        await targetClient.query(
          `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
      } catch (err) {
        console.log(`   ⚠️  Row error in ${tableName}: ${err.message.substring(0, 100)}`);
      }
    }

    offset += rows.length;
    transferred += rows.length;
    process.stdout.write(`\r   Progress: ${transferred}/${total} (${Math.round(transferred/total*100)}%)`);
  }

  console.log(`\n   ✅ Done: ${transferred} rows`);
}

async function getFullSchema(sourceClient) {
  const res = await sourceClient.query(`
    SELECT pg_dump_schema_as_sql()
  `).catch(() => null);
  return res;
}

async function createTablesFromSource(sourceClient, targetClient) {
  console.log('\n🏗️  Creating schema in target database...');

  const ddlRes = await sourceClient.query(`
    SELECT 
      'CREATE TABLE IF NOT EXISTS ' || quote_ident(t.table_name) || ' (' ||
      string_agg(
        quote_ident(c.column_name) || ' ' ||
        CASE 
          WHEN c.column_default LIKE 'nextval%' THEN
            CASE c.data_type
              WHEN 'integer' THEN 'SERIAL'
              WHEN 'bigint' THEN 'BIGSERIAL'
              ELSE 'SERIAL'
            END
          WHEN c.data_type = 'character varying' THEN 'VARCHAR(' || COALESCE(c.character_maximum_length::text, '255') || ')'
          WHEN c.data_type = 'character' THEN 'CHAR(' || COALESCE(c.character_maximum_length::text, '1') || ')'
          WHEN c.data_type = 'ARRAY' THEN c.udt_name || '[]'
          ELSE c.data_type
        END ||
        CASE WHEN c.is_nullable = 'NO' AND c.column_default NOT LIKE 'nextval%' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN c.column_default IS NOT NULL AND c.column_default NOT LIKE 'nextval%' THEN ' DEFAULT ' || c.column_default ELSE '' END,
        ', ' ORDER BY c.ordinal_position
      ) || ');' AS create_sql,
      t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name
    ORDER BY t.table_name
  `);

  for (const row of ddlRes.rows) {
    try {
      await targetClient.query(row.create_sql);
      console.log(`   ✅ Table created: ${row.table_name}`);
    } catch (err) {
      console.log(`   ⚠️  Table ${row.table_name}: ${err.message.substring(0, 150)}`);
    }
  }
}

async function main() {
  console.log('🚀 Starting full database migration...');
  console.log(`Source: ${SOURCE_URL.substring(0, 50)}...`);
  console.log(`Target: ${TARGET_URL.substring(0, 50)}...`);

  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();

  try {
    await createTablesFromSource(sourceClient, targetClient);

    const tables = await getTablesInOrder(sourceClient);
    console.log(`\n📊 Tables to migrate: ${tables.join(', ')}`);

    const orderedTables = [
      'sessions',
      'users',
      'app_settings',
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

    const remainingTables = tables.filter(t => !orderedTables.includes(t));
    const allTables = [...orderedTables, ...remainingTables];

    await targetClient.query('BEGIN');

    for (const tableName of allTables) {
      if (!tables.includes(tableName)) continue;
      await copyTable(sourceClient, targetClient, tableName);
    }

    await targetClient.query('COMMIT');

    console.log('\n\n🔄 Syncing sequences...');
    const seqRes = await sourceClient.query(`
      SELECT 
        sequence_name,
        start_value,
        last_value,
        increment_by
      FROM information_schema.sequences s
      LEFT JOIN pg_sequences ps ON ps.sequencename = s.sequence_name AND ps.schemaname = 'public'
      WHERE s.sequence_schema = 'public'
    `);

    for (const seq of seqRes.rows) {
      try {
        const srcSeq = await sourceClient.query(`SELECT last_value FROM "${seq.sequence_name}"`);
        const lastVal = srcSeq.rows[0]?.last_value;
        if (lastVal) {
          await targetClient.query(`SELECT setval('${seq.sequence_name}', ${lastVal}, true)`);
          console.log(`   ✅ Sequence ${seq.sequence_name} set to ${lastVal}`);
        }
      } catch (err) {
        console.log(`   ⚠️  Sequence ${seq.sequence_name}: ${err.message.substring(0, 80)}`);
      }
    }

    console.log('\n\n✅ Migration completed successfully!');

    console.log('\n📊 Verification - Row counts in target:');
    for (const t of allTables) {
      if (!tables.includes(t)) continue;
      const r = await targetClient.query(`SELECT COUNT(*) FROM "${t}"`);
      console.log(`   ${t}: ${r.rows[0].count} rows`);
    }

  } catch (err) {
    await targetClient.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    sourceClient.release();
    targetClient.release();
    await sourcePool.end();
    await targetPool.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
