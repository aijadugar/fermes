import { config } from '../config.js';
import { logger } from '../logger.js';
import { AuthError } from '../errors.js';

export function authMiddleware(req, _res, next) {
  const token = config.auth.apiToken;
  if (!token) return next();
  const header = req.headers['authorization'];
  const xKey = req.headers['x-api-key'];
  const sent = header?.startsWith('Bearer ') ? header.slice(7) : xKey;
  if (sent !== token) return next(new AuthError('Invalid or missing API token'));
  next();
}

export function logAuthStatus() {
  if (config.auth.apiToken) {
    logger.info('auth enabled', { mechanism: 'bearer / x-api-key' });
  } else {
    logger.warn('auth disabled — set AUTH_API_TOKEN to protect /v1/agent/*');
  }
}
