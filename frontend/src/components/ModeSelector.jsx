const MODES = [
  {
    id: 'prompt_optimization',
    label: 'Prompt Optimization',
    icon: '✦',
    description: 'Optimize & get MCP tools',
    color: 'brand',
  },
  {
    id: 'summarise',
    label: 'Summarise',
    icon: '≡',
    description: 'TL;DR + key points',
    color: 'emerald',
  },
  {
    id: 'agent',
    label: 'Chat with Agent',
    icon: '◈',
    description: 'AI conversation with memory',
    color: 'violet',
  },
]

export default function ModeSelector({ activeMode, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-gray-800/60 border border-gray-700/60 rounded-xl p-1">
      {MODES.map(mode => {
        const isActive = activeMode === mode.id
        return (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            title={mode.description}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${isActive
                ? mode.color === 'brand'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : mode.color === 'emerald'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-violet-700 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }
            `}
          >
            <span className="text-sm leading-none">{mode.icon}</span>
            <span className="hidden sm:block">{mode.label}</span>
          </button>
        )
      })}
    </div>
  )
}
