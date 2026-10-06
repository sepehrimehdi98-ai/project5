'use strict';

const { getSessionUser, requestIsSameOrigin } = require('./sessions');

function json(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  });
  res.end(JSON.stringify(body));
}

function createAuthorizer(loadUser = getSessionUser) {
  return async function authorize(req, res, allowedRoles = []) {
    let user;
    try { user = await loadUser(req); }
    catch (error) {
      console.error('Authorization lookup failed:', error.code || error.message);
      json(res, 503, { error: 'Authentication service is temporarily unavailable.' });
      return null;
    }
    if (!user) {
      json(res, 401, { error: 'Sign in is required.' });
      return null;
    }
    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      json(res, 403, { error: 'You do not have permission to perform this action.' });
      return null;
    }
    return user;
  };
}

function requireSameOriginJson(req, res) {
  if (!requestIsSameOrigin(req)) {
    json(res, 403, { error: 'Request origin could not be verified.' });
    return false;
  }
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    json(res, 415, { error: 'JSON content type required.' });
    return false;
  }
  return true;
}

module.exports = { json, createAuthorizer, requireSameOriginJson };
