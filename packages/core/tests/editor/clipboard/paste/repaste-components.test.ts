import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import type { Editor } from '@pairdraw/core'
import type { ClipboardSnapshot } from '@pairdraw/core/editor/clipboard/snapshot'
import { PAIRDRAW_PLUGIN_DATA, withoutPluginData } from '@pairdraw/scene-graph/plugin-data'

import { expectDefined } from '#core-tests/helpers/assert'

/** A component with a text child, plus an instance of it, copied from its document. */
async function copyAuthoredComponent(
  editor: Editor,
  name = 'Card'
): Promise<{ snapshot: ClipboardSnapshot; mainId: string }> {
  const page = editor.state.currentPageId
  const main = editor.graph.createNode('COMPONENT', page, { name, width: 80, height: 60 })
  editor.graph.createNode('TEXT', main.id, { name: 'Label', text: 'Card' })
  const instance = editor.graph.createInstance(main.id, page)
  if (!instance) throw new Error('No instance')
  editor.select([instance.id])
  const snapshot = expectDefined((await editor.prepareCopy()).snapshot, 'snapshot')
  return { snapshot, mainId: main.id }
}

/** A component set of On and Off variants, copied through an instance of On. */
async function copyVariantSet(editor: Editor) {
  const page = editor.state.currentPageId
  const off = editor.graph.createNode('COMPONENT', page, { name: 'State=Off', width: 40, height: 20 })
  const on = editor.graph.createNode('COMPONENT', page, { name: 'State=On', width: 40, height: 20 })
  editor.select([off.id, on.id])
  editor.createComponentSetFromComponents()
  const instance = editor.graph.createInstance(on.id, page)
  if (!instance) throw new Error('No instance')
  editor.select([instance.id])
  return expectDefined((await editor.prepareCopy()).snapshot, 'snapshot')
}

function count(editor: Editor, type: 'COMPONENT' | 'COMPONENT_SET', name?: string) {
  return [...editor.graph.getAllNodes()].filter(
    (node) => node.type === type && (name === undefined || node.name === name)
  )
}

function pastedInstance(editor: Editor) {
  const selected = [...editor.state.selectedIds].flatMap((id) => {
    const node = editor.graph.getNode(id)
    return node ? [node] : []
  })
  return expectDefined(
    selected.find((node) => node.type === 'INSTANCE') ?? selected[0],
    'pasted instance'
  )
}

describe('re-pasting the same foreign component snapshot', () => {
  test('reuses the component it pasted, and both instances point at it', async () => {
    const source = createEditor()
    const { snapshot } = await copyAuthoredComponent(source)
    const target = createEditor()

    await target.pasteSnapshot(structuredClone(snapshot))
    const first = pastedInstance(target)
    const firstMain = expectDefined(target.graph.getNode(first.componentId ?? ''), 'first main')
    expect(count(target, 'COMPONENT', 'Card')).toHaveLength(1)

    await target.pasteSnapshot(structuredClone(snapshot))
    const second = pastedInstance(target)
    expect(first.id).not.toBe(second.id)
    expect(count(target, 'COMPONENT', 'Card')).toHaveLength(1)
    expect(second.componentId).toBe(firstMain.id)

    source.dispose()
    target.dispose()
  })

  test('reuses a pasted variant set, and the second instance switches inside it', async () => {
    const source = createEditor()
    const snapshot = await copyVariantSet(source)
    const target = createEditor()

    await target.pasteSnapshot(structuredClone(snapshot))
    const firstMain = expectDefined(
      target.graph.getNode(pastedInstance(target).componentId ?? ''),
      'first main'
    )
    const firstSet = expectDefined(target.graph.getNode(firstMain.parentId ?? ''), 'first set')

    await target.pasteSnapshot(structuredClone(snapshot))
    const second = pastedInstance(target)
    expect(count(target, 'COMPONENT_SET')).toHaveLength(1)
    expect(expectDefined(target.graph.getNode(second.componentId ?? ''), 'second main').parentId).toBe(
      firstSet.id
    )

    target.switchInstanceVariant(second.id, 'State', 'Off')
    const off = target.graph
      .getChildren(firstSet.id)
      .find((node) => node.name === 'State=Off')
    expect(target.graph.getNode(second.id)?.componentId).toBe(off?.id)

    source.dispose()
    target.dispose()
  })

  test('reuses a component from a .fig by its source identity', async () => {
    const source = createEditor()
    const { snapshot } = await copyAuthoredComponent(source, 'Imported card')
    const target = createEditor()
    const dependency = expectDefined(snapshot.componentDependencies[0], 'dependency')
    dependency.source = { ...dependency.source, id: '1:42' }

    await target.pasteSnapshot(structuredClone(snapshot))
    const first = pastedInstance(target)
    const main = expectDefined(target.graph.getNode(first.componentId ?? ''), 'main')
    expect(main.source.id).toBe('1:42')
    // A document saved from Figma carries no clipboard-origin note on the component.
    target.graph.updateNode(main.id, {
      pluginData: withoutPluginData(main.pluginData, [PAIRDRAW_PLUGIN_DATA.clipboardOrigin])
    })

    await target.pasteSnapshot(structuredClone(snapshot))
    expect(count(target, 'COMPONENT', 'Imported card')).toHaveLength(1)
    expect(pastedInstance(target).componentId).toBe(main.id)

    source.dispose()
    target.dispose()
  })

  test('does not match an unrelated component that shares the name', async () => {
    const source = createEditor()
    const { snapshot } = await copyAuthoredComponent(source, 'Card')
    const target = createEditor()
    const own = target.graph.createNode('COMPONENT', target.state.currentPageId, {
      name: 'Card',
      width: 80,
      height: 60
    })

    await target.pasteSnapshot(structuredClone(snapshot))
    const pasted = pastedInstance(target)
    expect(count(target, 'COMPONENT', 'Card')).toHaveLength(2)
    expect(pasted.componentId).not.toBe(own.id)
    expect(count(target, 'COMPONENT').find((node) => node.id === pasted.componentId)?.name).toBe(
      'Card'
    )

    source.dispose()
    target.dispose()
  })

  test('reuses the pasted component after the document was saved and reopened', async () => {
    const source = createEditor()
    const { snapshot } = await copyAuthoredComponent(source, 'Saved card')
    const target = createEditor()

    await target.pasteSnapshot(structuredClone(snapshot))
    const saved = await exportFigFile(target.graph)
    const reopened = createEditor({ graph: await parseFigFile(saved.buffer as ArrayBuffer) })
    expect(count(reopened, 'COMPONENT', 'Saved card')).toHaveLength(1)

    await reopened.pasteSnapshot(structuredClone(snapshot))
    expect(count(reopened, 'COMPONENT', 'Saved card')).toHaveLength(1)
    expect(pastedInstance(reopened).componentId).toBe(count(reopened, 'COMPONENT')[0]?.id)

    source.dispose()
    target.dispose()
    reopened.dispose()
  })
})
