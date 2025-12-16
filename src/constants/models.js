// OneLLM API Base URL
export const ONELLM_API_URL = 'https://onellmweb.onrender.com/api'

// Provider definitions with their required API keys
export const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    requiresKey: true,
    keyName: 'openai',
    keyPlaceholder: 'sk-...',
  },
  anthropic: {
    name: 'Anthropic',
    requiresKey: true,
    keyName: 'anthropic',
    keyPlaceholder: 'sk-ant-...',
  },
  google: {
    name: 'Google Gemini',
    requiresKey: true,
    keyName: 'google',
    keyPlaceholder: 'AIza...',
  },
  groq: {
    name: 'Groq',
    requiresKey: true,
    keyName: 'groq',
    keyPlaceholder: 'gsk_...',
  },
  xai: {
    name: 'xAI (Grok)',
    requiresKey: true,
    keyName: 'xai',
    keyPlaceholder: 'xai-...',
  },
  openrouter: {
    name: 'OpenRouter',
    requiresKey: true,
    keyName: 'openrouter',
    keyPlaceholder: 'sk-or-...',
  },
  azure: {
    name: 'Azure OpenAI',
    requiresKey: true,
    keyName: 'azure',
    keyPlaceholder: 'api-key',
  },
  cerebras: {
    name: 'Cerebras',
    requiresKey: true,
    keyName: 'cerebras',
    keyPlaceholder: 'cbs-...',
  },
  copilot: {
    name: 'GitHub Copilot',
    requiresKey: true,
    keyName: 'copilot',
    keyPlaceholder: 'token',
  },
  huggingface: {
    name: 'Hugging Face',
    requiresKey: true,
    keyName: 'huggingface',
    keyPlaceholder: 'hf_...',
  },
  ollama: {
    name: 'Ollama',
    requiresKey: false,
    keyName: null,
  },
  freellm: {
    name: 'FreeLLM',
    requiresKey: false,
    keyName: null,
  },
  rwkv: {
    name: 'RWKV7',
    requiresKey: false,
    keyName: 'rwkv',
    keyPlaceholder: 'sk-test',
    defaultApiKey: 'sk-test',
    defaultBaseUrl: 'https://rwkv-red-team-rwkv-latestspace.hf.space/api/v1',
  },
}

// Max tokens supported by each provider (conservative limits that work for all models)
export const MAX_TOKENS = {
  openai: 16384,        // GPT-4 Turbo supports up to 128k, but 16k is safe default
  anthropic: 8192,      // Claude models support various limits
  google: 1000000,         // Gemini models
  groq: 8192,           // Groq hosted models
  xai: 4096,            // Grok models
  openrouter: 16384,    // Depends on model, using safe default
  azure: 16384,         // Azure OpenAI
  cerebras: 1000000,       // Cerebras models
  copilot: 4096,        // GitHub Copilot
  huggingface: 8192,    // HuggingFace - conservative for free tier
  ollama: 1000000,         // Ollama local models
  freellm: 1000000,        // FreeLLM lightweight models
  rwkv: 1000000,           // RWKV models
}

// Available models grouped by provider
export const FALLBACK_MODELS = [
  // Free models (no API key required)
  { id: 'freellm/TinyLlama/TinyLlama-1.1B-Chat-v1.0', name: 'TinyLlama 1.1B', provider: 'freellm', free: true, description: 'Fast, lightweight' },
  { id: 'freellm/Qwen/Qwen2.5-0.5B-Instruct', name: 'Qwen 0.5B', provider: 'freellm', free: true, description: 'Ultra-fast' },
  { id: 'freellm/Qwen/Qwen2.5-1.5B-Instruct', name: 'Qwen 1.5B', provider: 'freellm', free: true, description: 'Balanced' },

  // RWKV7 models (free with sk-test API key)
  { id: 'hf/rwkv7-g1a4-2.9b-20251118-ctx8192', name: 'RWKV7 2.9B', provider: 'rwkv', free: true, description: 'Standard chat' },
  { id: 'hf/rwkv7-g1a4-2.9b-20251118-ctx8192:thinking', name: 'RWKV7 2.9B Thinking', provider: 'rwkv', free: true, description: 'Chain-of-thought reasoning' },

  { id: 'ollama/gemma3:270m', name: 'Gemma3 270M', provider: 'ollama', free: true, description: 'Google lightweight' },
  { id: 'ollama/gemma3:4b', name: 'Gemma3 4B', provider: 'ollama', free: true, description: 'Google Balanced' },
  { id: 'ollama/mistral:7b', name: 'Mistral 7B', provider: 'ollama', free: true, description: 'Powerful open model' },
]

// Helper to extract provider from model ID
export const getProviderFromModelId = (modelId) => {
  if (!modelId) return null

  // Check explicit provider prefixes
  for (const provider of Object.keys(PROVIDERS)) {
    if (modelId.startsWith(`${provider}/`)) {
      return provider
    }
  }

  // Check for RWKV models (special case - no prefix)
  if (modelId.includes('rwkv')) {
    return 'rwkv'
  }

  // Try to match from fallback models
  const fallback = FALLBACK_MODELS.find(m => m.id === modelId)
  if (fallback) return fallback.provider

  return null
}

// Check if model requires API key (works with dynamic models)
export const modelRequiresKey = (modelId) => {
  const provider = getProviderFromModelId(modelId)
  if (!provider) return true
  return PROVIDERS[provider]?.requiresKey ?? true
}

// Get required key name for model (works with dynamic models)
export const getRequiredKeyForModel = (modelId) => {
  const provider = getProviderFromModelId(modelId)
  if (!provider) return null
  return PROVIDERS[provider]?.keyName || null
}

// Get default API key for a model (some providers have free defaults)
export const getDefaultApiKey = (modelId) => {
  const provider = getProviderFromModelId(modelId)
  if (!provider) return null
  return PROVIDERS[provider]?.defaultApiKey || null
}

// Get default base URL for a model
export const getDefaultBaseUrl = (modelId) => {
  const provider = getProviderFromModelId(modelId)
  if (!provider) return null
  return PROVIDERS[provider]?.defaultBaseUrl || null
}

// Get max tokens for a model based on provider
export const getMaxTokensForModel = (modelId, fallback = 4096) => {
  const provider = getProviderFromModelId(modelId)
  if (!provider) return fallback
  return MAX_TOKENS[provider] || fallback
}

// Get provider info
export const getProviderInfo = (providerId) => {
  return PROVIDERS[providerId] || null
}
