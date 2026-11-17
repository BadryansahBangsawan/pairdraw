import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'

import { setEffects } from '#core/tools/modify/effects'
import { setFill, setStroke } from '#core/tools/modify/paint'
import { parseOptionalToolColor } from '#core/tools/schema'

type Refusal = { error?: string }

function rect() {
  const figma = new FigmaAPI(new SceneGraph())
  return { figma, node: figma.createRectangle() }
}

function takenColor(value: string | undefined): Color | undefined {
  const parsed = parseOptionalToolColor(value)
  if ('error' in parsed) return undefined
  return parsed.color
}

function refusal(value: string): string | undefined {
  const parsed = parseOptionalToolColor(value)
  return 'error' in parsed ? parsed.error : undefined
}

describe('an optional tool colour', () => {
  test('keeps a missing colour missing and refuses one that is not a colour', () => {
    expect(takenColor(undefined)).toBeUndefined()
    expect(refusal('notacolor')).toContain('notacolor')
    expect(takenColor('#ff0000')).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  })
})

describe('a colour that is not one is refused instead of painting black', () => {
  const bad = ['notacolor', '', '#GGGGGG', '#12345']

  for (const color of bad) {
    test(`set_fill refuses ${JSON.stringify(color)}`, () => {
      const { figma, node } = rect()
      const before = node.fills

      const result = setFill.execute(figma, v.parse(setFill.input, { id: node.id, color })) as Refusal

      expect(result.error).toContain(JSON.stringify(color))
      expect(node.fills).toEqual(before)
    })

    test(`set_stroke refuses ${JSON.stringify(color)}`, () => {
      const { figma, node } = rect()
      const before = node.strokes

      const result = setStroke.execute(
        figma,
        v.parse(setStroke.input, { id: node.id, color })
      ) as Refusal

      expect(result.error).toContain(JSON.stringify(color))
      expect(node.strokes).toEqual(before)
    })
  }

  test('set_effects refuses a shadow colour that is not one', () => {
    const { figma, node } = rect()
    const before = node.effects

    const result = setEffects.execute(
      figma,
      v.parse(setEffects.input, { id: node.id, type: 'DROP_SHADOW', color: 'notacolor' })
    ) as Refusal

    expect(result.error).toContain('"notacolor"')
    expect(node.effects).toEqual(before)
  })

  test('a named, hex, and rgba colour all paint', () => {
    for (const color of ['tomato', '#1E1E1E', 'rgba(0, 0, 0, 0.5)']) {
      const { figma, node } = rect()
      setFill.execute(figma, v.parse(setFill.input, { id: node.id, color }))
      expect(node.fills).toHaveLength(1)
    }
  })
})
