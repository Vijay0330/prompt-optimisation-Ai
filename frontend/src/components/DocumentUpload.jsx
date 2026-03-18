import { useState, useRef, useEffect } from 'react'
import { tokenStore } from '../services/token'

const BASE = import.meta.env.VITE_API_URL || '/api'

async function apiRequest(path, options = {}) {
  const token = tokenStore.get()
  const headers = {
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

export default function DocumentUpload({ onClose }) {
  const [docs,      setDocs]      = useState([])
  const [uploading, setUploading] = useState(false)
  const [deleting,  setDeleting]  = useState(null)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const fileRef = useRef(null)

  const loadDocs = async () => {
    try {
      const data = await apiRequest('/documents')
      setDocs(data.documents || [])
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { loadDocs() }, [])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    setSuccess('')

    const form = new FormData()
    form.append('file', file)
    form.append('doc_title', file.name.replace(/\.[^.]+$/, ''))

    try {
      const data = await apiRequest('/documents/upload', { method: 'POST', body: form })
      setSuccess(data.message)
      await loadDocs()
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (filename) => {
    setDeleting(filename)
    setError('')
    try {
      await apiRequest(`/documents/${encodeURIComponent(filename)}`, { method: 'DELETE' })
      setDocs(prev => prev.filter(d => d.filename !== filename))
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden animate-slide-up"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lg)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-base">📚</span>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Your Knowledge Base
          </p>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">

        {/* Upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all"
          style={{ borderColor: 'var(--border-strong)' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
        >
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.rst"
            className="hidden" onChange={handleUpload} />

          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent)' }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Uploading and indexing...</p>
            </div>
          ) : (
            <>
              <span className="text-3xl block mb-2">📎</span>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Click to upload a document
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                PDF, TXT, MD — max 10MB
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                Documents are embedded into your personal RAG index and used to ground AI responses
              </p>
            </>
          )}
        </div>

        {/* Status messages */}
        {success && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
            <span>✓</span> {success}
          </div>
        )}
        {error && (
          <div className="px-3 py-2 rounded-xl text-xs"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Document list */}
        {docs.length === 0 ? (
          <p className="text-center text-xs py-2" style={{ color: 'var(--text-muted)' }}>
            No documents yet. Upload your first file above.
          </p>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto scrollbar-sidebar">
            <p className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
              Indexed Documents ({docs.length})
            </p>
            {docs.map(doc => (
              <div key={doc.filename}
                className="flex items-center gap-2 p-2.5 rounded-xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <span className="text-base flex-shrink-0">
                  {doc.filename.endsWith('.pdf') ? '📄' : '📝'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {doc.title || doc.filename}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                    {doc.total_chunks} chunks · {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(doc.filename)}
                  disabled={deleting === doc.filename}
                  className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                >
                  {deleting === doc.filename ? (
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 000 1.5h.3l.815 8.15A1.5 1.5 0 005.357 15h5.285a1.5 1.5 0 001.493-1.35l.815-8.15h.3a.75.75 0 000-1.5H11v-.75A2.25 2.25 0 008.75 1h-1.5A2.25 2.25 0 005 3.25z" clipRule="evenodd"/>
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
