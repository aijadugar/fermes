import { config } from './config.js';

const { apiKey, baseUrl } = config.mireye;

// NOTE: Mireye's data catalog covers the US (primary) and Canada (limited,
// proximity/drive-time only). It has no meaningful coverage elsewhere and it
// is a LAND-FACTS API (elevation, flood zone, soil, parcel), not a business
// directory — pair it with services/places.js for "find dealers nearby".

async function call(path, params, method = 'GET') {
  const url = new URL(`${baseUrl}${path}`);
  let body;
  const headers = { Authorization: `Bearer ${apiKey}` };

  if (method === 'GET') {
    Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(params);
  }

  const res = await fetch(url, { method, headers, body });
  if (!res.ok) {
    throw new Error(`Mireye ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Natural-language question about a place. Returns cited answer + sources. */
export function mireyeAsk(question, { lat, lon, address } = {}) {
  return call('/v1/ask', { question, lat, lon, address }, 'POST');
}

/** Resolve a loose address/description into canonical coordinates + parcel. */
export function mireyeGeocode(address) {
  return call('/v1/geocode', { address }, 'POST');
}

/** Fetch specific cited fields (elevation, flood_zone, soil_type, etc.) at a coordinate. */
export function mireyeFetchFields(lat, lon, fields) {
  return call('/v1/fetch', { lat, lng: lon, fields }, 'POST');
}

/** Real drive-time/distance ranking between an origin and candidate points (US full, Canada limited). */
export function mireyeProximity(origin, candidates, mode = 'drive') {
  return call('/v1/proximity', { origin, candidates, mode }, 'POST');
}

/** Ask for a field that doesn't exist in the catalog yet — queues a build. */
export function mireyeRequestField(description, { lat, lon } = {}) {
  return call('/v1/field-requests', { description, lat, lon }, 'POST');
}