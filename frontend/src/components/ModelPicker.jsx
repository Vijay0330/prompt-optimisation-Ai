import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updatePreferredModel } from '../services/auth'

const MODELS = [
  { id: 'gemini-2.0-flash',       label: 'Gemini 2.0 Flash',      badge: 'Default' },
  { id: 'gemini-2.0-flash-lite',  label: 'Gemini 2.0 Flash Lite', badge: 'Fastest' },
  { id: 'gemini-1.5-pro',         label: 'Gemini 1.5 Pro',        badge: 'Powerful' },
  { id: 'gemini-1.5-flash',       label: 'Gemini 1.5 Flash',      badge: 'Balanced' },
]

export default function ModelPicker({ onModelChange }) {
  const { user, updateModel } = useAuth()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const current = MODELS.find(m => m.id === user?.preferred_model) || MODELS[0]

  const handleSelect = async (modelId) => {
    setOpen(false)
    if (modelId === user?.preferred_model) return
    setSaving(true)
    try {
      await updatePreferredModel(modelId)
      updateModel(modelId)
      onModelChange?.(modelId)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-gray-300 bg-gray-800 border border-gray-700 hover:border-gray-600 px-2.5 py-1.5 rounded-lg transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-brand-400">
          <path d="M7.25 1.5a.75.75 0 011.5 0v1.5a.75.75 0 01-1.5 0V1.5zM7.25 13a.75.75 0 011.5 0v1.5a.75.75 0 01-1.5 0V13zM14.5 7.25a.75.75 0 010 1.5H13a.75.75 0 010-1.5h1.5zM3 7.25a.75.75 0 010 1.5H1.5a.75.75 0 010-1.5H3zM12.03 3.03a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 01-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM5.09 9.97a.75.75 0 010 1.06L4.03 12.03a.75.75 0 01-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM12.03 12.97a.75.75 0 01-1.06 0l-1.06-1.06a.75.75 0 011.06-1.06l1.06 1.06a.75.75 0 010 1.06zM5.03 4.03a.75.75 0 01-1.06 0L2.97 2.97a.75.75 0 011.06-1.06l1.06 1.06a.75.75 0 010 1.06zM8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"/>
        </svg>
        {saving ? 'Saving...' : current.label}
        <svg viewBox="0 0 16 16" fill="currentColor" className={`w-3 h-3 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-30 overflow-hidden">
            {MODELS.map(model => (
              <button
                key={model.id}
                onClick={() => handleSelect(model.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors
                  ${model.id === user?.preferred_model
                    ? 'bg-brand-900/40 text-brand-300'
                    : 'text-gray-300 hover:bg-gray-800'}
                `}
              >
                <span className="text-xs font-medium">{model.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                  model.id === user?.preferred_model
                    ? 'bg-brand-800/60 text-brand-300'
                    : 'bg-gray-700/60 text-gray-500'
                }`}>
                  {model.badge}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
