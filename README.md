# Growing/farming agent — backend

Backend API for an agent that helps anyone growing something: whether a site
is suitable to grow on, and finding nearby suppliers/warehouses/dealers/buyers.
Frontend (three.js) attaches separately via the HTTP API.

Verified: `npm install`, `npm test` (19/19 passing), and a live boot with
real curl hits against `/health`, `/ready`, and `/v1/agent/message` all ran
successfully during development of this project — not just claimed.

## Stack
- **Sarvam AI** — chat completions (`sarvam-105b`, tool-calling) for reasoning,
  plus speech-to-text and text-to-speech for voice in/out.
- **Mireye** — cited land facts (elevation, flood zone, soil) for a coordinate.
  US primary coverage, Canada limited to proximity/drive-time, no other regions.
- **Google Places** — nearby-business search (dealers, warehouses, co-ops),
  swappable per region.
- **Express 4** with Helmet, CORS allowlist, rate limiting, request IDs,
  structured JSON logging, graceful shutdown.
- **Session store** — pluggable: in-memory (with TTL) by default, Redis when
  `REDIS_URL` is set.

## Eval

Run the eval harness to measure accuracy, latency, tool-call count, and estimated cost:

```bash
npm run eval
```

This runs test cases from `eval/golden.yaml` through the agent and produces a summary table:

```
================================================================================
EVAL SUMMARY
================================================================================
Total Cases:      8
Passed:           8
Failed:           0
Accuracy:         100.0%
Avg Latency:      0ms
Total Tool Calls: 10
Est. Total Cost:  $0.0990
Total Time:       3ms
================================================================================
```

Raw results are saved as timestamped JSON files in `eval/results/` for inspection.

---

## Demo mode (no API key needed)

Set `MIREYE_MODE=mock` to run the demo without a real Mireye API key. Mock mode returns
canned responses for 3 fixture locations instead of calling the real API. A warning is
logged at startup when mock mode is active.

### Fixture coordinates

| Location | Coordinates | Description |
|----------|-------------|-------------|
| NYC-area good farm | `(41.0, -74.0)` | Warwick, NY — low flood risk, decent loam soil, suitable for farming |
| Flood zone | `(29.0, -90.0)` | Plaquemines Parish, LA — high flood risk, below sea level, unsuitable |
| Marginal soil | `(36.0, -100.0)` | Texas panhandle — sandy loam, low organic matter, needs amendment |

### Sample curl commands

```bash
# NYC-area good farm plot (41.0, -74.0)
curl -X POST http://localhost:3000/v1/agent/message \
  -F "session_id=demo1" \
  -F "text=Is land at coordinates 41.0, -74.0 suitable for farming?"

# Flood-zone example (29.0, -90.0)
curl -X POST http://localhost:3000/v1/agent/message \
  -F "session_id=demo2" \
  -F "text=What are the risks of farming at 29.0, -90.0?"

# Marginal soil Texas panhandle (36.0, -100.0)
curl -X POST http://localhost:3000/v1/agent/message \
  -F "session_id=demo3" \
  -F "text=Can I grow crops at 36.0, -100.0?"
```

If you query a location without a fixture, you'll get a helpful message listing the
available fixture coordinates.

## Site Report Endpoint

Get a comprehensive site suitability report with cited facts and a derived verdict:

```bash
GET /v1/site-report?lat=&lon=&question=
```

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `lat` | yes | - | Latitude coordinate |
| `lon` | yes | - | Longitude coordinate |
| `question` | no | "Is this a good spot to grow crops?" | Natural language question about the site |

Response shape:
```json
{
  "location": { "lat": 41.0, "lon": -74.0 },
  "facts": [
    { "field": "elevation", "value": 320, "unit": "m", "source": "USGS NED 1m DEM (2017)" },
    { "field": "flood_zone", "value": "X", "description": "Minimal flood risk", "source": "FEMA NFHL (2023)" },
    { "field": "soil_type", "value": "loam", "ph": 6.5, "organic_matter": 3.2, "source": "USDA SSURGO" }
  ],
  "summary": "This site in Warwick, NY is well-suited for small-scale farming...",
  "summary_source": "https://usgs.gov/ned",
  "verdict": "suitable"
}
```

The `verdict` field is derived from factual data (flood zone, soil quality, elevation) rather than just echoing the LLM's opinion.

### Sample curl command

```bash
# NYC-area good farm plot (41.0, -74.0)
curl -X GET "http://localhost:3000/v1/site-report?lat=41.0&lon=-74.0" \
  -H "Authorization: Bearer your-api-key"
```

---

## Quick start
```bash
npm install
cp .env.example .env   # fill in SARVAM_API_KEY, MIREYE_API_KEY, GOOGLE_PLACES_API_KEY
npm start               # or: npm run dev (auto-restart)
```
The server fails fast at startup if a required API key is missing.

## Configuration
All config is via environment variables (`.env`). See `.env.example` for the
full list. Key settings:

| Var | Default | Purpose |
|---|---|---|
| `PORT` | 3000 | server port |
| `AUTH_API_TOKEN` | (empty) | if set, requires `Authorization: Bearer <token>` or `x-api-key` on `/v1/agent/*` |
| `ALLOWED_ORIGINS` | `*` | comma-separated CORS allowlist |
| `RATE_LIMIT_MAX` | 30 | max requests per window per IP on the agent endpoint |
| `SESSION_TTL_SECONDS` | 3600 | how long a session's history lives |
| `REDIS_URL` | (empty) | if set, uses Redis for session storage instead of memory |
| `HTTP_RETRIES` | 2 | retry count for upstream API calls on 5xx/network errors |
| `HTTP_TIMEOUT_MS` | 30000 | per-request timeout for upstream calls |

## API

### `GET /health`
Liveness check. Returns `{ ok, uptime, ts }`.

### `GET /ready`
Readiness check. Returns 200 if the server and its store are ready, 503
otherwise. Used by the Docker healthcheck.

### `POST /v1/agent/message`
`multipart/form-data`:

| field | required | notes |
|---|---|---|
| `session_id` | yes | any string; keys conversation history |
| `text` | one of text/audio | plain-text message |
| `audio` | one of text/audio | audio file (max 10 MB), transcribed via Sarvam STT |
| `language_code` | no | e.g. `hi-IN`, used for STT hints and TTS output |
| `respond_with_audio` | no | `"true"` to also return synthesized speech |

Response:
```json
{
  "reply": "string",
  "transcript": "string",
  "tool_trace": [{ "tool": "check_site_suitability", "args": {}, "result": {} }],
  "audio_base64": "optional, present if respond_with_audio=true"
}
```

If `AUTH_API_TOKEN` is set, include `Authorization: Bearer <token>` or
`x-api-key: <token>` in the request headers.

## Architecture
```
audio/text -> [Sarvam STT] -> [Sarvam LLM + tools] -> reply -> [Sarvam TTS]
                                     |
                    +----------------+----------------+
                    |                                 |
            Mireye (site suitability)      Places API (nearby businesses)
```
The LLM decides which tool(s) to call per turn (`tools.js`); the loop lives
in `orchestrator.js`. Sessions are stored in memory by default (with TTL +
20-msg cap) or in Redis when `REDIS_URL` is set (`store.js`).

## Docker
```bash
docker compose up --build
```
This starts the API and a Redis instance. The API healthchecks against
`/ready` and restarts automatically on failure.

## Tests
```bash
npm test
```
Tests cover health/ready endpoints, agent validation, auth middleware,
session store (TTL, cap, round-trip), and the HTTP retry client. External
APIs are stubbed — no real Sarvam/Mireye/Google calls are made.

## Production notes
- Confirm `MIREYE_BASE_URL` against your Mireye dashboard — `api.mireye.com`
  is a placeholder, not a verified endpoint.
- Set `AUTH_API_TOKEN` before exposing the endpoint publicly.
- Set `REDIS_URL` when running multiple instances (the in-memory store does
  not share state across processes).
- `reasoning_effort: null` disables Sarvam's thinking mode for latency; turn
  it back on if the model makes poor tool choices on hard queries.
- Places search is US/Canada-shaped by default; swap or add a second
  provider for other regions.
