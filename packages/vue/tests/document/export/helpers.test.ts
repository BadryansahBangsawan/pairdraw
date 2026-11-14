import { describe, expect, test } from 'bun:test'

import { computed } from 'vue'

import { createEditor } from '@pairdraw/core'
import { SceneGraph } from '@pairdraw/scene-graph'
import { PAIRDRAW_PLUGIN_DATA, readPluginData } from '@pairdraw/scene-graph/plugin-data'

import { createExportSettingActions, formatSupportsQuality } from '#vue/document/export/helpers'

function setup() {
  const graph = new SceneGraph()
  const editor = createEditor({ graph })
  const frame = graph.createNode('FRAME', graph.getPages()[0].id, { name: 'Card' })
  const actions = createExportSettingActions(
    editor,
    computed(() => [frame.id])
  )
  const settings = () => graph.getNode(frame.id)?.exportSettings ?? []
  return { editor, graph, frame, actions, settings }
}

describe('export quality', () => {
  test('only JPG and WEBP rows take one', () => {
    expect(formatSupportsQuality('jpg')).toBe(true)
    expect(formatSupportsQuality('webp')).toBe(true)
    expect(formatSupportsQuality('png')).toBe(false)
    expect(formatSupportsQuality('pdf')).toBe(false)
  })

  test('is set per row, clamped, saved with the layer, and undone', () => {
    const { editor, graph, frame, actions, settings } = setup()
    actions.addSetting()
    actions.updateFormat(0, 'jpg')
    actions.updateQuality(0, 140)

    expect(settings()).toEqual([{ scale: 1, format: 'jpg', quality: 100 }])
    const node = graph.getNode(frame.id)
    if (!node) throw new Error('Expected the frame')
    expect(readPluginData(node.pluginData, PAIRDRAW_PLUGIN_DATA.exportSettings)).toEqual([
      { scale: 1, format: 'jpg', quality: 100 }
    ])

    editor.undo.undo()
    expect(settings()).toEqual([{ scale: 1, format: 'jpg' }])
  })

  test('a new row keeps the last row’s quality, and a format without one drops it', () => {
    const { actions, settings } = setup()
    actions.addSetting()
    actions.updateFormat(0, 'webp')
    actions.updateQuality(0, 40)
    actions.addSetting()
    expect(settings()[1]).toEqual({ scale: 2, format: 'webp', quality: 40 })

    actions.updateFormat(1, 'png')
    expect(settings()[1]).toEqual({ scale: 2, format: 'png' })
  })
})
