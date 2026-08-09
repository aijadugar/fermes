// In-memory only — swap for Redis/a DB before running more than one server
// process or before you need history to survive a restart.
const sessions = new Map();

export function getHistory(sessionId) {
  return sessions.get(sessionId) || [];
}

export function saveHistory(sessionId, history) {
  // Keep the last ~20 turns so context doesn't grow unbounded.
  sessions.set(sessionId, history.slice(-20));
}
