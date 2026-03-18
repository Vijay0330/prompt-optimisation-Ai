import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import LoginPage     from './pages/LoginPage'
import RegisterPage  from './pages/RegisterPage'
import ChatPage      from './pages/ChatPage'
import DashboardPage from './pages/DashboardPage'
import Header        from './components/Header'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-base">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center animate-float shadow-glow">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
          </div>
          <div className="flex gap-1.5">
            {[0,120,240].map(d => (
              <span key={d} className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay:`${d}ms` }}/>
            ))}
          </div>
        </div>
      </div>
    )
  }
  return user ? children : <Navigate to="/login" replace />
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/" replace /> : children
}

// Shared layout for protected pages that need Header
function AppLayout({ children }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login"     element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register"  element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/"          element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
                  <Header />
                  <DashboardPage />
                </div>
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
