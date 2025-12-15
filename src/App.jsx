import { useState } from 'react'
import useChat from './hooks/useChat'
import Sidebar from './components/Sidebar/Sidebar'
import ChatContainer from './components/Chat/ChatContainer'
import ModelSelector from './components/Settings/ModelSelector'
import SettingsModal from './components/Settings/SettingsModal'
import { MenuIcon, SettingsIcon } from './components/Icons'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  
  const {
    conversations,
    activeConversation,
    activeConvoId,
    apiKeys,
    baseUrls,
    selectedModel,
    isGenerating,
    isProcessingOCR,
    error,
    streamOutput,
    setStreamOutput,
    setActiveConvoId,
    createNewChat,
    deleteConversation,
    sendMessage,
    processImage,
    setSelectedModel,
    updateApiKey,
    updateBaseUrl,
  } = useChat()

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeConvoId={activeConvoId}
        onSelectConvo={setActiveConvoId}
        onNewChat={createNewChat}
        onDeleteConvo={deleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <main className="main-content">
        <header className="app-header">
          <div className="header-left">
            <button 
              className="menu-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <MenuIcon />
            </button>
            
            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              apiKeys={apiKeys}
            />
            
            <div className="stream-toggle">
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={streamOutput}
                  onChange={(e) => setStreamOutput(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
              <span className="stream-label">Stream</span>
            </div>
          </div>
          
          <div className="header-right">
            <button 
              className="settings-btn"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon />
              <span>API Keys</span>
            </button>
          </div>
        </header>
        
        <ChatContainer
          messages={activeConversation?.messages || []}
          isGenerating={isGenerating}
          isProcessingOCR={isProcessingOCR}
          error={error}
          onSendMessage={sendMessage}
          onImageUpload={processImage}
        />
      </main>
      
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKeys={apiKeys}
        baseUrls={baseUrls}
        onUpdateApiKey={updateApiKey}
        onUpdateBaseUrl={updateBaseUrl}
      />
    </div>
  )
}

export default App
