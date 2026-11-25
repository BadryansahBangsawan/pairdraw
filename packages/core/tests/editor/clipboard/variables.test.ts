import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@pairdraw/core'
import { exportFigFile } from '@pairdraw/core/io/formats/fig'
import { parseFigBuffer } from '@pairdraw/fig'
import { symbolOverridesOf } from '@pairdraw/fig/instance-overrides'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph } from '@pairdraw/scene-graph'
import {
  bindingOverrideField,
  ownInstanceOverrides,
  setInstanceOverride,
  variableModeOverrideField
} from '@pairdraw/scene-graph/instances/overrides'

import { remapClipboardVariableBindings } from '#core/editor/clipboard/variables'

test('a pasted instance override follows the collections and variables the paste copied', () => {
  const graph = new SceneGraph()
  const instance = graph.createNode('INSTANCE', graph.getPages()[0].id, { name: 'Outer' })
  const state = ownInstanceOverrides(instance)
  setInstanceOverride(state, instance.id, 'nested', variableModeOverrideField('sizes'))
  setInstanceOverride(state, instance.id, 'nested', variableModeOverrideField('themes'))
  setInstanceOverride(state, instance.id, 'nested', bindingOverrideField('width'), 'gap')
  setInstanceOverride(state, instance.id, instance.id, 'name', 'Card')

  remapClipboardVariableBindings(
    instance,
    new Map([['gap', 'pasted-gap']]),
    new Map([['sizes', 'pasted-sizes']])
  )

  expect(instance.instanceOverrides.self).toEqual(new Map([['name', 'Card']]))
  expect(instance.instanceOverrides.descendants).toEqual(
    new Map([
      [
        'nested',
        new Map<string, unknown>([
          [variableModeOverrideField('pasted-sizes'), true],
          [variableModeOverrideField('themes'), true],
          [bindingOverrideField('width'), 'pasted-gap']
        ])
      ]
    ])
  )
})

function pinnedNestedMode() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0].id
  const sizes = graph.createCollection('Sizes')
  const wide = expectDefined(graph.createMode(sizes.id, 'Wide'))
  const width = graph.createVariable('Width', 'FLOAT', sizes.id, 64)
  const leaf = graph.createNode('COMPONENT', page, {
    name: 'Leaf',
    variableModes: { [sizes.id]: wide }
  })
  graph.bindVariable(leaf.id, 'width', width.id)
  const card = graph.createNode('COMPONENT', page, { name: 'Card' })
  graph.createInstance(leaf.id, card.id, { name: 'Nested' })
  const outer = expectDefined(graph.createInstance(card.id, page, { name: 'Outer' }))
  const nested = expectDefined(graph.getChildren(outer.id)[0])
  for (const field of ['variableModes', variableModeOverrideField(sizes.id)]) {
    setInstanceOverride(ownInstanceOverrides(outer), outer.id, nested.id, field)
  }
  return { graph, outer }
}

test('a mode a pasted instance pins on a nested layer follows its collection into another file', async () => {
  await initCodec()
  const { graph, outer } = pinnedNestedMode()
  const editor = createEditor({ graph })
  editor.select([outer.id])
  const copy = await editor.prepareCopy()
  const target = new SceneGraph()

  await createEditor({ graph: target }).pasteSnapshot(expectDefined(copy.snapshot))

  const records = parseFigBuffer((await exportFigFile(target)).slice().buffer).nodeChanges
  const outerRecord = expectDefined(records.find((node) => node.name === 'Outer'))
  const sizes = expectDefined(records.find((node) => node.type === 'VARIABLE_SET'))
  const wide = sizes.variableSetModes?.find((mode) => mode.name === 'Wide')
  const modeMaps = symbolOverridesOf(outerRecord).flatMap(
    (override) => override.variableModeBySetMap ?? []
  )
  expect(modeMaps).toEqual([
    { entries: [{ variableSetID: { guid: sizes.guid }, variableModeID: wide?.id }] }
  ])
})

test('a variable a pasted instance binds on a nested layer follows the paste into another file', async () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0].id
  const sizes = graph.createCollection('Sizes')
  const width = graph.createVariable('Width', 'FLOAT', sizes.id, 64)
  const leaf = graph.createNode('COMPONENT', page, { name: 'Leaf' })
  const card = graph.createNode('COMPONENT', page, { name: 'Card' })
  graph.createInstance(leaf.id, card.id, { name: 'Nested' })
  const outer = expectDefined(graph.createInstance(card.id, page, { name: 'Outer' }))
  const nested = expectDefined(graph.getChildren(outer.id)[0])
  setInstanceOverride(
    ownInstanceOverrides(outer),
    outer.id,
    nested.id,
    bindingOverrideField('width'),
    width.id
  )
  const editor = createEditor({ graph })
  editor.select([outer.id])
  const copy = await editor.prepareCopy()
  const target = new SceneGraph()

  await createEditor({ graph: target }).pasteSnapshot(expectDefined(copy.snapshot))

  const pastedWidth = expectDefined([...target.variables.values()].find((v) => v.name === 'Width'))
  const pastedOuter = expectDefined([...target.getAllNodes()].find((node) => node.name === 'Outer'))
  const pastedNested = expectDefined(target.getChildren(pastedOuter.id)[0])
  const binding = pastedOuter.instanceOverrides.descendants
    .get(pastedNested.id)
    ?.get(bindingOverrideField('width'))
  expect(pastedWidth.id).not.toBe(width.id)
  expect(binding).toBe(pastedWidth.id)
})