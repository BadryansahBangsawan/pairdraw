import { expect, setDefaultTimeout, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'
import { collectAllNodes } from '#core-tests/helpers/fig/traversal'

import { createEditor } from '@pairdraw/core'
import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { variationSetOf } from '@pairdraw/scene-graph/variations'

setDefaultTimeout(60_000)

test('a set of variations stays a set of its original through a .fig archive', async () => {
  await initCodec()
  const editor = createEditor()
  const pageId = editor.graph.getPages()[0].id
  const card = editor.graph.createNode('FRAME', pageId, { name: 'Card', width: 200, height: 100 })
  editor.createVariations(card.id, { count: 2, labels: ['Calmer'] })

  const read = await parseFigFile((await exportFigFile(editor.graph)).buffer as ArrayBuffer)
  const section = expectDefined(
    collectAllNodes(read).find((node) => node.type === 'SECTION'),
    'variations section'
  )
  const view = expectDefined(variationSetOf(read, section.id), 'variation set')

  expect(view.original?.name).toBe('Card')
  expect(view.versions.map((version) => version.name)).toEqual(['V1 · Calmer', 'V2'])
})
