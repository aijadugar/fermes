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

export type SiteFact = {
  name?: string
  value?: unknown
  source?: string | null
  [key: string]: unknown
}

export type BusinessCandidate = {
  name?: string
  address?: string
  lat?: number
  lon?: number
  rating?: number
  phone?: string
  [key: string]: unknown
}

export type SiteReport = {
  location?: { lat?: number; lon?: number } | null
  facts?: SiteFact[] | null
  summary?: string | null
  summary_source?: string | null
  verdict?: string | null
  [key: string]: unknown
}

const apiUrl = () => process.env.NEXT_PUBLIC_MIREYE_API_URL || 'http://localhost:3000'
const headers = (): HeadersInit => {
  const key = process.env.NEXT_PUBLIC_MIREYE_API_KEY
  return key ? { Authorization: `Bearer ${key}` } : {}
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(typeof body?.error === 'string' ? body.error : `Request failed (${response.status})`)
    Object.assign(error, { detail: body?.detail, status: response.status })
    throw error
  }
  return body as T
}

export async function checkHealth() {
  const response = await fetch(`${apiUrl()}/health`, { cache: 'no-store' })
  return parse<{ ok?: boolean; uptime?: number; ts?: string }>(response)
}

export async function sendAgentMessage(sessionId: string, text: string) {
  const form = new FormData()
  form.set('session_id', sessionId)
  form.set('text', text)
  return parse<AgentResponse>(await fetch(`${apiUrl()}/v1/agent/message`, { method: 'POST', headers: headers(), body: form }))
}

export async function sendAgentAudio(sessionId: string, audio: Blob, languageCode = 'en-IN') {
  const form = new FormData()
  form.set('session_id', sessionId)
  form.set('audio', audio, 'farm-question.webm')
  form.set('language_code', languageCode)
  form.set('respond_with_audio', 'true')
  return parse<AgentResponse>(await fetch(`${apiUrl()}/v1/agent/message`, { method: 'POST', headers: headers(), body: form }))
}

export async function getSiteReport(lat: number, lon: number, question?: string) {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) })
  if (question?.trim()) params.set('question', question.trim())
  return parse<SiteReport>(await fetch(`${apiUrl()}/v1/site-report?${params}`, { headers: headers(), cache: 'no-store' }))
}

export { apiUrl }

export function newSessionId() {
  return `farmai-${crypto.randomUUID()}`
}

export function extractCoordinates(text: string) {
  const match = text.match(/(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/)
  if (!match) return null
  const lat = Number(match[1])
  const lon = Number(match[2])
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { lat, lon }
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export function traceBusinesses(trace: ToolTrace[] = []) {
  return trace.flatMap((item) => {
    if (item.tool !== 'find_nearby_business') return []
    const result = item.result as { candidates?: BusinessCandidate[] } | null
    return result?.candidates || []
  })
}

export function traceHasError(trace: ToolTrace[] = []) {
  return trace.some((item) => Boolean((item.result as { error?: unknown } | null)?.error))
}

export function traceState(item: ToolTrace) {
  return (item.result as { error?: unknown } | null)?.error ? 'Failed' : item.result ? 'Completed' : 'Running'
}

export function formatValue(value: unknown) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function errorDetail(error: unknown) {
  if (error instanceof Error) return { message: error.message, detail: (error as Error & { detail?: unknown }).detail }
  return { message: 'Something went wrong', detail: error }
}
