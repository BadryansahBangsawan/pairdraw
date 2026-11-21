import { expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { FigmaAPI } from '@pairdraw/core/figma-api'

// Layers share one frozen value for every empty list and record; a setter that wrote into one
// instead of replacing it would throw a TypeError here.

test('Figma API setters on default layers', () => {
  const api = new FigmaAPI(createEditor().graph)
  const rect = api.createRectangle()
  rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]
  rect.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 } }]
  rect.effects = [
    {
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.5 },
      offset: { x: 0, y: 2 },
      radius: 4,
      visible: true,
      blendMode: 'NORMAL'
    }
  ]
  rect.dashPattern = [2, 2]
  rect.exportSettings = [{ format: 'PNG' }]
  rect.setPluginData('key', 'value')
  rect.setSharedPluginData('ns', 'key', 'value')
  const frame = api.createFrame()
  frame.layoutGrids = [{ pattern: 'GRID', sectionSize: 8, visible: true }]
  frame.layoutMode = 'HORIZONTAL'
  frame.appendChild(rect)
  const component = api.createComponent()
  component.addComponentProperty('Label', 'TEXT', 'Hi')
  const copy = rect.clone()
  copy.fills = []
  expect(rect.fills).toHaveLength(1)
})
