import { PlusIcon, ChatIcon, TrashIcon, CloseIcon } from '../Icons'
import './Sidebar.css'

const Sidebar = ({ 
  conversations, 
  activeConvoId, 
  onSelectConvo, 
  onNewChat, 
  onDeleteConvo,
  isOpen,
  onClose 
}) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={onNewChat}>
            <PlusIcon />
            <span>New chat</span>
          </button>
          <button className="sidebar-close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="no-conversations">
              <ChatIcon />
              <p>No conversations yet</p>
              <span>Start a new chat to begin</span>
            </div>
          ) : (
            conversations.map(convo => (
              <div
                key={convo.id}
                className={`conversation-item ${convo.id === activeConvoId ? 'active' : ''}`}
                onClick={() => {
                  onSelectConvo(convo.id)
                  onClose()
                }}
              >
                <ChatIcon />
                <span className="conversation-title">{convo.title}</span>
                <button 
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteConvo(convo.id)
                  }}
                >
                  <TrashIcon />
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="sidebar-footer">
          <span className="powered-by">Powered by OneLLM</span>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
