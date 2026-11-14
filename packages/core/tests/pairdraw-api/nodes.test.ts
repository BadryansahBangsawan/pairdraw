import { expect, test } from 'bun:test'

import { PairdrawAPI } from '@pairdraw/core/pairdraw-api'
import { FigmaAPI } from '@pairdraw/core/figma-api'
import { compileScript } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'

test('scripts set layout and text direction through pairdraw, which figma lacks', async () => {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const result = (await compileScript(`
    const frame = figma.createFrame()
    const text = figma.createText()
    const before = pairdraw.getLayoutDirection(frame)
    pairdraw.setLayoutDirection(frame, 'RTL')
    pairdraw.setTextDirection(text, 'RTL')
    return {
      before,
      layout: pairdraw.getLayoutDirection(frame),
      text: pairdraw.getTextDirection(text),
      onFigma: 'layoutDirection' in frame || 'textDirection' in text
    }
  `)(figma)) as { before: string; layout: string; text: string; onFigma: boolean }
  expect(result).toEqual({ before: 'AUTO', layout: 'RTL', text: 'RTL', onFigma: false })
  await expect(
    compileScript(`pairdraw.setTextDirection(figma.createText(), 'UP')`)(figma)
  ).rejects.toThrow('Unknown direction UP; use AUTO, LTR, RTL')
})

test('a layer saved without a layout direction reads AUTO', () => {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const frame = figma.createFrame()
  Reflect.deleteProperty(graph.getNode(frame.id) as object, 'layoutDirection')
  expect(new PairdrawAPI(figma).getLayoutDirection(frame)).toBe('AUTO')
})
