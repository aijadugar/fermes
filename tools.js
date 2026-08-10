import { mireyeAsk, mireyeFetchFields, mireyeGeocode, mireyeProximity, mireyeRequestField } from './mireye.js';
import { findNearbyBusinesses } from './places.js';

export const toolSchemas = [
  {
    type: 'function',
    function: {
      name: 'resolve_location',
      description: 'Turn a place name or loose address into precise coordinates. Call this first if you only have a place name.',
      parameters: {
        type: 'object',
        properties: { address: { type: 'string' } },
        required: ['address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_site_suitability',
      description:
        'Get cited land facts for growing something at a US/Canada coordinate: elevation, flood zone, soil type, climate signals. Not for finding businesses.',
      parameters: {
        type: 'object',
        properties: {
          lat: { type: 'number' },
          lon: { type: 'number' },
          question: { type: 'string', description: 'What the grower actually wants to know, in plain language.' },
        },
        required: ['lat', 'lon', 'question'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_nearby_business',
      description:
        'Find nearby farm-supply stores, warehouses, seed dealers, co-ops, or grain buyers around a coordinate, ranked by real travel distance.',
      parameters: {
        type: 'object',
        properties: {
          lat: { type: 'number' },
          lon: { type: 'number' },
          businessType: { type: 'string', description: 'e.g. "seed dealer", "grain warehouse", "farm supply store"' },
        },
        required: ['lat', 'lon', 'businessType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_missing_field',
      description: "Use only when the grower needs a specific data field that check_site_suitability doesn't return.",
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          lat: { type: 'number' },
          lon: { type: 'number' },
        },
        required: ['description'],
      },
    },
  },
];

export async function executeTool(name, args) {
  switch (name) {
    case 'resolve_location':
      return mireyeGeocode(args.address);

    case 'check_site_suitability': {
      const facts = await mireyeFetchFields(args.lat, args.lon, ['elevation', 'flood_zone', 'soil_type']);
      const cited = await mireyeAsk(args.question, { lat: args.lat, lon: args.lon });
      return { facts, cited };
    }

    case 'find_nearby_business': {
      const candidates = await findNearbyBusinesses({ lat: args.lat, lon: args.lon }, args.businessType);
      if (!candidates.length) return { candidates: [] };
      const ranked = await mireyeProximity(
        { lat: args.lat, lon: args.lon },
        candidates.map((c) => ({ lat: c.lat, lon: c.lon }))
      ).catch(() => null);
      return { candidates, ranked };
    }

    case 'request_missing_field':
      return mireyeRequestField(args.description, { lat: args.lat, lon: args.lon });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
