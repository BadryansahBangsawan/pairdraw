import { describe, expect, test } from 'bun:test'

import { chatReasoningTheme, chatThinkingTheme, chatTranscriptTheme } from '@/components/chat/ui'

// The agent's typing and reasoning indicators draw in the agent violet: the shared `text-agent`
// token, plus the thinking meter's violet stop levels.

describe('agent violet chat indicators', () => {
  test('the typing indicator avatar uses the agent violet', () => {
    const classes = chatTranscriptTheme().typingAvatar()
    expect(classes).toContain('text-agent')
    expect(classes).toContain('bg-agent/15')
  })

  test('the reasoning indicator icon uses the agent violet', () => {
    expect(chatReasoningTheme().icon()).toContain('text-agent')
  })

  test('the thinking meter deepens in the agent violet as the model thinks harder', () => {
    const meter = chatThinkingTheme().meter()
    for (const level of ['low', 'medium', 'high'] as const) {
      expect(meter).toContain(`data-[level=${level}]:text-agent`)
    }
  })
})
