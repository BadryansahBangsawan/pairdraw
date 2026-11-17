import { describe, expect, test } from 'bun:test'

import { awayRunLocation } from '@/app/ai/chat/run-location/target'

const shop = { id: 'tab-2', store: { state: { documentName: 'Shop' } } }

describe('a reply running in another document', () => {
  test('names the agent and that document, and opens its tab', () => {
    const opened: string[] = []
    const location = awayRunLocation(shop, 'Claude', (id) => {
      opened.push(id)
    })

    expect(location?.agent).toBe('Claude')
    expect(location?.document).toBe('Shop')
    expect(location?.page).toBeUndefined()
    location?.open()
    expect(opened).toEqual(['tab-2'])
  })

  test('offers nothing once that document is gone', () => {
    expect(awayRunLocation(undefined, 'Claude', () => undefined)).toBeNull()
    expect(awayRunLocation(shop, undefined, () => undefined)).toBeNull()
  })
})
