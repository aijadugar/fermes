---
name: sarvam-ai
description: Use this skill whenever writing, debugging, or extending code in this repo that calls Sarvam AI — chat completions (LLM + tool calling), speech-to-text, or text-to-speech. Trigger on any mention of Sarvam, sarvam-105b/sarvam-30b, saarika, saaras, bulbul, STT, TTS, or on any change to src/services/sarvam.js, src/agent/orchestrator.js, or src/agent/tools.js. Also consult this before adding new Sarvam-backed features (streaming, diarization, batch STT, new languages) so the request shape and gotchas below aren't re-derived from scratch.
---

# Sarvam AI integration (this project)

This project uses three Sarvam AI endpoints. All requests need the
`api-subscription-key` header (or `Authorization: Bearer <key>` for
OpenAI-compatible tooling) — never both on the same request.

Base URL: `https://api.sarvam.ai` (see `SARVAM_BASE_URL` in `.env`).

## 1. Chat completions (the agent's brain)

`POST /v1/chat/completions` — OpenAI-compatible request/response shape.

- Models: prefer `sarvam-30b` (64K context, cheaper/faster) or `sarvam-105b`
  (128K context, stronger tool-use). `sarvam-m` (24B) is deprecated — don't
  use it in new code.
- **Thinking mode is ON by default** (`reasoning_effort: "low"`). Reasoning
  tokens count against `max_tokens` and are returned separately as
  `reasoning_content`. If `max_tokens` is small, the entire budget can be
  consumed by reasoning, leaving `content` empty with
  `finish_reason: "length"`. This project sets `reasoning_effort: null` in
  `src/services/sarvam.js` to disable thinking mode for latency — only
  re-enable it (e.g. `"low"`) if tool-call quality on hard queries needs it,
  and raise `max_tokens` accordingly if you do.
- Tool calling uses the standard OpenAI `tools=[{type:"function", function:{...}}]`
  shape and returns `message.tool_calls[].function.{name,arguments}` (arguments
  is a JSON string — parse it). This project's tool loop lives in
  `src/agent/orchestrator.js`; tool schemas live in `src/agent/tools.js`.
- `response_format` with `json_schema` + `strict: true` is supported for
  structured JSON output if a feature needs it later.

## 2. Speech-to-text (voice input)

Two REST variants, both `multipart/form-data` with the audio under `file`:

- `POST /speech-to-text` — transcribe in the spoken language. Model:
  `saarika:v2.5`. Use when you want text in the original language.
- `POST /speech-to-text-translate` — transcribe **and translate to English**
  regardless of spoken language. Model: `saaras:v2`. Use this instead if the
  agent's downstream logic assumes English input.

Both take `language_code` (BCP-47, e.g. `hi-IN`, or `unknown` to
auto-detect) and return `{transcript, language_code}`. This project wraps
both behind `transcribeAudio(buffer, filename, {languageCode, translate})`
in `src/services/sarvam.js` — pass `translate: true` to hit the translate
variant.

A WebSocket endpoint (`wss://api.sarvam.ai/speech-to-text/ws`) exists for
real-time streaming transcription if a future feature needs live captions
during voice input instead of record-then-send. Not implemented here yet —
if adding it, keep the existing REST path as the non-streaming fallback.

## 3. Text-to-speech (voice output)

`POST /text-to-speech` — JSON body, NOT multipart.

- Fields: `text`, `target_language_code` (BCP-47), `speaker`, `model`.
- Default speaker is `shubh` for `bulbul:v3`, `anushka` for `bulbul:v2`. This
  project defaults to `bulbul:v3` / `shubh` in `textToSpeech()`.
- **Response is base64-encoded audio** under `audios[0]` — the caller must
  decode it before playback/saving. This project returns the base64 string
  as-is (`audio_base64` in the API response) and leaves decoding to the
  frontend, since the three.js client will likely play it directly via the
  Web Audio API rather than needing a decoded buffer server-side.

## Common mistakes to avoid in this codebase

- Don't set `Content-Type` manually on STT requests — `FormData` sets the
  multipart boundary itself; an explicit header breaks the upload.
- Don't send both `api-subscription-key` and `Authorization: Bearer` on one
  request — pick one auth style per call (this project uses
  `api-subscription-key` everywhere for consistency).
- Don't forget `reasoning_effort: null` when touching chat completions, or
  latency will regress and short `max_tokens` values will silently return
  empty replies.
- STT/TTS language codes must be BCP-47 (`hi-IN`, `ta-IN`, `en-IN`), not
  bare language names.

## Where this lives in the codebase

- `src/services/sarvam.js` — all three API wrappers
- `src/agent/orchestrator.js` — the chat-completions tool-calling loop
- `src/agent/tools.js` — tool schemas passed to chat completions
- `src/routes/agent.js` — HTTP layer that decides STT vs text input, and
  whether to call TTS on the way out

## Reference

Full docs: https://docs.sarvam.ai — check here before implementing anything
not covered above (batch STT jobs, diarization, streaming TTS, new models),
since Sarvam's model lineup and endpoints change over time.
