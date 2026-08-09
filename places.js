import { config } from './config.js';
import { fetchWithRetry } from './http.js';
import { UpstreamError } from './errors.js';

const { apiKey } = config.places;

export async function findNearbyBusinesses(location, query, radiusMeters = 25000) {
  const res = await fetchWithRetry('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.displayName,places.formattedAddress,places.location,places.rating,places.internationalPhoneNumber',
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: location.lat, longitude: location.lon },
          radius: radiusMeters,
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new UpstreamError(`Places search failed: ${res.status} ${text.slice(0, 500)}`, {
      details: { status: res.status, provider: 'google-places' },
    });
  }
  const data = await res.json();
  return (data.places || []).map((p) => ({
    name: p.displayName?.text,
    address: p.formattedAddress,
    lat: p.location?.latitude,
    lon: p.location?.longitude,
    rating: p.rating,
    phone: p.internationalPhoneNumber,
  }));
}
