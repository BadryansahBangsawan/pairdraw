import { expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'

import { createBindingForTargets } from '#vue/controls/binding-provider/create'
import { createAndBindNumberVariable } from '#vue/controls/binding-provider/number'
import { createPairdrawBindingProvider } from '#vue/controls/binding-provider/pairdraw'

function setup() {
  const editor = createEditor()
  const page = editor.graph.getPages()[0]
  if (!page) throw new Error('No page')
  const provider = createPairdrawBindingProvider<number>(editor, {
    types: ['FLOAT'],
    resolve: (e, id) => e.resolveNumberVariable(id),
    create: createAndBindNumberVariable
  })
  return { editor, page, provider }
}

test('a variable created from a size field starts from its value, so the layer keeps its size', () => {
  const { editor, page, provider } = setup()
  const node = editor.graph.createNode('RECTANGLE', page.id, { width: 120, height: 80 })

  createBindingForTargets(provider, [{ nodeId: node.id, path: 'width' }], 120, 'Size')

  const variableId = editor.graph.getNode(node.id)?.boundVariables.width
  expect(variableId).toBeDefined()
  expect(variableId ? editor.resolveNumberVariable(variableId) : undefined).toBe(120)
  expect(editor.graph.getNode(node.id)?.width).toBe(120)
})

test('a variable created from a field binds every layer and path the field edits', () => {
  const { editor, page, provider } = setup()
  const a = editor.graph.createNode('RECTANGLE', page.id, { width: 40, height: 40 })
  const b = editor.graph.createNode('RECTANGLE', page.id, { width: 40, height: 40 })
  const targets = [a, b].flatMap((node) =>
    ['topLeftRadius', 'bottomRightRadius'].map((path) => ({ nodeId: node.id, path }))
  )

  createBindingForTargets(provider, targets, 8, 'Radius')

  const bound = targets.map((target) => provider.getBindingId(target))
  expect(bound.every((id) => id !== undefined && id === bound[0])).toBe(true)
  expect(provider.getState(targets)).toBe('bound')
  expect(editor.graph.getNode(b.id)?.bottomRightRadius).toBe(8)
  expect([...editor.graph.variables.values()]).toHaveLength(1)
})
