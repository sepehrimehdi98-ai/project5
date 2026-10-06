'use strict';

require('../lib/load-env');

function hasRealPostgresUrl(value) {
  if (!value || /user:password|@host/i.test(value)) return false;
  try {
    const parsed = new URL(value);
    return ['postgres:', 'postgresql:'].includes(parsed.protocol) && Boolean(parsed.hostname && parsed.pathname.length > 1);
  } catch { return false; }
}

const provider = String(process.env.MEDIA_PROVIDER || 'cloudinary').trim().toLowerCase();
const checks = [
  ['Production runtime', process.env.NODE_ENV === 'production'],
  ['Demo accounts explicitly disabled', process.env.NOVA_DEMO_MODE === 'false'],
  ['PostgreSQL connection configured', hasRealPostgresUrl(process.env.DATABASE_URL)],
  ['PostgreSQL TLS enabled', ['require', 'verify-full'].includes(process.env.DATABASE_SSL)],
  ['OpenRouter server key configured', Boolean(process.env.OPENROUTER_API_KEY)],
  ['Supported media provider configured', provider === 'cloudinary'],
  ['Cloudinary upload credentials configured', provider !== 'cloudinary' || Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)],
  ['Temporary admin bootstrap secrets removed', !process.env.BOOTSTRAP_ADMIN_USERNAME && !process.env.BOOTSTRAP_ADMIN_NAME && !process.env.BOOTSTRAP_ADMIN_PASSWORD]
];

for (const [label, ok] of checks) process.stdout.write(`${ok ? '[OK]' : '[MISSING]'} ${label}\n`);
if (checks.some(([, ok]) => !ok)) {
  process.stderr.write('\nConfiguration check failed. Set missing values in the hosting provider’s private environment settings. Values are never printed by this script.\n');
  process.exitCode = 1;
} else {
  process.stdout.write('\nConfiguration is present. This check does not connect to PostgreSQL or prove the app is production-ready.\n');
}
