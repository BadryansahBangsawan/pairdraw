import { describe, expect, test } from 'bun:test'

import { ref } from 'vue'

import type { AutoConnectOutcome } from '@/app/ai/agents/auto/session'
import { createChatSetupGate, joinWaitingPrompt } from '@/app/ai/chat/setup'
import type { ChatSubmission } from '@/app/ai/chat/submission/types'

interface GateOptions {
  configured?: boolean
  /** The lookup leaves the chat able to send. */
  detectConfigures?: boolean
  setupConfigures?: boolean
}

/** A gate whose auto-connect ends with `outcome`, recording whether guided setup opened. */
function gate(
  outcome: AutoConnectOutcome,
  {
    configured = false,
    detectConfigures = outcome === 'connected',
    setupConfigures = false
  }: GateOptions = {}
) {
  const isConfigured = ref(configured)
  const opened = { detect: 0, setup: 0 }
  const ensure = createChatSetupGate({
    isConfigured,
    autoConnect: {
      async detect() {
        opened.detect++
        if (detectConfigures) isConfigured.value = true
        return outcome
      }
    },
    async runSetup() {
      opened.setup++
      if (setupConfigures) isConfigured.value = true
    }
  })
  return { ensure, opened }
}

function submission(text: string, nodes: ChatSubmission['nodes'] = []): ChatSubmission {
  return { modelText: `model: ${text}`, displayText: text, images: [], nodes }
}

describe('setting the chat up before it sends', () => {
  test('sends at once when a model is set up', async () => {
    const { ensure, opened } = gate('none', { configured: true })
    expect(await ensure()).toBe(true)
    expect(opened).toEqual({ detect: 0, setup: 0 })
  })

  test('leaves the prompt to an agent on this computer without opening setup', async () => {
    for (const outcome of ['connected', 'action'] as const) {
      const { ensure, opened } = gate(outcome)
      expect(await ensure()).toBe(true)
      expect(opened).toEqual({ detect: 1, setup: 0 })
    }
  })

  test('opens guided setup when no agent can be used', async () => {
    for (const outcome of ['none', 'unsupported'] as const) {
      const finished = gate(outcome, { setupConfigures: true })
      expect(await finished.ensure()).toBe(true)
      expect(finished.opened).toEqual({ detect: 1, setup: 1 })

      const dismissed = gate(outcome)
      expect(await dismissed.ensure()).toBe(false)
      expect(dismissed.opened.setup).toBe(1)
    }
  })

  test('opens guided setup when an agent connected but the chat still cannot send', async () => {
    const { ensure, opened } = gate('connected', { detectConfigures: false })
    expect(await ensure()).toBe(false)
    expect(opened).toEqual({ detect: 1, setup: 1 })
  })
})

describe('writing while a prompt waits for setup', () => {
  test('keeps a first message as it is', () => {
    const first = submission('Make a login screen')
    expect(joinWaitingPrompt(null, first)).toBe(first)
  })

  test('joins the next message to the waiting one, in the order written', () => {
    const frame = { id: '1:2', name: 'Frame', type: 'FRAME' } as const
    const button = { id: '1:3', name: 'Button', type: 'FRAME' } as const
    const joined = joinWaitingPrompt(
      submission('Make a login screen', [frame]),
      submission('Use a dark theme', [frame, button])
    )

    expect(joined.displayText).toBe('Make a login screen\n\nUse a dark theme')
    expect(joined.modelText).toBe('model: Make a login screen\n\nmodel: Use a dark theme')
    expect(joined.nodes).toEqual([frame, button])
  })
})
