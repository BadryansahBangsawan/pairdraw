import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { browserNodeSchema, type BrowserNodeRecord } from '@open-pencil/scene-graph/browser-node'

import { browserURLPolicy } from '@/app/browser/url'

const REST = {
  width: 390,
  height: 844,
  preset: 'iphone-14',
  refreshedAt: '2026-11-13T00:00:00.000Z'
} satisfies Omit<BrowserNodeRecord, 'url'>

function stores(url: string): boolean {
  return v.safeParse(browserNodeSchema, { ...REST, url }).success
}

describe('browser node addresses', () => {
  test('a snapshot stores only the address the window would open', () => {
    for (const input of ['https://example.com/docs', 'example.com', 'http://localhost:1420/']) {
      const policy = browserURLPolicy(input)
      expect(policy.ok).toBe(true)
      if (!policy.ok) continue
      expect(stores(policy.url)).toBe(true)
      expect(stores(input)).toBe(policy.url === input)
    }
    for (const input of ['', 'file:///etc/passwd', 'about:blank', 'https://']) {
      expect(browserURLPolicy(input).ok).toBe(false)
      expect(stores(input)).toBe(false)
    }
  })
})
