// Fermes AI Chatbot API helper
// Uses environment variables for API configuration

export type ToolTrace = {
  tool?: string
  args?: Record<string, unknown> | null
  result?: unknown
}

export type AgentResponse = {
  reply?: string | null
  transcript?: string | null
  tool_trace?: ToolTrace[] | null
  audio?: string | null
  audio_url?: string | null
  [key: string]: unknown
}

const apiUrl = () =>
  process.env.NEXT_PUBLIC_MIREYE_API_URL

const apiToken = () =>
  process.env.NEXT_PUBLIC_MIREYE_API_KEY

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(
      typeof body?.error === 'string'
        ? body.error
        : `Request failed (${response.status})`
    )
    Object.assign(error, {
      detail: body?.detail,
      status: response.status
    })
    throw error
  }
  return body as T
}

/**
 * Send a text message to the Fermes AI agent
 */
export async function sendTextMessage(
  sessionId: string,
  text: string
): Promise<AgentResponse> {
  const formData = new FormData()
  formData.append('session_id', sessionId)
  formData.append('text', text)

  const response = await fetch(`${apiUrl()}/v1/agent/message`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken()}`,
    },
    body: formData,
  })

  return parse<AgentResponse>(response)
}

/**
 * Send an audio message to the Fermes AI agent (Boost mode)
 */
export async function sendVoiceMessage(
  sessionId: string,
  audio: Blob | File,
  languageCode = 'en-IN',
  respondWithAudio = true
): Promise<AgentResponse> {
  const formData = new FormData()
  formData.append('session_id', sessionId)

  const fileName = audio instanceof File ? audio.name : 'voice-message.webm'
  formData.append('audio', audio, fileName)
  formData.append('language_code', languageCode)
  formData.append('respond_with_audio', respondWithAudio ? 'true' : 'false')

  const response = await fetch(`${apiUrl()}/v1/agent/message`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken()}`,
    },
    body: formData,
  })

  return parse<AgentResponse>(response)
}

/**
 * Generate a new session ID for the chat
 */
export function newSessionId(): string {
  return `fermes-${crypto.randomUUID()}`
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<{ ok?: boolean; uptime?: number; ts?: string }> {
  try {
    const response = await fetch(`${apiUrl()}/health`, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${apiToken()}`,
      }
    })
    return parse<{ ok?: boolean; uptime?: number; ts?: string }>(response)
  } catch {
    return {}
  }
}