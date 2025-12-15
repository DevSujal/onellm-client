import { memo } from 'react'
import { UserIcon, BotIcon, CopyIcon, RefreshIcon } from '../Icons'
import './Message.css'

const Message = memo(({ message, isGenerating }) => {
  const isUser = message.role === 'user'
  const isStreaming = !isUser && isGenerating && !message.content
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
  }
  
  // Format message content (simple markdown-like formatting)
  const formatContent = (content) => {
    if (!content) return null
    
    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g)
    
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/)
        const lang = match?.[1] || ''
        const code = match?.[2] || part.slice(3, -3)
        return (
          <div key={i} className="code-block">
            {lang && <span className="code-lang">{lang}</span>}
            <pre><code>{code.trim()}</code></pre>
          </div>
        )
      }
      
      // Format inline code
      const withInlineCode = part.split(/(`[^`]+`)/g).map((segment, j) => {
        if (segment.startsWith('`') && segment.endsWith('`')) {
          return <code key={j} className="inline-code">{segment.slice(1, -1)}</code>
        }
        return segment
      })
      
      return <span key={i}>{withInlineCode}</span>
    })
  }

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'} ${message.isError ? 'error' : ''}`}>
      <div className="message-avatar">
        {isUser ? <UserIcon /> : <BotIcon />}
      </div>
      
      <div className="message-content">
        <div className="message-header">
          <span className="message-role">{isUser ? 'You' : 'Assistant'}</span>
        </div>
        
        <div className="message-body">
          {isStreaming ? (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          ) : (
            formatContent(message.content)
          )}
        </div>
        
        {!isUser && message.content && !isGenerating && (
          <div className="message-actions">
            <button className="action-btn" onClick={handleCopy} title="Copy">
              <CopyIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

Message.displayName = 'Message'

export default Message
