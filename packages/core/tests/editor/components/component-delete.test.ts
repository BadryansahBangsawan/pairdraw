import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@pairdraw/core'
import { exportFigFile } from '@pairdraw/core/io/formats/fig'

test('deleting a component layer takes its copies, and the document still saves', async () => {
  const editor = createEditor()
  try {
    const page = editor.state.currentPageId
    const component = editor.graph.createNode('COMPONENT', page, { name: 'Card', width: 200, height: 100 })
    const frame = editor.graph.createNode('FRAME', component.id, { name: 'Box', width: 100, height: 60 })
    editor.graph.createNode('RECTANGLE', frame.id, { name: 'Inner', width: 40, height: 24 })
    const instance = expectDefined(editor.graph.createInstance(component.id, page, { x: 300, y: 0 }), 'instance')
    expect(editor.graph.getChildren(instance.id)).toHaveLength(1)

    editor.select([frame.id])
    editor.deleteSelected()
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })

    // A copy left behind would name a component layer that no longer exists, and saving it threw.
    expect(editor.graph.getChildren(instance.id)).toHaveLength(0)
    expect((await exportFigFile(editor.graph)).byteLength).toBeGreaterThan(0)
  } finally {
    editor.dispose()
  }
})
