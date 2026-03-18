import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getChats, deleteChat } from '../services/chats'

const MODE_META = {
  prompt_optimization: { icon: '✦', color: '#6366f1' },
  summarise:           { icon: '≡', color: '#10b981' },
  agent:               { icon: '◈', color: '#8b5cf6' },
  output:              { icon: '⊕', color: '#f59e0b' },
}

function groupByDate(chats) {
  const now       = new Date()
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const week      = new Date(today); week.setDate(today.getDate() - 7)
  const groups = { Today: [], Yesterday: [], 'Last 7 Days': [], Older: [] }
  chats.forEach(c => {
    const d   = new Date(c.created_at)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if      (day >= today)     groups['Today'].push(c)
    else if (day >= yesterday) groups['Yesterday'].push(c)
    else if (day >= week)      groups['Last 7 Days'].push(c)
    else                       groups['Older'].push(c)
  })
  return groups
}

export default function Sidebar({ activeChatId, onSelectChat, onNewChat, refreshTrigger }) {
  const [chats,    setChats]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState(null)
  const location = useLocation()

  const loadChats = async () => {
    try { const d = await getChats(); setChats(d) }
    catch { setChats([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadChats() }, [refreshTrigger])

  const handleDelete = async (e, chatId) => {
    e.stopPropagation()
    setDeleting(chatId)
    try {
      await deleteChat(chatId)
      setChats(prev => prev.filter(c => c.id !== chatId))
      if (activeChatId === chatId) onNewChat()
    } finally { setDeleting(null) }
  }

  const groups = groupByDate(chats)
  const isDashboard = location.pathname === '/dashboard'

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-full"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>

      {/* Nav buttons */}
      <div className="p-3 space-y-1.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {/* New Chat */}
        <button onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 2px 12px rgba(99,102,241,0.4)' }}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/>
          </svg>
          New Chat
        </button>

        {/* Dashboard link */}
        <Link to="/dashboard"
          className="w-full flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-all"
          style={{
            background: isDashboard ? 'var(--accent-soft)' : 'var(--bg-elevated)',
            border: `1px solid ${isDashboard ? 'var(--border-strong)' : 'var(--border)'}`,
            color: isDashboard ? 'var(--accent)' : 'var(--text-secondary)',
            textDecoration: 'none',
          }}>
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
            <path d="M8 1a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0v-5.5A.75.75 0 018 1zm-3.28 3.22a.75.75 0 010 1.06 5.5 5.5 0 107.56 0 .75.75 0 111.06-1.06 7 7 0 11-9.62 0 .75.75 0 011.06 0z"/>
          </svg>
          🧠 Training Dashboard
        </Link>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto scrollbar-sidebar py-2">
        {loading ? (
          <div className="px-3 space-y-2 mt-2">
            {[1,2,3].map(i => <div key={i} className="h-9 rounded-lg shimmer" />)}
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-2xl mb-3 flex items-center justify-center text-xl" style={{ background: 'var(--accent-soft)' }}>💬</div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>No chats yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Start a new conversation</p>
          </div>
        ) : (
          Object.entries(groups).map(([label, items]) =>
            items.length === 0 ? null : (
              <div key={label} className="mb-3">
                <p className="text-xs font-semibold px-4 py-1.5 uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{label}</p>
                {items.map(chat => {
                  const meta     = MODE_META[chat.mode] || MODE_META.prompt_optimization
                  const isActive = activeChatId === chat.id
                  return (
                    <div key={chat.id} onClick={() => onSelectChat(chat)}
                      className="group relative flex items-center gap-2.5 px-3 py-2 mx-2 rounded-xl cursor-pointer transition-all"
                      style={isActive
                        ? { background: 'var(--accent-soft)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-sm)' }
                        : { border: '1px solid transparent' }
                      }>
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: 'var(--accent)' }} />}
                      <span className="text-xs flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
                        style={{ background: `${meta.color}18`, color: meta.color, fontSize: '0.7rem' }}>
                        {meta.icon}
                      </span>
                      <span className="flex-1 text-xs truncate font-medium"
                        style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                        {chat.title}
                      </span>
                      <button onClick={e => handleDelete(e, chat.id)} disabled={deleting === chat.id}
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 hover:bg-red-500/10"
                        style={{ color: 'var(--text-muted)' }}>
                        {deleting === chat.id ? (
                          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 hover:text-red-400">
                            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 000 1.5h.3l.815 8.15A1.5 1.5 0 005.357 15h5.285a1.5 1.5 0 001.493-1.35l.815-8.15h.3a.75.75 0 000-1.5H11v-.75A2.25 2.25 0 008.75 1h-1.5A2.25 2.25 0 005 3.25zm2.25-.75a.75.75 0 00-.75.75V4h3v-.75a.75.75 0 00-.75-.75h-1.5z" clipRule="evenodd"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          )
        )}
      </div>

      {/* Footer */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-center" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
          Prompt Intelligence · v4.0
        </p>
      </div>
    </aside>
  )
}
