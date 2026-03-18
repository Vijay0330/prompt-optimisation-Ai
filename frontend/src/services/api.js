import { tokenStore } from './token'

const BASE = import.meta.env.VITE_API_URL || '/api'

// ── Core request helper ───────────────────────────────────────────────────────
// Attaches Authorization: Bearer <token> on every request automatically.
async function request(path, options = {}) {
  const token = tokenStore.get()

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const detail = err.detail || `Request failed: ${res.status}`
    if (res.status === 429 || detail.toLowerCase().includes('rate limit')) {
      throw new Error('⏳ Rate limit reached (free tier: 15 req/min). Wait 60s and retry.')
    }
    throw new Error(detail)
  }

  return res.status === 204 ? null : res.json()
}

// ── Prompt analysis ───────────────────────────────────────────────────────────
export async function analyzePrompt(prompt, mode, model, chatId) {
  return request('/prompt-analyze', {
    method: 'POST',
    body: JSON.stringify({ prompt, mode, model, chat_id: chatId }),
  })
}
