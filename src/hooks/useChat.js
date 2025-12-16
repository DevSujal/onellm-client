import { useState, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { sendChatMessage, processImageOCR } from '../services/api'

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Custom hook for chat functionality
export const useChat = () => {
  const [conversations, setConversations] = useLocalStorage('conversations', [])
  const [activeConvoId, setActiveConvoId] = useLocalStorage('activeConvoId', null)
  const [apiKeys, setApiKeys] = useLocalStorage('apiKeys', {})
  const [baseUrls, setBaseUrls] = useLocalStorage('baseUrls', {})
  const [selectedModel, setSelectedModel] = useLocalStorage('selectedModel', 'hf/rwkv7-g1a4-2.9b-20251118-ctx8192')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [error, setError] = useState(null)
  const [streamOutput, setStreamOutput] = useLocalStorage('streamOutput', true)

  // Get active conversation
  const activeConversation = conversations.find(c => c.id === activeConvoId) || null

  // Create new chat
  const createNewChat = useCallback(() => {
    const newConvo = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
    }
    setConversations(prev => [newConvo, ...prev])
    setActiveConvoId(newConvo.id)
    setError(null)
    return newConvo.id
  }, [setConversations, setActiveConvoId])

  // Delete conversation
  const deleteConversation = useCallback((id) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeConvoId === id) {
      const remaining = conversations.filter(c => c.id !== id)
      setActiveConvoId(remaining[0]?.id || null)
    }
  }, [conversations, activeConvoId, setConversations, setActiveConvoId])

  // Update conversation messages
  const updateMessages = useCallback((convoId, messages, title = null) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convoId) return c
      return {
        ...c,
        messages,
        title: title || c.title,
      }
    }))
  }, [setConversations])

  // Send message (non-streaming)
  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isGenerating) return

    let convoId = activeConvoId
    if (!convoId) {
      convoId = createNewChat()
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

    updateMessages(convoId, updatedMessages, title)
    setError(null)
    setIsGenerating(true)

    // Create assistant message placeholder
    const assistantMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }

    updateMessages(convoId, [...updatedMessages, assistantMessage], title)

    try {
      // Prepare messages for API (without IDs and timestamps)
      const apiMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content,
      }))

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
      // Update assistant message with error
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
    }
  }, [activeConvoId, conversations, selectedModel, apiKeys, baseUrls, isGenerating, createNewChat, updateMessages, setConversations, streamOutput])

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

  // Update API key
  const updateApiKey = useCallback((provider, key) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: key,
    }))
  }, [setApiKeys])

  // Update base URL
  const updateBaseUrl = useCallback((provider, url) => {
    setBaseUrls(prev => ({
      ...prev,
      [provider]: url,
    }))
  }, [setBaseUrls])

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
    error,
    streamOutput,
    // Actions
    setStreamOutput,
    setActiveConvoId,
    createNewChat,
    deleteConversation,
    sendMessage,
    processImage,
    setSelectedModel,
    updateApiKey,
    updateBaseUrl,
    clearError,
  }
}

export default useChat
