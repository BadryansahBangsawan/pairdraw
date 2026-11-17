import { describe, expect, test } from 'bun:test'

import { restartDelay } from '@/app/automation/restart-policy'

describe('restartDelay', () => {
  test('waits longer after each attempt, so a broken server is not hammered', () => {
    expect(restartDelay(0)).toBe(500)
    expect(restartDelay(1)).toBe(1000)
    expect(restartDelay(2)).toBe(2000)
  })

  test('stops waiting at the cap', () => {
    expect(restartDelay(12, { attempts: 20, limitMs: 30_000 })).toBe(30_000)
  })

  test('gives up after the attempts it is allowed', () => {
    expect(restartDelay(4, { attempts: 5 })).toBe(8000)
    expect(restartDelay(5, { attempts: 5 })).toBeNull()
  })
})
