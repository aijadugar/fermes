# Growing/farming agent — backend

Backend API for an agent that helps anyone growing something: whether a site is
suitable to grow on, and finding nearby suppliers/warehouses/dealers/buyers.
Frontend (three.js) attaches separately via the HTTP API below.

## Stack
- **Sarvam AI** — chat completions (`sarvam-105b`, tool-calling) for reasoning,
  plus speech-to-text and text-to-speech for voice in/out.
- **Mireye** — cited land facts (elevation, flood zone, soil) for a coordinate.
  **US primary coverage, Canada limited to proximity/drive-time, no other
  regions.** It is not a business directory.
- **Google Places** — nearby-business search (dealers, warehouses, co-ops),
  swappable per region.

## Setup
```bash
npm install
cp .env.example .env   # fill in SARVAM_API_KEY, MIREYE_API_KEY, GOOGLE_PLACES_API_KEY
npm start               # or: npm run dev (auto-restart)
```

Confirm `MIREYE_BASE_URL` against your actual Mireye dashboard/docs before
relying on it — `src/services/mireye.js` uses a placeholder base URL.

## API

### `GET /health`
Liveness check.

### `POST /v1/agent/message`
`multipart/form-data`:

| field | required | notes |
|---|---|---|
| `session_id` | yes | any string; keys conversation history |
| `text` | one of text/audio | plain-text message |
| `audio` | one of text/audio | audio file, transcribed via Sarvam STT |
| `language_code` | no | e.g. `hi-IN`, used for STT hints and TTS output |
| `respond_with_audio` | no | `"true"` to also return synthesized speech |

Response:
```json
{
  "reply": "string",
  "transcript": "string (echoes what was understood, useful to show in UI)",
  "tool_trace": [{ "tool": "check_site_suitability", "args": {...}, "result": {...} }],
  "audio_base64": "optional, present if respond_with_audio=true"
}
```

## Architecture
```
audio/text -> [Sarvam STT] -> [Sarvam LLM + tools] -> reply -> [Sarvam TTS]
                                     |
                    +----------------+----------------+
                    |                                 |
            Mireye (site suitability)      Places API (nearby businesses)
```
The LLM decides which tool(s) to call per turn (`src/agent/tools.js`); the
loop lives in `src/agent/orchestrator.js`. Sessions are in-memory
(`src/session/store.js`) — swap for Redis/a DB before running multiple
server instances or needing history to survive restarts.

## Known gaps to close before production
- Mireye base URL/paths are unverified — confirm against your account's docs.
- No auth on `/v1/agent/message` yet — add a token/session check before
  exposing this publicly.
- `reasoning_effort: null` disables Sarvam's thinking mode for latency; turn
  it back on if you see the model making bad tool choices on hard queries.
- Places search is US/Canada-shaped by default (Google Places); swap or add
  a second provider for other regions.
