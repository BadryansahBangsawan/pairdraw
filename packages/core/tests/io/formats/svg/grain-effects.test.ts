import { describe, expect, test } from 'bun:test'

import { renderNodesToSVG } from '@pairdraw/core/io/formats/svg'
import { SceneGraph, type Effect } from '@pairdraw/scene-graph'

function grainSVG(effects: Effect[]): string {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  if (!page) throw new Error('The fixture has no page')
  const node = graph.createNode('RECTANGLE', page.id, {
    name: 'Grain',
    width: 40,
    height: 40,
    fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
    effects
  })
  const svg = renderNodesToSVG(graph, page.id, [node.id], { xmlDeclaration: false })
  if (!svg) throw new Error('The export wrote no SVG')
  return svg
}

const noise: Effect = {
  type: 'NOISE',
  color: { r: 0, g: 0, b: 0, a: 0.25 },
  visible: true,
  noise: { noiseType: 'MONOTONE', noiseSize: { x: 0.5, y: 0.5 }, density: 1 }
}

const texture: Effect = {
  type: 'TEXTURE',
  color: { r: 0, g: 0, b: 0, a: 1 },
  radius: 4,
  visible: true,
  texture: { noiseSize: { x: 4, y: 4 }, clipToShape: false }
}

describe('grain effects in SVG export', () => {
  test('a noise exports Figma’s turbulence chain with its density band', () => {
    const svg = grainSVG([noise])
    expect(svg).toContain('feTurbulence')
    expect(svg).toContain('baseFrequency="2 2"')
    expect(svg).toContain('stitchTiles="stitch"')
    expect(svg).toContain('feFuncA type="discrete"')
    // Full density shows all 100 steps; none shows one.
    expect(svg).toContain('tableValues="1 1 1 1')
  })

  test('a duotone mirrors its second colour’s band', () => {
    const duotone: Effect = {
      ...noise,
      noise: {
        noiseType: 'DUOTONE',
        noiseSize: { x: 1, y: 1 },
        density: 0.5,
        secondaryColor: { r: 1, g: 1, b: 1, a: 1 }
      }
    }
    const svg = grainSVG([duotone])
    expect(svg).toContain('feFlood')
    expect(svg.match(/feFuncA type="discrete"/g)?.length).toBe(2)
  })

  test('a texture exports a displacement chain', () => {
    const svg = grainSVG([texture])
    expect(svg).toContain('feDisplacementMap')
    expect(svg).toContain('scale="8"')
    expect(svg).toContain('xChannelSelector="R"')
  })

  test('a filter region holds the radius a texture moves the edges by', () => {
    const svg = grainSVG([texture])
    expect(svg).toContain('x="-4"')
    expect(svg).toContain('width="48"')
    expect(svg).toContain('filterUnits="userSpaceOnUse"')
  })
})
