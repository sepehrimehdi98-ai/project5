'use strict';

const crypto = require('node:crypto');

const DEMO_USERS = Object.freeze([
  { id: 'demo-student', username: 'student', name: 'نگار احمدی', role: 'student', password: 'learn123' },
  { id: 'demo-teacher', username: 'teacher', name: 'سارا رضایی', role: 'teacher', password: 'teach123' },
  { id: 'demo-admin', username: 'admin', name: 'مدیر سامانه', role: 'admin', password: 'admin123' }
]);

function isDemoMode() {
  const url = String(process.env.DATABASE_URL || '').trim();
  const placeholder = /@host(?::\d+)?\//i.test(url) || /user:password/i.test(url);
  const production = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  return process.env.NOVA_DEMO_MODE === 'true' && (!url || placeholder) && (!production || Boolean(getDemoSessionSecret()));
}

function getDemoSessionSecret() {
  const configured = process.env.NOVA_DEMO_SESSION_SECRET || process.env.OPENROUTER_API_KEY || process.env.CLOUDINARY_API_SECRET;
  if (configured) return configured;
  return process.env.NODE_ENV !== 'production' && !process.env.VERCEL ? 'local-only-nova-demo-session-secret' : '';
}

function authenticateDemo(username, password) {
  const user = DEMO_USERS.find(item => item.username === String(username || '').trim().toLowerCase());
  const expected = Buffer.from(user?.password || 'invalid-demo-password');
  const actual = Buffer.from(String(password || ''));
  const matches = actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  if (!user || !matches) return null;
  const { id, name, role } = user;
  return { id, username: user.username, name, role };
}

function findDemoUser(id) { return DEMO_USERS.find(user => user.id === String(id)) || null; }

module.exports = { DEMO_USERS, isDemoMode, getDemoSessionSecret, authenticateDemo, findDemoUser };

