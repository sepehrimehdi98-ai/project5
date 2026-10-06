'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('portable PostgreSQL schema includes the platform records and foreign-key relationships', () => {
  const schema = fs.readFileSync(path.join(root, 'db', 'schema.sql'), 'utf8');
  for (const table of ['users', 'sessions', 'courses', 'course_teachers', 'enrollments', 'lessons', 'quizzes', 'quiz_attempts', 'lesson_progress', 'study_sessions', 'teacher_sources', 'teacher_guidance', 'media_assets', 'login_throttles']) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\(`, 'i'), `missing ${table} table`);
  }
  assert.match(schema, /REFERENCES users\(id\) ON DELETE CASCADE/i);
  assert.match(schema, /REFERENCES lessons\(id\) ON DELETE CASCADE/i);
  assert.match(schema, /UNIQUE \(username_normalized\)/i);
  assert.match(schema, /CHECK \(role IN \('student', 'teacher', 'admin'\)\)/i);
  assert.match(schema, /storage_provider text NOT NULL DEFAULT 'cloudinary'/i);
  assert.match(schema, /provider_asset_id text NOT NULL/i);
});

test('course records can distinguish Python and English in the shared database', () => {
  const schema = fs.readFileSync(path.join(root, 'db', 'schema.sql'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'src', 'App.tsx'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const adapters = fs.readFileSync(path.join(root, 'lib', 'course-adapters.js'), 'utf8');
  assert.match(schema, /subject text NOT NULL DEFAULT 'python' CHECK \(subject IN \('python', 'english'\)\)/i);
  assert.match(schema, /target_language text NOT NULL/i);
  assert.match(schema, /instruction_language text NOT NULL/i);
  assert.match(schema, /course_subject text CHECK \(course_subject IN \('python', 'english'\)\)/i);
  assert.match(app, /user\?\.courseSubject\?\?path/);
  assert.match(app, /مسیر قفل‌شده تا خروج از حساب/);
  assert.match(server, /body\.subject = user\.courseSubject/);
  assert.match(server, /resolveScopedLesson/);
  assert.match(adapters, /COURSE_ADAPTERS/);
  assert.match(adapters, /هیچ‌وقت sandbox را فراخوانی نکن/);
});

test('page motion respects reduced-motion settings and does not require animation libraries', () => {
  const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
  assert.match(css, /@keyframes rahcode-enter/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /animation:\s*none\s*!important/);
  assert.doesNotMatch(css, /@import\s+url\([^)]*(?:gsap|animate\.css)/i);
});

test('first-login walkthrough has separate guidance for all three roles and honors reduced motion', () => {
  const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
  for (const role of ['student', 'teacher', 'admin']) assert.match(app, new RegExp(`${role}:\\[`));
  assert.match(app, /nova-tour-seen:/);
  assert.match(app, /api\('\/api\/activity\/study'/);
  assert.match(css, /nova-tour-focus/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)[^{]*\{[^}]*nova-tour/);
});

test('function routes include auth and study tracking, and no deployment secret is hardcoded in frontend files', () => {
  for (const route of ['api/health.js', 'api/auth/login.js', 'api/auth/me.js', 'api/auth/logout.js', 'api/activity/study.js', 'api/activity/quiz.js']) {
    assert.equal(fs.existsSync(path.join(root, route)), true, `missing function ${route}`);
  }
  const frontend = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
  assert.doesNotMatch(frontend, /OPENROUTER_API_KEY\s*=\s*['"][^'"]+['"]/);
  assert.doesNotMatch(frontend, /CLOUDINARY_API_SECRET\s*=\s*['"][^'"]+['"]/);
  assert.doesNotMatch(frontend, /student\s*\/\s*learn123|teacher\s*\/\s*teach123|admin\s*\/\s*admin123/);
});

test('media storage contract is provider-neutral while Cloudinary remains the configured demo adapter', () => {
  const storage = require('../lib/media-storage');
  assert.deepEqual(storage.ADAPTER_CONTRACT, ['createUploadIntent', 'validateAsset', 'deleteAsset', 'playbackUrl']);
  const old = process.env.MEDIA_PROVIDER;
  process.env.MEDIA_PROVIDER = 'iran-s3';
  try { assert.throws(() => storage.getAdapter(), { code: 'MEDIA_PROVIDER_UNAVAILABLE' }); }
  finally { if (old === undefined) delete process.env.MEDIA_PROVIDER; else process.env.MEDIA_PROVIDER = old; }
});

test('PostgreSQL adapter refuses plaintext database connections in production deployments', () => {
  const database = require('../lib/database');
  const previous = {
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL,
    env: process.env.NODE_ENV,
    vercel: process.env.VERCEL
  };
  process.env.DATABASE_URL = 'postgresql://user:pass@example.test/app';
  process.env.DATABASE_SSL = 'disable';
  process.env.NODE_ENV = 'production';
  delete process.env.VERCEL;
  try { assert.throws(() => database.getPool(), { code: 'INSECURE_DATABASE_TRANSPORT' }); }
  finally {
    if (previous.url === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous.url;
    if (previous.ssl === undefined) delete process.env.DATABASE_SSL; else process.env.DATABASE_SSL = previous.ssl;
    if (previous.env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous.env;
    if (previous.vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous.vercel;
  }
});

test('PostgreSQL adapter rejects ambiguous TLS configuration values', () => {
  const database = require('../lib/database');
  const old = { url: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL, env: process.env.NODE_ENV };
  process.env.DATABASE_URL = 'postgresql://user:pass@example.test/app';
  process.env.DATABASE_SSL = 'prefer';
  process.env.NODE_ENV = 'development';
  try { assert.throws(() => database.getPool(), { code: 'INVALID_DATABASE_SSL_MODE' }); }
  finally {
    if (old.url === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = old.url;
    if (old.ssl === undefined) delete process.env.DATABASE_SSL; else process.env.DATABASE_SSL = old.ssl;
    if (old.env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = old.env;
  }
});

test('Vercel headers include baseline browser protections', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const headers = config.headers.flatMap(rule => rule.headers).map(item => `${item.key}: ${item.value}`);
  for (const header of ['X-Content-Type-Options: nosniff', 'X-Frame-Options: DENY', 'Referrer-Policy: strict-origin-when-cross-origin']) {
    assert.ok(headers.includes(header), `missing ${header}`);
  }
});

test('customer-facing platform name is Nova across the browser shell and document title', () => {
  const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  assert.match(app, /<span>Nova<\/span>/);
  assert.match(app, /Nova · دموی آموزشی/);
  assert.match(html, /<title>Nova \| فضای یادگیری<\/title>/);
  assert.doesNotMatch(app, /راه‌کد/);
});

test('local static server allowlists public files and checks protected API roles from server sessions', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(server, /const PUBLIC_FILES = new Map\(\[\['\/index\.html', 'index\.html'\], \['\/app\.js', 'app\.js'\], \['\/styles\.css', 'styles\.css'\]\]\)/);
  assert.match(server, /const user = await getSessionUser\(req\)/);
  assert.match(server, /body\.role = user\.role/);
  assert.doesNotMatch(server, /body\.role !== 'admin'/);
});
