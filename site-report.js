import { Router } from 'express';
import { mireyeFetchFields, mireyeAsk } from './mireye.js';
import { ValidationError } from './errors.js';

export const siteReportRouter = Router();

/**
 * GET /v1/site-report?lat=&lon=&question=
 * 
 * Chains multiple Mireye calls into one cited report.
 * Every fact carries its own citation, demonstrating Mireye's citation model.
 */
siteReportRouter.get('/site-report', async (req, res, next) => {
  try {
    const { lat, lon, question } = req.query;

    // Validate required params
    if (!lat || !lon) {
      throw new ValidationError('lat and lon are required query parameters');
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new ValidationError('lat and lon must be valid numbers');
    }

    // Default question if not provided
    const userQuestion = question || 'Is this a good spot to grow crops?';

    // Fetch field data (elevation, flood_zone, soil_type)
    const fieldsData = await mireyeFetchFields(latitude, longitude, ['elevation', 'flood_zone', 'soil_type']);

    // Check for error response (e.g., no mock fixture available)
    if (fieldsData.error) {
      return res.status(404).json({
        location: { lat: latitude, lon: longitude },
        error: fieldsData.error,
      });
    }

    // Build facts array with citations
    const facts = [];
    
    if (fieldsData.elevation) {
      facts.push({
        field: 'elevation',
        value: fieldsData.elevation.value !== undefined ? fieldsData.elevation.value : fieldsData.elevation,
        unit: fieldsData.elevation.unit || null,
        source: fieldsData.elevation.source || null,
      });
    }

    if (fieldsData.flood_zone) {
      facts.push({
        field: 'flood_zone',
        value: fieldsData.flood_zone.value !== undefined ? fieldsData.flood_zone.value : fieldsData.flood_zone,
        description: fieldsData.flood_zone.description || null,
        source: fieldsData.flood_zone.source || null,
      });
    }

    if (fieldsData.soil_type) {
      facts.push({
        field: 'soil_type',
        value: fieldsData.soil_type.value !== undefined ? fieldsData.soil_type.value : fieldsData.soil_type,
        ph: fieldsData.soil_type.ph || null,
        organic_matter: fieldsData.soil_type.organic_matter || null,
        source: fieldsData.soil_type.source || null,
      });
    }

    // Get the LLM summary/answer
    const askResponse = await mireyeAsk(userQuestion, { lat: latitude, lon: longitude });

    let summary = '';
    let summarySource = null;

    if (askResponse.error) {
      summary = `Unable to generate summary: ${askResponse.error}`;
    } else {
      summary = askResponse.answer || '';
      // Use first source URL as summary_source, or null if none
      summarySource = askResponse.sources && askResponse.sources.length > 0
        ? askResponse.sources[0].url || askResponse.sources[0].title || null
        : null;
    }

    // Derive verdict from facts, not just echoing LLM opinion
    const verdict = deriveVerdictFromFacts(facts);

    res.json({
      location: { lat: latitude, lon: longitude },
      facts,
      summary,
      summary_source: summarySource,
      verdict,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Derive verdict from factual data rather than LLM opinion.
 * Uses flood zone and soil quality as primary signals.
 */
function deriveVerdictFromFacts(facts) {
  let score = 50; // Start neutral

  for (const fact of facts) {
    // Flood zone is a strong signal
    if (fact.field === 'flood_zone') {
      const floodValue = String(fact.value || '').toUpperCase();
      if (floodValue.includes('AE') || floodValue.includes('A') || floodValue.includes('V')) {
        // High-risk flood zones
        score -= 40;
      } else if (floodValue.includes('X')) {
        // Minimal risk
        score += 15;
      }
    }

    // Soil type and organic matter
    if (fact.field === 'soil_type') {
      const soilValue = String(fact.value || '').toLowerCase();
      const organicMatter = fact.organic_matter;

      // Good soils
      if (soilValue.includes('loam') && !soilValue.includes('sandy')) {
        score += 15;
      } else if (soilValue.includes('sandy')) {
        score -= 10;
      } else if (soilValue.includes('clay')) {
        score -= 5;
      }

      // Organic matter is critical
      if (organicMatter !== null && organicMatter !== undefined) {
        if (organicMatter >= 3.0) {
          score += 15;
        } else if (organicMatter >= 2.0) {
          score += 5;
        } else if (organicMatter < 1.5) {
          score -= 15;
        }
      }
    }

    // Elevation (extreme negatives are bad)
    if (fact.field === 'elevation' && fact.value !== null && fact.value !== undefined) {
      if (fact.value < 0) {
        score -= 20; // Below sea level
      } else if (fact.value > 0 && fact.value < 500) {
        score += 5; // Reasonable elevation
      }
    }
  }

  // Convert score to verdict
  if (score >= 70) {
    return 'suitable';
  } else if (score >= 40) {
    return 'marginal';
  } else {
    return 'not suitable';
  }
}
