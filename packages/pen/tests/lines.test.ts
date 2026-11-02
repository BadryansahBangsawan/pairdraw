import { describe, expect, test } from 'bun:test'

import { parsePenFile, type PenNode } from '@open-pencil/pen'

import { getNodeOrThrow } from './helpers/assert'
import { parseDocument } from './helpers/document'
import { FIXTURES } from './helpers/paths'

/**
 * `line` is missing from pen.dev's published schema but written by pen.dev itself: the design
 * libraries its CLI 0.3.14 ships draw list dividers as below. pen.dev draws a line from its box's
 * top-left corner to its bottom-right.
 */
const listDivider: PenNode = {
  id: 'divider',
  type: 'frame',
  name: 'List Divider',
  width: 240,
  gap: 8,
  padding: [4, 0],
  justifyContent: 'center',
  alignItems: 'center',
  children: [
    {
      id: 'line',
      type: 'line',
      name: 'Line',
      width: 'fill_container',
      height: 0,
      stroke: { align: 'center', thickness: 1, fill: '#E4E4E7' }
    }
  ]
}

describe('parsePenFile — lines', () => {
  test('reads the line pen.dev 2.21 wrote in the oracle probes as a line layer', async () => {
    // "line width only" in the Align Probe frame, which pen.dev's own export draws as nothing.
    const graph = parsePenFile(await Bun.file(`${FIXTURES}/pen-oracles/probes.pen`).text())
    const line = getNodeOrThrow(graph, 'sEJi2')
    expect(line).toMatchObject({
      type: 'LINE',
      name: 'line width only',
      x: 20,
      y: 125,
      width: 480,
      height: 0,
      parentId: 'ZqgQn'
    })
    expect(line.strokes).toEqual([])
  })

  test('reads a line with no height as a line layer that fills its row', () => {
    const graph = parseDocument([listDivider])
    const line = getNodeOrThrow(graph, 'line')
    expect(line.type).toBe('LINE')
    expect(line.name).toBe('Line')
    expect(line.height).toBe(0)
    expect(line.layoutGrow).toBe(1)
    expect(line.strokes).toHaveLength(1)
    expect(line.strokes[0]).toMatchObject({ weight: 1, align: 'CENTER' })
    expect(line.strokes[0]?.color).toMatchObject({ r: 0xe4 / 255, g: 0xe4 / 255, b: 0xe7 / 255 })
  })

  test('centres a line layer’s stroke whatever alignment it asks for', () => {
    const graph = parseDocument([
      {
        id: 'line',
        type: 'line',
        width: 80,
        height: 0,
        stroke: '#000000',
        strokeWidth: 2,
        strokeAlignment: 'inside'
      }
    ])
    const line = getNodeOrThrow(graph, 'line')
    expect(line.width).toBe(80)
    expect(line.strokes[0]?.align).toBe('CENTER')
  })

  test('reads a slanted line as a vector across its box', () => {
    const graph = parseDocument([
      {
        id: 'page',
        type: 'frame',
        layout: 'none',
        width: 200,
        height: 200,
        children: [
          { id: 'slant', type: 'line', x: 10, y: 20, width: 60, height: 30, stroke: '#000000' }
        ]
      }
    ])
    const slant = getNodeOrThrow(graph, 'slant')
    expect(slant.type).toBe('VECTOR')
    expect(slant).toMatchObject({ x: 10, y: 20, width: 60, height: 30 })
    expect(slant.vectorNetwork?.vertices).toEqual([
      { x: 0, y: 0 },
      { x: 60, y: 30 }
    ])
    expect(slant.vectorNetwork?.segments).toHaveLength(1)
    expect(slant.vectorNetwork?.regions).toEqual([])
  })
})
