require('dotenv').config();
const fs = require('fs');
const { sequelize } = require('../config/database');

(async () => {
  try {
    const db = process.env.DB_NAME;

    const [tables] = await sequelize.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
      { replacements: [db] }
    );
    console.log('TABLES:', tables.map((t) => t.TABLE_NAME).join(', '));

    const [cols] = await sequelize.query(
      `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME, ORDINAL_POSITION`,
      { replacements: [db] }
    );
    fs.writeFileSync('tmp_schema_columns.json', JSON.stringify(cols, null, 2));

    const [fks] = await sequelize.query(
      `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION`,
      { replacements: [db] }
    );
    fs.writeFileSync('tmp_schema_fks.json', JSON.stringify(fks, null, 2));

    const [idx] = await sequelize.query(
      `SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, COLUMN_NAME, SEQ_IN_INDEX
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
      { replacements: [db] }
    );
    fs.writeFileSync('tmp_schema_indexes.json', JSON.stringify(idx, null, 2));

    console.log('WROTE tmp_schema_columns.json:', cols.length);
    console.log('WROTE tmp_schema_fks.json:', fks.length);
    console.log('WROTE tmp_schema_indexes.json:', idx.length);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
