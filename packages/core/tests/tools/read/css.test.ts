import { beforeAll, describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { PairdrawAPI } from '@pairdraw/core/pairdraw-api'
import { SceneGraph } from '@pairdraw/scene-graph'

import { getCSS } from '#core/tools/read/css'
import { setRadius } from '#core/tools/modify/geometry'

import { expectDefined } from '#core-tests/helpers/assert'
import { registerTestFont } from '#core-tests/helpers/figma-api'

beforeAll(async () => {
  await registerTestFont()
})

function output(result: unknown): string {
  const css = (result as { css?: string }).css
  if (typeof css !== 'string') throw new Error(`no css in ${JSON.stringify(result)}`)
  return css
}

/** A card with one box child, as an agent reads it: column layout, gap, padding, fill, radius. */
function card() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const frame = figma.createFrame()
  frame.name = 'Card'
  frame.resize(300, 120)
  frame.layoutMode = 'VERTICAL'
  frame.itemSpacing = 16
  frame.paddingTop = 24
  frame.paddingRight = 24
  frame.paddingBottom = 24
  frame.paddingLeft = 24
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1, visible: true }]
  frame.cornerRadius = 12
  frame.clipsContent = false
  const box = figma.createRectangle()
  box.name = 'Box'
  box.resize(40, 40)
  box.fills = [
    { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1, visible: true }
  ]
  frame.appendChild(box)
  return { figma, graph, frame, box }
}

describe('get_css', () => {
  test('reads a flex frame and its child as CSS-like lines', () => {
    const { figma, frame, box } = card()

    const css = output(getCSS.execute(figma, { id: frame.id }))

    expect(css).toBe(
      [
        `Card#${frame.id} ${Math.round(frame.width)}×${Math.round(frame.height)} {flex:column;gap:16px;padding:24px;hug:main;bg:#FFFFFF;radius:12px}`,
        `  Box#${box.id} 40×40 {bg:#FF0000}`
      ].join('\n')
    )
  })

  test('depth 0 reads one node and none of its children', () => {
    const { figma, frame } = card()

    expect(output(getCSS.execute(figma, { id: frame.id, depth: 0 }))).toBe(
      `Card#${frame.id} ${Math.round(frame.width)}×${Math.round(frame.height)} {flex:column;gap:16px;padding:24px;hug:main;bg:#FFFFFF;radius:12px}`
    )
  })

  test('ids reads several nodes in one call, one block each', () => {
    const { figma, frame, box } = card()

    expect(output(getCSS.execute(figma, { ids: [frame.id, box.id], depth: 0 }))).toBe(
      [
        `Card#${frame.id} ${Math.round(frame.width)}×${Math.round(frame.height)} {flex:column;gap:16px;padding:24px;hug:main;bg:#FFFFFF;radius:12px}`,
        `Box#${box.id} 40×40 {bg:#FF0000}`
      ].join('\n')
    )
  })

  test('a bound fill reads as the token with its value in CSS fallback form', () => {
    const { figma, graph, frame } = card()
    const collection = graph.createCollection('Theme')
    const brand = graph.createVariable(
      'color/brand',
      'COLOR',
      collection.id,
      { r: 0.31, g: 0.275, b: 0.898, a: 1 }
    )
    const variable = expectDefined(graph.variables.get(brand.id), 'brand')
    new PairdrawAPI(figma).bindVariable(frame.id, 'fills/0/color', variable)

    expect(output(getCSS.execute(figma, { id: frame.id, depth: 0 }))).toBe(
      `Card#${frame.id} ${Math.round(frame.width)}×${Math.round(frame.height)} {flex:column;gap:16px;padding:24px;hug:main;bg:var(--color/brand, #4F46E5);radius:12px}`
    )
  })

  test('reads text as a font shorthand with colour and line limit', async () => {
    const figma = new FigmaAPI(new SceneGraph())
    await figma.loadFontAsync({ family: 'Inter', style: 'SemiBold' })
    const text = figma.createText()
    text.name = 'Label'
    text.characters = 'Start free'
    text.fontSize = 14
    text.fontWeight = 600
    text.maxLines = 2
    text.fills = [
      { type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1, visible: true }
    ]

    expect(output(getCSS.execute(figma, { id: text.id, depth: 0 }))).toBe(
      `"Start free"#${text.id} ${Math.round(text.width)}×${Math.round(text.height)} {font:600 14px/auto Inter;color:#FFFFFF;max-lines:2}`
    )
  })

  test('a text label escapes quotes and newlines so one node stays one line', async () => {
    const figma = new FigmaAPI(new SceneGraph())
    await figma.loadFontAsync({ family: 'Inter', style: 'SemiBold' })
    const text = figma.createText()
    text.characters = 'say "hi"\nthen go'

    expect(output(getCSS.execute(figma, { id: text.id, depth: 0 }))).toStartWith(
      '"say \\"hi\\"\\nthen go"#'
    )
  })

  test('leaves out a hidden child, as describe does', () => {
    const { figma, frame, box } = card()
    box.visible = false

    expect(output(getCSS.execute(figma, { id: frame.id }))).toBe(
      `Card#${frame.id} ${Math.round(frame.width)}×${Math.round(frame.height)} {flex:column;gap:16px;padding:24px;hug:main;bg:#FFFFFF;radius:12px}`
    )
  })

  test('stops at max_bytes and says what it left out', () => {
    const { figma, frame } = card()
    const result = getCSS.execute(figma, { id: frame.id, max_bytes: 100 }) as {
      css: string
      truncated?: boolean
      omitted?: number
    }

    const [head] = result.css.split('\n')
    expect(result.truncated).toBe(true)
    expect(result.omitted).toBe(1)
    // The child does not fit. Head plus tail would not either, so the tail gives way and the
    // structured `omitted` reports the cut; the CSS itself never exceeds the budget.
    expect(result.css.split('\n')).toHaveLength(1)
    expect(head).toMatch(new RegExp(`^Card#${frame.id}`))
    expect(Buffer.byteLength(result.css, 'utf8')).toBeLessThanOrEqual(100)
  })

  test('refuses a node that is not there', () => {
    const figma = new FigmaAPI(new SceneGraph())
    expect(getCSS.execute(figma, { id: '9:9' })).toEqual({ error: 'Node "9:9" not found' })
  })

  test('asks for an id or ids', () => {
    const figma = new FigmaAPI(new SceneGraph())
    expect(getCSS.execute(figma, {})).toEqual({ error: 'Provide id (string) or ids (string[])' })
  })

  test('a stretch child and a growing child say so', () => {
    const { figma, frame, box } = card()
    expectDefined(frame, 'frame')
    box.layoutAlign = 'STRETCH'
    box.layoutGrow = 1

    expect(output(getCSS.execute(figma, { id: box.id, depth: 0 }))).toContain(
      'stretch;grow:1'
    )
  })

  test('reads independent corners as the radius shorthand', () => {
    const { figma, frame } = card()
    setRadius.execute(
      figma,
      v.parse(setRadius.input, { id: frame.id, radius: '12px 12px 4px 0' })
    )

    expect(output(getCSS.execute(figma, { id: frame.id, depth: 0 }))).toMatch(
      /radius:12px 12px 4px 0(?=[};])/
    )
  })

  test('independent corners that agree read as one radius', () => {
    const { figma, frame } = card()
    setRadius.execute(
      figma,
      v.parse(setRadius.input, {
        id: frame.id,
        top_left: 8,
        top_right: 8,
        bottom_right: 8,
        bottom_left: 8
      })
    )

    expect(output(getCSS.execute(figma, { id: frame.id, depth: 0 }))).toContain('radius:8px')
  })

  test('a radius read here writes back unchanged', () => {
    const { figma, frame } = card()
    setRadius.execute(
      figma,
      v.parse(setRadius.input, { id: frame.id, radius: '12px 12px 4px 0' })
    )
    const read = /radius:([^;}]+)/.exec(
      output(getCSS.execute(figma, { id: frame.id, depth: 0 }))
    )

    setRadius.execute(
      figma,
      v.parse(setRadius.input, { id: frame.id, radius: expectDefined(read?.[1], 'radius') })
    )

    expect([
      frame.topLeftRadius,
      frame.topRightRadius,
      frame.bottomRightRadius,
      frame.bottomLeftRadius
    ]).toEqual([12, 12, 4, 0])
  })

  test('the truncation tail counts against max_bytes', () => {
    const { figma, frame } = card()
    for (let index = 0; index < 4; index++) {
      const child = figma.createRectangle()
      child.name = `Row ${index}`
      child.resize(10, 10)
      frame.appendChild(child)
    }

    const result = getCSS.execute(figma, { id: frame.id, max_bytes: 200 }) as {
      css: string
      truncated?: boolean
      omitted?: number
    }

    expect(result.truncated).toBe(true)
    expect(result.css).toContain('… +')
    expect(Buffer.byteLength(result.css, 'utf8')).toBeLessThanOrEqual(200)
  })

  test('a single-node read never exceeds a budget the tail does not fit in', () => {
    const { figma, frame } = card()
    for (let index = 0; index < 4; index++) {
      const child = figma.createRectangle()
      child.name = `Row ${index}`
      child.resize(10, 10)
      frame.appendChild(child)
    }

    for (const maxBytes of [60, 80, 100, 120]) {
      const result = getCSS.execute(figma, { id: frame.id, max_bytes: maxBytes }) as {
        css: string
        truncated?: boolean
        omitted?: number
      }

      expect(Buffer.byteLength(result.css, 'utf8')).toBeLessThanOrEqual(maxBytes)
      expect(result.truncated).toBe(true)
    }
  })

  test('a budget smaller than the first line returns no CSS, not an oversized line', () => {
    const { figma, frame } = card()
    const result = getCSS.execute(figma, { id: frame.id, max_bytes: 20 }) as {
      css: string
      truncated?: boolean
      omitted?: number
    }

    expect(result.css).toBe('')
    expect(result.truncated).toBe(true)
    expect(result.omitted).toBeGreaterThan(0)
  })

  test('ids share one max_bytes budget across the reply', () => {
    const figma = new FigmaAPI(new SceneGraph())
    const boxes = [0, 1].map(() => {
      const box = figma.createRectangle()
      box.resize(40, 40)
      return box
    })

    const result = getCSS.execute(figma, { ids: boxes.map((box) => box.id), max_bytes: 60 }) as {
      css: string
      truncated?: boolean
      omitted?: number
    }

    expect(result.truncated).toBe(true)
    expect(Buffer.byteLength(result.css, 'utf8')).toBeLessThanOrEqual(60)
  })

  test('a stroke reads as a border with its weight', () => {
    const { figma, box } = card()
    box.strokeWeight = 1
    box.strokes = [
      {
        type: 'SOLID',
        color: { r: 0.5, g: 0.5, b: 0.5 },
        opacity: 1,
        visible: true
      }
    ]

    expect(output(getCSS.execute(figma, { id: box.id, depth: 0 }))).toContain(
      'border:1px #808080'
    )
  })
})
