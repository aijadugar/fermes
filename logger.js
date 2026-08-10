const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel = LEVELS[process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;

function emit(level, msg, meta) {
  if (LEVELS[level] < minLevel) return;
  const entry = { ts: new Date().toISOString(), level, msg, ...(meta || {}) };
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(JSON.stringify(entry) + '\n');
}

export const logger = {
  debug: (msg, meta) => emit('debug', msg, meta),
  info: (msg, meta) => emit('info', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  error: (msg, meta) => emit('error', msg, meta),
  child: (defaults) => ({
    debug: (msg, meta) => emit('debug', msg, { ...defaults, ...meta }),
    info: (msg, meta) => emit('info', msg, { ...defaults, ...meta }),
    warn: (msg, meta) => emit('warn', msg, { ...defaults, ...meta }),
    error: (msg, meta) => emit('error', msg, { ...defaults, ...meta }),
  }),
};
