import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'

import { expectDefined } from '#core-tests/helpers/assert'

/** Off and On variants of one set, with a property the set defines. */
function variantSet(editor: ReturnType<typeof createEditor>) {
  const graph = editor.graph
  const page = editor.state.currentPageId
  const off = graph.createNode('COMPONENT', page, { name: 'State=Off', width: 40, height: 20 })
  graph.createNode('TEXT', off.id, { name: 'Label', text: 'Off' })
  const on = graph.createNode('COMPONENT', page, { name: 'State=On', width: 40, height: 20 })
  graph.createNode('TEXT', on.id, { name: 'Label', text: 'On' })
  editor.select([off.id, on.id])
  editor.createComponentSetFromComponents()
  const set = expectDefined(graph.getNode(off.parentId ?? ''), 'set')
  const caption = expectDefined(
    editor.createComponentProperty(set.id, 'Caption', 'TEXT', 'Cap'),
    'property'
  )
  return { off, on, set, caption }
}

describe('a variant instance pasted into another document', () => {
  test('brings its component set, its variants, and the properties the set defines', async () => {
    const source = createEditor()
    const { on, set, caption } = variantSet(source)
    const instance = expectDefined(source.graph.createInstance(on.id, source.state.currentPageId), 'instance')
    source.setInstanceComponentProperty(instance.id, caption, 'Pasted cap')
    source.select([instance.id])
    const snapshot = expectDefined((await source.prepareCopy()).snapshot, 'snapshot')
    expect(snapshot.componentDependencies.map((node) => node.type)).toEqual(['COMPONENT_SET'])

    const target = createEditor()
    await target.pasteSnapshot(structuredClone(snapshot))
    const pasted = expectDefined(
      target.graph.getNode([...target.state.selectedIds][0] ?? ''),
      'pasted instance'
    )
    expect(pasted.type).toBe('INSTANCE')
    const main = expectDefined(target.graph.getNode(pasted.componentId ?? ''), 'main')
    expect(main.name).toBe('State=On')
    expect(main.parentId && target.graph.getNode(main.parentId)?.type).toBe('COMPONENT_SET')

    const definitions = target.getInstanceComponentPropertyDefinitions(pasted.id)
    expect(definitions.map((definition) => definition.name)).toEqual(['State', 'Caption'])
    const pastedCaption = expectDefined(
      definitions.find((definition) => definition.name === 'Caption'),
      'caption'
    )
    expect(target.getInstanceComponentPropertyValue(pasted.id, pastedCaption)).toBe('Pasted cap')

    // The pasted set still switches variants.
    target.switchInstanceVariant(pasted.id, 'State', 'Off')
    const off = target.graph
      .getChildren(expectDefined(target.graph.getNode(main.parentId ?? ''), 'set').id)
      .find((node) => node.name === 'State=Off')
    expect(target.graph.getNode(pasted.id)?.componentId).toBe(off?.id)

    // Nothing from the source document's set was needed once the copy carried its own.
    expect(set.id).not.toBe(main.parentId)
    source.dispose()
    target.dispose()
  })
})
