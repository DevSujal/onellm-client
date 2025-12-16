import { useState } from 'react'
import { PROVIDERS } from '../../constants/models'
import { CloseIcon, KeyIcon, CheckIcon, AlertIcon } from '../Icons'
import './SettingsModal.css'

const SettingsModal = ({ isOpen, onClose, apiKeys, baseUrls = {}, onUpdateApiKey, onUpdateBaseUrl }) => {
  const [editingKey, setEditingKey] = useState({})
  const [editingUrl, setEditingUrl] = useState({})
  
  if (!isOpen) return null

  const handleKeyChange = (provider, value) => {
    setEditingKey(prev => ({ ...prev, [provider]: value }))
  }

  const handleUrlChange = (provider, value) => {
    setEditingUrl(prev => ({ ...prev, [provider]: value }))
  }

  const handleSaveKey = (provider) => {
    const value = editingKey[provider]
    if (value !== undefined) {
      onUpdateApiKey(provider, value.trim())
      setEditingKey(prev => {
        const next = { ...prev }
        delete next[provider]
        return next
      })
    }
  }

  const handleSaveUrl = (provider) => {
    const value = editingUrl[provider]
    if (value !== undefined) {
      onUpdateBaseUrl(provider, value.trim())
      setEditingUrl(prev => {
        const next = { ...prev }
        delete next[provider]
        return next
      })
    }
  }

  const isEditing = (provider) => editingKey[provider] !== undefined
  const isEditingUrl = (provider) => editingUrl[provider] !== undefined

  // Separate providers: those with keys and RWKV (free with custom baseUrl)
  const providersWithKeys = Object.entries(PROVIDERS).filter(([, p]) => p.requiresKey)
  const freeProvidersWithConfig = Object.entries(PROVIDERS).filter(([key, p]) => !p.requiresKey && (p.defaultBaseUrl || p.defaultApiKey))

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">
            <KeyIcon />
            <h2>API Keys</h2>
          </div>
          <button className="settings-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        
        <div className="settings-content">
          <p className="settings-description">
            Add your API keys to use premium models. Keys are stored locally in your browser.
            <br />
            <span className="settings-hint">Free models (FreeLLM, Ollama & RWKV7) don't require any API key.</span>
          </p>
          
          {/* Free providers with configurable settings */}
          {freeProvidersWithConfig.length > 0 && (
            <>
              <h3 className="settings-section-title">🆓 Free Models Configuration</h3>
              <div className="api-keys-list">
                {freeProvidersWithConfig.map(([key, provider]) => (
                  <div key={key} className="api-key-item free-provider">
                    <div className="api-key-header">
                      <span className="provider-name">{provider.name} <span className="free-badge">FREE</span></span>
                    </div>
                    
                    {/* API Key (optional, with default) */}
                    {provider.defaultApiKey && (
                      <div className="api-key-field">
                        <label className="field-label">API Key (default: {provider.defaultApiKey})</label>
                        <div className="api-key-input-row">
                          <input
                            type={isEditing(key) ? 'text' : 'password'}
                            className="api-key-input"
                            placeholder={provider.keyPlaceholder || provider.defaultApiKey}
                            value={isEditing(key) ? editingKey[key] : (apiKeys[key] || '')}
                            onChange={e => handleKeyChange(key, e.target.value)}
                            onFocus={() => {
                              if (editingKey[key] === undefined) {
                                setEditingKey(prev => ({ ...prev, [key]: apiKeys[key] || '' }))
                              }
                            }}
                          />
                          {isEditing(key) && (
                            <button 
                              className="save-key-btn"
                              onClick={() => handleSaveKey(key)}
                            >
                              Save
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Base URL (optional, with default) */}
                    {provider.defaultBaseUrl && (
                      <div className="api-key-field">
                        <label className="field-label">Base URL (optional)</label>
                        <div className="api-key-input-row">
                          <input
                            type="text"
                            className="api-key-input base-url-input"
                            placeholder={provider.defaultBaseUrl}
                            value={isEditingUrl(key) ? editingUrl[key] : (baseUrls[key] || '')}
                            onChange={e => handleUrlChange(key, e.target.value)}
                            onFocus={() => {
                              if (editingUrl[key] === undefined) {
                                setEditingUrl(prev => ({ ...prev, [key]: baseUrls[key] || '' }))
                              }
                            }}
                          />
                          {isEditingUrl(key) && (
                            <button 
                              className="save-key-btn"
                              onClick={() => handleSaveUrl(key)}
                            >
                              Save
                            </button>
                          )}
                        </div>
                        <span className="field-hint">Default: {provider.defaultBaseUrl}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          
          <h3 className="settings-section-title">🔑 API Keys</h3>
          <div className="api-keys-list">
            {providersWithKeys.map(([key, provider]) => (
              <div key={key} className="api-key-item">
                <div className="api-key-header">
                  <span className="provider-name">{provider.name}</span>
                  {apiKeys[key] && !isEditing(key) && (
                    <span className="key-status key-saved">
                      <CheckIcon /> Saved
                    </span>
                  )}
                  {!apiKeys[key] && !isEditing(key) && (
                    <span className="key-status key-missing">
                      <AlertIcon /> Not set
                    </span>
                  )}
                </div>
                
                <div className="api-key-input-row">
                  <input
                    type={isEditing(key) ? 'text' : 'password'}
                    className="api-key-input"
                    placeholder={provider.keyPlaceholder || 'Enter API key...'}
                    value={isEditing(key) ? editingKey[key] : (apiKeys[key] || '')}
                    onChange={e => handleKeyChange(key, e.target.value)}
                    onFocus={() => {
                      if (editingKey[key] === undefined) {
                        setEditingKey(prev => ({ ...prev, [key]: apiKeys[key] || '' }))
                      }
                    }}
                  />
                  {isEditing(key) && (
                    <button 
                      className="save-key-btn"
                      onClick={() => handleSaveKey(key)}
                    >
                      Save
                    </button>
                  )}
                </div>
                
                {/* Base URL input for providers that support it */}
                <div className="api-key-field base-url-field">
                  <label className="field-label">Base URL (optional, for custom endpoints)</label>
                  <div className="api-key-input-row">
                    <input
                      type="text"
                      className="api-key-input base-url-input"
                      placeholder="https://api.example.com/v1"
                      value={isEditingUrl(key) ? editingUrl[key] : (baseUrls[key] || '')}
                      onChange={e => handleUrlChange(key, e.target.value)}
                      onFocus={() => {
                        if (editingUrl[key] === undefined) {
                          setEditingUrl(prev => ({ ...prev, [key]: baseUrls[key] || '' }))
                        }
                      }}
                    />
                    {isEditingUrl(key) && (
                      <button 
                        className="save-key-btn"
                        onClick={() => handleSaveUrl(key)}
                      >
                        Save
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="settings-footer">
          <p className="settings-security">
            🔒 Your API keys are stored securely in your browser's localStorage and never sent to any server except the respective API provider.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
