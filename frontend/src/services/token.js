// ── Token storage ─────────────────────────────────────────────────────────────
// We store the JWT in localStorage and send it as Authorization: Bearer on every
// request. The backend reads it from the header (see core/security.py).
// This approach works reliably with the Vite dev proxy and avoids httpOnly cookie
// cross-port issues between localhost:5173 and localhost:8000.

const TOKEN_KEY = 'pia_token'

export const tokenStore = {
  get:    ()      => localStorage.getItem(TOKEN_KEY),
  set:    (token) => localStorage.setItem(TOKEN_KEY, token),
  clear:  ()      => localStorage.removeItem(TOKEN_KEY),
}
