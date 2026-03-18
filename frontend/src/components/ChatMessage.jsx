import ResultCard        from './ResultCard'
import SummaryCard       from './SummaryCard'
import AgentMessage      from './AgentMessage'
import ImageOutputCard   from './ImageOutputCard'
import FileOutputCard    from './FileOutputCard'
import FeedbackButtons   from './FeedbackButtons'
import RagSourcesPanel   from './RagSourcesPanel'

function MessageText({ text }) {
  if (!text) return null
  const urlRegex = /https?:\/\/[^\s]+/g
  const parts = []
  let lastIndex = 0, match
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    parts.push({ type: 'url', value: match[0] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) })
  return (
    <p style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
      {parts.map((p, i) =>
        p.type === 'url'
          ? <a key={i} href={p.value} target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 opacity-90 hover:opacity-100 break-all"
              style={{ color: 'inherit' }} onClick={e => e.stopPropagation()}>{p.value}</a>
          : <span key={i}>{p.value}</span>
      )}
    </p>
  )
}

export default function ChatMessage({ message }) {
  const isUser   = message.role === 'user'
  const isError  = message.role === 'error'
  const isCasual = message.role === 'assistant' && message.casual_reply

  const showFeedback = (
    message.role === 'assistant' &&
    message.training_id &&
    !isCasual &&
    !message.result?.output_type
  )

  // Show RAG sources on non-casual, non-output assistant messages
  const showRag = (
    message.role === 'assistant' &&
    !isCasual &&
    !message.result?.output_type &&
    message.rag_used
  )

  const time = new Date(message.timestamp || message.created_at)
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const renderAssistant = () => {
    const r = message.result
    if (r?.output_type === 'image') return <ImageOutputCard imageUrl={r.image_url} prompt={r.prompt || message.content}/>
    if (r?.output_type === 'pdf')   return (
      <FileOutputCard outputType="pdf" fileB64={message.file_b64}
        filename={r.filename} previewText={r.title} pageCount={r.page_count}
        mimeType="application/pdf"/>
    )
    if (r?.output_type === 'ppt')   return (
      <FileOutputCard outputType="ppt" fileB64={message.file_b64}
        filename={r.filename} previewText={r.title} slideCount={r.slide_count}
        mimeType="application/vnd.openxmlformats-officedocument.presentationml.presentation"/>
    )
    if (isCasual) return (
      <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed max-w-lg msg-enter"
        style={{ background:'var(--chat-ai-bg)', border:'1px solid var(--chat-ai-border)', color:'var(--text-primary)', boxShadow:'var(--shadow-sm)', overflowWrap:'anywhere', wordBreak:'break-word' }}>
        {message.casual_reply}
      </div>
    )
    if (message.mode === 'summarise' && message.summary) return <SummaryCard summary={message.summary}/>
    if (message.mode === 'agent' && message.content)     return <AgentMessage content={message.content}/>
    if (message.result)                                  return <ResultCard result={message.result}/>
    if (message.content) return (
      <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed msg-enter"
        style={{ background:'var(--chat-ai-bg)', border:'1px solid var(--chat-ai-border)', color:'var(--text-primary)', boxShadow:'var(--shadow-sm)', overflowWrap:'anywhere', wordBreak:'break-word' }}>
        <MessageText text={message.content}/>
      </div>
    )
    return null
  }

  return (
    <div className={`flex gap-3 msg-enter ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {isUser ? (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background:'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow:'0 2px 8px rgba(99,102,241,0.4)' }}>
            {message.userInitial || 'U'}
          </div>
        ) : isError ? (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background:'var(--accent-soft)', border:'1px solid var(--border-strong)' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={{ color:'var(--accent)' }}>
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={`min-w-0 max-w-[82%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <p className="text-xs font-medium px-1 mb-0.5" style={{ color:'var(--text-muted)' }}>
          {isUser ? 'You' : isError ? 'Error' : 'Assistant'}
        </p>

        {isUser ? (
          <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed text-white msg-enter w-full"
            style={{ background:'linear-gradient(135deg,#4338ca,#6d28d9)', boxShadow:'0 2px 12px rgba(99,102,241,0.35)', overflowWrap:'anywhere', wordBreak:'break-word', minWidth:0 }}>
            <MessageText text={message.content}/>
          </div>
        ) : isError ? (
          <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed msg-enter w-full"
            style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171', overflowWrap:'anywhere', wordBreak:'break-word' }}>
            <MessageText text={message.content}/>
          </div>
        ) : (
          <div className="w-full min-w-0">{renderAssistant()}</div>
        )}

        {/* RAG Sources — collapsible, below the bubble */}
        {showRag && (
          <div className="w-full">
            <RagSourcesPanel
              citations={message.rag_citations}
              ragUsed={message.rag_used}
            />
          </div>
        )}

        {/* Feedback buttons */}
        {showFeedback && (
          <FeedbackButtons trainingId={message.training_id} usedFallback={message.used_fallback}/>
        )}

        <p className="text-xs px-1" style={{ color:'var(--text-muted)', opacity:0.7 }}>{time}</p>
      </div>
    </div>
  )
}
