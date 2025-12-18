import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import useChat from './hooks/useChat'
import Sidebar from './components/Sidebar/Sidebar'
import ChatContainer from './components/Chat/ChatContainer'
import ModelSelector from './components/Settings/ModelSelector'
import SettingsModal from './components/Settings/SettingsModal'
import AuthPage from './components/Auth/AuthPage'
import Profile from './components/Auth/Profile'
import { MenuIcon, SettingsIcon, UserIcon } from './components/Icons'
import './App.css'

function AppContent() {
  const { isAuthenticated, loading, user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  
  const {
    conversations,
    activeConversation,
    activeConvoId,
    apiKeys,
    baseUrls,
    selectedModel,
    isGenerating,
    isProcessingOCR,
    isSearching,
    error,
    streamOutput,
    searchEnabled,
    searchWithPerplexityEnabled,
    setStreamOutput,
    setSearchEnabled,
    setSearchWithPerplexityEnabled,
    setActiveConvoId,
    createNewChat,
    deleteConversation,
    sendMessage,
    processImage,
    setSelectedModel,
    updateApiKey,
    updateBaseUrl,
  } = useChat()

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="app loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />
  }

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

          <div className='header-left'>

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
          </div>
          
          <div className="header-toggles">
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
            
            <div className="search-toggle">
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={searchEnabled}
                  onChange={(e) => setSearchEnabled(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
              <span className="search-label">Search</span>
            </div>
            
            <div className="search-toggle perplexity-toggle">
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={searchWithPerplexityEnabled}
                  onChange={(e) => setSearchWithPerplexityEnabled(e.target.checked)}
                />
                <span className="slider round perplexity"></span>
              </label>
              <span className="search-label perplexity-label">Perplexity</span>
            </div>
          </div>
    </div>
          
          <div className="header-right">
            <button 
              className="profile-btn"
              onClick={() => setProfileOpen(true)}
              title={`@${user?.username}`}
            >
              <UserIcon />
            </button>
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
          streamOutput={streamOutput}
          setStreamOutput={setStreamOutput}
          searchEnabled={searchEnabled}
          setSearchEnabled={setSearchEnabled}
          searchWithPerplexityEnabled={searchWithPerplexityEnabled}
          setSearchWithPerplexityEnabled={setSearchWithPerplexityEnabled}
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

      <Profile 
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
