import { afterEach, describe, expect, test } from 'bun:test'

import {
  clearInMemoryClipboardHTML,
  setInMemoryClipboardPayload
} from '@/app/editor/clipboard/memory'
import { pasteClipboardHTML } from '@/app/editor/clipboard/paste/content'
import {
  answerClipboardImport,
  clipboardImportPrompt,
  requestClipboardImport
} from '@/app/editor/clipboard/paste/import-prompt'
import { createEditorStore } from '@/app/editor/session/create'

import { expectDefined } from '#tests/helpers/assert'

afterEach(() => {
  answerClipboardImport(null)
  clearInMemoryClipboardHTML()
})

/** A layer bound to a `Spacing/Radius` variable, copied into the in-memory clipboard. */
async function copyBoundLayer() {
  const source = createEditorStore()
  const spacing = source.graph.createCollection('Spacing')
  const radius = source.graph.createVariable('Radius', 'FLOAT', spacing.id, 12)
  const node = source.graph.createNode('RECTANGLE', source.state.currentPageId, {
    cornerRadius: 12,
    boundVariables: { cornerRadius: radius.id }
  })
  source.select([node.id])
  const payload = await source.prepareCopy()
  setInMemoryClipboardPayload(payload)
  return { source, html: payload.html }
}

function layerCount(store: ReturnType<typeof createEditorStore>) {
  return store.graph.getChildren(store.state.currentPageId).length
}

async function prompted() {
  for (let attempt = 0; attempt < 50 && !clipboardImportPrompt.value; attempt++)
    await Promise.resolve()
  return expectDefined(clipboardImportPrompt.value, 'import question')
}

describe('pasting layers that use another document’s variables', () => {
  test('asks first, then pastes with the answer', async () => {
    const { html } = await copyBoundLayer()
    const target = createEditorStore()
    const spacing = target.graph.createCollection('Spacing')
    const radius = target.graph.createVariable('Radius', 'FLOAT', spacing.id, 4)

    const paste = pasteClipboardHTML(target, html)
    const question = await prompted()
    expect(question.plan.collections).toMatchObject([
      { name: 'Spacing', variableCount: 1, existing: { id: spacing.id } }
    ])
    expect(layerCount(target)).toBe(0)

    answerClipboardImport({ mode: 'import' })
    await paste
    const pasted = target.graph.getNode([...target.state.selectedIds][0])
    expect(pasted?.boundVariables.cornerRadius).toBe(radius.id)
    expect(clipboardImportPrompt.value).toBeNull()
  })

  test('cancelling pastes nothing', async () => {
    const { html } = await copyBoundLayer()
    const target = createEditorStore()

    const paste = pasteClipboardHTML(target, html)
    await prompted()
    answerClipboardImport(null)
    await paste

    expect(layerCount(target)).toBe(0)
    expect(target.graph.variables.size).toBe(0)
  })

  test('a copy from the same document pastes without asking', async () => {
    const { source, html } = await copyBoundLayer()
    const before = layerCount(source)

    await pasteClipboardHTML(source, html)

    expect(clipboardImportPrompt.value).toBeNull()
    expect(layerCount(source)).toBe(before + 1)
  })

  test('a newer question cancels the one still open', async () => {
    const plan = { collections: [], styles: [] }
    const first = requestClipboardImport(plan)
    const second = requestClipboardImport(plan)
    expect(await first).toBeNull()
    answerClipboardImport({ mode: 'as-is' })
    expect(await second).toEqual({ mode: 'as-is' })
  })
})
