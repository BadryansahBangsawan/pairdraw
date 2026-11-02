import { describe, expect, test } from 'bun:test'

import { providerBackend, switchContextLoss } from '@/app/ai/chat/history/backend'

const builtIn = { id: 'profile-a', backend: 'direct' } as const
const otherBuiltIn = { id: 'profile-b', backend: 'direct' } as const
const agent = { id: 'profile-agent', backend: 'acp' } as const
const pi = { id: 'profile-pi', backend: 'harness' } as const

describe('chat backends', () => {
  test('names what a provider runs on', () => {
    expect(providerBackend('acp:claude')).toBe('acp')
    expect(providerBackend('harness:pi')).toBe('harness')
    expect(providerBackend('openrouter')).toBe('direct')
  })
})

describe('switching the chat model', () => {
  test('keeps the context between built-in models, which read the whole transcript', () => {
    expect(switchContextLoss(true, builtIn, otherBuiltIn)).toBe('none')
  })

  test('a coding agent does not see the messages so far', () => {
    expect(switchContextLoss(true, builtIn, agent)).toBe('transcript')
    expect(switchContextLoss(true, agent, pi)).toBe('transcript')
  })

  test('a built-in model sees the messages, but not what the agent session held', () => {
    expect(switchContextLoss(true, agent, builtIn)).toBe('agentSession')
    expect(switchContextLoss(true, pi, builtIn)).toBe('agentSession')
  })

  test('loses nothing before the first message, or when the model stays', () => {
    expect(switchContextLoss(false, builtIn, agent)).toBe('none')
    expect(switchContextLoss(true, agent, agent)).toBe('none')
    expect(switchContextLoss(true, null, agent)).toBe('none')
  })
})
