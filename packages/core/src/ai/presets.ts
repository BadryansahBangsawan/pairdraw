import type { AIProviderDef } from './providers'

/**
 * Providers reached through their OpenAI-compatible chat endpoint, which the app's provider
 * registry names; only the key and the recommended models differ between them.
 */
export const OPENAI_COMPATIBLE_PRESETS: AIProviderDef[] = [
  {
    id: 'xai',
    name: 'xAI',
    keyPlaceholder: 'xai-…',
    keyURL: 'https://console.x.ai/team/default/api-keys',
    defaultModel: 'grok-4.7',
    models: [
      {
        id: 'grok-4.7',
        name: 'Grok 4.7',
        tag: 'Best',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      },
      {
        id: 'grok-4.6',
        name: 'Grok 4.6',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      },
      {
        id: 'grok-build-0.1',
        name: 'Grok Build 0.1',
        tag: 'Fast',
        capabilities: ['tools', 'vision']
      }
    ]
  },
  {
    id: 'meta',
    name: 'Meta',
    keyPlaceholder: 'API key',
    keyURL: 'https://dev.meta.ai/',
    defaultModel: 'muse-spark-1.3',
    models: [
      {
        id: 'muse-spark-1.3',
        name: 'Muse Spark 1.3',
        tag: 'Best',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'minimal'
      },
      {
        id: 'muse-wonder-1.0',
        name: 'Muse Wonder',
        tag: 'Most capable',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'minimal'
      }
    ]
  },
  {
    id: 'kimi-for-coding',
    name: 'Kimi For Coding',
    keyPlaceholder: 'sk-kimi-…',
    keyURL: 'https://www.kimi.ai/code/console',
    defaultModel: 'k3.1-pro',
    models: [
      {
        id: 'k3.1-pro',
        name: 'Kimi K3.1 Pro',
        tag: 'Best',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      },
      {
        id: 'k3.1-pro-highspeed',
        name: 'Kimi K3.1 Pro Highspeed',
        tag: 'Fast',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      },
      { id: 'kimi-for-coding', name: 'Kimi For Coding', capabilities: ['tools', 'vision'] }
    ]
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI',
    keyPlaceholder: 'sk-…',
    keyURL: 'https://platform.moonshot.ai/console/api-keys',
    defaultModel: 'kimi-k3.1-pro',
    models: [
      {
        id: 'kimi-k3.1-pro',
        name: 'Kimi K3.1 Pro',
        tag: 'Best',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      },
      {
        id: 'kimi-k3.1-pro-highspeed',
        name: 'Kimi K3.1 Pro Highspeed',
        tag: 'Fast',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      },
      {
        id: 'kimi-k3',
        name: 'Kimi K3',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      }
    ]
  },
  {
    id: 'together',
    name: 'Together AI',
    keyPlaceholder: 'API key',
    keyURL: 'https://api.together.ai/settings/api-keys',
    defaultModel: 'moonshotai/Kimi-K3',
    models: [
      {
        id: 'moonshotai/Kimi-K3',
        name: 'Kimi K3',
        tag: 'Best',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'deepseek-ai/DeepSeek-V4.1-Flash',
        name: 'DeepSeek V4.1 Flash',
        tag: 'Fast',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'zai-org/GLM-5.3',
        name: 'GLM-5.3',
        capabilities: ['tools'],
        minReasoningEffort: 'low'
      },
      {
        id: 'meta-models/Muse-Spark-Open-816B-A42B',
        name: 'Muse Spark Open',
        capabilities: ['tools', 'vision']
      }
    ]
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    keyPlaceholder: 'fw_…',
    keyURL: 'https://app.fireworks.ai/settings/users/api-keys',
    defaultModel: 'accounts/fireworks/models/kimi-k3',
    models: [
      {
        id: 'accounts/fireworks/models/kimi-k3',
        name: 'Kimi K3',
        tag: 'Best',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'accounts/fireworks/models/deepseek-v4p1-flash',
        name: 'DeepSeek V4.1 Flash',
        tag: 'Fast',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'accounts/fireworks/models/glm-5p3',
        name: 'GLM 5.3',
        capabilities: ['tools'],
        minReasoningEffort: 'low'
      },
      {
        id: 'accounts/fireworks/models/minimax-m3p1-flash',
        name: 'MiniMax-M3.1-Flash',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      }
    ]
  },
  {
    id: 'opencode-zen',
    name: 'OpenCode Zen',
    keyPlaceholder: 'API key',
    keyURL: 'https://opencode.ai/auth',
    defaultModel: 'kimi-k3',
    models: [
      { id: 'kimi-k3', name: 'Kimi K3', tag: 'Best', capabilities: ['tools', 'vision'] },
      {
        id: 'deepseek-v4.1-flash',
        name: 'DeepSeek V4.1 Flash',
        tag: 'Fast',
        capabilities: ['tools', 'vision']
      },
      { id: 'glm-5.3', name: 'GLM-5.3', capabilities: ['tools'], minReasoningEffort: 'low' },
      { id: 'big-pickle', name: 'Big Pickle', tag: 'Free', capabilities: ['tools'] }
    ]
  },
  {
    id: 'opencode-go',
    name: 'OpenCode Go',
    keyPlaceholder: 'API key',
    keyURL: 'https://opencode.ai/auth',
    defaultModel: 'kimi-k3.1-pro',
    models: [
      {
        id: 'kimi-k3.1-pro',
        name: 'Kimi K3.1 Pro',
        tag: 'Best',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      },
      {
        id: 'minimax-m3.1-flash',
        name: 'MiniMax M3.1 Flash',
        tag: 'Fast',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      },
      { id: 'glm-5.3', name: 'GLM-5.3', capabilities: ['tools'], minReasoningEffort: 'low' },
      {
        id: 'deepseek-v4.1-flash',
        name: 'DeepSeek V4.1 Flash',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      }
    ]
  }
]
