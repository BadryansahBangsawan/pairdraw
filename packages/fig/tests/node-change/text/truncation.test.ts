import { describe, expect, test } from 'bun:test'

import { nodeChangeToProps } from '#fig/node-change/index'

import type { NodeChange } from '@pairdraw/kiwi/fig/codec'

function textChange(fields: Partial<NodeChange>): NodeChange {
  return {
    guid: { sessionID: 1, localID: 1 },
    type: 'TEXT',
    ...fields
  } as NodeChange
}

describe('@pairdraw/fig truncating text import', () => {
  test('keeps a fixed box with ENDING truncation fixed, since the archive cannot say TRUNCATE', () => {
    const props = nodeChangeToProps(
      textChange({
        textData: { characters: 'truncated' },
        textAutoResize: 'NONE',
        textTruncation: 'ENDING'
      }),
      []
    )
    expect(props.textAutoResize).toBe('NONE')
    expect(props.textTruncation).toBe('ENDING')
  })
  test('keeps a fixed box that does not truncate as NONE', () => {
    const props = nodeChangeToProps(
      textChange({ textData: { characters: 'fixed' }, textAutoResize: 'NONE' }),
      []
    )
    expect(props.textAutoResize).toBe('NONE')
  })
})
