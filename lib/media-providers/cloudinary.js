'use strict';

const crypto = require('node:crypto');

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

function createUploadIntent({ filename = 'video', subject, lessonId } = {}) {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloudName || !apiKey || !secret) throw Object.assign(new Error('Cloudinary server credentials are not configured.'), { status: 503 });
  if (!['python', 'english'].includes(subject) || !/^[A-Za-z0-9_-]{1,120}$/.test(String(lessonId || ''))) throw Object.assign(new Error('A valid lesson in the selected course is required.'), { status: 400 });
  const safeName = String(filename).replace(/[^\p{L}\p{N}._-]/gu, '_').slice(0, 80) || 'video';
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `${process.env.CLOUDINARY_FOLDER || 'nova-demo/lessons'}/${subject}/${lessonId}`;
  const publicId = `${Date.now()}-${crypto.randomUUID()}`;
  const allowedFormats = 'mp4,webm,mov,m4v,ogg';
  const params = { folder, public_id: publicId, timestamp, allowed_formats: allowedFormats, overwrite: 'false' };
  const toSign = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  const signature = crypto.createHash('sha1').update(toSign + secret).digest('hex');
  return { provider: 'cloudinary', cloudName, apiKey, timestamp, signature, folder, publicId, filename: safeName, params: { allowed_formats: allowedFormats, overwrite: 'false' } };
}

function validateAsset({ secureUrl, cloudName } = {}) {
  try {
    const url = new URL(secureUrl);
    const path = url.pathname.split('/').filter(Boolean);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && path[0] === cloudName && path[1] === 'video' && path[2] === 'upload';
  } catch { return false; }
}

function playbackUrl(asset) { return asset.secureUrl; }
async function verifyAsset({ publicId, secureUrl, cloudName } = {}) {
  const { CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!apiKey || !secret || !cloudName) throw Object.assign(new Error('Cloudinary verification credentials are not configured.'), { status: 503 });
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/video/upload?public_ids%5B%5D=${encodeURIComponent(publicId)}`;
  const response = await fetch(endpoint, { headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${secret}`).toString('base64')}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(`Cloudinary asset verification failed (${response.status}).`), { status: response.status === 404 ? 404 : 502 });
  const asset = payload.resources?.[0];
  if (!asset || asset.public_id !== publicId || !validateAsset({ secureUrl: asset.secure_url, cloudName }) || secureUrl !== asset.secure_url) throw Object.assign(new Error('Uploaded video metadata does not match the signed Cloudinary upload.'), { status: 400 });
  if (!Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 || asset.bytes > MAX_VIDEO_BYTES) {
    await deleteAsset({ publicId, cloudName });
    throw Object.assign(new Error('ویدیو از سقف ۵۰۰ مگابایت بیشتر است؛ فایل ابری رد و حذف شد.'), { status: 413 });
  }
  return { publicId: asset.public_id, secureUrl: asset.secure_url, bytes: asset.bytes, duration: Math.min(86400, Math.max(0, Math.floor(Number(asset.duration) || 0))) };
}

async function deleteAsset({ publicId, cloudName } = {}) {
  const { CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!apiKey || !secret || !cloudName) throw new Error('Cloudinary deletion credentials are not configured.');
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHash('sha1').update(`public_id=${publicId}&timestamp=${timestamp}${secret}`).digest('hex');
  const form = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), api_key: apiKey, signature });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/destroy`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !['ok', 'not found'].includes(payload.result)) throw new Error(`Cloudinary deletion failed (${response.status}).`);
  return payload;
}

module.exports = { provider: 'cloudinary', MAX_VIDEO_BYTES, createUploadIntent, validateAsset, verifyAsset, deleteAsset, playbackUrl };
