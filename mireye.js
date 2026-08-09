import { config } from './config.js';
import { fetchWithRetry } from './http.js';
import { UpstreamError } from './errors.js';

const { apiKey, baseUrl } = config.mireye;

// NOTE: Mireye covers the US (primary) and Canada (limited, proximity/drive-time
// only) — no other regions. It's a land-facts API (elevation, flood zone, soil,
// parcel), not a business directory; pair with places.js for "find dealers nearby".

async function call(path, params, method = 'GET') {
  const url = new URL(`${baseUrl}${path}`);
  let body;
  const headers = { Authorization: `Bearer ${apiKey}` };

  if (method === 'GET') {
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(params);
  }

  const res = await fetchWithRetry(url, { method, headers, body });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new UpstreamError(`Mireye ${path} failed: ${res.status} ${text.slice(0, 500)}`, {
      details: { status: res.status, provider: 'mireye' },
    });
  }
  return res.json();
}

export function mireyeAsk(question, { lat, lon, address } = {}) {
  return call('/v1/ask', { question, lat, lon, address }, 'POST');
}

export function mireyeGeocode(address) {
  return call('/v1/geocode', { address }, 'POST');
}

export function mireyeFetchFields(lat, lon, fields) {
  return call('/v1/fetch', { lat, lon, fields }, 'POST');
}

export function mireyeProximity(origin, candidates, mode = 'drive') {
  return call('/v1/proximity', { origin, candidates, mode }, 'POST');
}

export function mireyeRequestField(description, { lat, lon } = {}) {
  return call('/v1/field-requests', { description, lat, lon }, 'POST');
}
