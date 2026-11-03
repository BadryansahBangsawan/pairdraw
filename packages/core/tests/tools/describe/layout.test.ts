import { describe as group, expect, test } from 'bun:test'

import { FigmaAPI } from '@open-pencil/core/figma-api'
import { SceneGraph } from '@open-pencil/scene-graph'

import { describe } from '#core/tools/describe'

interface DescribedNode {
  layout?: string
  issues?: Array<{ message: string }>
}

function describeRow(sizing: 'FIXED' | 'HUG'): DescribedNode {
  const figma = new FigmaAPI(new SceneGraph())
  const row = figma.createFrame()
  row.name = 'Row'
  row.resize(300, 40)
  for (let index = 0; index < 2; index++) {
    const item = figma.createRectangle()
    item.resize(40, 40)
    row.appendChild(item)
  }
  figma.graph.updateNode(row.id, {
    layoutMode: 'HORIZONTAL',
    primaryAxisAlign: 'SPACE_AROUND',
    primaryAxisSizing: sizing
  })
  return describe.execute(figma, { id: row.id }) as DescribedNode
}

group('describe space around', () => {
  test('labels the distribution justify=around', () => {
    expect(describeRow('FIXED').layout).toContain('justify=around')
  })

  test('warns that space around has no effect on a frame that hugs its content', () => {
    const messages = (describeRow('HUG').issues ?? []).map((issue) => issue.message)
    expect(messages).toContainEqual(expect.stringContaining('justify="around" on "Row"'))
    expect(messages).toContainEqual(expect.stringContaining('no effect'))
  })

  test('does not warn when the frame has a fixed size', () => {
    const messages = (describeRow('FIXED').issues ?? []).map((issue) => issue.message)
    expect(messages).not.toContainEqual(expect.stringContaining('justify="around"'))
  })
})
