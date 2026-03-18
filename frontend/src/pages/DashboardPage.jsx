import { useState, useEffect } from 'react'
import { tokenStore } from '../services/token'

const BASE = import.meta.env.VITE_API_URL || '/api'

async function fetchStats() {
  const token = tokenStore.get()
  const res = await fetch(`${BASE}/dashboard/stats`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Failed to load stats')
  return res.json()
}

async function fetchData(page = 1, feedback = '') {
  const token = tokenStore.get()
  const params = new URLSearchParams({ page, limit: 15 })
  if (feedback) params.set('feedback', feedback)
  const res = await fetch(`${BASE}/dashboard/data?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Failed to load data')
  return res.json()
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sublabel, color = 'var(--accent)', icon }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value ?? '—'}</p>
      {sublabel && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sublabel}</p>}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ── Feedback badge ────────────────────────────────────────────────────────────
function FeedbackBadge({ value }) {
  if (value === 1)  return <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>👍 Up</span>
  if (value === -1) return <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>👎 Down</span>
  return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>No feedback</span>
}

export default function DashboardPage() {
  const [stats,      setStats]      = useState(null)
  const [tableData,  setTableData]  = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [tableLoad,  setTableLoad]  = useState(false)
  const [filter,     setFilter]     = useState('')
  const [page,       setPage]       = useState(1)
  const [error,      setError]      = useState('')

  const loadStats = async () => {
    try {
      const s = await fetchStats()
      setStats(s)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadTable = async (p = page, f = filter) => {
    setTableLoad(true)
    try {
      const d = await fetchData(p, f)
      setTableData(d)
    } catch (e) {
      setError(e.message)
    } finally {
      setTableLoad(false)
    }
  }

  useEffect(() => { loadStats(); loadTable() }, [])

  const handleFilter = (f) => { setFilter(f); setPage(1); loadTable(1, f) }
  const handlePage   = (p) => { setPage(p);  loadTable(p, filter) }

  const refreshAll = () => { loadStats(); loadTable(page, filter) }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="flex gap-1.5">
        {[0,150,300].map(d => (
          <span key={d} className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  )

  const mv = stats?.model_version

  return (
    <div className="flex-1 overflow-y-auto scrollbar-chat p-6" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>🧠 Training Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Monitor how your PIA free model is learning from user interactions
            </p>
          </div>
          <button onClick={refreshAll}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 01.75.75v3.182a.75.75 0 01-.75.75h-3.182a.75.75 0 010-1.5h1.37l-.84-.841a4.5 4.5 0 00-7.08.932.75.75 0 01-1.3-.75 6 6 0 019.44-1.242l.842.84V3.227a.75.75 0 01.75-.75zm-.911 7.5A.75.75 0 0113.199 11a6 6 0 01-9.44 1.241l-.84-.84v1.371a.75.75 0 01-1.5 0V9.591a.75.75 0 01.75-.75H5.35a.75.75 0 010 1.5H3.98l.841.841a4.5 4.5 0 007.08-.932.75.75 0 011.024.277z" clipRule="evenodd"/>
            </svg>
            Refresh
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Model version card */}
        {mv && (
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.2)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#818cf8', fontSize: '0.65rem' }}>Current Model Version</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{mv.version || 'Base Model'}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {mv.trained_at ? `Trained ${new Date(mv.trained_at).toLocaleDateString()} · ` : 'Not yet trained · '}
                  {mv.examples || 0} examples · {mv.hf_repo || 'local'}
                </p>
              </div>
              <div className="text-3xl">🤖</div>
            </div>

            {/* Training progress toward next trigger */}
            {stats && (
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <span>Progress to next training run</span>
                  <span style={{ color: '#818cf8' }}>
                    {stats.pending_training}/{stats.threshold} 👍
                  </span>
                </div>
                <ProgressBar value={stats.pending_training} max={stats.threshold} color="linear-gradient(90deg,#6366f1,#8b5cf6)" />
                {stats.training_running && (
                  <p className="text-xs mt-1.5 flex items-center gap-1.5" style={{ color: '#10b981' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Training in progress…
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Total"          value={stats.total_interactions} sublabel="interactions"    icon="💬" color="var(--accent)" />
            <StatCard label="Thumbs Up"      value={stats.positive_feedback}  sublabel="positive"       icon="👍" color="#10b981" />
            <StatCard label="Thumbs Down"    value={stats.negative_feedback}  sublabel="negative"       icon="👎" color="#f87171" />
            <StatCard label="No Feedback"    value={stats.no_feedback}        sublabel="unrated"        icon="❔" color="var(--text-muted)" />
            <StatCard label="Trained On"     value={stats.used_in_training}   sublabel="examples used"  icon="🎓" color="#f59e0b" />
            <StatCard label="Pending"        value={stats.pending_training}   sublabel={`of ${stats.threshold} needed`} icon="⏳" color="#818cf8" />
          </div>
        )}

        {/* Recent interactions table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Training Data</p>

            {/* Filter tabs */}
            <div className="flex gap-1">
              {[
                { id: '',         label: 'All' },
                { id: 'positive', label: '👍 Positive' },
                { id: 'negative', label: '👎 Negative' },
                { id: 'none',     label: 'No feedback' },
              ].map(f => (
                <button key={f.id} onClick={() => handleFilter(f.id)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: filter === f.id ? 'var(--accent-soft)' : 'transparent',
                    color: filter === f.id ? 'var(--accent)' : 'var(--text-muted)',
                    border: filter === f.id ? '1px solid var(--border-strong)' : '1px solid transparent',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {tableLoad ? (
              <div className="flex justify-center py-10">
                <div className="flex gap-1">
                  {[0,150,300].map(d => (
                    <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: `${d}ms` }}/>
                  ))}
                </div>
              </div>
            ) : tableData?.items?.length === 0 ? (
              <div className="flex flex-col items-center py-12" style={{ color: 'var(--text-muted)' }}>
                <span className="text-3xl mb-2">🗂️</span>
                <p className="text-sm">No data found for this filter.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                    {['Prompt', 'Response', 'Mode', 'Model', 'Feedback', 'Trained', 'Date'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData?.items?.map((row, i) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }} title={row.prompt}>{row.prompt}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }} title={row.response}>{row.response}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '0.65rem' }}>{row.mode}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.model_used}</p>
                      </td>
                      <td className="px-4 py-3"><FeedbackBadge value={row.feedback} /></td>
                      <td className="px-4 py-3">
                        {row.used_in_training
                          ? <span className="text-xs" style={{ color: '#10b981' }}>✓ Yes</span>
                          : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(row.created_at).toLocaleDateString()}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {tableData && tableData.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {tableData.total} total · Page {tableData.page} of {tableData.pages}
              </p>
              <div className="flex gap-1">
                <button onClick={() => handlePage(page - 1)} disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  ← Prev
                </button>
                <button onClick={() => handlePage(page + 1)} disabled={page >= tableData.pages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Training instructions */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>🔧 How Training Works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { step: '1', title: 'Collect Interactions', body: 'Every AI response is saved as training data. Users rate responses with 👍/👎.' },
              { step: '2', title: 'Auto-Trigger',         body: `After ${stats?.threshold || 100} positive feedbacks, fine-tuning starts automatically in the background.` },
              { step: '3', title: 'Model Improves',       body: 'The fine-tuned model is pushed to HuggingFace Hub. Free model users get better responses.' },
            ].map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                  {s.step}
                </div>
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-3 font-mono text-xs" style={{ background: 'var(--bg-elevated)', color: '#818cf8', border: '1px solid var(--border)' }}>
            # To run training manually:<br/>
            cd backend &amp;&amp; python scripts/train.py
          </div>
        </div>

      </div>
    </div>
  )
}
