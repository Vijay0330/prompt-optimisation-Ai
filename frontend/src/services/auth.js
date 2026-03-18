import { tokenStore } from './token'

const BASE = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  const token = tokenStore.get()

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }

  return res.status === 204 ? null : res.json()
}

// ── Auth API calls ─────────────────────────────────────────────────────────────

export async function loginUser(email, password) {
  // No token needed for login — but the response contains the token
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  // Save token immediately after login
  if (data?.token) tokenStore.set(data.token)
  return data
}

export async function registerUser(email, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  // Save token immediately after register
  if (data?.token) tokenStore.set(data.token)
  return data
}

export async function logoutUser() {
  try {
    await request('/auth/logout', { method: 'POST' })
  } finally {
    // Always clear local token even if server request fails
    tokenStore.clear()
  }
}

export async function getMe() {
  return request('/auth/me')
}

export async function updatePreferredModel(model) {
  return request('/auth/model', {
    method: 'PATCH',
    body: JSON.stringify({ preferred_model: model }),
  })
}
