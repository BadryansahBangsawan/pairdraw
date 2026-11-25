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

  test('takes padding as CSS shorthand', () => {
    const figma = new FigmaAPI(new SceneGraph())
    const frame = figma.createFrame()
    frame.resize(300, 40)
    const args = v.parse(setLayout.input, { id: frame.id, direction: 'VERTICAL', padding: '16px 24px' })

    setLayout.execute(figma, args)

    const node = expectDefined(figma.graph.getNode(frame.id), 'frame')
    expect([node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft]).toEqual([
      16, 24, 16, 24
    ])
  })

  test('reads three padding values as top, sides, bottom', () => {
    const figma = new FigmaAPI(new SceneGraph())
    const frame = figma.createFrame()
    frame.resize(300, 40)
    const args = v.parse(setLayout.input, { id: frame.id, direction: 'VERTICAL', padding: '8 16 4' })

    setLayout.execute(figma, args)

    const node = expectDefined(figma.graph.getNode(frame.id), 'frame')
    expect([node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft]).toEqual([
      8, 16, 4, 16
    ])
  })

  test('refuses a padding it cannot read and changes nothing', () => {
    const figma = new FigmaAPI(new SceneGraph())
    const frame = figma.createFrame()
    frame.resize(300, 40)
    const args = v.parse(setLayout.input, { id: frame.id, direction: 'VERTICAL', padding: 'wide' })

    const result = setLayout.execute(figma, args) as { error?: string }

    expect(result.error).toBe('"padding" expects px lengths, got "wide"')
    expect(expectDefined(figma.graph.getNode(frame.id), 'frame').paddingTop).toBe(0)
  })

  test('sets a gap, one value or two', () => {
    const figma = new FigmaAPI(new SceneGraph())
    const frame = figma.createFrame()
    frame.resize(300, 40)
    setLayout.execute(
      figma,
      v.parse(setLayout.input, { id: frame.id, direction: 'VERTICAL', gap: '12px' })
    )
    expect(expectDefined(figma.graph.getNode(frame.id), 'frame').itemSpacing).toBe(12)

    setLayout.execute(
      figma,
      v.parse(setLayout.input, { id: frame.id, direction: 'VERTICAL', gap: '12px 4px' })
    )
    const node = expectDefined(figma.graph.getNode(frame.id), 'frame')
    expect([node.itemSpacing, node.counterAxisSpacing]).toEqual([12, 4])
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
