import { useRef, useEffect } from 'react'
import Message from './Message'
import WelcomeScreen from './WelcomeScreen'
import MessageInput from './MessageInput'
import './ChatContainer.css'

const ChatContainer = ({ 
  messages, 
  isGenerating, 
  isProcessingOCR,
  error,
  onSendMessage, 
  onImageUpload,
  disabled,
  // Toggle props for mobile
  streamOutput,
  setStreamOutput,
  searchEnabled,
  setSearchEnabled,
}) => {
  const messagesEndRef = useRef(null)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSuggestionClick = (text) => {
    onSendMessage(text, null)
  }

  return (
    <div className="chat-container">
      <div className="messages-area">
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
        ) : (
          <div className="messages-list">
            {messages.map((message, index) => (
              <Message 
                key={message.id} 
                message={message}
                isGenerating={isGenerating && index === messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {error && (
        <div className="error-banner">
          <span>{error}</span>
        </div>
      )}
      
      {/* Mobile toggle bar - only visible on mobile */}
      <div className="mobile-toggle-bar">
        <div className="mobile-toggle">
          <label className="switch">
            <input 
              type="checkbox" 
              checked={streamOutput}
              onChange={(e) => setStreamOutput(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
          <span className="mobile-toggle-label">Stream</span>
        </div>
        
        <div className="mobile-toggle">
          <label className="switch">
            <input 
              type="checkbox" 
              checked={searchEnabled}
              onChange={(e) => setSearchEnabled(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
          <span className="mobile-toggle-label">Search</span>
        </div>
      </div>
      
      <MessageInput
        onSend={onSendMessage}
        onImageUpload={onImageUpload}
        isGenerating={isGenerating}
        isProcessingOCR={isProcessingOCR}
        disabled={disabled}
      />
    </div>
  )
}

export default ChatContainer

