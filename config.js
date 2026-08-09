import './config.js';

function required(name, fallback = undefined) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    console.warn(`[config] Missing env var ${name} — related features will fail until it's set.`);
  }
  return v;
}

export const config = {
  port: process.env.PORT || 3000,

  sarvam: {
    apiKey: required('SARVAM_API_KEY'),
    baseUrl: process.env.SARVAM_BASE_URL || 'https://api.sarvam.ai',
    chatModel: process.env.SARVAM_CHAT_MODEL || 'sarvam-105b'
  },

  mireye: {
    apiKey: required('MIREYE_API_KEY'),
    baseUrl: process.env.MIREYE_BASE_URL || 'https://api.mireye.com'
  },

  places: {
    apiKey: required('GOOGLE_PLACES_API_KEY')
  }
};
