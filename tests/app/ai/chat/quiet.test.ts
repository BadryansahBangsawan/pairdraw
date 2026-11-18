import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test'

import type { UIMessage } from 'ai'
import { effectScope, nextTick, ref, type EffectScope } from 'vue'

import { QUIET_TURN_MS, useQuietTurn } from '@/app/ai/chat/quiet'

const STATUS_BUSY = 'streaming'
const STATUS_IDLE = 'ready'

function message(text: string): UIMessage {
  return { id: `m-${text}`, role: 'assistant', parts: [{ type: 'text', text }] }
}

let scope: EffectScope
let clock: number

beforeEach(() => {
  jest.useFakeTimers()
  clock = Date.parse('2026-01-01T00:00:00.000Z')
  scope = effectScope()
})

afterEach(() => {
  scope.stop()
  jest.useRealTimers()
})

function quietTurn() {
  const status = ref<string>(STATUS_BUSY)
  const messages = ref<UIMessage[]>([message('first')])
  const waitingForPerson = ref(false)
  const turn = scope.run(() =>
    useQuietTurn({
      status: status as never,
      messages,
      waitingForPerson,
      limitMs: QUIET_TURN_MS,
      now: () => clock
    })
  )
  if (!turn) throw new Error('The quiet turn did not start')
  return { status, messages, waitingForPerson, turn }
}

const minutes = (count: number): number => count * 60_000

/** Moves the clock and lets the tracker's interval run. */
async function advance(ms: number): Promise<void> {
  clock += ms
  jest.advanceTimersByTime(ms)
  await nextTick()
}

describe('a quiet agent turn', () => {
  test('says nothing before the quiet limit', async () => {
    const { turn } = quietTurn()
    await advance(minutes(3) - 1_000)
    expect(turn.quiet.value).toBe(false)
  })

  test('reports the stretch once it reaches the limit', async () => {
    const { turn } = quietTurn()
    await advance(minutes(3) + 1_000)
    expect(turn.quiet.value).toBe(true)
    expect(turn.silentSince.value?.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  test('an agent event clears the notice and starts a new stretch', async () => {
    const { turn, messages } = quietTurn()
    await advance(minutes(4))
    expect(turn.quiet.value).toBe(true)

    messages.value = [message('first'), message('working')]
    await nextTick()
    await advance(1_000)
    expect(turn.quiet.value).toBe(false)
    expect(turn.silentSince.value).toBeNull()
    await advance(minutes(3))
    expect(turn.silentSince.value?.toISOString()).toBe('2026-01-01T00:04:00.000Z')
  })

  test('a permission request waiting on the person is not quiet', async () => {
    const { turn, waitingForPerson } = quietTurn()
    await advance(minutes(1))
    waitingForPerson.value = true
    await advance(minutes(5))
    expect(turn.quiet.value).toBe(false)
  })

  test('answering the request starts the stretch over', async () => {
    const { turn, waitingForPerson } = quietTurn()
    await advance(minutes(1))
    waitingForPerson.value = true
    await advance(minutes(5))
    waitingForPerson.value = false
    await nextTick()
    await advance(minutes(2))
    expect(turn.quiet.value).toBe(false)
    await advance(minutes(1) + 1_000)
    expect(turn.quiet.value).toBe(true)
  })

  test('a turn that ended shows nothing', async () => {
    const { turn, status } = quietTurn()
    await advance(minutes(4))
    expect(turn.quiet.value).toBe(true)
    status.value = STATUS_IDLE
    await advance(1_000)
    expect(turn.quiet.value).toBe(false)
  })
})
