import { useState } from 'react'

const TYPE_META = {
  knowledge_base:  { icon: '🧠', label: 'Knowledge Base', color: '#6366f1' },
  user_document:   { icon: '📄', label: 'Your Document',  color: '#10b981' },
  web_search:      { icon: '🌐', label: 'Web Search',     color: '#f59e0b' },
}

export default function RagSourcesPanel({ citations, ragUsed }) {
  const [open, setOpen] = useState(false)

  if (!ragUsed || !citations || citations.length === 0) return null

  return (
    <div className="mt-2 rounded-xl overflow-hidden animate-fade-in"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>

      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-soft)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* RAG indicator dot */}
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#10b981' }} />

        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Sources used ({citations.length})
        </span>

        {/* Source type badges */}
        <div className="flex gap-1 flex-1 flex-wrap">
          {[...new Set(citations.map(c => c.type))].map(type => {
            const meta = TYPE_META[type] || TYPE_META.knowledge_base
            return (
              <span key={type} className="text-xs px-1.5 py-0.5 rounded-md"
                style={{ background: `${meta.color}18`, color: meta.color, fontSize: '0.6rem', fontWeight: 600 }}>
                {meta.icon} {meta.label}
              </span>
            )
          })}
        </div>

        {/* Chevron */}
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round"
          className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-muted)' }}>
          <path d="M2 4l4 4 4-4"/>
        </svg>
      </button>

      {/* Expanded sources list */}
      {open && (
        <div className="px-3 pb-3 space-y-1.5" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs pt-2 pb-0.5 font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
            Retrieved Context Sources
          </p>

          {citations.map((cite, i) => {
            const meta = TYPE_META[cite.type] || TYPE_META.knowledge_base
            const isLink = cite.source.startsWith('http')
            const score  = Math.round(cite.score * 100)

            return (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

                {/* Icon */}
                <span className="text-sm flex-shrink-0 mt-0.5">{meta.icon}</span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Citation number */}
                    <span className="text-xs font-bold" style={{ color: meta.color }}>
                      [{cite.index}]
                    </span>

                    {/* Title */}
                    {isLink ? (
                      <a href={cite.source} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-medium truncate hover:underline"
                        style={{ color: 'var(--text-primary)', maxWidth: '240px' }}>
                        {cite.title || cite.source}
                      </a>
                    ) : (
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {cite.title}
                      </span>
                    )}

                    {/* Type badge */}
                    <span className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0"
                      style={{ background: `${meta.color}18`, color: meta.color, fontSize: '0.6rem' }}>
                      {meta.label}
                    </span>
                  </div>

                  {/* Source URL (if web) */}
                  {isLink && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                      {cite.source}
                    </p>
                  )}
                </div>

                {/* Relevance score */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-semibold" style={{ color: score > 70 ? '#10b981' : score > 50 ? '#f59e0b' : 'var(--text-muted)' }}>
                    {score}%
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>match</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
