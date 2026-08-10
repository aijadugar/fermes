import { config } from './config.js';
import { logger } from './logger.js';
import { UpstreamError } from './errors.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(url, options = {}, { retries, timeoutMs } = {}) {
  const maxRetries = retries ?? config.http.retries;
  const timeout = timeoutMs ?? config.http.timeoutMs;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) return res;
      // 4xx — don't retry, let the caller handle it
      if (res.status >= 400 && res.status < 500) return res;

      // 5xx — retry with exponential backoff
      const body = await res.text().catch(() => '');
      lastError = new UpstreamError(
        `Upstream ${res.status} from ${url}: ${body.slice(0, 500)}`,
        { status: 502, details: { status: res.status } }
      );
      if (attempt < maxRetries) {
        const backoff = 1000 * Math.pow(2, attempt);
        logger.warn('upstream 5xx, retrying', { url: String(url), status: res.status, attempt: attempt + 1, backoffMs: backoff });
        await sleep(backoff);
        continue;
      }
      throw lastError;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof UpstreamError) throw err;
      lastError = new UpstreamError(`Network error calling ${url}: ${err.message}`, { status: 504 });
      if (attempt < maxRetries) {
        const backoff = 1000 * Math.pow(2, attempt);
        logger.warn('network error, retrying', { url: String(url), error: err.message, attempt: attempt + 1, backoffMs: backoff });
        await sleep(backoff);
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}
