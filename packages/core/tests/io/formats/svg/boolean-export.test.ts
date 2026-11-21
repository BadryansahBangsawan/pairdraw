import { describe, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@pairdraw/core/editor'

import { BUILTIN_IO_FORMATS, IORegistry } from '#core/io'

const io = new IORegistry(BUILTIN_IO_FORMATS)

/** Two overlapping rectangles wrapped in each operation, as the editor's command makes them. */
function authored(operation: 'UNION' | 'SUBTRACT'): {
  editor: Editor
  pageId: string
  booleanId: string
  secondId: string
} {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const first = editor.graph.createNode('RECTANGLE', pageId, {
    x: 0,
    y: 0,
    width: 40,
    height: 40
  })
  const second = editor.graph.createNode('RECTANGLE', pageId, {
    x: 20,
    y: 0,
    width: 40,
    height: 40
  })
  editor.select([first.id, second.id])
  const booleanId = editor.booleanOperationSelected(operation)
  if (!booleanId) throw new Error('No boolean created')
  return { editor, pageId, booleanId, secondId: second.id }
}

async function exportOf(editor: Editor, nodeId: string, format: 'svg' | 'html' | 'jsx') {
  const result = await io.exportContent(format, {
    graph: editor.graph,
    target: { scope: 'node', nodeId }
  })
  if (typeof result.data !== 'string') throw new Error(`Expected ${format} markup`)
  return result.data
}

/** The numbers in a path's `d`, for the box the shape occupies. */
function pathData(svg: string): string {
  const d = /<path[^>]* d="([^"]+)"/.exec(svg)?.[1]
  if (!d) throw new Error('No path in the export')
  return d
}

function pathNumbers(svg: string): number[] {
  return [...pathData(svg).matchAll(/-?\d+(?:\.\d+)?/g)].map(([value]) => Number(value))
}

function box(numbers: number[]) {
  const xs = numbers.filter((_, index) => index % 2 === 0)
  const ys = numbers.filter((_, index) => index % 2 === 1)
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}

describe('exporting a boolean authored in Pairdraw', () => {
  test('SVG draws a Union as its result path, not the bounding box and operands', async () => {
    const { editor, booleanId } = authored('UNION')
    const svg = await exportOf(editor, booleanId, 'svg')

    expect(svg).not.toContain('<rect')
    expect(svg.match(/<path /g)).toHaveLength(1)
    expect(box(pathNumbers(svg))).toEqual({ width: 60, height: 40 })
  })

  test('SVG strokes the result path with every visible stroke', async () => {
    const { editor, booleanId } = authored('UNION')
    editor.graph.updateNode(booleanId, {
      strokes: [
        {
          type: 'SOLID',
          visible: true,
          color: { r: 1, g: 0, b: 0, a: 1 },
          opacity: 1,
          weight: 2,
          align: 'CENTER'
        },
        {
          type: 'SOLID',
          visible: true,
          color: { r: 0, g: 0, b: 1, a: 1 },
          opacity: 1,
          weight: 6,
          align: 'INSIDE'
        }
      ]
    })
    const svg = await exportOf(editor, booleanId, 'svg')

    expect(svg).not.toContain('<rect')
    // The centred stroke joins the fill; the inside one is drawn over the result outline at twice
    // its weight and clipped to that same outline, not to the layer's box.
    expect(svg.toLowerCase()).toContain('stroke="#ff0000"')
    expect(svg.toLowerCase()).toContain('stroke="#0000ff"')
    expect(svg).toContain('stroke-width="12"')
    expect(svg.match(/<clipPath\b/g)).toHaveLength(1)
    const clipPath = /<clipPath[^>]*>\s*<path[^>]* d="([^"]+)"/.exec(svg)?.[1]
    expect(clipPath).toBe(pathData(svg))
  })

  test('SVG draws a Subtract as its result path', async () => {
    const { editor, booleanId } = authored('SUBTRACT')
    const svg = await exportOf(editor, booleanId, 'svg')

    expect(svg).not.toContain('<rect')
    expect(svg.match(/<path /g)).toHaveLength(1)
    expect(box(pathNumbers(svg))).toEqual({ width: 20, height: 40 })
  })

  test('HTML draws the same result path', async () => {
    const { editor, booleanId } = authored('UNION')
    const html = await exportOf(editor, booleanId, 'html')

    expect(html).not.toContain('<rect')
    expect(html).toContain('<path')
  })

  test('an operand edit after the boolean changes the exported path', async () => {
    const { editor, booleanId, secondId } = authored('UNION')
    const before = await exportOf(editor, booleanId, 'svg')
    editor.graph.updateNode(secondId, { x: 80 })
    const after = await exportOf(editor, booleanId, 'svg')

    expect(after).not.toBe(before)
    expect(box(pathNumbers(after))).toEqual({ width: 120, height: 40 })
  })
})

describe('JSX export of a boolean authored in Pairdraw', () => {
  test('keeps the boolean as a Vector carrying its result paths', async () => {
    const { editor, booleanId } = authored('UNION')
    const jsx = await exportOf(editor, booleanId, 'jsx')

    expect(jsx).toContain('<Vector')
    expect(jsx).toContain('paths=')
  })

  test('an operand edit changes the paths JSX writes', async () => {
    const { editor, booleanId, secondId } = authored('UNION')
    const before = await exportOf(editor, booleanId, 'jsx')
    editor.graph.updateNode(secondId, { x: 80 })
    const after = await exportOf(editor, booleanId, 'jsx')

    expect(after).not.toBe(before)
  })
})
