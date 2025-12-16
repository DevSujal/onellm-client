import { memo, useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { UserIcon, BotIcon, CopyIcon } from '../Icons'
import './Message.css'

// Timer component for showing elapsed time while waiting for response
const ResponseTimer = () => {
  const [elapsed, setElapsed] = useState(0)
  
  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 100) / 10)
    }, 100)
    
    return () => clearInterval(interval)
  }, [])
  
  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`
    }
    const mins = Math.floor(seconds / 60)
    const secs = (seconds % 60).toFixed(1)
    return `${mins}m ${secs}s`
  }
  
  return (
    <div className="response-timer">
      <div className="timer-spinner"></div>
      <span className="timer-text">{formatTime(elapsed)}</span>
    </div>
  )
}

// Thinking indicator component for chain-of-thought models
const ThinkingIndicator = () => {
  return (
    <div className="thinking-indicator">
      <div className="thinking-brain">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a9 9 0 0 0-9 9c0 3.6 2.4 6.6 5.7 7.7.3.1.6.2.9.3h4.8c.3-.1.6-.2.9-.3C18.6 17.6 21 14.6 21 11a9 9 0 0 0-9-9z"/>
          <path d="M12 6v2M9 9c0-1.5 1.3-3 3-3s3 1.5 3 3-1.3 3-3 3"/>
          <path d="M12 18v4M8 22h8"/>
        </svg>
      </div>
      <span className="thinking-text">Thinking...</span>
    </div>
  )
}

const Message = memo(({ message, isGenerating }) => {
  const isUser = message.role === 'user'
  const isStreaming = !isUser && isGenerating && !message.content
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
  }

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
  }
  
  // Parse content to detect thinking blocks and extract actual response
  const parseThinkingContent = (content) => {
    if (!content) return { isThinking: false, hasResponse: false, responseContent: '' }
    
    // Check for <think> or <thinking> tags (common patterns)
    const thinkPatterns = [
      /<think>([\s\S]*?)<\/think>/gi,
      /<thinking>([\s\S]*?)<\/thinking>/gi,
    ]
    
    let cleanContent = content
    let hasThinkingBlock = false
    
    // Remove all thinking blocks
    for (const pattern of thinkPatterns) {
      if (pattern.test(cleanContent)) {
        hasThinkingBlock = true
        cleanContent = cleanContent.replace(pattern, '')
      }
      // Reset regex lastIndex
      pattern.lastIndex = 0
    }
    
    // Check if content starts with <think> but hasn't closed yet (still thinking)
    const unclosedThink = /<think>[\s\S]*$/i.test(content) && !/<\/think>/i.test(content)
    const unclosedThinking = /<thinking>[\s\S]*$/i.test(content) && !/<\/thinking>/i.test(content)
    const isActivelyThinking = unclosedThink || unclosedThinking
    
    // Trim the cleaned content
    cleanContent = cleanContent.trim()
    
    return {
      isThinking: isActivelyThinking,
      hasThinkingBlock: hasThinkingBlock || isActivelyThinking,
      hasResponse: cleanContent.length > 0,
      responseContent: cleanContent
    }
  }
  
  // Get display content (remove [Image text]: ... for display when image is present)
  const getDisplayContent = (content) => {
    if (!content) return ''
    
    // First, parse out thinking blocks
    const { responseContent } = parseThinkingContent(content)
    
    // If message has an image, remove the OCR text for cleaner display
    if (message.image) {
      // Remove [Image text]: and everything after it, keeping user's text before it
      let cleaned = responseContent.replace(/\n?\n?\[Image text\]:[\s\S]*$/g, '').trim()
      return cleaned
    }
    return responseContent
  }

  // Check thinking status
  const thinkingStatus = parseThinkingContent(message.content)

  // Custom components for react-markdown
  const markdownComponents = {
    // Code blocks with syntax highlighting
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '')
      const codeString = String(children).replace(/\n$/, '')
      
      if (!inline && match) {
        return (
          <div className="code-block">
            <div className="code-header">
              <span className="code-lang">{match[1]}</span>
              <button 
                className="code-copy-btn" 
                onClick={() => handleCopyCode(codeString)}
                title="Copy code"
              >
                <CopyIcon />
              </button>
            </div>
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: '0 0 12px 12px',
                background: 'transparent',
              }}
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        )
      } else if (!inline) {
        return (
          <div className="code-block">
            <div className="code-header">
              <span className="code-lang">code</span>
              <button 
                className="code-copy-btn" 
                onClick={() => handleCopyCode(codeString)}
                title="Copy code"
              >
                <CopyIcon />
              </button>
            </div>
            <pre className="code-pre">
              <code {...props}>{children}</code>
            </pre>
          </div>
        )
      }
      
      return <code className="inline-code" {...props}>{children}</code>
    },
    // Paragraphs
    p({ children }) {
      return <p className="markdown-p">{children}</p>
    },
    // Lists
    ul({ children }) {
      return <ul className="markdown-ul">{children}</ul>
    },
    ol({ children }) {
      return <ol className="markdown-ol">{children}</ol>
    },
    li({ children }) {
      return <li className="markdown-li">{children}</li>
    },
    // Headings
    h1({ children }) {
      return <h1 className="markdown-h1">{children}</h1>
    },
    h2({ children }) {
      return <h2 className="markdown-h2">{children}</h2>
    },
    h3({ children }) {
      return <h3 className="markdown-h3">{children}</h3>
    },
    h4({ children }) {
      return <h4 className="markdown-h4">{children}</h4>
    },
    // Blockquotes
    blockquote({ children }) {
      return <blockquote className="markdown-blockquote">{children}</blockquote>
    },
    // Links
    a({ href, children }) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="markdown-link">
          {children}
        </a>
      )
    },
    // Bold and italic are handled automatically by react-markdown
    strong({ children }) {
      return <strong className="markdown-strong">{children}</strong>
    },
    em({ children }) {
      return <em className="markdown-em">{children}</em>
    },
    // Horizontal rule
    hr() {
      return <hr className="markdown-hr" />
    },
    // Tables
    table({ children }) {
      return <table className="markdown-table">{children}</table>
    },
    thead({ children }) {
      return <thead className="markdown-thead">{children}</thead>
    },
    tbody({ children }) {
      return <tbody className="markdown-tbody">{children}</tbody>
    },
    tr({ children }) {
      return <tr className="markdown-tr">{children}</tr>
    },
    th({ children }) {
      return <th className="markdown-th">{children}</th>
    },
    td({ children }) {
      return <td className="markdown-td">{children}</td>
    },
  }

  const displayContent = getDisplayContent(message.content)

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
            <ResponseTimer />
          ) : (
            <>
              {/* Show thinking indicator when model is actively thinking */}
              {!isUser && thinkingStatus.isThinking && !thinkingStatus.hasResponse && (
                <ThinkingIndicator />
              )}
              {/* Show search result images if available */}
              {!isUser && message.searchImages && message.searchImages.length > 0 && (
                <div className="search-images">
                  {message.searchImages.map((imageUrl, index) => (
                    <a 
                      key={index} 
                      href={imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="search-image-link"
                    >
                      <img 
                        src={imageUrl} 
                        alt={`Search result ${index + 1}`} 
                        className="search-image"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </a>
                  ))}
                </div>
              )}
              {/* Show image preview if message has an image */}
              {message.image && (
                <div className="message-image">
                  <img src={message.image.preview} alt={message.image.name || 'Uploaded image'} />
                </div>
              )}
              {displayContent && (
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {displayContent}
                  </ReactMarkdown>
                </div>
              )}
            </>
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
