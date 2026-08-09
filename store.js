import { config } from './config.js';
import { logger } from './logger.js';

class MemoryStore {
  constructor() {
    this.sessions = new Map();
    this.timers = new Map();
  }

  async getHistory(sessionId) {
    return this.sessions.get(sessionId) || [];
  }

  async saveHistory(sessionId, history) {
    const trimmed = history.slice(-config.session.maxMessages);
    this.sessions.set(sessionId, trimmed);
    this._resetTtl(sessionId);
  }

  _resetTtl(sessionId) {
    if (this.timers.has(sessionId)) clearTimeout(this.timers.get(sessionId));
    const timer = setTimeout(() => {
      this.sessions.delete(sessionId);
      this.timers.delete(sessionId);
      logger.debug('session expired', { sessionId });
    }, config.session.ttlSeconds * 1000);
    timer.unref?.();
    this.timers.set(sessionId, timer);
  }

  async close() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.sessions.clear();
  }

  async isReady() {
    return true;
  }
}

class RedisStore {
  constructor(redisUrl) {
    this.url = redisUrl;
  }

  async _client() {
    if (!this._redis) {
      const Redis = (await import('ioredis')).default;
      this._redis = new Redis(this.url, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: true,
        retryStrategy: (times) => Math.min(times * 500, 2000),
      });
      this._redis.on('error', (err) => logger.error('redis error', { error: err.message }));
      this._redis.on('connect', () => logger.info('redis connected'));
    }
    return this._redis;
  }

  _key(sessionId) {
    return `session:${sessionId}`;
  }

  async getHistory(sessionId) {
    const redis = await this._client();
    const raw = await redis.get(this._key(sessionId));
    return raw ? JSON.parse(raw) : [];
  }

  async saveHistory(sessionId, history) {
    const redis = await this._client();
    const trimmed = history.slice(-config.session.maxMessages);
    await redis.set(this._key(sessionId), JSON.stringify(trimmed), 'EX', config.session.ttlSeconds);
  }

  async close() {
    if (this._redis) await this._redis.quit();
  }

  async isReady() {
    try {
      const redis = await this._client();
      return (await redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}

export const store = config.redis.url ? new RedisStore(config.redis.url) : new MemoryStore();
export { MemoryStore, RedisStore };
