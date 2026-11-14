import { describe, expect, test } from 'bun:test'

import type { PenDocument, PenNode } from '@pairdraw/pen'
import { percentLength } from '@pairdraw/scene-graph/text'

import { getNodeOrThrow } from './helpers/assert'
import { parseDocument } from './helpers/document'

function textOf(fields: Partial<PenNode>, variables?: PenDocument['variables']) {
  const graph = parseDocument(
    [
      {
        id: 'text',
        type: 'text',
        content: 'Label',
        fontFamily: 'Inter',
        fontSize: 16,
        fill: '#111111',
        ...fields
      }
    ],
    { variables }
  )
  return getNodeOrThrow(graph, 'text')
}

describe('parsePenFile — text', () => {
  test.each([
    ['700', 700],
    ['300', 300],
    ['normal', 400],
    ['bold', 700]
  ])('reads font weight %s', (fontWeight, expected) => {
    expect(textOf({ fontWeight }).fontWeight).toBe(expected)
  })

  test('reads italic', () => {
    expect(textOf({ fontStyle: 'italic' }).italic).toBe(true)
    expect(textOf({}).italic).toBe(false)
  })

  test.each([
    ['auto', 'WIDTH_AND_HEIGHT'],
    ['fixed-width', 'HEIGHT'],
    ['fixed-width-height', 'NONE']
  ] as const)('maps text growth %s', (textGrowth, expected) => {
    expect(textOf({ textGrowth, width: 120, height: 40 }).textAutoResize).toBe(expected)
  })

  test('maps justified and middle alignment', () => {
    const node = textOf({ textAlign: 'justify', textAlignVertical: 'middle' })
    expect(node.textAlignHorizontal).toBe('JUSTIFIED')
    expect(node.textAlignVertical).toBe('CENTER')
  })

  // A multiple of the font size follows it, as a percent does.
  test('reads the line height as a multiple of the font size', () => {
    expect(textOf({ fontSize: 28, lineHeight: 2 }).lineHeight).toEqual(percentLength(200))
    expect(textOf({ fontSize: 10, lineHeight: 6 }).lineHeight).toEqual(percentLength(600))
  })

  test('keeps every font at its default optical size, as pen.dev draws it', () => {
    expect(textOf({ fontSize: 96 }).opticalSizeFromFontSize).toBe(false)
  })

  test('draws no text stroke, as pen.dev does not', () => {
    expect(textOf({ stroke: '#FF0000', strokeWidth: 1 }).strokes).toEqual([])
  })

  test('has no fill unless given one', () => {
    expect(textOf({ fill: undefined }).fills).toEqual([])
  })

  test('keeps content that reads like a variable reference, as pen.dev shows it', () => {
    const node = textOf({ content: '$label' }, { label: { type: 'string', value: 'Resolved' } })
    expect(node.text).toBe('$label')
  })

  test('resolves and binds font size variables', () => {
    const node = textOf({ fontSize: '$size' }, { size: { type: 'number', value: 22 } })
    expect(node.fontSize).toBe(22)
    expect(node.boundVariables.fontSize).toBeDefined()
  })

  test('resolves and binds font weight variables', () => {
    const node = textOf({ fontWeight: '$weight' }, { weight: { type: 'number', value: 700 } })
    expect(node.fontWeight).toBe(700)
    expect(node.boundVariables.fontWeight).toBeDefined()
  })

  test('links all of a text with an href', () => {
    const node = textOf({ content: 'Docs', href: 'https://pen.dev/docs' })
    expect(node.styleRuns).toEqual([
      { start: 0, length: 4, style: { hyperlink: { type: 'URL', value: 'https://pen.dev/docs' } } }
    ])
  })

  test('links nothing without an href, with a null one, or with no text', () => {
    expect(textOf({}).styleRuns).toEqual([])
    expect(textOf({ href: null }).styleRuns).toEqual([])
    expect(textOf({ href: '  ' }).styleRuns).toEqual([])
    expect(textOf({ content: '', href: 'https://pen.dev' }).styleRuns).toEqual([])
  })

  test('resolves an href variable', () => {
    const node = textOf({ href: '$site' }, { site: { type: 'string', value: 'https://a.test' } })
    expect(node.styleRuns[0]?.style.hyperlink).toEqual({ type: 'URL', value: 'https://a.test' })
  })
})

describe('parsePenFile — absolute layers', () => {
  test('takes an absolute layer out of its parent auto layout', () => {
    const graph = parseDocument([
      {
        id: 'row',
        type: 'frame',
        layout: 'horizontal',
        width: 300,
        height: 50,
        children: [
          { id: 'flow', type: 'rectangle', width: 30, height: 30 },
          {
            id: 'pinned',
            type: 'rectangle',
            layoutPosition: 'absolute',
            x: 200,
            y: 10,
            width: 30,
            height: 30
          }
        ]
      }
    ])
    expect(getNodeOrThrow(graph, 'pinned')).toMatchObject({
      layoutPositioning: 'ABSOLUTE',
      x: 200,
      y: 10
    })
    expect(getNodeOrThrow(graph, 'flow').layoutPositioning).toBe('AUTO')
  })

  test('maps space-between with an underscore', () => {
    const graph = parseDocument([
      {
        id: 'row',
        type: 'frame',
        layout: 'horizontal',
        justifyContent: 'space_between',
        alignItems: 'end',
        width: 300
      }
    ])
    expect(getNodeOrThrow(graph, 'row')).toMatchObject({
      primaryAxisAlign: 'SPACE_BETWEEN',
      counterAxisAlign: 'MAX'
    })
  })
})
