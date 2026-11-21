import { describe, expect, test } from 'bun:test'

import { agentLogo } from '@/app/presence/logo'

describe("an agent's logo", () => {
  test('is the logo of the provider or coding agent it runs on', () => {
    expect(agentLogo({ kind: 'acp', provider: 'acp:claude-code', model: 'claude-code' })).toBe(
      'claude-code'
    )
    expect(agentLogo({ kind: 'chat', provider: 'anthropic', model: 'claude-opus-5-5' })).toBe(
      'anthropic'
    )
    expect(agentLogo({ kind: 'acp', provider: 'acp:omp' })).toBe('omp')
  })

  test("shows the maker of a model a router serves, as the chat's model picker does", () => {
    expect(
      agentLogo({ kind: 'chat', provider: 'openrouter', model: 'anthropic/claude-sonnet-5.5' })
    ).toBe('anthropic')
  })

  test('comes from what agents of older versions publish: the model, client, or kind', () => {
    expect(agentLogo({ kind: 'chat', model: 'gpt-6.1' })).toBe('openai')
    expect(agentLogo({ kind: 'mcp', model: 'claude-code' })).toBe('claude-code')
    expect(agentLogo({ kind: 'acp', model: 'codex-mcp-client' })).toBe('codex')
    expect(agentLogo({ kind: 'mcp', model: 'gemini-cli-mcp-client' })).toBe('gemini-cli')
    expect(agentLogo({ kind: 'harness', model: 'pi' })).toBe('pi')
  })

  test('falls back to the model when the provider has no brand', () => {
    expect(agentLogo({ kind: 'chat', provider: 'custom-endpoint', model: 'glm-5.3' })).toBe('zai')
  })

  test('is unknown for an agent nothing identifies', () => {
    expect(agentLogo({ kind: 'chat' })).toBeNull()
    expect(
      agentLogo({ kind: 'chat', provider: 'openai-compatible', model: 'my-finetune' })
    ).toBeNull()
    expect(agentLogo({ kind: 'mcp', model: 'some-other-client' })).toBeNull()
    expect(agentLogo({ kind: 'mcp' })).toBeNull()
  })
})
