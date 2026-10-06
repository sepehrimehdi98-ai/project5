'use strict';

const { query, getPool } = require('../lib/database');
const { hashPassword } = require('../lib/passwords');

async function main() {
  const username = String(process.env.BOOTSTRAP_ADMIN_USERNAME || '').trim();
  const displayName = String(process.env.BOOTSTRAP_ADMIN_NAME || 'Platform administrator').trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!username || username.length > 80 || !password) throw new Error('Set BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD in the server environment.');
  const passwordHash = await hashPassword(password);
  const result = await query(
    `INSERT INTO users(username, display_name, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (username_normalized) DO NOTHING
     RETURNING id`,
    [username, displayName || 'Platform administrator', passwordHash]
  );
  if (!result.rowCount) throw new Error('That username already exists. Use the authenticated admin account-management flow to change it.');
  await query('DELETE FROM login_throttles WHERE updated_at < now() - interval \'1 day\'').catch(() => {});
  await getPool().end();
  process.stdout.write(`Initial admin account created for ${username}. Remove the bootstrap variables from the environment now.\n`);
}

main().catch(async error => {
  console.error('Admin bootstrap failed:', error.code || error.message);
  try { await getPool().end(); } catch {}
  process.exitCode = 1;
});
