import { afterEach, describe, expect, spyOn, test } from 'bun:test'

import { companionAgentHost } from '@/app/ai/agents/host/companion'
import { agentHost, agentHostAvailable, piHostAvailable } from '@/app/ai/agents/host/current'
import { companion } from '@/app/automation/companion/connection'

import { asDouble } from '#tests/helpers/doubles'

afterEach(() => {
  companion.disconnect()
})

describe('agent host selection outside the desktop app', () => {
  test('runs agents through the companion, and only while a tab is paired with it', async () => {
    expect(agentHost()).toBe(companionAgentHost)
    expect(agentHostAvailable()).toBe(false)

    const request = spyOn(globalThis, 'fetch').mockImplementation(
      asDouble<typeof fetch>(async () =>
        Response.json({ token: 'f'.repeat(64), version: '0.16.0' })
      )
    )
    try {
      await companion.pair({ code: '0'.repeat(32), port: 7601 })
    } finally {
      request.mockRestore()
    }
    expect(agentHostAvailable()).toBe(true)

    companion.disconnect()
    expect(agentHostAvailable()).toBe(false)
  })

  test('never offers Pi, whose Harness companion only the desktop app runs', () => {
    expect(piHostAvailable).toBe(false)
  })
})
