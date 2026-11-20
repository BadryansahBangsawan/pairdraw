import { expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { parsePenFile, writePenDocument } from '@pairdraw/pen'
import { variationSetsOnPage } from '@pairdraw/scene-graph/variations'

test('a set of variations is written to .pen as plain frames, and the original as it was', () => {
  const editor = createEditor()
  const pageId = editor.graph.getPages()[0].id
  const card = editor.graph.createNode('FRAME', pageId, { name: 'Card', width: 200, height: 100 })
  editor.graph.createNode('TEXT', card.id, { name: 'Title', text: 'Hello' })
  editor.createVariations(card.id, { count: 2, labels: ['Calmer'] })

  const read = parsePenFile(writePenDocument(editor.graph))
  const readPage = read.getPages()[0].id
  const [readCard, section] = read.getChildren(readPage)

  expect(readCard).toMatchObject({ type: 'FRAME', name: 'Card', width: 200, height: 100 })
  expect(read.getChildren(readCard.id).map((node) => node.name)).toEqual(['Title'])
  // The section comes back as a frame holding the versions, which no longer form a set.
  expect(section).toMatchObject({ type: 'FRAME', name: 'Variations · Card' })
  expect(read.getChildren(section.id).map((node) => [node.type, node.name])).toEqual([
    ['FRAME', 'V1 · Calmer'],
    ['FRAME', 'V2']
  ])
  expect(variationSetsOnPage(read, readPage)).toEqual([])
})
