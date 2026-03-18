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

export const getChats    = ()           => request('/chats')
export const createChat  = (body)       => request('/chats', { method: 'POST', body: JSON.stringify(body) })
export const getChatById = (id)         => request(`/chats/${id}`)
export const deleteChat  = (id)         => request(`/chats/${id}`, { method: 'DELETE' })
export const updateTitle = (id, title)  => request(`/chats/${id}/title`, { method: 'PATCH', body: JSON.stringify({ title }) })
