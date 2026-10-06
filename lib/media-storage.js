'use strict';

// Application code stores normalized asset metadata. Provider-specific upload signing,
// URL validation, deletion, and playback URL generation belong behind this adapter boundary.
const ADAPTER_CONTRACT = Object.freeze(['createUploadIntent', 'validateAsset', 'deleteAsset', 'playbackUrl']);
const DEMO_PROVIDER = 'cloudinary';

function configuredProvider() {
  const value = String(process.env.MEDIA_PROVIDER || DEMO_PROVIDER).trim().toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(value)) throw new Error('MEDIA_PROVIDER must be a provider slug.');
  return value;
}

function getAdapter(provider = configuredProvider()) {
  if (provider === 'cloudinary') return require('./media-providers/cloudinary');
  const error = new Error(`Media provider "${provider}" has no adapter installed yet. Implement the media provider contract before switching providers.`);
  error.code = 'MEDIA_PROVIDER_UNAVAILABLE';
  throw error;
}

module.exports = { ADAPTER_CONTRACT, DEMO_PROVIDER, configuredProvider, getAdapter };
