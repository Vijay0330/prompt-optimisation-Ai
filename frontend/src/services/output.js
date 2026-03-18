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

/**
 * Generate an output (image / pdf / ppt)
 * @param {string} prompt
 * @param {'image'|'pdf'|'ppt'} outputType
 * @param {string} model
 * @param {string|null} chatId
 * @param {object|null} pptOptions  { theme, font_size, custom_header }
 */
export async function generateOutput(prompt, outputType, model, chatId, pptOptions = null) {
  return request('/generate-output', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      output_type: outputType,
      model,
      chat_id: chatId,
      ppt_options: pptOptions,
    }),
  })
}

/**
 * Open a base64 file in a new browser tab.
 * Works for both PDF and PPTX.
 */
export function openFileInTab(fileB64, mimeType, filename) {
  const byteChars  = atob(fileB64)
  const byteArrays = []
  for (let i = 0; i < byteChars.length; i += 512) {
    const slice = byteChars.slice(i, i + 512)
    const bytes = new Uint8Array(slice.length)
    for (let j = 0; j < slice.length; j++) bytes[j] = slice.charCodeAt(j)
    byteArrays.push(bytes)
  }
  const blob = new Blob(byteArrays, { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.target   = '_blank'
  a.rel      = 'noopener'
  // For PPTX, trigger download since browsers can't render it
  if (mimeType.includes('presentation')) {
    a.download = filename
  }
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
