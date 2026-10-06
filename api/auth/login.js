'use strict';

const { query } = require('../../lib/database');
const { hashPassword, verifyPassword } = require('../../lib/passwords');
const { createSession, getSessionUser, requestIsSameOrigin } = require('../../lib/sessions');
const crypto = require('node:crypto');
const { isDemoMode, authenticateDemo, DEMO_USERS } = require('../../lib/demo-auth');
const { resolveCourseScope, SUBJECTS } = require('../../lib/course-scope');

const MAX_FAILURES = 8;
const WINDOW_MINUTES = 15;
const DUMMY_PASSWORD_HASH = hashPassword(crypto.randomBytes(32).toString('base64url'));

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  let parsedBody;
  try { parsedBody = req.body; }
  catch { return Promise.reject(Object.assign(new Error('Invalid JSON.'), { status: 400 })); }
  if (parsedBody !== undefined && parsedBody !== null) {
    try {
      const body = typeof parsedBody === 'string' ? JSON.parse(parsedBody || '{}') : parsedBody;
      if (Buffer.byteLength(JSON.stringify(body)) > 8192) throw Object.assign(new Error('Request too large.'), { status: 413 });
      return Promise.resolve(body && typeof body === 'object' && !Array.isArray(body) ? body : {});
    } catch (error) { return Promise.reject(error.status ? error : Object.assign(new Error('Invalid JSON.'), { status: 400 })); }
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (Buffer.byteLength(raw) > 8192) { reject(Object.assign(new Error('Request too large.'), { status: 413 })); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch { reject(Object.assign(new Error('Invalid JSON.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function throttleKey(username, req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map(value => value.trim()).filter(Boolean);
  const address = String(req.headers['x-real-ip'] || forwarded.at(-1) || req.socket?.remoteAddress || 'unknown').slice(0, 80);
  return crypto.createHash('sha256').update(`${String(username || '').trim().toLowerCase()}|${address}`).digest('hex');
}

async function isThrottled(key) {
  const result = await query('SELECT blocked_until > now() AS blocked FROM login_throttles WHERE key_hash = $1', [key]);
  return result.rows[0]?.blocked === true;
}

async function recordFailure(key) {
  await query(
    `INSERT INTO login_throttles(key_hash, window_started_at, failures, blocked_until)
     VALUES ($1, now(), 1, NULL)
     ON CONFLICT (key_hash) DO UPDATE SET
       failures = CASE WHEN login_throttles.window_started_at < now() - ($2 * interval '1 minute') THEN 1 ELSE login_throttles.failures + 1 END,
       window_started_at = CASE WHEN login_throttles.window_started_at < now() - ($2 * interval '1 minute') THEN now() ELSE login_throttles.window_started_at END,
       blocked_until = CASE
         WHEN login_throttles.window_started_at < now() - ($2 * interval '1 minute') THEN NULL
         WHEN login_throttles.failures + 1 >= $3 THEN now() + ($2 * interval '1 minute')
         ELSE login_throttles.blocked_until END,
       updated_at = now()`,
    [key, WINDOW_MINUTES, MAX_FAILURES]
  );
}

async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  if (!requestIsSameOrigin(req)) return send(res, 403, { error: 'Request origin could not be verified.' });
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return send(res, 415, { error: 'JSON content type required.' });
  try {
    const activeUser = await getSessionUser(req);
    if (activeUser) return send(res, 409, { error: 'برای انتخاب مسیر یا حساب دیگر، ابتدا از حساب فعلی خارج شوید.' });
    const body = await readJson(req);
    const subject = String(body.subject || '');
    if (!SUBJECTS.includes(subject)) return send(res, 400, { error: 'ابتدا مسیر پایتون یا انگلیسی را انتخاب کنید.' });
    const username = String(body.username || '').trim();
    const password = typeof body.password === 'string' ? body.password : '';
    if (isDemoMode() && ['student', 'teacher', 'admin'].includes(body.demoRole)) {
      const demoUser = DEMO_USERS.find(item => item.role === body.demoRole);
      if (!demoUser) return send(res, 401, { error: 'Demo role is unavailable.' });
      const scope = { courseId: `demo-${subject}`, courseSubject: subject };
      const session = await createSession(demoUser.id, req, scope);
      return send(res, 200, { user: { id: demoUser.id, username: demoUser.username, name: demoUser.name, role: demoUser.role, ...scope } }, { 'Set-Cookie': session.cookie });
    }
    if (!username || username.length > 80 || !password || password.length > 256) return send(res, 400, { error: 'Enter a valid username and password.' });
    if (isDemoMode()) {
      const demoUser = authenticateDemo(username, password);
      if (!demoUser) return send(res, 401, { error: 'Username or password is incorrect.' });
      const scope = { courseId: `demo-${subject}`, courseSubject: subject };
      const session = await createSession(demoUser.id, req, scope);
      return send(res, 200, { user: { id: demoUser.id, username: demoUser.username, name: demoUser.name, role: demoUser.role, ...scope } }, { 'Set-Cookie': session.cookie });
    }
    const key = throttleKey(username, req);
    if (await isThrottled(key)) return send(res, 429, { error: 'Too many sign-in attempts. Try again in 15 minutes.' }, { 'Retry-After': String(WINDOW_MINUTES * 60) });
    const result = await query('SELECT id, username, display_name, role, password_hash, is_active FROM users WHERE username_normalized = lower(trim($1)) LIMIT 1', [username]);
    const user = result.rows[0];
    const candidateHash = user?.password_hash || await DUMMY_PASSWORD_HASH;
    const passwordMatches = await verifyPassword(password, candidateHash);
    const valid = Boolean(user && user.is_active && passwordMatches);
    if (!valid) {
      await recordFailure(key);
      return send(res, 401, { error: 'Username or password is incorrect.' });
    }
    await query('DELETE FROM login_throttles WHERE key_hash = $1', [key]);
    const scope = await resolveCourseScope(user, subject);
    const session = await createSession(user.id, req, scope);
    return send(res, 200, { user: { id: user.id, username: user.username, name: user.display_name, role: user.role, ...scope } }, { 'Set-Cookie': session.cookie });
  } catch (error) {
    console.error('Sign-in error:', error.code || error.message);
    return send(res, error.status || 503, { error: error.status ? error.message : 'Sign-in service is temporarily unavailable.' });
  }
}

module.exports = handler;
