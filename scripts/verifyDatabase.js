require('dotenv').config();
const { sequelize } = require('../config/database');

const EXPECTED_TABLES = [
  'users',
  'merchants',
  'merchant_wallets',
  'invoices',
  'exchange_quotes',
  'payments',
  'settlements',
  'webhook_events',
  'audit_logs'
];

const EXPECTED_FOREIGN_KEYS = [
  { table: 'merchants', column: 'user_id', referencedTable: 'users', referencedColumn: 'user_id' },
  { table: 'merchant_wallets', column: 'merchant_id', referencedTable: 'merchants', referencedColumn: 'merchant_id' },
  { table: 'invoices', column: 'merchant_id', referencedTable: 'merchants', referencedColumn: 'merchant_id' },
  { table: 'exchange_quotes', column: 'invoice_id', referencedTable: 'invoices', referencedColumn: 'invoice_id' },
  { table: 'payments', column: 'invoice_id', referencedTable: 'invoices', referencedColumn: 'invoice_id' },
  { table: 'settlements', column: 'merchant_id', referencedTable: 'merchants', referencedColumn: 'merchant_id' },
  { table: 'settlements', column: 'payment_id', referencedTable: 'payments', referencedColumn: 'payment_id' },
  { table: 'audit_logs', column: 'user_id', referencedTable: 'users', referencedColumn: 'user_id' }
];

async function verifyDatabase() {
  try {
    const dbName = process.env.DB_NAME;
    console.log('VERIFYING DATABASE SCHEMA FOR:', dbName);

    const [tables] = await sequelize.query(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME`,
      { replacements: [dbName] }
    );

    const tableNames = tables.map((t) => t.TABLE_NAME);
    const missingTables = EXPECTED_TABLES.filter((table) => !tableNames.includes(table));
    const unexpectedTables = tableNames.filter((table) => !EXPECTED_TABLES.includes(table));

    console.log('Tables present:', tableNames.join(', '));
    console.log('Missing expected tables:', missingTables.length ? missingTables.join(', ') : 'none');
    console.log('Unexpected tables:', unexpectedTables.length ? unexpectedTables.join(', ') : 'none');

    const [constraints] = await sequelize.query(
      `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ?
         AND REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION`,
      { replacements: [dbName] }
    );

    const missingFks = EXPECTED_FOREIGN_KEYS.filter((expectedFk) => {
      return !constraints.some((actualFk) => {
        return (
          actualFk.TABLE_NAME === expectedFk.table &&
          actualFk.COLUMN_NAME === expectedFk.column &&
          actualFk.REFERENCED_TABLE_NAME === expectedFk.referencedTable &&
          actualFk.REFERENCED_COLUMN_NAME === expectedFk.referencedColumn
        );
      });
    });

    console.log('Foreign key count:', constraints.length);
    console.log('Missing expected foreign keys:', missingFks.length ? JSON.stringify(missingFks, null, 2) : 'none');

    const [indexes] = await sequelize.query(
      `SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
      { replacements: [dbName] }
    );

    const duplicateIndexRows = [];
    const seen = new Set();
    for (const indexRow of indexes) {
      const signature = [
        indexRow.TABLE_NAME,
        indexRow.INDEX_NAME,
        indexRow.COLUMN_NAME,
        indexRow.SEQ_IN_INDEX
      ].join('|');

      if (seen.has(signature)) {
        duplicateIndexRows.push(indexRow);
      }
      seen.add(signature);
    }

    console.log('Index row count:', indexes.length);
    console.log('Duplicate index rows:', duplicateIndexRows.length ? JSON.stringify(duplicateIndexRows, null, 2) : 'none');

    if (missingTables.length || missingFks.length) {
      console.error('Schema verification failed.');
      process.exitCode = 1;
      return;
    }

    console.log('DATABASE VERIFICATION COMPLETE: OK');
  } catch (error) {
    console.error('Failed to verify database schema:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

verifyDatabase();
