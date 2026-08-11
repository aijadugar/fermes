/**
 * Mireye mock fixtures for demo mode (MIREYE_MODE=mock).
 * Each fixture is keyed by rounded lat/lon and returns realistic canned responses.
 *
 * Coverage:
 * 1. NYC-area good farm plot (low flood risk, decent soil) - lat: 41.0, lon: -74.0
 * 2. Flood-zone example (high flood risk, unsuitable) - lat: 29.0, lon: -90.0 (New Orleans area)
 * 3. Soil-quality edge case (marginal soil, needs amendment) - lat: 36.0, lon: -100.0 (Texas panhandle)
 */

export const FIXTURE_COORDS = [
  { lat: 41.0, lon: -74.0, label: 'NYC-area good farm plot' },
  { lat: 29.0, lon: -90.0, label: 'Flood-zone (New Orleans area)' },
  { lat: 36.0, lon: -100.0, label: 'Marginal soil (Texas panhandle)' },
];

/** Round lat/lon to 1 decimal place for fixture lookup */
function roundCoord(n) {
  return Math.round(n * 10) / 10;
}

/** Find nearest fixture within ~0.5 degrees */
export function findFixture(lat, lon) {
  const rLat = roundCoord(lat);
  const rLon = roundCoord(lon);
  
  for (const fixture of FIXTURE_COORDS) {
    if (fixture.lat === rLat && fixture.lon === rLon) {
      return fixture;
    }
  }
  return null;
}

/** Get list of fixture coords as a helpful message */
export function getFixtureListMessage() {
  return `no mock fixture near this location — try one of: ${FIXTURE_COORDS.map(f => `(${f.lat}, ${f.lon})`).join(', ')}`;
}

// Fixture data for each location
const FIXTURES = {
  // 1. NYC-area good farm plot (low flood risk, decent soil)
  '41,-74': {
    lat: 41.0,
    lon: -74.0,
    address: 'Warwick, NY 10990, USA',
    suitability: {
      verdict: 'suitable',
      score: 78,
      reasons: ['Low flood risk (Zone X)', 'Decent soil quality (loam)', 'Adequate growing season'],
    },
    fields: {
      elevation: { value: 320, unit: 'm', source: 'USGS NED 1m DEM (2017)' },
      flood_zone: { value: 'X', description: 'Minimal flood risk', source: 'FEMA NFHL (2023)' },
      soil_type: { value: 'loam', ph: 6.5, organic_matter: 3.2, source: 'USDA SSURGO' },
      parcel_size: { value: 12.5, unit: 'acres', source: 'Orange County NY Parcel Map' },
    },
    askResponse: {
      answer: 'This site in Warwick, NY is well-suited for small-scale farming. The land has minimal flood risk (Zone X), loam soil with good drainage, and a moderate growing season. Elevation around 320m provides good air drainage.',
      sources: [
        { title: 'USGS National Elevation Dataset', url: 'https://usgs.gov/ned' },
        { title: 'FEMA Flood Maps', url: 'https://msc.fema.gov' },
        { title: 'USDA Soil Survey', url: 'https://websoilsurvey.nrcs.usda.gov' },
      ],
    },
    geocodeResponse: {
      formatted_address: 'Warwick, NY 10990, USA',
      lat: 41.0,
      lon: -74.0,
      parcel_id: 'ORANGE-NY-234-567',
      confidence: 'high',
      source: 'Orange County NY Tax Assessor',
    },
    proximityResponse: {
      origin: { lat: 41.0, lon: -74.0 },
      candidates: [
        { id: 'dealer1', name: 'Hudson Valley Farm Supply', lat: 41.2, lon: -74.1, distance_km: 22.3, drive_time_min: 28 },
        { id: 'warehouse1', name: 'Northeast Produce Terminal', lat: 40.8, lon: -73.9, distance_km: 35.1, drive_time_min: 45 },
      ],
      mode: 'drive',
      source: 'Mireye Drive-Time API + OpenStreetMap',
    },
  },

  // 2. Flood-zone example (high flood risk, unsuitable) - New Orleans area
  '29,-90': {
    lat: 29.0,
    lon: -90.0,
    address: 'Plaquemines Parish, LA 70083, USA',
    suitability: {
      verdict: 'unsuitable',
      score: 22,
      reasons: ['High flood risk (Zone AE)', 'Below sea level elevation', 'Hurricane exposure'],
    },
    fields: {
      elevation: { value: -1.2, unit: 'm', source: 'USGS NED 1m DEM (2019)' },
      flood_zone: { value: 'AE', description: 'High-risk flood zone, base flood elevation required', source: 'FEMA NFHL (2023)' },
      soil_type: { value: 'clay', ph: 5.8, organic_matter: 4.1, source: 'USDA SSURGO' },
      parcel_size: { value: 8.0, unit: 'acres', source: 'Plaquemines Parish Parcel Map' },
    },
    askResponse: {
      answer: 'This site in Plaquemines Parish is unsuitable for most farming due to extreme flood risk. The land sits below sea level (-1.2m), is in FEMA Zone AE requiring elevated structures, and faces regular hurricane threats. Consider raised-bed aquaculture instead.',
      sources: [
        { title: 'FEMA Flood Insurance Rate Maps', url: 'https://msc.fema.gov' },
        { title: 'USGS Coastal Elevation Data', url: 'https://usgs.gov/coastal' },
        { title: 'Louisiana Sea Grant', url: 'https://laseagrant.org' },
      ],
    },
    geocodeResponse: {
      formatted_address: 'Plaquemines Parish, LA 70083, USA',
      lat: 29.0,
      lon: -90.0,
      parcel_id: 'PLAQ-LA-891-234',
      confidence: 'medium',
      source: 'Plaquemines Parish Tax Assessor',
    },
    proximityResponse: {
      origin: { lat: 29.0, lon: -90.0 },
      candidates: [
        { id: 'dealer2', name: 'Gulf Coast Marine Supply', lat: 29.3, lon: -89.8, distance_km: 42.1, drive_time_min: 55 },
        { id: 'warehouse2', name: 'New Orleans Cold Storage', lat: 29.9, lon: -90.1, distance_km: 98.5, drive_time_min: 85 },
      ],
      mode: 'drive',
      source: 'Mireye Drive-Time API + OpenStreetMap',
    },
  },

  // 3. Soil-quality edge case (marginal soil, needs amendment) - Texas panhandle
  '36,-100': {
    lat: 36.0,
    lon: -100.0,
    address: 'Hemphill County, TX 790xx, USA',
    suitability: {
      verdict: 'marginal',
      score: 45,
      reasons: ['Marginal soil (sandy loam, low organic matter)', 'Limited water access', 'Good sun exposure'],
    },
    fields: {
      elevation: { value: 780, unit: 'm', source: 'USGS NED 1m DEM (2018)' },
      flood_zone: { value: 'X', description: 'Minimal flood risk', source: 'FEMA NFHL (2022)' },
      soil_type: { value: 'sandy loam', ph: 7.8, organic_matter: 1.1, source: 'USDA SSURGO' },
      parcel_size: { value: 160.0, unit: 'acres', source: 'Hemphill County Parcel Map' },
    },
    askResponse: {
      answer: 'This Texas panhandle site has marginal conditions for farming. While flood risk is low and sun exposure is excellent, the sandy loam soil has very low organic matter (1.1%) and alkaline pH (7.8). Success would require significant soil amendment, drip irrigation, and drought-tolerant crops.',
      sources: [
        { title: 'USDA Web Soil Survey', url: 'https://websoilsurvey.nrcs.usda.gov' },
        { title: 'Texas A&M AgriLife Extension', url: 'https://agrilife.tamu.edu' },
        { title: 'High Plains Underground Water District', url: 'https://hpud.org' },
      ],
    },
    geocodeResponse: {
      formatted_address: 'Hemphill County, TX 790xx, USA',
      lat: 36.0,
      lon: -100.0,
      parcel_id: 'HEMP-TX-456-789',
      confidence: 'low',
      source: 'Hemphill County Tax Assessor',
    },
    proximityResponse: {
      origin: { lat: 36.0, lon: -100.0 },
      candidates: [
        { id: 'dealer3', name: 'Panhandle Co-op', lat: 35.8, lon: -100.4, distance_km: 45.2, drive_time_min: 52 },
        { id: 'warehouse3', name: 'Amarillo Grain Elevator', lat: 35.2, lon: -101.8, distance_km: 185.3, drive_time_min: 140 },
      ],
      mode: 'drive',
      source: 'Mireye Drive-Time API + OpenStreetMap',
    },
  },
};

export default FIXTURES;
