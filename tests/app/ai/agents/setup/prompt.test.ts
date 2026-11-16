import { describe, expect, test } from 'bun:test'

import { codingAgentSetupPrompt } from '@/app/ai/agents/setup/prompt'

describe('codingAgentSetupPrompt', () => {
  test('gives npm advice for an agent installed with npm', () => {
    const prompt = codingAgentSetupPrompt('gemini-cli')
    expect(prompt).toContain('npm i -g @google/gemini-cli')
    expect(prompt).toContain('EACCES')
  })

  test('gives no npm advice for an agent installed with Bun', () => {
    const prompt = codingAgentSetupPrompt('omp')
    expect(prompt).not.toContain('EACCES')
    expect(prompt).not.toContain('npm config set prefix')
    expect(prompt).toContain('bun i -g @oh-my-pi/pi-coding-agent')
  })
})
