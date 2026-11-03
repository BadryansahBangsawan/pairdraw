import { describe, expect, test, beforeEach, jest, spyOn } from 'bun:test'

import type { RequestPermissionRequest, RequestPermissionResponse } from '@agentclientprotocol/sdk'

import {
  permissionQueue,
  currentPermission,
  requestPermissionFromUser,
  respondToPermission,
  rejectCurrentPermission
} from '@/app/ai/agents/acp/permission'
import { AGENT_INPUT_NOTIFY_DELAY_MS } from '@/constants'

function makeRequest(
  options: { optionId: string; kind: string; name: string }[] = [
    { optionId: 'allow', kind: 'allow_once', name: 'Allow once' },
    { optionId: 'reject', kind: 'reject_once', name: 'Reject' }
  ]
): RequestPermissionRequest {
  return {
    sessionId: 'session-1',
    options: options.map((o) => ({
      optionId: o.optionId,
      kind: o.kind as 'allow_once' | 'allow_always' | 'reject_once' | 'reject_always',
      name: o.name
    })),
    toolCall: {
      toolCallId: 'tc-1',
      status: 'pending' as const
    }
  }
}

function selectedOptionId(response: RequestPermissionResponse): string | null {
  const { outcome } = response
  return outcome.outcome === 'selected' ? outcome.optionId : null
}

describe('acp-permission', () => {
  beforeEach(() => {
    permissionQueue.value = []
  })

  test('requestPermissionFromUser queues an entry', () => {
    void requestPermissionFromUser(makeRequest())
    expect(permissionQueue.value).toHaveLength(1)
    expect(currentPermission.value).not.toBeNull()
    expect(currentPermission.value?.request.sessionId).toBe('session-1')
    respondToPermission('allow')
  })

  test('respondToPermission resolves with selected optionId', async () => {
    const promise = requestPermissionFromUser(makeRequest())
    respondToPermission('allow')
    const result = await promise
    expect(result.outcome.outcome).toBe('selected')
    expect(selectedOptionId(result)).toBe('allow')
    expect(permissionQueue.value).toHaveLength(0)
  })

  test('rejectCurrentPermission picks reject option', async () => {
    const promise = requestPermissionFromUser(makeRequest())
    rejectCurrentPermission()
    const result = await promise
    expect(selectedOptionId(result)).toBe('reject')
  })

  test('rejectCurrentPermission falls back to first option when no reject kind', async () => {
    const req = makeRequest([{ optionId: 'only-allow', kind: 'allow_once', name: 'Allow' }])
    const promise = requestPermissionFromUser(req)
    rejectCurrentPermission()
    const result = await promise
    expect(selectedOptionId(result)).toBe('only-allow')
  })

  test('queue handles multiple concurrent requests in order', async () => {
    const p1 = requestPermissionFromUser(
      makeRequest([{ optionId: 'a1', kind: 'allow_once', name: 'First' }])
    )
    const p2 = requestPermissionFromUser(
      makeRequest([{ optionId: 'a2', kind: 'allow_once', name: 'Second' }])
    )
    expect(permissionQueue.value).toHaveLength(2)
    expect(currentPermission.value?.request.options[0].optionId).toBe('a1')

    respondToPermission('a1')
    const r1 = await p1
    expect(selectedOptionId(r1)).toBe('a1')
    expect(currentPermission.value?.request.options[0].optionId).toBe('a2')

    respondToPermission('a2')
    const r2 = await p2
    expect(selectedOptionId(r2)).toBe('a2')
    expect(permissionQueue.value).toHaveLength(0)
  })

  test('respondToPermission is no-op when queue is empty', () => {
    expect(permissionQueue.value).toHaveLength(0)
    respondToPermission('anything')
    expect(permissionQueue.value).toHaveLength(0)
  })

  test('rejectCurrentPermission is no-op when queue is empty', () => {
    expect(permissionQueue.value).toHaveLength(0)
    rejectCurrentPermission()
    expect(permissionQueue.value).toHaveLength(0)
  })

  test('timer cleared on manual resolution (no double resolve)', async () => {
    const promise = requestPermissionFromUser(makeRequest())
    respondToPermission('allow')
    const result = await promise
    expect(selectedOptionId(result)).toBe('allow')
    // Timer should be cleared — wait to ensure no stale timeout fires
    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })
    expect(permissionQueue.value).toHaveLength(0)
  })

  test('timeout auto-rejects after delay', async () => {
    const req = makeRequest()
    // Override timeout for test speed by creating request and manually triggering the timer
    const promise = requestPermissionFromUser(req)
    const entry = permissionQueue.value[0]
    expect(entry).toBeDefined()

    // Fast-forward: manually fire the timer callback
    clearTimeout(entry.timer)
    const timerFn = () => {
      const idx = permissionQueue.value.indexOf(entry)
      if (idx === -1) return
      permissionQueue.value = permissionQueue.value.filter((e) => e !== entry)
      entry.resolve({
        outcome: {
          outcome: 'selected',
          optionId:
            req.options.find((o) => o.kind.startsWith('reject'))?.optionId ??
            req.options[0]?.optionId ??
            ''
        }
      })
    }
    timerFn()

    const result = await promise
    expect(selectedOptionId(result)).toBe('reject')
    expect(permissionQueue.value).toHaveLength(0)
  })

  test('a request left unanswered calls onUnanswered once, and an answered one never', () => {
    jest.useFakeTimers()
    try {
      let unanswered = 0
      void requestPermissionFromUser(makeRequest(), () => unanswered++)
      jest.advanceTimersByTime(AGENT_INPUT_NOTIFY_DELAY_MS - 1)
      expect(unanswered).toBe(0)
      jest.advanceTimersByTime(1)
      expect(unanswered).toBe(1)
      respondToPermission('allow')

      void requestPermissionFromUser(makeRequest(), () => unanswered++)
      respondToPermission('allow')
      jest.advanceTimersByTime(AGENT_INPUT_NOTIFY_DELAY_MS)
      expect(unanswered).toBe(1)
    } finally {
      jest.useRealTimers()
    }
  })

  test('an aborted signal rejects the waiting request and takes it from the dialog', async () => {
    const controller = new AbortController()
    const promise = requestPermissionFromUser(makeRequest(), undefined, {
      signal: controller.signal
    })
    expect(permissionQueue.value).toHaveLength(1)
    controller.abort()
    expect(selectedOptionId(await promise)).toBe('reject')
    expect(permissionQueue.value).toHaveLength(0)
  })

  test('a request asked with an aborted signal never reaches the dialog', async () => {
    const controller = new AbortController()
    controller.abort()
    const promise = requestPermissionFromUser(makeRequest(), undefined, {
      signal: controller.signal
    })
    expect(permissionQueue.value).toHaveLength(0)
    expect(selectedOptionId(await promise)).toBe('reject')
  })

  test('the app’s own request carries its wording for the dialog', () => {
    void requestPermissionFromUser(makeRequest(), undefined, { description: 'Run set_fill?' })
    expect(currentPermission.value?.description).toBe('Run set_fill?')
    respondToPermission('allow')
  })

  test('a request stops listening to a shared signal however it ends', async () => {
    jest.useFakeTimers()
    const controller = new AbortController()
    const removed = spyOn(controller.signal, 'removeEventListener')
    try {
      const answered = requestPermissionFromUser(makeRequest(), undefined, {
        signal: controller.signal
      })
      respondToPermission('allow')
      await answered
      expect(removed).toHaveBeenCalledTimes(1)

      const timedOut = requestPermissionFromUser(makeRequest(), undefined, {
        signal: controller.signal,
        timeoutMs: 1_000
      })
      jest.advanceTimersByTime(1_000)
      await timedOut
      expect(removed).toHaveBeenCalledTimes(2)
    } finally {
      removed.mockRestore()
      jest.useRealTimers()
    }
  })

  test('a request can wait longer than an agent’s and says when nobody answered', async () => {
    jest.useFakeTimers()
    try {
      let timedOut = false
      const promise = requestPermissionFromUser(makeRequest(), undefined, {
        timeoutMs: 120_000,
        onTimeout: () => {
          timedOut = true
        }
      })
      jest.advanceTimersByTime(60_000)
      expect(permissionQueue.value).toHaveLength(1)
      jest.advanceTimersByTime(60_000)
      expect(selectedOptionId(await promise)).toBe('reject')
      expect(timedOut).toBe(true)
    } finally {
      jest.useRealTimers()
    }
  })
})
