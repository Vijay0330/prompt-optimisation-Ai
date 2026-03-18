export default function ResultCard({ result }) {
  if (!result) return null
  const { optimized_prompt, skill_persona, mcp_suggestions } = result

  return (
    <div className="space-y-2.5 w-full msg-enter">

      {/* Optimized Prompt */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.2)', background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.1)', background: 'rgba(99,102,241,0.06)' }}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3" style={{ color: '#818cf8' }}>
              <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
            </svg>
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#818cf8', fontSize: '0.65rem' }}>Optimized Prompt</span>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{optimized_prompt}</p>
        </div>
      </div>

      {/* Skill Persona */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.2)', background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(16,185,129,0.1)', background: 'rgba(16,185,129,0.05)' }}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-emerald-400">
              <path fillRule="evenodd" d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 1110 0H3z" clipRule="evenodd"/>
            </svg>
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400" style={{ fontSize: '0.65rem' }}>Skill Persona</span>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>{skill_persona}</p>
        </div>
      </div>

      {/* MCP Tools */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(245,158,11,0.1)', background: 'rgba(245,158,11,0.05)' }}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-amber-400">
              <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 010 1.06L2.56 10l3.72 3.72a.75.75 0 01-1.06 1.06L.97 10.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0zm3.44 0a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L13.44 10l-3.72-3.72a.75.75 0 010-1.06z" clipRule="evenodd"/>
            </svg>
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-400" style={{ fontSize: '0.65rem' }}>MCP Tools</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium text-amber-400" style={{ background: 'rgba(245,158,11,0.12)', fontSize: '0.65rem' }}>
            {mcp_suggestions.length}
          </span>
        </div>
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {mcp_suggestions.length > 0 ? mcp_suggestions.map((tool, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
              <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
              {tool}
            </span>
          )) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tools suggested.</p>
          )}
        </div>
      </div>

    </div>
  )
}
