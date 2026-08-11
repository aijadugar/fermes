import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (v === undefined || v === '') {
    throw new Error(
      `[config] Missing required env var ${name}. Copy .env.example to .env and fill it in.`
    );
  }
  return v;
}

function optional(name, fallback) {
  const v = process.env[name];
  return v !== undefined && v !== '' ? v : fallback;
}

function int(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) throw new Error(`[config] ${name} must be an integer, got: ${v}`);
  return n;
}

function list(name, fallback) {
  const v = process.env[name];
  if (!v) return fallback;
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

export const config = {
  port: int('PORT', 3000),
  nodeEnv: optional('NODE_ENV', 'development'),

  app: {
    allowedOrigins: list('ALLOWED_ORIGINS', ['*']),
  },

  auth: {
    apiToken: optional('AUTH_API_TOKEN', undefined),
  },

  rateLimit: {
    windowMs: int('RATE_LIMIT_WINDOW_MS', 900000),
    max: int('RATE_LIMIT_MAX', 30),
  },

  session: {
    ttlSeconds: int('SESSION_TTL_SECONDS', 3600),
    maxMessages: int('SESSION_MAX_MESSAGES', 20),
  },

  http: {
    timeoutMs: int('HTTP_TIMEOUT_MS', 30000),
    retries: int('HTTP_RETRIES', 2),
  },

  redis: {
    url: optional('REDIS_URL', undefined),
  },

  sarvam: {
    apiKey: required('SARVAM_API_KEY'),
    baseUrl: optional('SARVAM_BASE_URL', 'https://api.sarvam.ai'),
    chatModel: optional('SARVAM_CHAT_MODEL', 'sarvam-105b'),
  },

  mireye: {
    apiKey: required('MIREYE_API_KEY'),
    baseUrl: optional('MIREYE_BASE_URL', 'https://api.mireye.com'),
    mode: optional('MIREYE_MODE', 'live'),
  },

  places: {
    apiKey: required('GOOGLE_PLACES_API_KEY'),
  },
};
