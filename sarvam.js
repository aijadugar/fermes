import { config } from './config.js';
import { fetchWithRetry } from './http.js';
import { UpstreamError } from './errors.js';

const { apiKey, baseUrl, chatModel, mockMode } = config.sarvam;

// Log startup warning if mock mode is active
if (mockMode) {
  console.warn('[SARVAM] Running in MOCK mode - no real API calls will be made.');
}

function authHeaders(extra = {}) {
  return { 'api-subscription-key': apiKey, ...extra };
}

// Mock LLM responses for eval testing
const MOCK_LLM_RESPONSES = {
  // Responses for site suitability questions with known locations
  'warwick.*suitable': {
    content: 'This site in Warwick, NY is well-suited for small-scale farming. The land has minimal flood risk (Zone X), loam soil with good drainage, and a moderate growing season.',
    tool_calls: [
      {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'check_site_suitability',
          arguments: JSON.stringify({ lat: 41.0, lon: -74.0, question: 'Is this land suitable for farming?' }),
        },
      },
    ],
  },
  'plaquemines.*crop': {
    content: 'This site in Plaquemines Parish is unsuitable for most farming due to extreme flood risk. The land sits below sea level, is in FEMA Zone AE requiring elevated structures, and faces regular hurricane threats.',
    tool_calls: [
      {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'check_site_suitability',
          arguments: JSON.stringify({ lat: 29.0, lon: -90.0, question: 'Can I grow crops here?' }),
        },
      },
    ],
  },
  'hemphill.*soil': {
    content: 'This Texas panhandle site has marginal conditions for farming. While flood risk is low and sun exposure is excellent, the sandy loam soil has very low organic matter (1.1%) and alkaline pH (7.8). Success would require significant soil amendment.',
    tool_calls: [
      {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'check_site_suitability',
          arguments: JSON.stringify({ lat: 36.0, lon: -100.0, question: 'What is the soil quality?' }),
        },
      },
    ],
  },
  'warwick.*good': {
    content: 'Warwick, New York is a good location for farming with suitable soil and low flood risk.',
    tool_calls: [
      {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'resolve_location',
          arguments: JSON.stringify({ address: 'Warwick, NY' }),
        },
      },
      {
        id: 'call_2',
        type: 'function',
        function: {
          name: 'check_site_suitability',
          arguments: JSON.stringify({ lat: 41.0, lon: -74.0, question: 'Is this good for farming?' }),
        },
      },
    ],
  },
  'tomato': {
    content: 'To give you specific advice about growing tomatoes, I need to know your location. Where are you planning to grow them? Different regions have different climate considerations.',
    tool_calls: [],
  },
  'louisiana.*delta': {
    content: 'The Louisiana delta near New Orleans has significant flood risks and is generally unsuitable for traditional farming due to being in a high-risk flood zone (Zone AE).',
    tool_calls: [
      {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'resolve_location',
          arguments: JSON.stringify({ address: 'Louisiana delta near New Orleans' }),
        },
      },
      {
        id: 'call_2',
        type: 'function',
        function: {
          name: 'check_site_suitability',
          arguments: JSON.stringify({ lat: 29.0, lon: -90.0, question: 'Is this suitable for farming?' }),
        },
      },
    ],
  },
  'hemphill.*agriculture': {
    content: 'Hemphill County in the Texas panhandle has marginal soil conditions for agriculture. The sandy loam soil needs significant amendment.',
    tool_calls: [
      {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'resolve_location',
          arguments: JSON.stringify({ address: 'Hemphill County, TX' }),
        },
      },
      {
        id: 'call_2',
        type: 'function',
        function: {
          name: 'check_site_suitability',
          arguments: JSON.stringify({ lat: 36.0, lon: -100.0, question: 'How is the land for agriculture?' }),
        },
      },
    ],
  },
  'seed.*fertilizer': {
    content: 'I can help you find nearby farm supply stores for seeds and fertilizer. Let me search the area around your location.',
    tool_calls: [
      {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'find_nearby_business',
          arguments: JSON.stringify({ lat: 41.0, lon: -74.0, businessType: 'farm supply store' }),
        },
      },
    ],
  },
};

function selectMockResponse(question) {
  const qLower = question.toLowerCase();
  for (const [pattern, response] of Object.entries(MOCK_LLM_RESPONSES)) {
    if (qLower.match(pattern.replace(/\.\*/g, '.*'))) {
      return response;
    }
  }
  // Default fallback
  return {
    content: 'I understand your question. Let me help you with that.',
    tool_calls: [],
  };
}

export async function chatCompletion({ messages, tools, model = chatModel, temperature = 0.3, maxTokens = 1024 }) {
  if (mockMode) {
    // Return mock response based on the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const mockResponse = selectMockResponse(lastUserMessage);
    
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: mockResponse.content,
            tool_calls: mockResponse.tool_calls || [],
          },
        },
      ],
    };
  }
  
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
