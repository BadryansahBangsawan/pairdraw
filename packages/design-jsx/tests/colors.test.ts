import { describe, expect, test } from 'bun:test'

import { createDesignJSXRenderer } from '#design-jsx/index'

import { SceneGraph } from '@pairdraw/scene-graph'

const renderer = createDesignJSXRenderer<never>({
  icon: () => Promise.resolve(null),
  svg: () => null,
  createArtwork: () => {
    throw new Error('No artwork in these tests')
  },
  layout: () => {
    // Colors do not depend on layout.
  },
  vectorBounds: () => {
    throw new Error('No vectors in these tests')
  }
})

async function renderIn(profile: 'srgb' | 'display-p3', source: string) {
  const graph = new SceneGraph()
  graph.documentColorSpace = profile
  const [result] = await renderer.renderJSX(graph, source)
  return graph.getNode(result.id)
}

describe('design JSX colors', () => {
  test('a literal color prop is read into the document profile', async () => {
    const p3 = await renderIn('display-p3', '<Rectangle bg="color(display-p3 1 0 0)" />')
    expect(p3?.fills[0]?.color).toEqual({ r: 1, g: 0, b: 0, a: 1 })
    const srgb = await renderIn('srgb', '<Rectangle bg="color(display-p3 1 0 0)" />')
    expect(srgb?.fills[0]?.color.r).toBeLessThan(1)
  })

  test('a text color and its decoration color are read into the document profile', async () => {
    const p3 = await renderIn(
      'display-p3',
      '<Text color="color(display-p3 1 0 0)" textDecorationColor="color(display-p3 1 0 0)">x</Text>'
    )
    expect(p3?.fills[0]?.color).toEqual({ r: 1, g: 0, b: 0, a: 1 })
    expect(p3?.textDecorationFills?.[0]?.color).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  })

  test('a literal stroke color is read into the document profile', async () => {
    const p3 = await renderIn('display-p3', '<Rectangle stroke="color(display-p3 1 0 0)" />')
    expect(p3?.strokes[0]?.color).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  })

  test('a literal shadow color is read into the document profile', async () => {
    const p3 = await renderIn(
      'display-p3',
      '<Rectangle shadow="0 4px 8px color(display-p3 1 0 0)" />'
    )
    const shadow = p3?.effects?.find((effect) => effect.type === 'DROP_SHADOW')
    expect(shadow?.type === 'DROP_SHADOW' ? shadow.color : undefined).toEqual({
      r: 1,
      g: 0,
      b: 0,
      a: 1
    })
  })
})
