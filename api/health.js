'use strict';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); res.statusCode = 405; return res.end(JSON.stringify({ error: 'Method not allowed.' })); }
  res.statusCode = 200;
  return res.end(JSON.stringify({ ok: true, backend: 'vercel-functions', databaseConfigured: Boolean(process.env.DATABASE_URL) }));
};
