'use strict';

const crypto = require('node:crypto');
const { query } = require('./database');
const { isDemoMode, getDemoSessionSecret, findDemoUser } = require('./demo-auth');

const COOKIE_NAME = 'nova_session';
const SESSION_HOURS = 12;
function signDemoPayload(encoded) {
  return crypto.createHmac('sha256', getDemoSessionSecret()).update(encoded).digest('base64url');
}

function makeDemoToken(user, courseSubject, expiresAt) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id, username: user.username, name: user.name, role: user.role,
    courseSubject, courseId: `demo-${courseSubject}`, exp: Math.floor(expiresAt.getTime() / 1000),
    nonce: crypto.randomBytes(12).toString('base64url')
  })).toString('base64url');
  return `${payload}.${signDemoPayload(payload)}`;
}

function readDemoToken(token) {
  if (!getDemoSessionSecret() || typeof token !== 'string' || token.length > 2048) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(signDemoPayload(payload));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;
  try {
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!['student', 'teacher', 'admin'].includes(user.role) || !['python', 'english'].includes(user.courseSubject)) return null;
    if (!user.id || !user.username || !Number.isInteger(user.exp) || user.exp <= Math.floor(Date.now() / 1000)) return null;
    if (user.courseId !== `demo-${user.courseSubject}`) return null;
    return { id: user.id, username: user.username, name: user.name, role: user.role, courseSubject: user.courseSubject, courseId: user.courseId };
  } catch { return null; }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function readCookie(req, name = COOKIE_NAME) {
  const header = String(req.headers.cookie || '');
  for (const item of header.split(';')) {
    const index = item.indexOf('=');
    if (index < 0 || item.slice(0, index).trim() !== name) continue;
    try { return decodeURIComponent(item.slice(index + 1).trim()); } catch { return null; }
  }
  return null;
}

function sessionCookie(token, req) {
  const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const attrs = [`${COOKIE_NAME}=${encodeURIComponent(token)}`, 'Path=/', `Max-Age=${SESSION_HOURS * 60 * 60}`, 'HttpOnly', 'SameSite=Lax'];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

function clearSessionCookie(req) {
  const attrs = [`${COOKIE_NAME}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax'];
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) attrs.push('Secure');
  return attrs.join('; ');
}

async function createSession(userId, req, courseScope = {}) {
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  if (isDemoMode()) {
    const user = findDemoUser(userId);
    if (!user) throw new Error('Demo user not found.');
    if (!['python', 'english'].includes(courseScope.courseSubject)) throw new Error('A learning path must be selected before sign-in.');
    const token = makeDemoToken(user, courseScope.courseSubject, expiresAt);
    return { token, cookie: sessionCookie(token, req), expiresAt };
  }
  const token = crypto.randomBytes(32).toString('base64url');
  if (!['python', 'english'].includes(courseScope.courseSubject) || !courseScope.courseId) throw new Error('A learning path must be selected before sign-in.');
  await query('INSERT INTO sessions(user_id, token_hash, expires_at, course_id, course_subject) VALUES ($1, $2, $3, $4, $5)', [userId, hashToken(token), expiresAt, courseScope.courseId, courseScope.courseSubject]);
  return { token, cookie: sessionCookie(token, req), expiresAt };
}

async function getSessionUser(req) {
  const token = readCookie(req);
  if (!token || token.length > 2048) return null;
  if (isDemoMode()) return readDemoToken(token);
  const result = await query(
    `SELECT u.id, u.username, u.display_name, u.role, s.course_id, s.course_subject
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.is_active = true`,
    [hashToken(token)]
  );
  if (!result.rows[0]) return null;
  await query('UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1', [hashToken(token)]);
  const { id, username, display_name, role, course_id, course_subject } = result.rows[0];
  if (!course_id || !['python', 'english'].includes(course_subject)) return null;
  return { id, username, name: display_name, role, courseId: course_id, courseSubject: course_subject };
}

async function deleteSession(req) {
  const token = readCookie(req);
  if (isDemoMode()) return;
  if (token && token.length <= 128) await query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

function requestIsSameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return false;
  try { return new URL(origin).host.toLowerCase() === String(host).toLowerCase(); }
  catch { return false; }
}

module.exports = { COOKIE_NAME, SESSION_HOURS, hashToken, readCookie, sessionCookie, clearSessionCookie, createSession, getSessionUser, deleteSession, requestIsSameOrigin };

