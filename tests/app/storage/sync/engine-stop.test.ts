import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'

import {
  createMemoryOutbox,
  getOutbox,
  kickSyncEngine,
  resetOutboxForTests
} from '@/app/storage/sync'

describe('a drain an earlier outbox scheduled', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    resetOutboxForTests()
    vi.useRealTimers()
  })

  test('does not run the jobs of the outbox that replaced it', async () => {
    const earlier = createMemoryOutbox()
    resetOutboxForTests(earlier)
    await earlier.enqueue({ canvasId: 'earlier', type: 'deleteCanvas', revision: 0 })
    const [queued] = await earlier.list()
    if (!queued) throw new Error('the job was not queued')
    // Due later, so this drain only schedules the wake that is not meant to outlive its test.
    await earlier.update({ ...queued, nextAttemptAt: Date.now() + 1_000 })
    await kickSyncEngine()
    // The next test's outbox, with work of its own, replaces the one that scheduled that wake.
    const later = createMemoryOutbox()
    resetOutboxForTests(later)
    await later.enqueue({ canvasId: 'later', type: 'deleteCanvas', revision: 0 })
    const queuedLater = await later.list()

    // Every wake the earlier outbox scheduled would have fired within this span; the drain runs
    // off microtasks, so they are flushed before the outbox is read.
    vi.advanceTimersByTime(120_000)
    for (let turn = 0; turn < 20; turn++) await Promise.resolve()

    // Untouched: still queued as it was left, rather than parked by a drain from another test.
    expect(getOutbox()).toBe(later)
    expect(await later.list()).toEqual(queuedLater)
  })
})
