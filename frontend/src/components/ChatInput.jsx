import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { updatePreferredModel } from '../services/auth'

const PLACEHOLDERS = {
  prompt_optimization: 'Ask anything, describe your task or idea...',
  summarise:           'Paste any text, article, or notes to summarise...',
  agent:               'Ask me anything — I remember our conversation...',
  image:               'Describe the image you want to create...',
  pdf:                 'Describe the document or report you want to generate...',
  ppt:                 'Describe the presentation topic or content...',
}

const MODES = [
  { id: 'prompt_optimization', label: 'Optimize',  icon: '✦', color: '#6366f1' },
  { id: 'summarise',           label: 'Summarise', icon: '≡', color: '#10b981' },
  { id: 'agent',               label: 'Agent',     icon: '◈', color: '#8b5cf6' },
]

const OUTPUT_TYPES = [
  { id: 'chat',  label: 'Default Chat',   desc: 'Standard conversation modes',    icon: '💬', color: '#6366f1' },
  { id: 'image', label: 'Create Image',   desc: 'AI-generated image from prompt', icon: '🎨', color: '#ec4899' },
  { id: 'pdf',   label: 'Create PDF',     desc: 'Structured document / report',   icon: '📄', color: '#ef4444' },
  { id: 'ppt',   label: 'Create PPT',     desc: 'PowerPoint presentation',        icon: '📊', color: '#f59e0b' },
]

const MODELS = [
  { id: 'free',                  label: '✦ PIA Free Model',      short: 'Free ✦',   desc: 'Our custom fine-tuned model. Gets smarter with your feedback.', badge: 'Free',     isFree: true },
  { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash',      short: 'Flash 2.0', desc: 'Fast & capable. Default choice.',    badge: 'Default' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', short: 'Flash Lite',desc: 'Fastest responses, lighter output.',  badge: 'Fastest' },
  { id: 'gemini-1.5-pro',        label: 'Gemini 1.5 Pro',        short: '1.5 Pro',   desc: 'Most powerful, slower responses.',   badge: 'Powerful' },
  { id: 'gemini-1.5-flash',      label: 'Gemini 1.5 Flash',      short: '1.5 Flash', desc: 'Balanced speed and quality.',        badge: 'Balanced' },
]

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null

// ── Shared dropdown shell ─────────────────────────────────────────────────────
function DropdownMenu({ children, onClose, wide = false }) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute bottom-full mb-2 left-0 z-30 overflow-hidden rounded-xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lg)', minWidth: wide ? '14rem' : '11rem' }}>
        {children}
      </div>
    </>
  )
}

// ── + Output Type Picker ──────────────────────────────────────────────────────
function OutputTypePicker({ activeOutputType, onSelect }) {
  const [open, setOpen] = useState(false)
  const isOutputMode = ['image', 'pdf', 'ppt'].includes(activeOutputType)

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} title="Choose output type"
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
        style={isOutputMode
          ? { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }
          : { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }
        }
        onMouseEnter={e => { if (!isOutputMode) { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.color = 'var(--accent)' } }}
        onMouseLeave={e => { if (!isOutputMode) { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-muted)' } }}
      >
        {isOutputMode
          ? <span className="text-sm leading-none">{OUTPUT_TYPES.find(t => t.id === activeOutputType)?.icon || '+'}</span>
          : <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8.75 3.75a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5v-3.5z"/></svg>
        }
      </button>

      {open && (
        <DropdownMenu onClose={() => setOpen(false)} wide>
          <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>Output Type</p>
          </div>
          {OUTPUT_TYPES.map(type => {
            const isActive = activeOutputType === type.id || (type.id === 'chat' && !['image','pdf','ppt'].includes(activeOutputType))
            return (
              <button key={type.id} onClick={() => { onSelect(type.id); setOpen(false) }}
                className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-all"
                style={{ background: isActive ? 'var(--accent-soft)' : 'transparent' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span className="text-base leading-none flex-shrink-0 mt-0.5">{type.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: isActive ? type.color : 'var(--text-primary)' }}>{type.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{type.desc}</p>
                </div>
                {isActive && (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 ml-auto flex-shrink-0 mt-0.5" style={{ color: type.color }}>
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd"/>
                  </svg>
                )}
              </button>
            )
          })}
        </DropdownMenu>
      )}
    </div>
  )
}

// ── Mode Dropdown ─────────────────────────────────────────────────────────────
function ModeDropdown({ activeMode, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const current = MODES.find(m => m.id === activeMode) || MODES[0]
  if (disabled) return null

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} title="Switch mode"
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all"
        style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', color: current.color }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-soft)'}
      >
        <span className="leading-none">{current.icon}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }}>
          <path d="M2 4l4 4 4-4"/>
        </svg>
      </button>
      {open && (
        <DropdownMenu onClose={() => setOpen(false)}>
          <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>Mode</p>
          </div>
          {MODES.map(m => (
            <button key={m.id} onClick={() => { onChange(m.id); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium transition-all"
              style={{ background: m.id === activeMode ? 'var(--accent-soft)' : 'transparent', color: m.id === activeMode ? m.color : 'var(--text-secondary)' }}
              onMouseEnter={e => { if (m.id !== activeMode) e.currentTarget.style.background = 'var(--bg-elevated)' }}
              onMouseLeave={e => { if (m.id !== activeMode) e.currentTarget.style.background = 'transparent' }}
            >
              <span className="w-5 text-center text-base leading-none" style={{ color: m.color }}>{m.icon}</span>
              <span>{m.label}</span>
              {m.id === activeMode && (
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 ml-auto" style={{ color: m.color }}>
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd"/>
                </svg>
              )}
            </button>
          ))}
        </DropdownMenu>
      )}
    </div>
  )
}

// ── Model Dropdown ────────────────────────────────────────────────────────────
function ModelDropdown({ onModelChange }) {
  const { user, updateModel } = useAuth()
  const [open, setOpen]   = useState(false)
  const [saving, setSaving] = useState(false)
  const current = MODELS.find(m => m.id === user?.preferred_model) || MODELS[1]

  const handleSelect = async (modelId) => {
    setOpen(false)
    if (modelId === user?.preferred_model) return
    setSaving(true)
    try { await updatePreferredModel(modelId); updateModel(modelId); onModelChange?.(modelId) }
    finally { setSaving(false) }
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} title="Switch model"
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all"
        style={current.isFree
          ? { background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.35)', color: '#818cf8' }
          : { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
        }
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = current.isFree ? 'rgba(99,102,241,0.35)' : 'var(--border)'}
      >
        {current.isFree
          ? <span className="text-xs leading-none">✦</span>
          : <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--accent)' }}>
              <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
            </svg>
        }
        <span className="hidden sm:inline">{saving ? 'Saving...' : current.short}</span>
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }}>
          <path d="M2 4l4 4 4-4"/>
        </svg>
      </button>

      {open && (
        <DropdownMenu onClose={() => setOpen(false)} wide>
          <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>AI Model</p>
          </div>
          {MODELS.map((model, idx) => {
            const isActive = model.id === user?.preferred_model || (!user?.preferred_model && model.id === 'gemini-2.0-flash')
            return (
              <div key={model.id}>
                {idx === 1 && (
                  <div className="px-3 py-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>Gemini</p>
                  </div>
                )}
                <button onClick={() => handleSelect(model.id)}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-all"
                  style={{ background: isActive ? (model.isFree ? 'rgba(99,102,241,0.1)' : 'var(--accent-soft)') : 'transparent' }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold" style={{ color: isActive ? (model.isFree ? '#818cf8' : 'var(--accent)') : 'var(--text-primary)' }}>
                        {model.label}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                        style={{ background: model.isFree ? 'rgba(99,102,241,0.15)' : 'var(--bg-elevated)', color: model.isFree ? '#818cf8' : 'var(--text-muted)', border: model.isFree ? '1px solid rgba(99,102,241,0.25)' : '1px solid var(--border)', fontSize: '0.6rem' }}>
                        {model.badge}
                      </span>
                    </div>
                    {model.desc && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{model.desc}</p>}
                  </div>
                  {isActive && (
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: model.isFree ? '#818cf8' : 'var(--accent)' }}>
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd"/>
                    </svg>
                  )}
                </button>
              </div>
            )
          })}
        </DropdownMenu>
      )}
    </div>
  )
}

// ── Main ChatInput ────────────────────────────────────────────────────────────
export default function ChatInput({
  onSend,
  isLoading,
  mode = 'prompt_optimization',
  onModeChange,
  outputType = 'chat',
  onOutputTypeChange,
  onToggleDocUpload,    // ← Phase 5: toggle document upload panel
  docUploadActive,      // ← Phase 5: whether doc upload panel is open
}) {
  const [value,        setValue]        = useState('')
  const [isListening,  setIsListening]  = useState(false)
  const [voiceError,   setVoiceError]   = useState('')
  const [voiceSupport, setVoiceSupport] = useState(!!SpeechRecognition)
  const [isFocused,    setIsFocused]    = useState(false)

  const textareaRef    = useRef(null)
  const recognitionRef = useRef(null)
  const isOutputMode   = ['image', 'pdf', 'ppt'].includes(outputType)

  useEffect(() => {
    if (!SpeechRecognition) return
    const rec = new SpeechRecognition()
    rec.continuous = false; rec.interimResults = true; rec.lang = 'en-US'
    rec.onstart  = () => { setIsListening(true); setVoiceError('') }
    rec.onend    = () => setIsListening(false)
    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('')
      setValue(t)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
      }
    }
    rec.onerror = (e) => {
      setIsListening(false)
      if (e.error === 'not-allowed') { setVoiceError('Mic access denied.'); setVoiceSupport(false) }
      else if (e.error === 'no-speech') setVoiceError('No speech detected. Try again.')
      else setVoiceError(`Voice error: ${e.error}`)
      setTimeout(() => setVoiceError(''), 3000)
    }
    recognitionRef.current = rec
  }, [])

  const toggleVoice = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return
    if (isListening) { rec.stop() }
    else { setValue(''); if (textareaRef.current) textareaRef.current.style.height = 'auto'; rec.start() }
  }, [isListening])

  const handleSend = useCallback(() => {
    if (isListening) recognitionRef.current?.stop()
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [value, isLoading, isListening, onSend])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }
  const handleChange = (e) => {
    setValue(e.target.value)
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px' }
  }

  const cardStyle = () => {
    if (isListening) return { borderColor: 'rgba(239,68,68,0.5)', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' }
    if (isFocused && !isLoading) return { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-glow), var(--shadow-md)' }
    return { borderColor: 'var(--input-border)', boxShadow: 'var(--shadow-sm)' }
  }

  const placeholder = isOutputMode ? PLACEHOLDERS[outputType]
    : isListening ? '🎙  Listening...'
    : PLACEHOLDERS[mode]

  return (
    <div className="px-4 pb-4 pt-2 flex-shrink-0">
      <div className="max-w-3xl mx-auto">

        {voiceError && (
          <div className="mb-2 text-xs px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
            {voiceError}
          </div>
        )}

        {isListening && (
          <div className="mb-2 flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            Listening… speak now. Press mic or Enter to stop.
          </div>
        )}

        {isOutputMode && (
          <div className="mb-2 flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
            <span>{OUTPUT_TYPES.find(t => t.id === outputType)?.icon}</span>
            <span className="font-medium">{OUTPUT_TYPES.find(t => t.id === outputType)?.label} mode active</span>
            <button onClick={() => onOutputTypeChange?.('chat')} className="ml-auto text-xs underline" style={{ color: 'var(--text-muted)' }}>
              switch back
            </button>
          </div>
        )}

        {/* Input card */}
        <div className="rounded-2xl border transition-all" style={{ background: 'var(--input-bg)', ...cardStyle() }}>

          <div className="px-4 pt-3 pb-2">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isLoading}
              placeholder={placeholder}
              rows={1}
              className="w-full resize-none bg-transparent text-sm outline-none leading-relaxed scrollbar-hide disabled:opacity-50"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-3 pb-2.5 pt-1.5" style={{ borderTop: '1px solid var(--border)' }}>

            {/* Left side */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">

              {/* Output type picker */}
              <OutputTypePicker activeOutputType={outputType} onSelect={onOutputTypeChange} />

              <span className="w-px h-4 flex-shrink-0" style={{ background: 'var(--border)' }} />

              {/* Mode selector */}
              <ModeDropdown activeMode={mode} onChange={onModeChange} disabled={isOutputMode} />
              {isOutputMode && (
                <span className="text-xs font-medium px-2 py-1 rounded-lg"
                  style={{ background: 'var(--accent-soft)', color: OUTPUT_TYPES.find(t => t.id === outputType)?.color, border: '1px solid var(--border)' }}>
                  {OUTPUT_TYPES.find(t => t.id === outputType)?.icon}{' '}
                  {OUTPUT_TYPES.find(t => t.id === outputType)?.label}
                </span>
              )}

              <span className="w-px h-4 flex-shrink-0" style={{ background: 'var(--border)' }} />

              {/* Model picker */}
              <ModelDropdown />

              <span className="w-px h-4 flex-shrink-0" style={{ background: 'var(--border)' }} />

              {/* ── Phase 5: RAG Document Upload toggle ── */}
              <button
                onClick={onToggleDocUpload}
                title="Upload documents to your knowledge base (RAG)"
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                style={docUploadActive
                  ? { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }
                  : { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }
                }
                onMouseEnter={e => { if (!docUploadActive) { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.color = '#10b981'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)' } }}
                onMouseLeave={e => { if (!docUploadActive) { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' } }}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                  <path d="M2 2.75A.75.75 0 012.75 2h2.5a.75.75 0 010 1.5h-2.5A.75.75 0 012 2.75zm0 5A.75.75 0 012.75 7h2.5a.75.75 0 010 1.5h-2.5A.75.75 0 012 7.75zm0 5A.75.75 0 012.75 12h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 010-1.5zm5-10A.75.75 0 018.5 2h5a.75.75 0 010 1.5h-5A.75.75 0 017.75 2.75zm0 5A.75.75 0 018.5 7h5a.75.75 0 010 1.5h-5a.75.75 0 01-.75-.75zm0 5A.75.75 0 018.5 12h5a.75.75 0 010 1.5h-5a.75.75 0 01-.75-.75z"/>
                </svg>
                <span className="hidden sm:inline">Docs</span>
                {docUploadActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />}
              </button>

            </div>

            {/* Right side: mic + send */}
            <div className="flex items-center gap-1.5 flex-shrink-0">

              {voiceSupport && (
                <button onClick={toggleVoice} disabled={isLoading} title={isListening ? 'Stop' : 'Voice input'}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                  style={isListening ? { background: '#ef4444', color: 'white' } : { color: 'var(--text-muted)', background: 'transparent' }}
                  onMouseEnter={e => { if (!isListening) { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
                  onMouseLeave={e => { if (!isListening) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
                >
                  {isListening ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm5-2.25A.75.75 0 017.75 7h4.5a.75.75 0 01.75.75v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-4.5z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z"/>
                      <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.029 5.65 4.75 6.718V18.5h-1.75a.75.75 0 000 1.5h5a.75.75 0 000-1.5H10v-1.782A6.985 6.985 0 0016 10v-.357a.75.75 0 00-1.5 0V10a5.5 5.5 0 01-11 0v-.357z"/>
                    </svg>
                  )}
                </button>
              )}

              <button onClick={handleSend} disabled={!value.trim() || isLoading} title="Send (Enter)"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={value.trim() && !isLoading
                  ? { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }
                  : { background: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'not-allowed' }
                }
              >
                {isLoading ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z"/>
                  </svg>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
