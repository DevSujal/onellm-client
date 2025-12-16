import { ONELLM_API_URL, getRequiredKeyForModel, modelRequiresKey, getDefaultApiKey, getDefaultBaseUrl, getMaxTokensForModel, getContextWindowForModel, PROVIDERS } from '../constants/models'

// Estimate token count using ~4 characters per token heuristic
// This is a rough approximation that works reasonably for most languages
const estimateTokens = (text) => Math.ceil((text || '').length / 4)

// Estimate total tokens for an array of messages
const estimateMessagesTokens = (messages) => {
  return messages.reduce((total, msg) => {
    // Add ~4 tokens overhead per message for role markup
    return total + estimateTokens(msg.content) + 4
  }, 0)
}

// Truncate messages to fit within context window
// Preserves system message (if any) and most recent messages
// Drops oldest non-system messages when over limit
const truncateMessagesToFit = (messages, maxContextTokens, reserveForResponse = 2048) => {
  const availableTokens = maxContextTokens - reserveForResponse

  if (availableTokens <= 0) {
    console.warn('Context window too small after reserving for response')
    return messages.slice(-2) // Keep only last exchange
  }

  const totalTokens = estimateMessagesTokens(messages)

  // If we're under the limit, return all messages
  if (totalTokens <= availableTokens) {
    return messages
  }

  console.log(`Truncating messages: ${totalTokens} tokens exceeds limit of ${availableTokens}`)

  // Separate system message from other messages
  const systemMessages = messages.filter(m => m.role === 'system')
  const otherMessages = messages.filter(m => m.role !== 'system')

  // Calculate tokens used by system messages
  const systemTokens = estimateMessagesTokens(systemMessages)
  const tokensForConversation = availableTokens - systemTokens

  // Keep removing oldest messages until we fit
  let truncatedMessages = [...otherMessages]
  while (truncatedMessages.length > 1 && estimateMessagesTokens(truncatedMessages) > tokensForConversation) {
    truncatedMessages.shift() // Remove oldest message
  }

  console.log(`Kept ${truncatedMessages.length} of ${otherMessages.length} conversation messages`)

  // Combine system messages with truncated conversation
  return [...systemMessages, ...truncatedMessages]
}

// Fetch supported providers
export const fetchProviders = async () => {
  const response = await fetch(`${ONELLM_API_URL}/providers`)
  if (!response.ok) {
    throw new Error('Failed to fetch providers')
  }
  return response.json()
}

// Fetch models for a specific provider
export const fetchModelsForProvider = async (provider, apiKey = null) => {
  const providerInfo = PROVIDERS[provider]

  // Build URL with API key if provided
  let url = `${ONELLM_API_URL}/models/${provider}`
  if (apiKey) {
    url += `?apiKey=${encodeURIComponent(apiKey)}`
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      // Return empty array if fetch fails (e.g., no API key for paid provider)
      return []
    }
    const data = await response.json()
    // Normalize the response - API may return { models: [...] } or just [...]
    const models = data.models || data || []

    // Map to our format
    return models.map(model => {
      // Determine the base model name
      let modelName = typeof model === 'string' ? model : (model.name || model.id)

      // Build the full ID with provider prefix
      // If the model already has a provider prefix, use it as-is; otherwise add the prefix
      let modelId = typeof model === 'string' ? model : (model.id || model.name)
      if (!modelId.includes('/')) {
        modelId = `${provider}/${modelId}`
      }

      return {
        id: modelId,
        name: modelName,
        provider: provider,
        description: model.description || '',
        free: !providerInfo?.requiresKey,
      }
    })
  } catch (err) {
    console.error(`Failed to fetch models for ${provider}:`, err)
    return []
  }
}

// Fetch all available models (for providers with API keys or free providers)
export const fetchAllModels = async (apiKeys = {}) => {
  const providersResponse = await fetchProviders()
  const providerList = providersResponse?.providers || Object.keys(PROVIDERS)

  const allModels = []

  // Fetch models for each provider in parallel
  const fetchPromises = providerList.map(async (provider) => {
    const providerInfo = PROVIDERS[provider]
    const apiKey = providerInfo?.keyName ? apiKeys[providerInfo.keyName] : null
    const defaultKey = providerInfo?.defaultApiKey

    // For free providers or providers with API keys, fetch models
    if (!providerInfo?.requiresKey || apiKey || defaultKey) {
      const models = await fetchModelsForProvider(provider, apiKey || defaultKey)
      return models
    }
    return []
  })

  const results = await Promise.all(fetchPromises)
  results.forEach(models => allModels.push(...models))

  return allModels
}

// Check API health
export const checkHealth = async () => {
  const response = await fetch(`${ONELLM_API_URL}/health`)
  if (!response.ok) {
    throw new Error('Health check failed')
  }
  return response.json()
}

// Send a chat completion request to OneLLM
export const sendChatMessage = async (messages, model, apiKeys, options = {}) => {
  // Get provider-specific maxTokens, with user override capability
  const providerMaxTokens = getMaxTokensForModel(model)
  const { temperature = 0.7, maxTokens = providerMaxTokens, stream = false, onChunk, baseUrls = {} } = options

  // Get context window limit for this model
  const contextWindow = getContextWindowForModel(model)

  // Get the required API key for this model
  const keyName = getRequiredKeyForModel(model)
  const defaultApiKey = getDefaultApiKey(model)
  const apiKey = keyName ? (apiKeys[keyName] || defaultApiKey) : defaultApiKey

  // Get baseUrl - user custom, or default for the provider
  const defaultBaseUrl = getDefaultBaseUrl(model)
  const baseUrl = keyName ? (baseUrls[keyName] || defaultBaseUrl) : defaultBaseUrl

  // Check if API key is required but missing (and no default available)
  if (modelRequiresKey(model) && !apiKey) {
    throw new Error(`API key required for ${keyName}. Please add it in Settings.`)
  }

  const endpoint = stream ? `${ONELLM_API_URL}/chat/completions/stream` : `${ONELLM_API_URL}/chat/completions`

  // Prepare messages for API (clean format)
  const cleanMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }))

  // Truncate messages to fit within context window (reserve tokens for response)
  const truncatedMessages = truncateMessagesToFit(cleanMessages, contextWindow, maxTokens)

  const body = {
    apiKey: apiKey || undefined,
    model,
    messages: truncatedMessages,
    temperature,
    maxTokens,
  }

  // Add baseUrl if provided
  if (baseUrl) {
    body.baseUrl = baseUrl
  }

  if (stream) {

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || error.message || `HTTP ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentEventType = 'chunk' // Track event type (chunk or complete)

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.trim()) continue

        // Track event type - skip complete events as they contain the full message
        if (line.startsWith('event:')) {
          currentEventType = line.slice(6).trim()
          continue
        }

        // Skip data from 'complete' events (contains full content, would duplicate)
        if (currentEventType === 'complete') continue

        let dataStr = line

        // Handle SSE format - strip data: prefix (with or without space)
        if (line.startsWith('data:')) {
          dataStr = line.slice(5) // Remove 'data:'
          // Also handle if there's a space after data:
          if (dataStr.startsWith(' ')) {
            dataStr = dataStr.slice(1)
          }
        }

        if (dataStr === '[DONE]') continue

        try {
          const data = JSON.parse(dataStr)
          if (data.content && onChunk) {
            onChunk(data.content)
          }
        } catch (e) {
          console.error('Error parsing stream data:', e, 'Line:', line)
        }
      }
    }

    // Process any remaining data in buffer after stream ends
    if (buffer.trim() && !buffer.startsWith('event:')) {
      let dataStr = buffer
      if (buffer.startsWith('data:')) {
        dataStr = buffer.slice(5)
        if (dataStr.startsWith(' ')) {
          dataStr = dataStr.slice(1)
        }
      }
      if (dataStr !== '[DONE]') {
        try {
          const data = JSON.parse(dataStr)
          if (data.content && onChunk) {
            onChunk(data.content)
          }
        } catch (e) {
          console.error('Error parsing final buffer:', e, 'Buffer:', buffer)
        }
      }
    }

    return { content: '' } // Content handled via onChunk
  } else {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })


    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || error.message || `HTTP ${response.status}`)
    }


    const data = await response.json()
    return data
  }
}

// OCR API using ocr.space
export const processImageOCR = async (file) => {
  const apiKey = import.meta.env.VITE_PUBLIC_OCR_API_KEY

  if (!apiKey) {
    throw new Error('OCR API key not configured')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('apikey', apiKey)
  formData.append('language', 'eng')
  formData.append('isOverlayRequired', 'false')

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('OCR request failed')
  }

  const data = await response.json()

  if (data.IsErroredOnProcessing) {
    throw new Error(data.ErrorMessage?.[0] || 'OCR processing failed')
  }

  const text = data.ParsedResults?.[0]?.ParsedText || ''
  return text.trim()
}

// Search with Perplexity via custom proxy API (no API key needed)
export const searchWithPerplexity = async (query) => {
  const response = await fetch('https://6940fc870015a23b9a98.fra.appwrite.run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query,
      max_results: 5,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Search failed: ${response.status}`)
  }

  const data = await response.json()

  // Format search results into a readable context
  const results = data.results || []
  const formattedResults = results.map((result, index) =>
    `[${index + 1}] ${result.title}\nURL: ${result.url}\n${result.snippet}`
  ).join('\n\n')

  return {
    content: formattedResults,
    results: results, // Raw results for potential additional processing
    images: [], // Search API doesn't return images
  }
}

