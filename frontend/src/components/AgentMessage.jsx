import ReactMarkdown from 'react-markdown'

export default function AgentMessage({ content }) {
  return (
    <div className="rounded-2xl rounded-tl-sm px-4 py-3.5 max-w-2xl msg-enter"
      style={{
        background: 'var(--chat-ai-bg)',
        border: '1px solid var(--chat-ai-border)',
        boxShadow: 'var(--shadow-sm)',
      }}>
      <div className="prose prose-sm prose-invert max-w-none
        prose-p:leading-relaxed prose-p:my-1.5
        prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
        prose-ul:my-1.5 prose-li:my-0.5
        prose-ol:my-1.5
        prose-pre:my-2
      ">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  )
}
