import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../services/auth'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function RegisterPage() {
  const { login }    = useAuth()
  const navigate     = useNavigate()
  const { isDark, toggle } = useTheme()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const user = await registerUser(email, password)
      login(user)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--input-border)',
    color: 'var(--text-primary)',
  }
  const focusIn  = e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)' }
  const focusOut = e => { e.target.style.borderColor = 'var(--input-border)'; e.target.style.boxShadow = 'none' }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-base">
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="absolute top-1/3 right-1/3 w-56 h-56 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle,#8b5cf6,transparent)' }} />

      <button onClick={toggle} className="absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
        {isDark
          ? <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/></svg>
          : <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-500"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
        }
      </button>

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 animate-float"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gradient">Create account</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>Start building smarter prompts</p>
        </div>

        <div className="rounded-3xl p-6 space-y-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>

          {error && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm8 4a.75.75 0 01-.75-.75v-2.5a.75.75 0 011.5 0v2.5A.75.75 0 018 12zm0-6.5a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          {[
            { label: 'Email', type: 'email', val: email, set: setEmail, placeholder: 'you@example.com' },
            { label: 'Password', type: showPass ? 'text' : 'password', val: password, set: setPassword, placeholder: 'Min. 6 characters' },
            { label: 'Confirm Password', type: 'password', val: confirm, set: setConfirm, placeholder: '••••••••' },
          ].map(({ label, type, val, set, placeholder }, i) => (
            <div key={label}>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{label}</label>
              <input type={type} value={val} onChange={e => set(e.target.value)}
                placeholder={placeholder} disabled={loading}
                onKeyDown={e => e.key === 'Enter' && i === 2 && handleSubmit(e)}
                className="w-full text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all"
                style={inputStyle} onFocus={focusIn} onBlur={focusOut}
              />
            </div>
          ))}

          {/* Password strength */}
          {password.length > 0 && (
            <div>
              <div className="flex gap-1 mb-1">
                {[1,2,3,4].map(n => (
                  <div key={n} className="h-1 flex-1 rounded-full transition-all"
                    style={{ background: password.length >= n * 3 ? (password.length >= 10 ? '#10b981' : password.length >= 6 ? '#f59e0b' : '#ef4444') : 'var(--bg-elevated)' }} />
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {password.length < 6 ? 'Too short' : password.length < 10 ? 'Moderate' : 'Strong password'}
              </p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading || !email || !password || !confirm}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] mt-1"
            style={{
              background: loading || !email || !password || !confirm ? 'var(--bg-elevated)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              color: loading || !email || !password || !confirm ? 'var(--text-muted)' : 'white',
              boxShadow: loading || !email || !password || !confirm ? 'none' : '0 4px 16px rgba(139,92,246,0.4)',
              border: '1px solid var(--border)',
            }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Creating account...
              </span>
            ) : 'Create Account'}
          </button>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
