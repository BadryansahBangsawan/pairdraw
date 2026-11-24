import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test'

import { effectScope, nextTick, ref, type EffectScope } from 'vue'

import { useActiveNow } from '@/app/cloud/active-now'

let scope: EffectScope

beforeEach(() => {
  jest.useFakeTimers()
  scope = effectScope()
})

afterEach(() => {
  scope.stop()
  jest.useRealTimers()
})

function gatedClock() {
  const active = ref(false)
  const now = scope.run(() => useActiveNow(() => active.value, 1000))
  if (!now) throw new Error('The clock did not start')
  return { active, now }
}

/** Lets the interval callback run, if one is armed. */
async function advance(ms: number) {
  jest.advanceTimersByTime(ms)
  await nextTick()
}

describe('a clock gated on being active', () => {
  test('does not tick while idle', async () => {
    const { now } = gatedClock()
    const started = now.value
    await advance(5 * 60_000)
    expect(now.value).toBe(started)
  })

  test('reads the time and ticks once active', async () => {
    const { active, now } = gatedClock()
    const started = now.value
    active.value = true
    await nextTick()
    expect(now.value).not.toBe(started)
    const activated = now.value
    await advance(1000)
    expect(now.value).not.toBe(activated)
  })

  test('stops again when it becomes inactive', async () => {
    const { active, now } = gatedClock()
    active.value = true
    await nextTick()
    active.value = false
    await nextTick()
    const stopped = now.value
    await advance(5 * 60_000)
    expect(now.value).toBe(stopped)
  })
})
