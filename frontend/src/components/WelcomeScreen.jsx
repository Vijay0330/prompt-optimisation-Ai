const EXAMPLES = {
  prompt_optimization: [
    { icon: '🤖', label: 'ML System',     text: 'Build a fraud detection system using machine learning with real-time scoring' },
    { icon: '🌐', label: 'Web App',       text: 'Create a full-stack project management web app with user authentication' },
    { icon: '📊', label: 'Data Pipeline', text: 'Design a data pipeline that scrapes prices and builds analytics dashboards' },
    { icon: '💬', label: 'AI Chatbot',    text: 'Build a customer support chatbot with RAG over product documentation' },
  ],
  summarise: [
    { icon: '📄', label: 'Article',        text: 'Paste any article or blog post here and I will summarise it for you.' },
    { icon: '📑', label: 'Research Paper', text: 'Paste the abstract and introduction of a research paper to summarise.' },
    { icon: '📝', label: 'Meeting Notes',  text: 'Paste your meeting notes and get a clean TL;DR with action points.' },
    { icon: '📰', label: 'News Story',     text: 'Paste a news article to get the key facts fast.' },
  ],
  agent: [
    { icon: '💡', label: 'Brainstorm', text: 'Help me brainstorm startup ideas in the AI productivity space' },
    { icon: '🔍', label: 'Explain',    text: 'Explain how transformer models work in simple terms' },
    { icon: '✍️', label: 'Write',      text: 'Write a professional LinkedIn post about launching a new SaaS product' },
    { icon: '🐛', label: 'Debug',      text: 'Help me debug this Python code — it keeps throwing a KeyError' },
  ],
}

const MODE_INFO = {
  prompt_optimization: {
    icon: '✦',
    label: 'Prompt Optimization',
    desc: 'Turn any rough idea into a sharp, actionable prompt with expert persona and MCP tools.',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
  },
  summarise: {
    icon: '≡',
    label: 'Summarise',
    desc: 'Paste any text — article, notes, docs — and get a TL;DR, key points, and read time.',
    color: '#10b981',
    gradient: 'linear-gradient(135deg,#059669,#0d9488)',
  },
  agent: {
    icon: '◈',
    label: 'Chat with Agent',
    desc: 'A real AI conversation with full memory. Ask anything — I remember the whole session.',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg,#7c3aed,#6366f1)',
  },
}

export default function WelcomeScreen({ onExampleClick, activeMode = 'prompt_optimization' }) {
  const info     = MODE_INFO[activeMode]
  const examples = EXAMPLES[activeMode] || EXAMPLES.prompt_optimization

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-10">

      {/* Hero section */}
      <div className="text-center mb-10 animate-fade-in">
        {/* Animated icon */}
        <div className="relative inline-block mb-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl animate-float"
            style={{ background: info.gradient, boxShadow: `0 8px 32px ${info.color}40` }}>
            {info.icon}
          </div>
          <div className="absolute inset-0 rounded-2xl blur-xl opacity-30 -z-10"
            style={{ background: info.gradient }} />
        </div>

        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {info.label}
        </h2>
        <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {info.desc}
        </p>
      </div>

      {/* Example grid */}
      <div className="w-full max-w-xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
          Try an example
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {examples.map((ex, i) => (
            <button
              key={ex.label}
              onClick={() => onExampleClick(ex.text)}
              className="flex items-start gap-3 text-left p-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] group"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                animationDelay: `${i * 60}ms`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = info.color + '40'
                e.currentTarget.style.boxShadow = `0 4px 16px ${info.color}15`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
              }}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{ex.icon}</span>
              <div>
                <p className="text-xs font-semibold mb-1 transition-colors"
                  style={{ color: 'var(--text-primary)' }}>
                  {ex.label}
                </p>
                <p className="text-xs leading-relaxed line-clamp-2"
                  style={{ color: 'var(--text-muted)' }}>
                  {ex.text}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
