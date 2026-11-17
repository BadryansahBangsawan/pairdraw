import { describe, expect, test } from 'bun:test'

import { toolReply } from '@/app/automation/bridge/tool-reply'

describe('tool reply', () => {
  test('reports a tool failure as a failed call', () => {
    expect(toolReply({ error: 'Node "1:2" not found' })).toEqual({
      ok: false,
      error: 'Node "1:2" not found'
    })
  })
  test('keeps a successful answer', () => {
    expect(toolReply({ id: '1:2', name: 'Card' })).toEqual({
      ok: true,
      result: { id: '1:2', name: 'Card' }
    })
  })
  test('keeps an answer that only mentions errors alongside its own data', () => {
    const partial = { updated: 1, errors: ['Node "9:9" not found'] }
    expect(toolReply(partial)).toEqual({ ok: true, result: partial })
  })
})

describe('a tool answer that names a failure beside other data', () => {
  test('is a failed call, as it is for the CLI', () => {
    expect(toolReply({ error: 'Patch does not apply', results: [{ id: '1:2' }] })).toEqual({
      ok: false,
      error: 'Patch does not apply'
    })
  })
})
