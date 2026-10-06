'use strict';

const { deleteSession, clearSessionCookie, requestIsSameOrigin } = require('../../lib/sessions');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.statusCode = 405; return res.end(JSON.stringify({ error: 'Method not allowed.' })); }
  if (!requestIsSameOrigin(req)) { res.statusCode = 403; return res.end(JSON.stringify({ error: 'Request origin could not be verified.' })); }
  try {
    await deleteSession(req);
    res.setHeader('Set-Cookie', clearSessionCookie(req));
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    console.error('Sign-out error:', error.code || error.message);
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: 'Authentication service is temporarily unavailable.' }));
  }
};
