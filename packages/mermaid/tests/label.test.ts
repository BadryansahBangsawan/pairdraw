import { describe, expect, test } from 'bun:test'

import { parseFlowchart } from '@pairdraw/mermaid'

describe('label HTML', () => {
  test('reads a label whose tags nest deeper than the call stack', () => {
    const depth = 20_000
    const chart = parseFlowchart(`flowchart TD\nA["${'<b>'.repeat(depth)}deep<br>text"] --> B`)
    expect(chart.nodes.find((node) => node.id === 'A')?.label).toEqual({
      text: 'deep\ntext',
      format: 'text'
    })
  })
})
