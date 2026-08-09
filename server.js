import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { config } from './config.js';
import { logger } from './logger.js';
import { store } from './store.js';
import { agentRouter } from './agent.js';
import { authMiddleware, logAuthStatus } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        const allowed = config.app.allowedOrigins;
        if (allowed.includes('*') || !origin || allowed.includes(origin)) {
          cb(null, true);
        } else {
          cb(new Error('Not allowed by CORS'));
        }
      },
    })
  );

  app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info('request', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      });
    });
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime(), ts: new Date().toISOString() });
  });

  app.get('/ready', async (_req, res) => {
    const checks = { config: true };
    try {
      checks.store = await store.isReady();
    } catch {
      checks.store = false;
    }
    const ok = Object.values(checks).every(Boolean);
    res.status(ok ? 200 : 503).json({ ok, checks });
  });

  const agentLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  app.use('/v1/agent', agentLimiter, authMiddleware, agentRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export async function startServer() {
  const app = createApp();
  logAuthStatus();
  const server = app.listen(config.port, () => {
    logger.info('server started', { port: config.port, env: config.nodeEnv });
  });

  const shutdown = (signal) => {
    logger.info('shutdown initiated', { signal });
    server.close(async () => {
      try {
        await store.close();
      } catch (err) {
        logger.error('store close error', { error: err.message });
      }
      logger.info('shutdown complete');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('forced shutdown after 10s timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
