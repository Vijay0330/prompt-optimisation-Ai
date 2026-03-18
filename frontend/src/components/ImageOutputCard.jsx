import { useState } from 'react'

export default function ImageOutputCard({ imageUrl, prompt }) {
  const [loaded,  setLoaded]  = useState(false)
  const [error,   setError]   = useState(false)
  const [loading, setLoading] = useState(true)

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = 'generated-image.jpg'
    a.target = '_blank'
    a.rel = 'noopener'
    a.click()
  }

  return (
    <div
      className="rounded-2xl overflow-hidden msg-enter max-w-xl"
      style={{
        border: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--border)', background: 'rgba(99,102,241,0.05)' }}
      >
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center text-sm"
          style={{ background: 'rgba(99,102,241,0.15)' }}
        >
          🎨
        </div>
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--accent)', fontSize: '0.65rem' }}
        >
          Generated Image
        </span>
      </div>

      {/* Image area */}
      <div
        className="relative"
        style={{ background: 'var(--bg-elevated)', minHeight: '200px' }}
      >
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="flex gap-1">
              {[0, 150, 300].map(d => (
                <span
                  key={d}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: 'var(--accent)', animationDelay: `${d}ms` }}
                />
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Generating image…
            </p>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <span className="text-3xl">😕</span>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Image failed to load. Try again.
            </p>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={prompt}
            className="w-full object-cover transition-opacity duration-500"
            style={{ opacity: loaded ? 1 : 0, maxHeight: '400px' }}
            onLoad={() => { setLoaded(true); setLoading(false) }}
            onError={() => { setError(true); setLoading(false) }}
          />
        )}
      </div>

      {/* Prompt + actions */}
      <div className="px-4 py-3">
        <p className="text-xs mb-3 italic line-clamp-2" style={{ color: 'var(--text-muted)' }}>
          "{prompt}"
        </p>
        <div className="flex items-center gap-2">
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
            }}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M8.75 2.75a.75.75 0 00-1.5 0v5.69L5.03 6.22a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 00-1.06-1.06L8.75 8.44V2.75z"/>
              <path d="M3.5 9.75a.75.75 0 00-1.5 0v1.5A2.75 2.75 0 004.75 14h6.5A2.75 2.75 0 0014 11.25v-1.5a.75.75 0 00-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5z"/>
            </svg>
            Open Full Size
          </a>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M8 1a.75.75 0 01.75.75v5.793l1.97-2.047a.75.75 0 111.08 1.04l-3.25 3.375a.75.75 0 01-1.08 0L4.22 6.536a.75.75 0 111.08-1.04L7.25 7.543V1.75A.75.75 0 018 1zM1.75 11a.75.75 0 01.75.75v1.5c0 .138.112.25.25.25h10.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 0113.25 15H2.75A1.75 1.75 0 011 13.25v-1.5A.75.75 0 011.75 11z" clipRule="evenodd"/>
            </svg>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
