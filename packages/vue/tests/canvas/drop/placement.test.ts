import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@pairdraw/core'

import { componentDropPlacement } from '#vue/canvas/drop/use'

let editor: Editor
let componentId: string

beforeEach(() => {
  editor = createEditor()
  const pageId = editor.state.currentPageId
  componentId = editor.graph.createNode('COMPONENT', pageId, {
    name: 'Card',
    width: 100,
    height: 40
  }).id
})

afterEach(() => editor.dispose())

describe('dropping a component from Assets', () => {
  test('lands on the pixel grid while Snap to pixel grid is on', () => {
    const placement = componentDropPlacement(componentId, 200.5, 100.25, editor)
    expect(placement).toMatchObject({ x: 151, y: 80 })
  })

  test('lands on half pixels when half-pixel snapping is on', () => {
    editor.state.snappingPreferences = {
      ...editor.state.snappingPreferences,
      halfPixel: true
    }
    const placement = componentDropPlacement(componentId, 200.5, 100.25, editor)
    expect(placement).toMatchObject({ x: 150.5, y: 80.5 })
  })

  test('lands where it was dropped while Snap to pixel grid is off', () => {
    editor.state.snappingPreferences = {
      ...editor.state.snappingPreferences,
      pixelGrid: false
    }
    const placement = componentDropPlacement(componentId, 200.5, 100.25, editor)
    expect(placement).toMatchObject({ x: 150.5, y: 80.25 })
  })
})
