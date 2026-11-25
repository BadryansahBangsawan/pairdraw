import { afterEach, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@pairdraw/core'
import { BUILTIN_IO_FORMATS, IORegistry } from '@pairdraw/core/io'

import { createDocumentExportActions } from '@/app/document/export'
import { toast } from '@/app/shell/ui'

import { expectDefined } from '#tests/helpers/assert'

const io = new IORegistry(BUILTIN_IO_FORMATS)
const editors: Editor[] = []

afterEach(() => {
  toast.toasts.value = []
  for (const editor of editors.splice(0)) editor.dispose()
})

function editor(): Editor {
  const created = createEditor()
  editors.push(created)
  return created
}

/** A card whose paint uses a variable, which a draw.io file cannot hold. */
function themed(created: Editor): void {
  const page = expectDefined(created.graph.getPages()[0], 'page')
  const frame = created.graph.createNode('FRAME', page.id, { name: 'Card', width: 100, height: 60 })
  created.graph.createNode('RECTANGLE', frame.id, { width: 40, height: 40 })
  const collection = created.graph.createCollection('Brand')
  created.graph.createVariable('primary', 'COLOR', collection.id, '#3366ff')
}

test('an export shows what the file could not hold, once it saved', async () => {
  const created = editor()
  themed(created)
  const page = expectDefined(created.graph.getPages()[0], 'page')
  const saved: string[] = []
  const actions = createDocumentExportActions(created, created.state, io, (_data, name) => {
    saved.push(name)
  })

  await actions.exportTarget({ scope: 'page', pageId: page.id }, 'drawio')

  expect(saved).toHaveLength(1)
  expect(toast.toasts.value.map((entry) => entry.message).join(' ')).toContain(
    'draw.io has no variables'
  )
})

test('an export with nothing to report says nothing', async () => {
  const created = editor()
  const page = expectDefined(created.graph.getPages()[0], 'page')
  created.graph.createNode('FRAME', page.id, { name: 'Card', width: 100, height: 60 })
  const actions = createDocumentExportActions(created, created.state, io, () => undefined)

  await actions.exportTarget({ scope: 'page', pageId: page.id }, 'drawio')

  expect(toast.toasts.value).toEqual([])
})
