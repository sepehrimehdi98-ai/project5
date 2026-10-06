'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { query, getPool } = require('../lib/database');

async function main() {
  const sql = await fs.readFile(path.join(__dirname, '..', 'db', 'seed-courses.sql'), 'utf8');
  await query(sql);
  await getPool().end();
  process.stdout.write('Python and English starter courses were added without changing existing records.\n');
}

main().catch(error => {
  console.error('Course seed failed:', error.code || error.message);
  process.exitCode = 1;
});
