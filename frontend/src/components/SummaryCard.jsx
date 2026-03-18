export default function SummaryCard({ summary }) {
  if (!summary) return null
  const { tldr, key_points = [], read_time } = summary

  return (
    <div className="space-y-2.5 w-full msg-enter">

      {/* TL;DR */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.2)', background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(16,185,129,0.1)', background: 'rgba(16,185,129,0.05)' }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
              <span className="text-emerald-400 font-bold" style={{ fontSize: '0.65rem' }}>≡</span>
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400" style={{ fontSize: '0.65rem' }}>TL;DR</span>
          </div>
          {read_time && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium text-emerald-400"
              style={{ background: 'rgba(16,185,129,0.1)', fontSize: '0.65rem' }}>
              {read_time}
            </span>
          )}
        </div>
        <div className="px-4 py-3">
          <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text-primary)' }}>{tldr}</p>
        </div>
      </div>

      {/* Key Points */}
      {key_points.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.2)', background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.1)', background: 'rgba(99,102,241,0.05)' }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3" style={{ color: '#818cf8' }}>
                <path fillRule="evenodd" d="M3.75 2a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5zM3 6.75a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5A.75.75 0 013 6.75zm.75 3.75a.75.75 0 000 1.5h5a.75.75 0 000-1.5h-5z" clipRule="evenodd"/>
              </svg>
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#818cf8', fontSize: '0.65rem' }}>Key Points</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontSize: '0.65rem' }}>
              {key_points.length}
            </span>
          </div>
          <ul className="px-4 py-3 space-y-2.5">
            {key_points.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--accent)' }} />
                <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
