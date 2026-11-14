import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'

import { setLayout } from '#core/tools/modify/layout'

describe('set_layout', () => {
  test('accepts space around and sets it on the frame', () => {
    const figma = new FigmaAPI(new SceneGraph())
    const frame = figma.createFrame()
    frame.resize(300, 40)
    const args = v.parse(setLayout.input, {
      id: frame.id,
      direction: 'HORIZONTAL',
      align: 'SPACE_AROUND'
    })

    setLayout.execute(figma, args)

    expect(figma.graph.getNode(frame.id)?.primaryAxisAlign).toBe('SPACE_AROUND')
  })
})
