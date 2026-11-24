import { expect, test } from 'bun:test'

import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import type { NodeChange } from '@pairdraw/kiwi/fig/codec'
import { stringToGuid } from '@pairdraw/kiwi/fig/guid'
import { SceneGraph, type Variable } from '@pairdraw/scene-graph'

import { figArchive, registerFigArchive } from '#core/kiwi/fig/session/archive/access'

const RED = { r: 1, g: 0, b: 0, a: 1 }
const BLUE = { r: 0, g: 0, b: 1, a: 1 }

/** A record the pinned schema has no type for, shaped as the archive decodes one. */
function unreadPaintRecord(legacy: Variable): NodeChange {
  return {
    guid: stringToGuid(legacy.id),
    type: 'VARIABLE',
    name: legacy.name,
    ...({ variableResolvedType: 'PAINT' } as Partial<NodeChange>)
  }
}

/** A document read from its own file, whose second variable the reader left unread. */
async function documentWithUnreadVariable() {
  await initCodec()
  const source = new SceneGraph()
  const colors = source.createCollection('Colors')
  source.createVariable('Accent', 'COLOR', colors.id, RED)
  source.createVariable('Legacy', 'COLOR', colors.id, BLUE)
  const bytes = await exportFigFile(source)

  const graph = await parseFigFile(bytes.buffer as ArrayBuffer)
  const archive = figArchive(graph)
  if (!archive) throw new Error('The read registered no archive')
  const info = await archive.info()
  const legacy = [...graph.variables.values()].find((variable) => variable.name === 'Legacy')
  if (!legacy) throw new Error('Missing Legacy')
  const collectionId = legacy.collectionId
  graph.removeVariable(legacy.id)
  // An image the archive's name does not hash to makes the save a whole write instead of a patch.
  graph.images.set('not-a-sha1', new Uint8Array([1, 2, 3]))
  // The pinned schema has no type for this record, so the reader leaves it out; a save must keep
  // its bytes rather than encode it again.
  registerFigArchive(graph, {
    original: () => archive.original(),
    info: async () => ({
      ...info,
      imageHashes: ['not-a-sha1'],
      unreadVariables: [{ record: unreadPaintRecord(legacy), collectionId }]
    }),
    componentPages: (ids) => archive.componentPages(ids),
    recordPages: (ids) => archive.recordPages(ids),
    patch: async () => {
      throw new Error('A patch cannot carry this record')
    },
    close: () => undefined
  })
  return { graph, legacy }
}

test('a whole save copies a record the schema cannot encode instead of failing', async () => {
  const { graph, legacy } = await documentWithUnreadVariable()
  const saved = await exportFigFile(graph)
  const reopened = await parseFigFile(Uint8Array.from(saved).buffer as ArrayBuffer)
  expect(reopened.variables.get(legacy.id)?.name).toBe('Legacy')
  expect(reopened.variables.get(legacy.id)?.collectionId).toBe(legacy.collectionId)
  expect([...reopened.variables.values()].find((item) => item.name === 'Accent')).toBeDefined()
})

test('a second whole save keeps the copied record too', async () => {
  const { graph, legacy } = await documentWithUnreadVariable()
  await exportFigFile(graph)
  const second = await exportFigFile(graph)
  const reopened = await parseFigFile(Uint8Array.from(second).buffer as ArrayBuffer)
  expect(reopened.variables.get(legacy.id)?.name).toBe('Legacy')
})
