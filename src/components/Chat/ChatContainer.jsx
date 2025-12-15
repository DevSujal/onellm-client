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
  disabled 
}) => {
  const messagesEndRef = useRef(null)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSuggestionClick = (text) => {
    onSendMessage(text)
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
