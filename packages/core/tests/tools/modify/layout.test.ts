import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'

import { setLayout } from '#core/tools/modify/layout'

import { expectDefined } from '#core-tests/helpers/assert'

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

  test('refuses a page, naming it', () => {
    const figma = new FigmaAPI(new SceneGraph())
    const page = expectDefined(figma.currentPage, 'page')
    const args = v.parse(setLayout.input, { id: page.id, direction: 'HORIZONTAL' })

    const result = setLayout.execute(figma, args) as { error?: string }

    expect(result.error).toMatch(/page cannot hold auto layout/i)
    expect(figma.graph.getNode(page.id)?.layoutMode).toBe('NONE')
  })
})
