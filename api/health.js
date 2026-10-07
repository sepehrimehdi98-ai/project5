'use strict';

const { isDemoMode } = require('../lib/demo-auth');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); res.statusCode = 405; return res.end(JSON.stringify({ error: 'Method not allowed.' })); }
  res.statusCode = 200;
  return res.end(JSON.stringify({ ok: true, backend: 'vercel-functions', demoMode: isDemoMode(), production: true, previewOnly: !process.env.DATABASE_URL && !isDemoMode(), databaseConfigured: Boolean(process.env.DATABASE_URL), aiConfigured: Boolean(process.env.OPENROUTER_API_KEY), mediaProvider: process.env.MEDIA_PROVIDER || 'cloudinary', cloudinaryConfigured: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) }));
};

