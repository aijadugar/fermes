import { config } from './config.js';

const { apiKey, baseUrl, chatModel } = config.sarvam;

function authHeaders(extra = {}) {
  return {
    'api-subscription-key': apiKey,
    ...extra
  };
}

/**
 * OpenAI-compatible chat completions.
 * Docs: POST https://api.sarvam.ai/v1/chat/completions
 * Supports tool calling (function calling) — pass `tools` in the
 * OpenAI tools=[{type:"function", function:{...}}] shape.
 */
export async function chatCompletion({ messages, tools, model = chatModel, temperature = 0.3, maxTokens = 1024 }) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    // Thinking mode is on by default and can eat the whole max_tokens budget
    // on reasoning before ever emitting content. Disable for latency-sensitive
    // agent turns; re-enable (e.g. "low") if you need deeper reasoning.
    reasoning_effort: null
  };
  if (tools?.length) body.tools = tools;

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Sarvam chat completion failed: ${res.status} ${await res.text()}`);
  }
  return res.json(); // OpenAI-shaped response: choices[0].message
}

/**
 * Speech-to-text (single-turn, non-streaming).
 * Docs: POST https://api.sarvam.ai/speech-to-text (multipart/form-data)
 * Use speech-to-text-translate instead if you want direct English output
 * regardless of the spoken language.
 */
export async function transcribeAudio(fileBuffer, filename, { languageCode = 'unknown', translate = false } = {}) {
  const form = new FormData();
  form.append('file', new Blob([fileBuffer]), filename || 'audio.wav');
  form.append('model', translate ? 'saaras:v2' : 'saarika:v2.5');
  form.append('language_code', languageCode);

  const endpoint = translate ? 'speech-to-text-translate' : 'speech-to-text';
  const res = await fetch(`${baseUrl}/${endpoint}`, {
    method: 'POST',
    headers: authHeaders(), // do NOT set Content-Type — FormData sets the multipart boundary
    body: form
  });

  if (!res.ok) {
    throw new Error(`Sarvam STT failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return { text: data.transcript, languageDetected: data.language_code };
}

/**
 * Text-to-speech. Returns base64-encoded audio (caller decodes to bytes).
 * Docs: POST https://api.sarvam.ai/text-to-speech
 */
export async function textToSpeech(text, { languageCode = 'hi-IN', speaker = 'shubh', model = 'bulbul:v3' } = {}) {
  const res = await fetch(`${baseUrl}/text-to-speech`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      text,
      target_language_code: languageCode,
      speaker,
      model
    })
  });

  if (!res.ok) {
    throw new Error(`Sarvam TTS failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.audios?.[0]; // base64 string
}
