'use strict';

const { getSessionUser } = require('../../lib/sessions');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); res.statusCode = 405; return res.end(JSON.stringify({ error: 'Method not allowed.' })); }
  try {
    const user = await getSessionUser(req);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = user ? 200 : 401;
    return res.end(JSON.stringify(user ? { user } : { user: null }));
  } catch (error) {
    console.error('Session lookup error:', error.code || error.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: 'Authentication service is temporarily unavailable.' }));
  }
};
