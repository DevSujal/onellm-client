import { SparkleIcon } from '../Icons'
import './WelcomeScreen.css'

const suggestions = [
  { icon: '💡', text: 'Explain quantum computing in simple terms' },
  { icon: '✍️', text: 'Write a short story about a robot' },
  { icon: '💻', text: 'Help me debug my JavaScript code' },
  { icon: '📊', text: 'Analyze the pros and cons of remote work' },
]

const WelcomeScreen = ({ onSuggestionClick }) => {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-icon">
          <SparkleIcon />
        </div>
        <h1 className="welcome-title">How can I help you today?</h1>
        <p className="welcome-subtitle">
          Start a conversation or try one of these suggestions
        </p>
        
        <div className="suggestions-grid">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="suggestion-card"
              onClick={() => onSuggestionClick(suggestion.text)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <span className="suggestion-icon">{suggestion.icon}</span>
              <span className="suggestion-text">{suggestion.text}</span>
            </button>
          ))}
        </div>
      </div>
      
      <p className="welcome-disclaimer">
        AI can make mistakes. Consider checking important information.
      </p>
    </div>
  )
}

export default WelcomeScreen
