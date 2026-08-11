/**
 * Tests for Mireye mock mode fixtures.
 * Run with: node --test test/mireye-mock.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// Set MIREYE_MODE=mock BEFORE importing any modules that depend on it
process.env.MIREYE_MODE = 'mock';

import { mireyeAsk, mireyeFetchFields, mireyeGeocode, mireyeProximity } from '../mireye.js';

describe('Mireye Mock Mode', () => {
  describe('fixture locations', () => {
    it('NYC-area good farm plot (41.0, -74.0) returns suitable verdict', async () => {
      const result = await mireyeAsk('Is this land suitable for farming?', { lat: 41.0, lon: -74.0 });
      assert.ok(!result.error, 'Should not return an error');
      assert.strictEqual(result.answer.includes('Warwick'), true, 'Answer should mention Warwick, NY');
      // Check that sources exist and have realistic citations
      assert.ok(Array.isArray(result.sources), 'Should have sources array');
      assert.ok(result.sources.length > 0, 'Should have at least one source');
      assert.ok(result.sources[0].title, 'Source should have a title');
      assert.ok(result.sources[0].url, 'Source should have a URL');
    });

    it('Flood-zone example (29.0, -90.0) returns unsuitable verdict', async () => {
      const result = await mireyeAsk('Is this land suitable for farming?', { lat: 29.0, lon: -90.0 });
      assert.ok(!result.error, 'Should not return an error');
      assert.strictEqual(result.answer.includes('unsuitable'), true, 'Answer should mention unsuitable');
      assert.strictEqual(result.answer.includes('flood'), true, 'Answer should mention flood risk');
      assert.ok(Array.isArray(result.sources), 'Should have sources array');
      assert.ok(result.sources.length > 0, 'Should have at least one source');
    });

    it('Marginal soil Texas panhandle (36.0, -100.0) returns marginal verdict', async () => {
      const result = await mireyeAsk('Is this land suitable for farming?', { lat: 36.0, lon: -100.0 });
      assert.ok(!result.error, 'Should not return an error');
      assert.strictEqual(result.answer.includes('marginal'), true, 'Answer should mention marginal conditions');
      assert.ok(Array.isArray(result.sources), 'Should have sources array');
      assert.ok(result.sources.length > 0, 'Should have at least one source');
    });
  });

  describe('mireyeFetchFields', () => {
    it('returns fields with source citations for NYC fixture', async () => {
      const result = await mireyeFetchFields(41.0, -74.0, ['elevation', 'flood_zone', 'soil_type']);
      assert.ok(!result.error, 'Should not return an error');
      assert.ok(result.elevation, 'Should have elevation field');
      assert.ok(result.elevation.source, 'Elevation should have source citation');
      assert.ok(result.flood_zone, 'Should have flood_zone field');
      assert.ok(result.flood_zone.source, 'Flood zone should have source citation');
      assert.ok(result.soil_type, 'Should have soil_type field');
      assert.ok(result.soil_type.source, 'Soil type should have source citation');
    });

    it('returns all fields when no specific fields requested', async () => {
      const result = await mireyeFetchFields(29.0, -90.0);
      assert.ok(!result.error, 'Should not return an error');
      assert.ok(result.elevation, 'Should have elevation');
      assert.ok(result.flood_zone, 'Should have flood_zone');
      assert.ok(result.soil_type, 'Should have soil_type');
      assert.ok(result.parcel_size, 'Should have parcel_size');
    });
  });

  describe('mireyeGeocode', () => {
    it('returns geocode response for known addresses', async () => {
      const result = await mireyeGeocode('Warwick, NY');
      assert.ok(!result.error, 'Should not return an error');
      assert.strictEqual(result.lat, 41.0);
      assert.strictEqual(result.lon, -74.0);
      assert.ok(result.source, 'Should have source citation');
    });

    it('returns error for unknown addresses', async () => {
      const result = await mireyeGeocode('Unknown Place, Nowhere');
      assert.ok(result.error, 'Should return an error for unknown address');
      assert.ok(result.error.includes('no mock fixture'), 'Error should mention no mock fixture');
    });
  });

  describe('mireyeProximity', () => {
    it('returns proximity data for fixture location', async () => {
      const origin = { lat: 41.0, lon: -74.0 };
      const candidates = [{ id: 'test', lat: 41.2, lon: -74.1 }];
      const result = await mireyeProximity(origin, candidates, 'drive');
      assert.ok(!result.error, 'Should not return an error');
      assert.ok(result.candidates, 'Should have candidates array');
      assert.ok(result.candidates.length > 0, 'Should have at least one candidate');
      assert.ok(result.source, 'Should have source citation');
    });
  });

  describe('out-of-range location', () => {
    it('returns "no fixture" message for coordinates without a fixture', async () => {
      const result = await mireyeAsk('Is this land suitable?', { lat: 55.0, lon: -120.0 });
      assert.ok(result.error, 'Should return an error');
      assert.ok(result.error.includes('no mock fixture'), 'Error should mention no mock fixture');
      // Check that the error mentions at least one fixture coordinate (format may vary)
      assert.ok(result.error.includes('41') && result.error.includes('-74'), 'Error should list fixture coords');
    });

    it('returns "no fixture" message for fetchFields out of range', async () => {
      const result = await mireyeFetchFields(0.0, 0.0, ['elevation']);
      assert.ok(result.error, 'Should return an error');
      assert.ok(result.error.includes('no mock fixture'), 'Error should mention no mock fixture');
    });

    it('returns "no fixture" message for proximity out of range', async () => {
      const result = await mireyeProximity({ lat: 50.0, lon: -100.0 }, []);
      assert.ok(result.error, 'Should return an error');
      assert.ok(result.error.includes('no mock fixture'), 'Error should mention no mock fixture');
    });
  });
});
