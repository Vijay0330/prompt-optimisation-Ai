import { createContext, useContext, useState, useEffect } from 'react'
import { getMe, logoutUser } from '../services/auth'
import { tokenStore } from '../services/token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount — restore session if token exists in localStorage
  useEffect(() => {
    const token = tokenStore.get()
    if (!token) {
      // No token stored — skip /me call, go straight to login
      setLoading(false)
      return
    }
    getMe()
      .then(setUser)
      .catch(() => {
        // Token invalid or expired — clear it
        tokenStore.clear()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = (userData) => {
    // userData comes from loginUser() / registerUser() which already stored the token
    setUser(userData)
  }

  const logout = async () => {
    await logoutUser()   // clears localStorage token inside logoutUser()
    setUser(null)
  }

  const updateModel = (model) =>
    setUser((prev) => prev ? { ...prev, preferred_model: model } : prev)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateModel }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
