'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { query, getPool } = require('../lib/database');

async function main() {
  const schema = await fs.readFile(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await query(schema);
  await getPool().end();
  process.stdout.write('PostgreSQL schema applied successfully.\n');
}

main().catch(error => {
  console.error('Database migration failed:', error.code || error.message);
  process.exitCode = 1;
});
