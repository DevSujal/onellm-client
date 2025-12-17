import { useState, useCallback, useEffect, useRef } from 'react'
import { sendChatMessage, processImageOCR, searchWithPerplexity } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

// In production, API is on same origin. In development, use localhost:3001
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001')

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Helper to get auth token
const getToken = () => localStorage.getItem('token')

// Helper for authenticated API calls
const authFetch = async (url, options = {}) => {
  const token = getToken()
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
  return response
}

// Custom hook for chat functionality
export const useChat = () => {
  const { token } = useAuth() // Get token from auth context to react to login/logout
  const [conversations, setConversations] = useState([])
  const conversationsRef = useRef([]) // Ref to always have latest conversations
  const [activeConvoId, setActiveConvoId] = useState(null)
  // API keys are stored in localStorage for security (not in database)
  const [apiKeys, setApiKeys] = useState(() => {
    try {
      const stored = localStorage.getItem('apiKeys')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })
  const [baseUrls, setBaseUrls] = useState({})
  const [selectedModel, setSelectedModel] = useState('hf/rwkv7-g1a4-2.9b-20251118-ctx8192')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState(null)
  const [streamOutput, setStreamOutput] = useState(true)
  const [searchEnabled, setSearchEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Keep ref in sync with state
  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  // Fetch conversations and settings from API on mount or when token changes
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setConversations([])
        setActiveConvoId(null)
        setIsLoading(false)
        return
      }

      try {
        // Fetch conversations
        const convosRes = await authFetch(`${API_URL}/api/conversations`)
        if (convosRes.ok) {
          const convosData = await convosRes.json()
          setConversations(convosData.conversations || [])
          // Set active conversation to first one if exists
          if (convosData.conversations?.length > 0 && !activeConvoId) {
            setActiveConvoId(convosData.conversations[0].id)
          }
        }

        // Fetch settings (apiKeys are stored in localStorage, not database)
        const settingsRes = await authFetch(`${API_URL}/api/user/settings`)
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json()
          const settings = settingsData.settings
          if (settings) {
            setBaseUrls(settings.baseUrls || {})
            setSelectedModel(settings.selectedModel || 'hf/rwkv7-g1a4-2.9b-20251118-ctx8192')
            setStreamOutput(settings.streamOutput ?? true)
            setSearchEnabled(settings.searchEnabled ?? false)
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [token]) // Re-fetch when token changes (login/logout)

  // Get active conversation
  const activeConversation = conversations.find(c => c.id === activeConvoId) || null

  // Save settings to API
  const saveSettings = useCallback(async (updates) => {
    try {
      await authFetch(`${API_URL}/api/user/settings`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }, [])

  // Create new chat
  const createNewChat = useCallback(async () => {
    try {
      const response = await authFetch(`${API_URL}/api/conversations`, {
        method: 'POST',
        body: JSON.stringify({ title: 'New Chat' }),
      })

      if (response.ok) {
        const data = await response.json()
        const newConvo = data.conversation
        setConversations(prev => [newConvo, ...prev])
        setActiveConvoId(newConvo.id)
        setError(null)
        return newConvo.id
      }
    } catch (err) {
      console.error('Failed to create chat:', err)
    }
    return null
  }, [])

  // Delete conversation
  const deleteConversation = useCallback(async (id) => {
    try {
      const response = await authFetch(`${API_URL}/api/conversations/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== id))
        if (activeConvoId === id) {
          const remaining = conversations.filter(c => c.id !== id)
          setActiveConvoId(remaining[0]?.id || null)
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }, [conversations, activeConvoId])

  // Update conversation messages locally and sync to API
  const updateMessages = useCallback(async (convoId, messages, title = null) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convoId) return c
      return {
        ...c,
        messages,
        title: title || c.title,
      }
    }))

    // Sync to API
    try {
      await authFetch(`${API_URL}/api/conversations/${convoId}/sync`, {
        method: 'POST',
        body: JSON.stringify({ title, messages }),
      })
    } catch (err) {
      console.error('Failed to sync messages:', err)
    }
  }, [])

  // Send message
  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isGenerating) return

    let convoId = activeConvoId
    if (!convoId) {
      convoId = await createNewChat()
      if (!convoId) return
    }

    const currentConvo = conversations.find(c => c.id === convoId) || { messages: [] }

    // Add user message
    const userMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    }

    const updatedMessages = [...currentConvo.messages, userMessage]

    // Generate title from first message
    const title = currentConvo.messages.length === 0
      ? content.slice(0, 30) + (content.length > 30 ? '...' : '')
      : null

    // Update locally first
    setConversations(prev => prev.map(c => {
      if (c.id !== convoId) return c
      return { ...c, messages: updatedMessages, title: title || c.title }
    }))

    setError(null)
    setIsGenerating(true)

    // Create assistant message placeholder
    const assistantMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      searchImages: [],
    }

    setConversations(prev => prev.map(c => {
      if (c.id !== convoId) return c
      return { ...c, messages: [...updatedMessages, assistantMessage] }
    }))

    try {
      let searchContext = ''
      let searchImages = []

      // If search is enabled, call Perplexity first
      if (searchEnabled) {
        setIsSearching(true)
        try {
          const searchResult = await searchWithPerplexity(content.trim())
          searchContext = searchResult.content
          searchImages = searchResult.images || []

          // Update assistant message with search images immediately
          if (searchImages.length > 0) {
            setConversations(prev => prev.map(c => {
              if (c.id !== convoId) return c
              const msgs = [...c.messages]
              const lastIdx = msgs.length - 1
              if (msgs[lastIdx]?.role === 'assistant') {
                msgs[lastIdx] = { ...msgs[lastIdx], searchImages }
              }
              return { ...c, messages: msgs }
            }))
          }
        } catch (searchErr) {
          console.error('Search failed:', searchErr)
        } finally {
          setIsSearching(false)
        }
      }

      // Prepare messages for API
      const apiMessages = updatedMessages
        .filter(m => m.content && !m.isError && !m.content.startsWith('Error:'))
        .map((m, idx, arr) => {
          if (searchContext && m.role === 'user' && idx === arr.length - 1) {
            return {
              role: m.role,
              content: `${m.content}\n\n---\nSearch Results:\n${searchContext}\n---\n\nBased on the search results above, please answer my question.`,
            }
          }
          return { role: m.role, content: m.content }
        })

      let fullContent = ''

      const response = await sendChatMessage(apiMessages, selectedModel, apiKeys, {
        stream: streamOutput,
        baseUrls,
        onChunk: (chunk) => {
          fullContent += chunk
          setConversations(prev => prev.map(c => {
            if (c.id !== convoId) return c
            const msgs = [...c.messages]
            const lastIdx = msgs.length - 1
            if (msgs[lastIdx]?.role === 'assistant') {
              msgs[lastIdx] = { ...msgs[lastIdx], content: fullContent }
            }
            return { ...c, messages: msgs }
          }))
        }
      })

      if (!streamOutput) {
        setConversations(prev => prev.map(c => {
          if (c.id !== convoId) return c
          const msgs = [...c.messages]
          const lastIdx = msgs.length - 1
          if (msgs[lastIdx]?.role === 'assistant') {
            msgs[lastIdx] = { ...msgs[lastIdx], content: response.content }
          }
          return { ...c, messages: msgs }
        }))
      }

    } catch (err) {
      setError(err.message)
      setConversations(prev => prev.map(c => {
        if (c.id !== convoId) return c
        const msgs = [...c.messages]
        const lastIdx = msgs.length - 1
        if (msgs[lastIdx]?.role === 'assistant') {
          msgs[lastIdx] = {
            ...msgs[lastIdx],
            content: `Error: ${err.message}`,
            isError: true,
          }
        }
        return { ...c, messages: msgs }
      }))
    } finally {
      setIsGenerating(false)

      // Sync to database - use ref to get latest state
      setTimeout(() => {
        const currentConvoState = conversationsRef.current.find(c => c.id === convoId)
        if (currentConvoState) {
          // console.log('Syncing messages to DB:', {
          //   convoId,
          //   title: title || currentConvoState.title,
          //   messageCount: currentConvoState.messages.length,
          //   messages: currentConvoState.messages
          // })
          authFetch(`${API_URL}/api/conversations/${convoId}/sync`, {
            method: 'POST',
            body: JSON.stringify({
              title: title || currentConvoState.title,
              messages: currentConvoState.messages
            }),
          })
            .then(res => {
              // console.log('Sync response status:', res.status)
              return res.json()
            })
            .then(data => console.log('Sync response data:', data))
            .catch(err => console.error('Failed to sync messages:', err))
        } else {
          console.error('Could not find conversation for sync:', convoId)
        }
      }, 500)
    }
  }, [activeConvoId, conversations, selectedModel, apiKeys, baseUrls, isGenerating, createNewChat, streamOutput, searchEnabled])

  // Process image with OCR
  const processImage = useCallback(async (file) => {
    setIsProcessingOCR(true)
    setError(null)

    try {
      const text = await processImageOCR(file)
      return text
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsProcessingOCR(false)
    }
  }, [])

  // Update API key (stored in localStorage, not database)
  const updateApiKey = useCallback((provider, key) => {
    setApiKeys(prev => {
      const updated = { ...prev, [provider]: key }
      // Store in localStorage for security
      try {
        localStorage.setItem('apiKeys', JSON.stringify(updated))
      } catch (err) {
        console.error('Failed to save API keys to localStorage:', err)
      }
      return updated
    })
  }, [])

  // Update base URL (with API persistence)
  const updateBaseUrl = useCallback((provider, url) => {
    setBaseUrls(prev => {
      const updated = { ...prev, [provider]: url }
      saveSettings({ baseUrls: updated })
      return updated
    })
  }, [saveSettings])

  // Update selected model (with API persistence)
  const handleSetSelectedModel = useCallback((model) => {
    setSelectedModel(prev => {
      saveSettings({ selectedModel: model })
      return model
    })
  }, [saveSettings])

  // Update stream output (with API persistence)
  const handleSetStreamOutput = useCallback((value) => {
    setStreamOutput(prev => {
      saveSettings({ streamOutput: value })
      return value
    })
  }, [saveSettings])

  // Update search enabled (with API persistence)
  const handleSetSearchEnabled = useCallback((value) => {
    setSearchEnabled(prev => {
      saveSettings({ searchEnabled: value })
      return value
    })
  }, [saveSettings])

  // Clear error
  const clearError = useCallback(() => setError(null), [])

  return {
    // State
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
    isLoading,
    // Actions
    setStreamOutput: handleSetStreamOutput,
    setSearchEnabled: handleSetSearchEnabled,
    setActiveConvoId,
    createNewChat,
    deleteConversation,
    sendMessage,
    processImage,
    setSelectedModel: handleSetSelectedModel,
    updateApiKey,
    updateBaseUrl,
    clearError,
  }
}

export default useChat
