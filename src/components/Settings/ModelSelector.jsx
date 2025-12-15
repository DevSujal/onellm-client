import { useState, useRef, useEffect, useCallback } from 'react'
import { FALLBACK_MODELS, PROVIDERS } from '../../constants/models'
import { fetchProviders, fetchModelsForProvider } from '../../services/api'
import { ChevronDownIcon, CheckIcon, AlertIcon } from '../Icons'
import './ModelSelector.css'

const ModelSelector = ({ selectedModel, onSelectModel, apiKeys }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [availableProviders, setAvailableProviders] = useState([])
  const [models, setModels] = useState(FALLBACK_MODELS)
  const [loadingModels, setLoadingModels] = useState({})
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)
  
  // Load providers on mount
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const data = await fetchProviders()
        if (data && data.providers) {
          setAvailableProviders(data.providers)
        }
      } catch (err) {
        console.error('Failed to load providers:', err)
      }
    }
    loadProviders()
  }, [])

  // Load models for a provider
  const loadModelsForProvider = useCallback(async (provider) => {
    const providerInfo = PROVIDERS[provider]
    if (!providerInfo) return

    const apiKey = providerInfo.keyName ? apiKeys[providerInfo.keyName] : null
    const defaultKey = providerInfo.defaultApiKey

    // Only fetch if provider doesn't require key, has an API key, or has a default key
    if (providerInfo.requiresKey && !apiKey && !defaultKey) return

    setLoadingModels(prev => ({ ...prev, [provider]: true }))
    
    try {
      const fetchedModels = await fetchModelsForProvider(provider, apiKey || defaultKey)
      if (fetchedModels && fetchedModels.length > 0) {
        setModels(prev => {
          // Remove existing models for this provider and add new ones
          const filtered = prev.filter(m => m.provider !== provider)
          return [...filtered, ...fetchedModels]
        })
      }
    } catch (err) {
      console.error(`Failed to load models for ${provider}:`, err)
    } finally {
      setLoadingModels(prev => ({ ...prev, [provider]: false }))
    }
  }, [apiKeys])

  // Load models for free providers on mount
  useEffect(() => {
    const freeProviders = Object.keys(PROVIDERS).filter(p => !PROVIDERS[p].requiresKey || PROVIDERS[p].defaultApiKey)
    freeProviders.forEach(provider => {
      loadModelsForProvider(provider)
    })
  }, [loadModelsForProvider])

  // Load models when API keys change
  useEffect(() => {
    Object.keys(apiKeys).forEach(keyName => {
      // Find provider by keyName
      const provider = Object.keys(PROVIDERS).find(p => PROVIDERS[p].keyName === keyName)
      if (provider && apiKeys[keyName]) {
        loadModelsForProvider(provider)
      }
    })
  }, [apiKeys, loadModelsForProvider])

  const currentModel = models.find(m => m.id === selectedModel) || FALLBACK_MODELS.find(m => m.id === selectedModel)
  
  // Check if selected model has required API key
  const currentProvider = currentModel ? PROVIDERS[currentModel.provider] : null
  const hasRequiredKey = currentProvider && (
    !currentProvider.requiresKey || 
    currentProvider.defaultApiKey ||
    (currentProvider.keyName && apiKeys[currentProvider.keyName])
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Filter models based on search and available providers
  const filteredModels = models.filter(m => {
    // If we have a list of available providers from API, filter by that
    // But always keep FreeLLM, Ollama, and RWKV as they are free
    if (availableProviders.length > 0 && 
        !availableProviders.includes(m.provider) && 
        m.provider !== 'freellm' && 
        m.provider !== 'ollama' &&
        m.provider !== 'rwkv') {
      return false
    }

    const searchLower = search.toLowerCase()
    return (
      m.name.toLowerCase().includes(searchLower) ||
      m.id.toLowerCase().includes(searchLower) ||
      PROVIDERS[m.provider]?.name.toLowerCase().includes(searchLower)
    )
  })

  // Group filtered models by provider
  const groupedFiltered = {}
  filteredModels.forEach(m => {
    if (!groupedFiltered[m.provider]) {
      groupedFiltered[m.provider] = []
    }
    groupedFiltered[m.provider].push(m)
  })

  const handleSelect = (modelId) => {
    onSelectModel(modelId)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="model-selector" ref={dropdownRef}>
      <button 
        className={`model-selector-btn ${isOpen ? 'open' : ''} ${!hasRequiredKey ? 'warning' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="model-selector-content">
          <span className="model-selector-label">Model</span>
          <span className="model-selector-value">
            {currentModel?.name || 'Select model'}
            {currentModel?.free && <span className="free-badge">FREE</span>}
          </span>
        </div>
        {!hasRequiredKey && (
          <span className="key-warning" title="API key required">
            <AlertIcon />
          </span>
        )}
        <ChevronDownIcon />
      </button>
      
      {isOpen && (
        <div className="model-dropdown">
          <div className="model-search-container">
            <input
              ref={inputRef}
              type="text"
              className="model-search"
              placeholder="Search models..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div className="model-list">
            {Object.entries(groupedFiltered).map(([provider, models]) => (
              <div key={provider} className="model-group">
                <div className="model-group-header">
                  <span>{PROVIDERS[provider]?.name || provider}</span>
                  {!PROVIDERS[provider]?.requiresKey && (
                    <span className="free-label">Free</span>
                  )}
                  {PROVIDERS[provider]?.requiresKey && !apiKeys[PROVIDERS[provider]?.keyName] && (
                    <span className="needs-key-label">
                      <AlertIcon /> Key needed
                    </span>
                  )}
                </div>
                {models.map(model => {
                  const provider = PROVIDERS[model.provider]
                  const needsKey = provider?.requiresKey && !apiKeys[provider?.keyName]
                  
                  return (
                    <button
                      key={model.id}
                      className={`model-option ${selectedModel === model.id ? 'selected' : ''} ${needsKey ? 'disabled' : ''}`}
                      onClick={() => !needsKey && handleSelect(model.id)}
                      disabled={needsKey}
                    >
                      <div className="model-option-info">
                        <span className="model-option-name">
                          {model.name}
                          {model.free && <span className="free-badge small">FREE</span>}
                        </span>
                        <span className="model-option-desc">{model.description}</span>
                      </div>
                      {selectedModel === model.id && (
                        <CheckIcon />
                      )}
                      {needsKey && (
                        <span className="model-option-lock">🔒</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
            
            {filteredModels.length === 0 && (
              <div className="no-models">
                No models found for "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelSelector
