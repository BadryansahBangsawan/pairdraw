import { afterEach, describe, expect, test, vi } from 'bun:test'

import { createRestartScheduler } from '@/app/automation/bridge/restart-scheduler'
import { RESTART_HEALTHY_RESET_MS } from '@/app/automation/restart-policy'

afterEach(() => {
  vi.useRealTimers()
})

describe('restart scheduler', () => {
  test('starts the child again after a crash', () => {
    vi.useFakeTimers()
    let retries = 0
    const scheduler = createRestartScheduler({
      retry: () => {
        retries += 1
      },
      policy: { baseMs: 1, attempts: 3 }
    })

    scheduler.afterCrash()
    expect(retries).toBe(0)
    vi.advanceTimersByTime(1)
    expect(retries).toBe(1)
    scheduler.stop()
  })

  test('waits longer after each crash', () => {
    vi.useFakeTimers()
    const retries: number[] = []
    const scheduler = createRestartScheduler({
      retry: () => retries.push(Date.now()),
      policy: { baseMs: 10, attempts: 3 }
    })

    scheduler.afterCrash()
    scheduler.afterCrash()
    vi.advanceTimersByTime(10)
    expect(retries).toHaveLength(1)

    scheduler.stop()
  })

  test('gives up, and says why, when the child keeps dying', () => {
    vi.useFakeTimers()
    let retries = 0
    const reports: number[] = []
    const scheduler = createRestartScheduler({
      retry: () => {
        retries += 1
        scheduler.afterCrash()
      },
      report: (_reason, attempts) => reports.push(attempts),
      policy: { baseMs: 1, attempts: 2 }
    })

    scheduler.afterCrash()
    vi.advanceTimersByTime(10)

    expect(retries).toBe(2)
    expect(reports).toEqual([2])
    scheduler.stop()
  })

  test('a restart that worked resets the attempts once the child has stayed up', () => {
    vi.useFakeTimers()
    let retries = 0
    const scheduler = createRestartScheduler({
      retry: () => {
        retries += 1
      },
      policy: { baseMs: 1, attempts: 1 }
    })

    scheduler.afterCrash()
    vi.advanceTimersByTime(1)
    scheduler.afterSuccess()
    vi.advanceTimersByTime(RESTART_HEALTHY_RESET_MS)
    scheduler.afterCrash()
    vi.advanceTimersByTime(1)

    expect(retries).toBe(2)
    scheduler.stop()
  })

  test('a restart that just worked does not forget the crashes before it', () => {
    vi.useFakeTimers()
    let retries = 0
    const reports: number[] = []
    const scheduler = createRestartScheduler({
      retry: () => {
        retries += 1
      },
      report: (_reason, attempts) => reports.push(attempts),
      policy: { baseMs: 1, attempts: 1 }
    })

    scheduler.afterCrash()
    vi.advanceTimersByTime(1)
    scheduler.afterSuccess()
    scheduler.afterCrash()
    vi.advanceTimersByTime(1)

    expect(retries).toBe(1)
    expect(reports).toEqual([1])
    scheduler.stop()
  })

  test('stopping the scheduler cancels the restart it planned', () => {
    vi.useFakeTimers()
    let retries = 0
    const scheduler = createRestartScheduler({
      retry: () => {
        retries += 1
      },
      policy: { baseMs: 5, attempts: 3 }
    })

    scheduler.afterCrash()
    scheduler.stop()
    vi.advanceTimersByTime(40)

    expect(retries).toBe(0)
  })
})
