import { useState } from 'react'
import { tokenStore } from '../services/token'

const BASE = import.meta.env.VITE_API_URL || '/api'

async function submitFeedback(trainingId, feedback) {
  const token = tokenStore.get()
  const res = await fetch(`${BASE}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ training_id: trainingId, feedback }),
  })
  if (!res.ok) throw new Error('Failed to submit feedback')
  return res.json()
}

export default function FeedbackButtons({ trainingId, usedFallback }) {
  const [voted,   setVoted]   = useState(null)   // null | 1 | -1
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  if (!trainingId) return null

  const handleVote = async (value) => {
    if (voted !== null || loading) return
    setLoading(true)
    setError('')
    try {
      await submitFeedback(trainingId, value)
      setVoted(value)
    } catch {
      setError('Could not save feedback')
      setTimeout(() => setError(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 mt-1.5 px-1">
      {/* Fallback note */}
      {usedFallback && (
        <span
          className="text-xs px-2 py-0.5 rounded-full mr-1"
          style={{
            background: 'rgba(245,158,11,0.1)',
            border:     '1px solid rgba(245,158,11,0.2)',
            color:      '#f59e0b',
            fontSize:   '0.6rem',
          }}
        >
          ⚡ Gemini fallback
        </span>
      )}

      {/* Feedback label */}
      {voted === null && !loading && (
        <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
          Was this helpful?
        </span>
      )}

      {/* Thumbs up */}
      <button
        onClick={() => handleVote(1)}
        disabled={voted !== null || loading}
        title="Helpful — trains the free model"
        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all disabled:cursor-not-allowed"
        style={{
          background: voted === 1
            ? 'rgba(16,185,129,0.2)'
            : 'var(--bg-elevated)',
          border: `1px solid ${voted === 1 ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
          color: voted === 1 ? '#10b981' : 'var(--text-muted)',
          opacity: voted === -1 ? 0.35 : 1,
        }}
      >
        {loading ? (
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M8.834.066C7.662-.087 6.9.814 6.9 1.71V3.16c0 .538-.212 1.026-.556 1.386-.332.347-.794.6-1.395.676L3 5.48A1.5 1.5 0 001.5 6.973v4.56A1.5 1.5 0 003 13.026l1.948.243c.508.063.957.307 1.29.654.346.36.56.848.56 1.386v.45c0 .895.761 1.796 1.933 1.643C9.578 17.36 11.5 15.51 11.5 13.14V10.5h1A2.5 2.5 0 0015 8V7a2.5 2.5 0 00-2.5-2.5h-1V3.17C11.5 1.2 10.248-.198 8.834.066z"/>
          </svg>
        )}
      </button>

      {/* Thumbs down */}
      <button
        onClick={() => handleVote(-1)}
        disabled={voted !== null || loading}
        title="Not helpful"
        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all disabled:cursor-not-allowed"
        style={{
          background: voted === -1
            ? 'rgba(239,68,68,0.15)'
            : 'var(--bg-elevated)',
          border: `1px solid ${voted === -1 ? 'rgba(239,68,68,0.35)' : 'var(--border)'}`,
          color: voted === -1 ? '#f87171' : 'var(--text-muted)',
          opacity: voted === 1 ? 0.35 : 1,
        }}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"
          style={{ transform: 'rotate(180deg)' }}>
          <path d="M8.834.066C7.662-.087 6.9.814 6.9 1.71V3.16c0 .538-.212 1.026-.556 1.386-.332.347-.794.6-1.395.676L3 5.48A1.5 1.5 0 001.5 6.973v4.56A1.5 1.5 0 003 13.026l1.948.243c.508.063.957.307 1.29.654.346.36.56.848.56 1.386v.45c0 .895.761 1.796 1.933 1.643C9.578 17.36 11.5 15.51 11.5 13.14V10.5h1A2.5 2.5 0 0015 8V7a2.5 2.5 0 00-2.5-2.5h-1V3.17C11.5 1.2 10.248-.198 8.834.066z"/>
        </svg>
      </button>

      {/* Voted confirmation */}
      {voted !== null && (
        <span className="text-xs" style={{
          color: voted === 1 ? '#10b981' : 'var(--text-muted)',
          fontSize: '0.65rem',
        }}>
          {voted === 1 ? '✓ Thanks! This helps train the free model.' : '✓ Noted.'}
        </span>
      )}

      {error && (
        <span className="text-xs" style={{ color: '#f87171', fontSize: '0.65rem' }}>{error}</span>
      )}
    </div>
  )
}
