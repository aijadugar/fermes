import { config } from './config.js';

const { apiKey } = config.places;

/**
 * Nearby-search wrapper. Swap this implementation per-region if needed
 * (e.g. Overpass/OpenStreetMap for regions Google Places covers poorly).
 *
 * @param {{lat:number, lon:number}} location
 * @param {string} query e.g. "farm supply store", "grain warehouse", "seed dealer"
 * @param {number} radiusMeters
 */
export async function findNearbyBusinesses(location, query, radiusMeters = 25000) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.internationalPhoneNumber'
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: location.lat, longitude: location.lon },
          radius: radiusMeters
        }
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Places search failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return (data.places || []).map((p) => ({
    name: p.displayName?.text,
    address: p.formattedAddress,
    lat: p.location?.latitude,
    lon: p.location?.longitude,
    rating: p.rating,
    phone: p.internationalPhoneNumber
  }));
}
