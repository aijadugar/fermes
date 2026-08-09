import { config } from './config.js';
import { fetchWithRetry } from './http.js';
import { UpstreamError } from './errors.js';

const { apiKey, baseUrl, chatModel } = config.sarvam;

function authHeaders(extra = {}) {
  return { 'api-subscription-key': apiKey, ...extra };
}

export async function chatCompletion({ messages, tools, model = chatModel, temperature = 0.3, maxTokens = 1024 }) {
  const body = { model, messages, temperature, max_tokens: maxTokens, reasoning_effort: null };
  if (tools?.length) body.tools = tools;

  const res = await fetchWithRetry(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new UpstreamError(`Sarvam chat completion failed: ${res.status} ${text.slice(0, 500)}`, {
      details: { status: res.status, provider: 'sarvam' },
    });
  }
  return res.json();
}

export async function transcribeAudio(fileBuffer, filename, { languageCode = 'unknown', translate = false } = {}) {
  const form = new FormData();
  form.append('file', new Blob([fileBuffer]), filename || 'audio.wav');
  form.append('model', translate ? 'saaras:v2' : 'saarika:v2.5');
  form.append('language_code', languageCode);

  const endpoint = translate ? 'speech-to-text-translate' : 'speech-to-text';
  const res = await fetchWithRetry(`${baseUrl}/${endpoint}`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new UpstreamError(`Sarvam STT failed: ${res.status} ${text.slice(0, 500)}`, {
      details: { status: res.status, provider: 'sarvam' },
    });
  }
  const data = await res.json();
  return { text: data.transcript, languageDetected: data.language_code };
}

export async function textToSpeech(text, { languageCode = 'hi-IN', speaker = 'shubh', model = 'bulbul:v3' } = {}) {
  const res = await fetchWithRetry(`${baseUrl}/text-to-speech`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ text, target_language_code: languageCode, speaker, model }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new UpstreamError(`Sarvam TTS failed: ${res.status} ${errText.slice(0, 500)}`, {
      details: { status: res.status, provider: 'sarvam' },
    });
  }
  const data = await res.json();
  return data.audios?.[0];
}
