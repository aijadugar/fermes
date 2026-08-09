import { logger } from '../logger.js';

export function notFoundHandler(req, res, _next) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
}

export function errorHandler(err, req, res, _next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Audio file too large (max 10 MB)' });
  }
  const status = err.status || 500;
  if (status >= 500) {
    logger.error('request failed', { requestId: req.id, error: err.message, stack: err.stack });
  } else {
    logger.warn('request error', { requestId: req.id, status, error: err.message });
  }
  const body = { error: err.message };
  if (err.details) body.details = err.details;
  res.status(status).json(body);
}
