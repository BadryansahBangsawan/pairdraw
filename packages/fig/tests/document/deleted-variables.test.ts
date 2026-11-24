import { expect, test } from 'bun:test'

import { guid } from '#fig-tests/helpers/guid'
import { materializeDocument } from '#fig/document/materialize'

import type { NodeChange } from '@pairdraw/kiwi/fig/codec'

const LIGHT = guid(10)
const DARK = guid(11)

function color(localID: number, name: string, set: number, extra: Partial<NodeChange> = {}) {
  return {
    guid: guid(localID),
    type: 'VARIABLE',
    name,
    variableResolvedType: 'COLOR',
    variableSetID: { guid: guid(set) },
    variableDataValues: {
      entries: [
        {
          modeID: LIGHT,
          variableData: { dataType: 'COLOR', value: { colorValue: { r: 1, g: 0, b: 0, a: 1 } } }
        },
        {
          modeID: DARK,
          variableData: { dataType: 'COLOR', value: { colorValue: { r: 0, g: 0, b: 1, a: 1 } } }
        }
      ]
    },
    ...extra
  } satisfies NodeChange
}

/**
 * Figma keeps a deleted variable in the file, marked `isSoftDeleted`, for the layers still bound
 * to it; deleting a collection marks it and its variables.
 */
function records(): NodeChange[] {
  const modes = [
    { id: LIGHT, name: 'Light' },
    { id: DARK, name: 'Dark' }
  ]
  return [
    { guid: guid(3), type: 'VARIABLE_SET', name: 'Color Scheme', variableSetModes: modes },
    color(4, 'Accent', 3),
    color(5, 'Old accent', 3, { isSoftDeleted: true }),
    {
      guid: guid(6),
      type: 'VARIABLE_SET',
      name: 'Liquid Glass',
      variableSetModes: modes,
      isSoftDeleted: true
    },
    color(7, 'Tint', 6, { isSoftDeleted: true })
  ]
}

test('a deleted variable stays resolvable but leaves its collection’s list', () => {
  const { graph } = materializeDocument(records())
  expect(graph.variableCollections.get('1:3')?.variableIds).toEqual(['1:4'])
  expect(graph.variables.get('1:5')).toMatchObject({ name: 'Old accent', deleted: true })
  expect(graph.resolveColorVariable('1:5')).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  expect(graph.getLiveVariables().map((variable) => variable.name)).toEqual(['Accent'])
})

test('a deleted collection and its variables are kept, out of every list', () => {
  const { graph } = materializeDocument(records())
  expect(graph.variableCollections.get('1:6')).toMatchObject({ deleted: true, variableIds: [] })
  expect(graph.variables.get('1:7')?.deleted).toBe(true)
  expect(graph.getLiveCollections().map((collection) => collection.name)).toEqual(['Color Scheme'])
})

test('a variable that names its collection only as its parent joins it', () => {
  const parentNamed: NodeChange = color(4, 'Accent', 3)
  delete parentNamed.variableSetID
  parentNamed.parentIndex = { guid: guid(3), position: 'a0' }
  const { graph } = materializeDocument([
    {
      guid: guid(3),
      type: 'VARIABLE_SET',
      name: 'Color Scheme',
      variableSetModes: [
        { id: LIGHT, name: 'Light' },
        { id: DARK, name: 'Dark' }
      ]
    },
    parentNamed
  ])
  expect(graph.variableCollections.get('1:3')?.variableIds).toEqual(['1:4'])
  expect(graph.variables.get('1:4')?.collectionId).toBe('1:3')
})
