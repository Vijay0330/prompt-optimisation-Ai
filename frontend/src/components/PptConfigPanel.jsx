import { useState } from 'react'

const THEMES = [
  { id: 'ocean',     label: 'Ocean',     colors: ['#0a0e28', '#38bdf8'], emoji: '🌊' },
  { id: 'midnight',  label: 'Midnight',  colors: ['#08081a', '#a78bfa'], emoji: '🌙' },
  { id: 'forest',    label: 'Forest',    colors: ['#052e16', '#86efac'], emoji: '🌿' },
  { id: 'sunset',    label: 'Sunset',    colors: ['#1e0a3c', '#fb923c'], emoji: '🌅' },
  { id: 'corporate', label: 'Corporate', colors: ['#f8fafc', '#4f46e5'], emoji: '💼' },
]

const FONT_SIZES = [
  { id: 'small',  label: 'Small',  desc: '14pt bullets' },
  { id: 'medium', label: 'Medium', desc: '16pt bullets' },
  { id: 'large',  label: 'Large',  desc: '18pt bullets' },
]

export default function PptConfigPanel({ prompt, onGenerate, onCancel, isLoading }) {
  const [theme,        setTheme]        = useState('ocean')
  const [fontSize,     setFontSize]     = useState('medium')
  const [customHeader, setCustomHeader] = useState('')

  const handleGenerate = () => {
    onGenerate({
      theme,
      font_size: fontSize,
      custom_header: customHeader.trim() || null,
    })
  }

  return (
    <div
      className="rounded-2xl border p-4 animate-slide-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Configure Presentation
            </p>
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
              "{prompt}"
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
          </svg>
        </button>
      </div>

      <div className="space-y-4">

        {/* Color Theme */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2.5"
            style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
            Color Theme <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
          </p>
          <div className="flex gap-2 flex-wrap">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                title={t.label}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all hover:scale-[1.05]"
                style={{
                  borderColor: theme === t.id ? 'var(--accent)' : 'var(--border)',
                  background: theme === t.id ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                  boxShadow: theme === t.id ? '0 0 0 2px var(--accent-glow)' : 'none',
                  minWidth: '52px',
                }}
              >
                {/* Mini preview swatch */}
                <div
                  className="w-8 h-5 rounded-md flex items-end overflow-hidden"
                  style={{ background: t.colors[0] }}
                >
                  <div className="w-full h-1.5" style={{ background: t.colors[1] }} />
                </div>
                <span className="text-xs font-medium" style={{
                  color: theme === t.id ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: '0.6rem',
                }}>
                  {t.emoji}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Selected: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {THEMES.find(t => t.id === theme)?.label}
            </span>
          </p>
        </div>

        {/* Font Size */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2.5"
            style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
            Font Size <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
          </p>
          <div className="flex gap-2">
            {FONT_SIZES.map(f => (
              <button
                key={f.id}
                onClick={() => setFontSize(f.id)}
                className="flex-1 py-2 px-3 rounded-xl border text-center transition-all"
                style={{
                  borderColor: fontSize === f.id ? 'var(--accent)' : 'var(--border)',
                  background: fontSize === f.id ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                  color: fontSize === f.id ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <p className="text-xs font-semibold">{f.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{f.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Header (optional) */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
            Custom Title <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — leave blank to auto-generate)</span>
          </p>
          <input
            type="text"
            value={customHeader}
            onChange={e => setCustomHeader(e.target.value)}
            placeholder="e.g. Q4 2025 Strategy Review"
            className="w-full text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--input-border)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              color: 'white',
              boxShadow: '0 3px 12px rgba(99,102,241,0.4)',
            }}
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating…
              </>
            ) : (
              <>
                <span>📊</span>
                Generate Presentation
              </>
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  )
}
