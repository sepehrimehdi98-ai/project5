'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../lib/passwords');

test('password hashes are salted and verify only the matching password', async () => {
  const password = 'A-long-demo-passphrase!';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second, 'independent hashes must have distinct salts');
  assert.match(first, /^scrypt\$131072\$8\$1\$/);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('different-password', first), false);
});

test('password hashing rejects short or non-string passwords', async () => {
  await assert.rejects(hashPassword('short'), /12 and 256/);
  await assert.rejects(hashPassword(null), /12 and 256/);
});

test('password verification safely rejects malformed or excessive parameters', async () => {
  assert.equal(await verifyPassword('anything', 'plain-text-password'), false);
  assert.equal(await verifyPassword('anything', 'scrypt$999999999$8$1$abc$def'), false);
});
