import { expect, test } from 'bun:test'

import { tokenStylesheet } from '@pairdraw/dom-css/export'
import { SceneGraph } from '@pairdraw/scene-graph'

function palette(profile: 'srgb' | 'display-p3') {
  const graph = new SceneGraph()
  graph.documentColorSpace = profile
  graph.addCollection({
    id: 'palette',
    name: 'Palette',
    modes: [{ modeId: 'light', name: 'Light' }],
    defaultModeId: 'light',
    variableIds: []
  })
  graph.addVariable({
    id: 'brand',
    name: 'Brand',
    type: 'COLOR',
    collectionId: 'palette',
    valuesByMode: { light: { r: 0.8, g: 0.4, b: 0.3, a: 1 } },
    description: '',
    hiddenFromPublishing: false
  })
  return graph
}

test('a Display P3 document writes tokens in its own profile', async () => {
  const { css } = await tokenStylesheet(palette('display-p3'), { format: 'css' })
  expect(css).toContain('--color-brand: color(display-p3 0.8 0.4 0.3)')
})

test('an sRGB document keeps writing the same hex', async () => {
  const { css } = await tokenStylesheet(palette('srgb'), { format: 'css' })
  expect(css).toContain('--color-brand: #CC664D')
})
