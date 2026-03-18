import { openFileInTab } from '../services/output'

const TYPE_META = {
  pdf: {
    icon:     '📄',
    label:    'PDF Document',
    color:    '#ef4444',
    bg:       'rgba(239,68,68,0.08)',
    border:   'rgba(239,68,68,0.2)',
    btnLabel: 'Open PDF',
    mime:     'application/pdf',
  },
  ppt: {
    icon:     '📊',
    label:    'PowerPoint Presentation',
    color:    '#f59e0b',
    bg:       'rgba(245,158,11,0.08)',
    border:   'rgba(245,158,11,0.2)',
    btnLabel: 'Download PPTX',
    mime:     'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
}

export default function FileOutputCard({ outputType, fileB64, filename, previewText, slideCount, pageCount, mimeType }) {
  const meta = TYPE_META[outputType] || TYPE_META.pdf

  const handleOpen = () => {
    if (!fileB64) return
    openFileInTab(fileB64, mimeType || meta.mime, filename)
  }

  const subtitle = outputType === 'ppt'
    ? `${slideCount || '?'} slides`
    : pageCount
      ? `~${pageCount} pages`
      : 'Ready to open'

  return (
    <div
      className="rounded-2xl overflow-hidden msg-enter max-w-sm"
      style={{
        border: `1px solid ${meta.border}`,
        background: 'var(--bg-surface)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header strip */}
      <div
        className="px-4 py-2.5 flex items-center gap-2.5"
        style={{ background: meta.bg, borderBottom: `1px solid ${meta.border}` }}
      >
        <span className="text-lg">{meta.icon}</span>
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: meta.color, fontSize: '0.65rem' }}
        >
          {meta.label}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {/* File icon + info */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-12 h-14 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
          >
            {meta.icon}
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-semibold truncate mb-0.5"
              style={{ color: 'var(--text-primary)' }}
            >
              {previewText || filename}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {filename}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: meta.bg, color: meta.color, fontSize: '0.65rem' }}
              >
                {subtitle}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium uppercase"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '0.65rem' }}
              >
                {outputType.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={handleOpen}
          disabled={!fileB64}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
          style={{
            background: fileB64
              ? `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`
              : 'var(--bg-elevated)',
            color: fileB64 ? 'white' : 'var(--text-muted)',
            boxShadow: fileB64 ? `0 3px 12px ${meta.color}40` : 'none',
          }}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M3.75 2A1.75 1.75 0 002 3.75v8.5C2 13.216 2.784 14 3.75 14h8.5A1.75 1.75 0 0014 12.25v-3.5a.75.75 0 00-1.5 0v3.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-8.5a.25.25 0 01.25-.25h3.5a.75.75 0 000-1.5h-3.5z"/>
            <path d="M10.25 2.75a.75.75 0 000 1.5h1.19l-4.22 4.22a.75.75 0 101.06 1.06l4.22-4.22V6.5a.75.75 0 001.5 0v-3a.75.75 0 00-.75-.75h-3z"/>
          </svg>
          {meta.btnLabel}
        </button>
      </div>
    </div>
  )
}
