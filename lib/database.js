'use strict';

require('./load-env');

let pool;

function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL is required for persistent backend storage.');
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }
  // Lazy loading lets the UI and offline tests run without opening a DB connection.
  const { Pool } = require('pg');
  const sslMode = process.env.DATABASE_SSL || 'require';
  if (!['require', 'verify-full', 'disable'].includes(sslMode)) {
    const error = new Error('DATABASE_SSL must be require, verify-full, or disable.');
    error.code = 'INVALID_DATABASE_SSL_MODE';
    throw error;
  }
  if ((process.env.NODE_ENV === 'production' || process.env.VERCEL) && sslMode === 'disable') {
    const error = new Error('DATABASE_SSL=disable is forbidden in production.');
    error.code = 'INSECURE_DATABASE_TRANSPORT';
    throw error;
  }
  const ca = process.env.DATABASE_CA_CERT;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Vercel functions use one client connection per warm instance; Supabase
    // transaction-pooler URLs should therefore stay at a single client here.
    max: process.env.VERCEL ? 1 : 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: sslMode === 'disable' ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) }
  });
  pool.on('error', error => console.error('Unexpected PostgreSQL pool error:', error.message));
  return pool;
}

async function query(text, values = []) {
  return getPool().query(text, values);
}

async function transaction(work) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { getPool, query, transaction };
