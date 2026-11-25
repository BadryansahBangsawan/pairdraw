import { spyOn } from 'bun:test'

/**
 * Records every interval armed through the global timer while `run` works, by the period it was
 * armed with, so a test can say a sampler stays unarmed without reading a private timer of the
 * code under test. The intervals themselves run as usual: only the bookkeeping is added.
 */
export async function withIntervalArms(run: (armed: Map<unknown, number>) => Promise<void>) {
  const armed = new Map<unknown, number>()
  const setIntervalReal = globalThis.setInterval
  const clearIntervalReal = globalThis.clearInterval

  const setIntervalSpy = spyOn(globalThis, 'setInterval').mockImplementation(((
    handler: TimerHandler,
    timeout?: number,
    ...args: unknown[]
  ) => {
    const id = setIntervalReal(handler, timeout, ...args)
    armed.set(id, timeout ?? 0)
    return id
  }) as typeof globalThis.setInterval)
  const clearIntervalSpy = spyOn(globalThis, 'clearInterval').mockImplementation(((id: number) => {
    armed.delete(id)
    clearIntervalReal(id)
  }) as typeof globalThis.clearInterval)

  try {
    await run(armed)
  } finally {
    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
  }
}

/** How many intervals are armed at `periodMs` right now. */
export function armedAt(armed: Map<unknown, number>, periodMs: number): number {
  let count = 0
  for (const period of armed.values()) if (period === periodMs) count += 1
  return count
}
