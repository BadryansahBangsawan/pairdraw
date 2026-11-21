import { describe, expect, test } from 'bun:test'

import { effectScope, nextTick } from 'vue'

import { SceneGraph } from '@pairdraw/scene-graph'

import { useVideoExport } from '@/app/document/export/video/use'
import { createEditorStore } from '@/app/editor/session'

/** A frame that dissolves to another after a second. */
function setup() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const intro = graph.createNode('FRAME', pageId, { name: 'Intro', width: 80, height: 60 })
  const outro = graph.createNode('FRAME', pageId, { name: 'Outro', x: 100, width: 80, height: 60 })
  graph.updateNode(intro.id, {
    prototypeReactions: [
      {
        id: '9:1',
        trigger: { type: 'AFTER_TIMEOUT', delay: 1 },
        actions: [
          {
            type: 'NODE',
            nodeId: outro.id,
            navigation: 'NAVIGATE',
            transition: { type: 'DISSOLVE', duration: 0.3 },
            overlayPosition: 'CENTER'
          }
        ]
      }
    ]
  })
  return createEditorStore(graph)
}

describe('the video export dialog', () => {
  test('keeps a failed export in the dialog, saying why, until the next try', async () => {
    const store = setup()
    const scope = effectScope()
    const dialog = scope.run(() => useVideoExport(store))
    if (!dialog) throw new Error('The dialog workflow did not start')
    dialog.open.value = true
    await nextTick()

    // Bun has no WebCodecs, so recording an MP4 here fails as it would in Firefox 128.
    await dialog.record()

    expect(dialog.open.value).toBe(true)
    expect(dialog.failure.value).toContain('MP4 can’t be encoded here')
    scope.stop()
    store.dispose()
  })
})
