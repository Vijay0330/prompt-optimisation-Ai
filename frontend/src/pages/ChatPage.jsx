import { useState, useRef, useEffect, useCallback } from 'react'
import Header          from '../components/Header'
import Sidebar         from '../components/Sidebar'
import ChatMessage     from '../components/ChatMessage'
import ChatInput       from '../components/ChatInput'
import PptConfigPanel  from '../components/PptConfigPanel'
import LoadingBubble   from '../components/LoadingBubble'
import WelcomeScreen   from '../components/WelcomeScreen'
import DocumentUpload  from '../components/DocumentUpload'   // ← Phase 5
import { analyzePrompt }  from '../services/api'
import { generateOutput } from '../services/output'
import { getChatById }    from '../services/chats'
import { useAuth }        from '../context/AuthContext'

const uid = () => Math.random().toString(36).slice(2, 10)

function dbMsgToLocal(doc) {
  return {
    id:            doc.id,
    role:          doc.role,
    content:       doc.content || '',
    mode:          doc.mode,
    result:        doc.result        || null,
    summary:       doc.summary       || null,
    casual_reply:  doc.casual_reply  || null,
    training_id:   doc.training_id   || null,
    used_fallback: doc.used_fallback || false,
    // Phase 5 — RAG
    rag_citations: doc.rag_citations || null,
    rag_used:      doc.rag_used      || false,
    timestamp:     doc.created_at,
  }
}

export default function ChatPage() {
  const { user } = useAuth()

  const [messages,       setMessages]       = useState([])
  const [activeChatId,   setActiveChatId]   = useState(null)
  const [mode,           setMode]           = useState('prompt_optimization')
  const [outputType,     setOutputType]     = useState('chat')
  const [isLoading,      setIsLoading]      = useState(false)
  const [sidebarRefresh, setSidebarRefresh] = useState(0)
  const [showPptConfig,  setShowPptConfig]  = useState(false)
  const [pendingPptPrompt, setPendingPptPrompt] = useState(null)

  // Phase 5 — doc upload panel toggle
  const [showDocUpload, setShowDocUpload] = useState(false)

  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, showPptConfig])

  const loadChat = useCallback(async (chat) => {
    setIsLoading(true)
    setShowPptConfig(false)
    setShowDocUpload(false)
    setPendingPptPrompt(null)
    try {
      const data = await getChatById(chat.id)
      setActiveChatId(chat.id)
      setMode(data.chat.mode || 'prompt_optimization')
      setMessages(data.messages.map(dbMsgToLocal))
    } catch { setMessages([]) }
    finally { setIsLoading(false) }
  }, [])

  const startNewChat = useCallback(() => {
    setActiveChatId(null)
    setMessages([])
    setMode('prompt_optimization')
    setOutputType('chat')
    setShowPptConfig(false)
    setShowDocUpload(false)
    setPendingPptPrompt(null)
  }, [])

  const handleOutputTypeChange = (type) => {
    setOutputType(type)
    setShowPptConfig(false)
    setPendingPptPrompt(null)
  }

  // ── Build assistant message including Phase 4 + Phase 5 fields ───────────
  const buildAssistantMsg = (data, currentMode) => ({
    id:            uid(),
    role:          'assistant',
    mode:          currentMode,
    content:       data.agent_reply  || '',
    result:        data.optimized_prompt ? {
                     optimized_prompt: data.optimized_prompt,
                     skill_persona:    data.skill_persona,
                     mcp_suggestions:  data.mcp_suggestions,
                   } : null,
    summary:       data.summary       || null,
    casual_reply:  data.casual_reply  || null,
    training_id:   data.training_id   || null,
    used_fallback: data.used_fallback || false,
    // Phase 5
    rag_citations: data.rag_citations || null,
    rag_used:      data.rag_used      || false,
    timestamp:     new Date().toISOString(),
  })

  // ── Main send ─────────────────────────────────────────────────────────────
  const sendPrompt = async (promptText) => {
    if (!promptText.trim() || isLoading) return
    const currentModel = user?.preferred_model || 'gemini-2.0-flash'
    const userInitial  = user?.email?.[0]?.toUpperCase() || 'U'

    // Close doc upload panel when sending
    setShowDocUpload(false)

    if (outputType === 'ppt') {
      setPendingPptPrompt(promptText)
      setShowPptConfig(true)
      return
    }

    const userMsg = {
      id: uid(), role: 'user', content: promptText, userInitial,
      mode, result: null, summary: null, casual_reply: null,
      training_id: null, used_fallback: false,
      rag_citations: null, rag_used: false,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      // Image output
      if (outputType === 'image') {
        const data = await generateOutput(promptText, 'image', currentModel, activeChatId)
        if (!activeChatId && data.chat_id) { setActiveChatId(data.chat_id); setSidebarRefresh(n => n+1) }
        setMessages(prev => [...prev, {
          id: uid(), role: 'assistant', mode: 'output',
          content: '', training_id: null, used_fallback: false,
          rag_citations: null, rag_used: false,
          timestamp: new Date().toISOString(),
          result: { output_type: 'image', image_url: data.image_url, prompt: promptText },
        }])
        return
      }

      // PDF output
      if (outputType === 'pdf') {
        const data = await generateOutput(promptText, 'pdf', currentModel, activeChatId)
        if (!activeChatId && data.chat_id) { setActiveChatId(data.chat_id); setSidebarRefresh(n => n+1) }
        setMessages(prev => [...prev, {
          id: uid(), role: 'assistant', mode: 'output',
          content: '', file_b64: data.file_b64,
          training_id: null, used_fallback: false,
          rag_citations: null, rag_used: false,
          timestamp: new Date().toISOString(),
          result: { output_type: 'pdf', filename: data.filename, title: data.preview_text, page_count: data.page_count },
        }])
        return
      }

      // Standard chat (prompt_optimization / summarise / agent / free)
      const data = await analyzePrompt(promptText, mode, currentModel, activeChatId)
      if (!activeChatId && data.chat_id) { setActiveChatId(data.chat_id); setSidebarRefresh(n => n+1) }
      setMessages(prev => [...prev, buildAssistantMsg(data, mode)])

    } catch (err) {
      setMessages(prev => [...prev, {
        id: uid(), role: 'error',
        content: err.message || 'Something went wrong.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // ── PPT generation ────────────────────────────────────────────────────────
  const handlePptGenerate = async (pptOptions) => {
    if (!pendingPptPrompt || isLoading) return
    const promptText   = pendingPptPrompt
    const currentModel = user?.preferred_model || 'gemini-2.0-flash'
    const userInitial  = user?.email?.[0]?.toUpperCase() || 'U'

    setShowPptConfig(false)
    setPendingPptPrompt(null)

    setMessages(prev => [...prev, {
      id: uid(), role: 'user', content: promptText, userInitial,
      mode, result: null, summary: null, casual_reply: null,
      training_id: null, used_fallback: false,
      rag_citations: null, rag_used: false,
      timestamp: new Date().toISOString(),
    }])
    setIsLoading(true)

    try {
      const data = await generateOutput(promptText, 'ppt', currentModel, activeChatId, pptOptions)
      if (!activeChatId && data.chat_id) { setActiveChatId(data.chat_id); setSidebarRefresh(n => n+1) }
      setMessages(prev => [...prev, {
        id: uid(), role: 'assistant', mode: 'output',
        content: '', file_b64: data.file_b64,
        training_id: null, used_fallback: false,
        rag_citations: null, rag_used: false,
        timestamp: new Date().toISOString(),
        result: { output_type: 'ppt', filename: data.filename, title: data.preview_text, slide_count: data.slide_count },
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: uid(), role: 'error',
        content: err.message || 'PPT generation failed.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>

      {/* Mesh background */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: 'var(--bg-base)' }}>
        <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <Header />

        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <Sidebar
            activeChatId={activeChatId}
            onSelectChat={loadChat}
            onNewChat={startNewChat}
            refreshTrigger={sidebarRefresh}
            onShowDocUpload={() => setShowDocUpload(v => !v)}
            showDocUpload={showDocUpload}
          />

          {/* Main area */}
          <div className="flex flex-col flex-1 overflow-hidden">

            {/* Messages */}
            <main className="flex-1 overflow-y-auto scrollbar-chat">
              <div className="max-w-3xl mx-auto px-4 py-6">
                {messages.length === 0 && !isLoading && !showPptConfig ? (
                  <WelcomeScreen onExampleClick={sendPrompt} activeMode={mode} />
                ) : (
                  <div className="space-y-6 pb-4">
                    {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
                    {isLoading && <LoadingBubble />}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>
            </main>

            {/* ── Document Upload Panel — slides up above input ── */}
            {showDocUpload && (
              <div className="flex-shrink-0 px-4 pb-2 animate-slide-up"
                style={{ borderTop: '1px solid var(--border)' }}>
                <div className="max-w-3xl mx-auto pt-3">
                  <DocumentUpload onClose={() => setShowDocUpload(false)} />
                </div>
              </div>
            )}

            {/* ── PPT Config Panel ── */}
            {showPptConfig && (
              <div className="flex-shrink-0 px-4 pb-2"
                style={{ borderTop: '1px solid var(--border)' }}>
                <div className="max-w-3xl mx-auto pt-3">
                  <PptConfigPanel
                    prompt={pendingPptPrompt}
                    onGenerate={handlePptGenerate}
                    onCancel={() => { setShowPptConfig(false); setPendingPptPrompt(null) }}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            )}

            {/* ── Chat Input ── */}
            {!showPptConfig && (
              <div className="flex-shrink-0"
                style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-overlay)', backdropFilter: 'blur(16px)' }}>
                <ChatInput
                  onSend={sendPrompt}
                  isLoading={isLoading}
                  mode={mode}
                  onModeChange={setMode}
                  outputType={outputType}
                  onOutputTypeChange={handleOutputTypeChange}
                  onToggleDocUpload={() => setShowDocUpload(v => !v)}
                  docUploadActive={showDocUpload}
                />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
