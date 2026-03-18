export default function LoadingBubble() {
  return (
    <div className="flex gap-3 msg-enter">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-strong)' }}>
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={{ color: 'var(--accent)' }}>
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
        </svg>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium px-1 mb-0.5" style={{ color: 'var(--text-muted)' }}>Assistant</p>
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
          style={{ background: 'var(--chat-ai-bg)', border: '1px solid var(--chat-ai-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[0,150,300].map(d => (
                <span key={d} className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: 'var(--accent)', animationDelay: `${d}ms` }} />
              ))}
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Thinking...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
