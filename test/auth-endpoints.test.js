'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const login = require('../api/auth/login');
const me = require('../api/auth/me');
const logout = require('../api/auth/logout');
const studyActivity = require('../api/activity/study');
const quizActivity = require('../api/activity/quiz');
const { requestIsSameOrigin, hashToken, sessionCookie, clearSessionCookie } = require('../lib/sessions');
const { createAuthorizer, requireSameOriginJson } = require('../lib/authorization');

function mockResponse() {
  return {
    headers: {}, statusCode: 200, body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    writeHead(status, headers = {}) { this.statusCode = status; Object.assign(this.headers, Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]))); },
    end(body = '') { this.body = body; }
  };
}

test('session tokens are stored by one-way hash and cookies are HttpOnly and SameSite=Lax', () => {
  const token = 'high-entropy-session-token';
  assert.notEqual(hashToken(token), token);
  const cookie = sessionCookie(token, { headers: { host: 'localhost:3000' } });
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /Secure/);
  assert.match(clearSessionCookie({ headers: {} }), /Max-Age=0/);
});

test('same-origin guard rejects missing, malformed, and foreign origins', () => {
  assert.equal(requestIsSameOrigin({ headers: { host: 'example.test', origin: 'https://example.test' } }), true);
  assert.equal(requestIsSameOrigin({ headers: { host: 'example.test', origin: 'https://attacker.test' } }), false);
  assert.equal(requestIsSameOrigin({ headers: { host: 'example.test' } }), false);
  assert.equal(requestIsSameOrigin({ headers: { host: 'example.test', origin: 'not a URL' } }), false);
});

test('login rejects unsafe request methods and foreign origins before database access', async () => {
  const wrongMethod = mockResponse();
  await login({ method: 'GET', headers: {} }, wrongMethod);
  assert.equal(wrongMethod.statusCode, 405);

  const foreignOrigin = mockResponse();
  await login({ method: 'POST', headers: { origin: 'https://evil.test', host: 'app.test', 'content-type': 'application/json' } }, foreignOrigin);
  assert.equal(foreignOrigin.statusCode, 403);
});

test('auth endpoints reject unsupported methods without touching storage', async () => {
  const meRes = mockResponse();
  await me({ method: 'POST', headers: {} }, meRes);
  assert.equal(meRes.statusCode, 405);

  const logoutRes = mockResponse();
  await logout({ method: 'GET', headers: {} }, logoutRes);
  assert.equal(logoutRes.statusCode, 405);
});

test('study-time writes reject foreign origins before reading a session or database', async () => {
  const res = mockResponse();
  await studyActivity({ method: 'POST', headers: { host: 'nova.test', origin: 'https://attacker.test', 'content-type': 'application/json' } }, res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body, /origin/i);
});

test('quiz attempts reject foreign origins before database access', async () => {
  const res = mockResponse();
  await quizActivity({ method: 'POST', headers: { host: 'nova.test', origin: 'https://attacker.test', 'content-type': 'application/json' } }, res);
  assert.equal(res.statusCode, 403);
});

test('authorization checks verified server identity and role, not request body claims', async () => {
  const studentGuard = createAuthorizer(async () => ({ id: 'u1', role: 'student' }));
  const okRes = mockResponse();
  assert.deepEqual(await studentGuard({ headers: {}, body: { role: 'admin' } }, okRes, ['student']), { id: 'u1', role: 'student' });

  const deniedRes = mockResponse();
  assert.equal(await studentGuard({ headers: {}, body: { role: 'admin' } }, deniedRes, ['admin']), null);
  assert.equal(deniedRes.statusCode, 403);

  const anonymousGuard = createAuthorizer(async () => null);
  const anonymousRes = mockResponse();
  assert.equal(await anonymousGuard({ headers: {} }, anonymousRes, ['student']), null);
  assert.equal(anonymousRes.statusCode, 401);
});

test('mutating JSON APIs require a same-origin request and JSON content type', () => {
  const res = mockResponse();
  assert.equal(requireSameOriginJson({ headers: { host: 'app.test', origin: 'https://app.test', 'content-type': 'application/json' } }, res), true);
  const badOrigin = mockResponse();
  assert.equal(requireSameOriginJson({ headers: { host: 'app.test', origin: 'https://evil.test', 'content-type': 'application/json' } }, badOrigin), false);
  assert.equal(badOrigin.statusCode, 403);
  const badType = mockResponse();
  assert.equal(requireSameOriginJson({ headers: { host: 'app.test', origin: 'https://app.test', 'content-type': 'text/plain' } }, badType), false);
  assert.equal(badType.statusCode, 415);
});
