import { config } from './config.js';
import FIXTURES, { findFixture, getFixtureListMessage } from './fixtures/mireye-fixtures.js';

const { apiKey, baseUrl, mode } = config.mireye;

// Log startup warning if mock mode is active
if (mode === 'mock') {
  console.warn('[MIREYE] Running in MOCK mode - no real API calls will be made. Fixtures available at: (41.0, -74.0), (29.0, -90.0), (36.0, -100.0)');
}

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
export async function mireyeAsk(question, { lat, lon, address } = {}) {
  if (mode === 'mock') {
    if (lat === undefined || lon === undefined) {
      return { error: getFixtureListMessage() };
    }

    const fixture = findFixture(lat, lon);

    if (!fixture) {
      return { error: getFixtureListMessage() };
    }

    return FIXTURES[`${fixture.lat},${fixture.lon}`].askResponse;
  }

  return call('/v1/ask', {
    question,
    lat,
    lng: lon,
    address,
  }, 'POST');
}

/** Resolve a loose address/description into canonical coordinates + parcel. */
export async function mireyeGeocode(address) {
  if (mode === 'mock') {
    // For geocode, we return fixture data if the address matches a known location
    const lowerAddress = address.toLowerCase();
    if (lowerAddress.includes('warwick') || lowerAddress.includes('orange county')) {
      return FIXTURES['41,-74'].geocodeResponse;
    }
    if (lowerAddress.includes('plaquemines') || lowerAddress.includes('new orleans')) {
      return FIXTURES['29,-90'].geocodeResponse;
    }
    if (lowerAddress.includes('hemphill') || lowerAddress.includes('texas panhandle')) {
      return FIXTURES['36,-100'].geocodeResponse;
    }
    return { error: getFixtureListMessage() };
  }
  return call('/v1/geocode', { address }, 'POST');
}

/** Fetch specific cited fields (elevation, flood_zone, soil_type, etc.) at a coordinate. */
export async function mireyeFetchFields(lat, lon, fields) {
  if (mode === 'mock') {
    const fixture = findFixture(lat, lon);
    if (!fixture) {
      return { error: getFixtureListMessage() };
    }
    const data = FIXTURES[`${fixture.lat},${fixture.lon}`];
    // Return only requested fields, or all if none specified
    if (!fields || fields.length === 0) {
      return data.fields;
    }
    const result = {};
    for (const field of fields) {
      if (data.fields[field]) {
        result[field] = data.fields[field];
      }
    }
    return result;
  }
  return call('/v1/fetch', { lat, lng: lon, fields }, 'POST');
}

/** Real drive-time/distance ranking between an origin and candidate points (US full, Canada limited). */
export async function mireyeProximity(origin, candidates, modeParam = 'drive') {
  if (mode === 'mock') {
    const fixture = findFixture(origin.lat, origin.lon);
    if (!fixture) {
      return { error: getFixtureListMessage() };
    }
    return FIXTURES[`${fixture.lat},${fixture.lon}`].proximityResponse;
  }
  return call('/v1/proximity', { origin, candidates, mode: modeParam }, 'POST');
}

/** Ask for a field that doesn't exist in the catalog yet — queues a build. */
export function mireyeRequestField(description, { lat, lon } = {}) {
  if (mode === 'mock') {
    return { status: 'queued', description, lat, lon, message: 'Mock mode: field request queued (not actually sent)' };
  }
  return call('/v1/field-requests', { description, lat, lon }, 'POST');
}