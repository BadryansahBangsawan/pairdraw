import { describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import type { SceneNode } from '@pairdraw/scene-graph'

import { createEditor } from '#core/editor'

describe('editor replaceFonts', () => {
  test('changes every face in one undoable step', () => {
    const editor = createEditor()
    const page = editor.state.currentPageId
    editor.graph.createNode('TEXT', page, {
      name: 'Title',
      fontFamily: 'Old',
      fontWeight: 700,
      fontStyle: 'Bold',
      styleRuns: [
        { start: 0, length: 2, style: { fontFamily: 'Old', fontWeight: 700, fontStyle: 'Bold' } }
      ]
    })

    const counts = editor.replaceFonts([
      { from: { family: 'Old', style: 'Bold' }, to: { family: 'New', style: 'Regular' } }
    ])
    expect(counts).toEqual({ layers: 1, runs: 1, styles: 0 })
    const changed = expectDefined(
      [...editor.graph.getAllNodes()].find((node): node is SceneNode => node.type === 'TEXT')
    )
    expect(changed.fontFamily).toBe('New')
    expect(changed.styleRuns[0]?.style.fontFamily).toBe('New')

    editor.undoAction()
    const restored = expectDefined(
      [...editor.graph.getAllNodes()].find((node): node is SceneNode => node.type === 'TEXT')
    )
    expect(restored.fontFamily).toBe('Old')
    expect(restored.styleRuns[0]?.style.fontFamily).toBe('Old')
    editor.dispose()
  })
})
