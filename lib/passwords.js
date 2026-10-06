'use strict';

const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);

const KEY_BYTES = 64;
const SCRYPT_OPTIONS = { N: 1 << 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };

async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) {
    throw new Error('Password must be between 12 and 256 characters.');
  }
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, KEY_BYTES, SCRYPT_OPTIONS);
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || typeof encoded !== 'string') return false;
  const [algorithm, n, r, p, saltText, hashText, extra] = encoded.split('$');
  const N = Number(n), R = Number(r), P = Number(p);
  if (algorithm !== 'scrypt' || extra !== undefined || !Number.isInteger(N) || N < 16384 || N > (1 << 17) || !Number.isInteger(R) || R < 1 || R > 16 || !Number.isInteger(P) || P < 1 || P > 4) return false;
  try {
    const expected = Buffer.from(hashText, 'base64url');
    const salt = Buffer.from(saltText, 'base64url');
    if (expected.length !== KEY_BYTES || salt.length < 16 || salt.length > 64) return false;
    const actual = await scrypt(password, salt, expected.length, { N, r: R, p: P, maxmem: 256 * 1024 * 1024 });
    return crypto.timingSafeEqual(expected, actual);
  } catch { return false; }
}

module.exports = { hashPassword, verifyPassword };
