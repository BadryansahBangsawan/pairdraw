import { describe, expect, test } from 'bun:test'

import { applyResourceCacheLimit, RESOURCE_CACHE_LIMIT_BYTES } from '#vue/canvas/surface/gl-surface'

/** A GrDirectContext stand-in: the two calls the helper may make, and the value it keeps. */
function fakeContext(limit: number) {
  const calls: string[] = []
  const context = {
    getResourceCacheLimitBytes: () => {
      calls.push('get')
      return context.limit
    },
    setResourceCacheLimitBytes: (bytes: number) => {
      calls.push(`set:${bytes}`)
      context.limit = bytes
    },
    limit
  }
  return { context, calls }
}

describe('applyResourceCacheLimit', () => {
  test('keeps the context default until a limit is chosen', () => {
    expect(RESOURCE_CACHE_LIMIT_BYTES).toBeUndefined()
    const { context, calls } = fakeContext(96 * 1024 * 1024)

    applyResourceCacheLimit(context, RESOURCE_CACHE_LIMIT_BYTES)

    expect(calls).toEqual([])
  })

  test('sets the limit when the context holds another value', () => {
    const { context, calls } = fakeContext(96 * 1024 * 1024)

    applyResourceCacheLimit(context, 32 * 1024 * 1024)

    expect(context.limit).toBe(32 * 1024 * 1024)
    expect(calls).toEqual(['get', 'set:33554432'])
  })

  test('is idempotent: a second call on the same context sets nothing', () => {
    const { context, calls } = fakeContext(96 * 1024 * 1024)

    applyResourceCacheLimit(context, 32 * 1024 * 1024)
    applyResourceCacheLimit(context, 32 * 1024 * 1024)

    expect(calls).toEqual(['get', 'set:33554432', 'get'])
  })
})
