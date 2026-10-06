'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

test('server-bound course claim blocks AI, upload-sign, and a second login from switching course', async () => {
  const previousDemo = process.env.NOVA_DEMO_MODE;
  const previousDatabase = process.env.DATABASE_URL;
  const previousVercel = process.env.VERCEL;
  process.env.NOVA_DEMO_MODE = 'true';
  delete process.env.DATABASE_URL;
  delete process.env.VERCEL;
  const app = require('../server');
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const origin = base;
  let cookie = '';
  try {
    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ demoRole: 'teacher', subject: 'python' }) });
    assert.equal(login.status, 200);
    cookie = login.headers.get('set-cookie').split(';')[0];

    const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } });
    const user = (await me.json()).user;
    assert.equal(user.courseSubject, 'python');
    assert.equal(user.courseId, 'demo-python');

    const headers = { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' };
    const aiSwitch = await fetch(`${base}/api/ai`, { method: 'POST', headers, body: JSON.stringify({ mode: 'teacher', role: 'teacher', subject: 'english', lessonId: 'en-l1-1', topic: 'present tense' }) });
    assert.equal(aiSwitch.status, 403);

    const uploadSwitch = await fetch(`${base}/api/media/sign`, { method: 'POST', headers, body: JSON.stringify({ resourceType: 'video', subject: 'english', lessonId: 'en-l1-1' }) });
    assert.equal(uploadSwitch.status, 403);

    const secondLogin = await fetch(`${base}/api/auth/login`, { method: 'POST', headers, body: JSON.stringify({ demoRole: 'teacher', subject: 'english' }) });
    assert.equal(secondLogin.status, 409);

    const logout = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers });
    assert.equal(logout.status, 200);
    const englishLogin = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ demoRole: 'teacher', subject: 'english' }) });
    assert.equal(englishLogin.status, 200);
    const englishCookie = englishLogin.headers.get('set-cookie').split(';')[0];
    const englishMe = await fetch(`${base}/api/auth/me`, { headers: { Cookie: englishCookie } });
    assert.equal((await englishMe.json()).user.courseSubject, 'english');
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (previousDemo === undefined) delete process.env.NOVA_DEMO_MODE; else process.env.NOVA_DEMO_MODE = previousDemo;
    if (previousDatabase === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previousDatabase;
    if (previousVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previousVercel;
  }
});
