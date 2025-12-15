import { ONELLM_API_URL, getRequiredKeyForModel, modelRequiresKey, getDefaultApiKey, getDefaultBaseUrl, PROVIDERS } from '../constants/models'

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
    return models.map(model => ({
      id: typeof model === 'string' ? `${provider}/${model}` : (model.id || `${provider}/${model.name}`),
      name: typeof model === 'string' ? model : (model.name || model.id),
      provider: provider,
      description: model.description || '',
      free: !providerInfo?.requiresKey,
    }))
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
  const { temperature = 0.7, maxTokens = 2048, stream = false, onChunk, baseUrls = {} } = options

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

  const body = {
    apiKey: apiKey || undefined,
    model,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
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

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6)
          if (dataStr === '[DONE]') continue
          
          try {
            const data = JSON.parse(dataStr)
            if (data.content && onChunk) {
              onChunk(data.content)
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e)
          }
        }
      }
    }
    return { content: '' } // Content handled via onChunk
  } else {

    console.log(body)
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
    console.log(data)
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
