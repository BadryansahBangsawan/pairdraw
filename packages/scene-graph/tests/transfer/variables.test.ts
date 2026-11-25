import { expect, test } from 'bun:test'

import type { Variable, VariableCollection } from '@pairdraw/scene-graph'
import { prepareVariableTransfer } from '@pairdraw/scene-graph/transfer'

const collections: VariableCollection[] = [
  {
    id: 'set',
    name: 'Tokens',
    modes: [{ modeId: 'mode', name: 'Default' }],
    defaultModeId: 'mode',
    variableIds: ['color', 'alias']
  }
]
const variables: Variable[] = [
  {
    id: 'color',
    collectionId: 'set',
    name: 'color',
    type: 'COLOR',
    description: '',
    hiddenFromPublishing: false,
    valuesByMode: { mode: { r: 1, g: 0, b: 0, a: 1 } }
  },
  {
    id: 'alias',
    collectionId: 'set',
    name: 'alias',
    type: 'COLOR',
    description: '',
    hiddenFromPublishing: false,
    valuesByMode: { mode: { aliasId: 'color' } }
  }
]
const references = () => ({
  variables: new Map([
    ['color', 'new-color'],
    ['alias', 'new-alias']
  ]),
  collections: new Map([['set', 'new-set']]),
  modes: new Map([['mode', 'new-mode']])
})

test('variable transfer remaps resource membership, modes, and aliases with isolated values', () => {
  const before = structuredClone({ variables, collections })
  const prepared = prepareVariableTransfer(variables, collections, references())
  expect(prepared.collections[0]).toMatchObject({
    id: 'new-set',
    defaultModeId: 'new-mode',
    variableIds: ['new-color', 'new-alias']
  })
  expect(prepared.variables[1]).toMatchObject({
    id: 'new-alias',
    collectionId: 'new-set',
    valuesByMode: { 'new-mode': { aliasId: 'new-color' } }
  })
  expect(prepared.variables[0].valuesByMode['new-mode']).not.toBe(variables[0].valuesByMode.mode)
  prepared.collections[0].modes[0].name = 'Changed'
  expect({ variables, collections }).toEqual(before)
})

test('variable transfer accepts a deleted variable its collection no longer lists', () => {
  const withDeleted = structuredClone(variables)
  withDeleted.push({
    id: 'retired',
    collectionId: 'set',
    name: 'retired',
    type: 'FLOAT',
    description: '',
    hiddenFromPublishing: false,
    valuesByMode: { mode: 4 },
    deleted: true
  })
  const deletedReferences = references()
  deletedReferences.variables.set('retired', 'new-retired')

  const prepared = prepareVariableTransfer(withDeleted, collections, deletedReferences)

  expect(prepared.collections[0].variableIds).toEqual(['new-color', 'new-alias'])
  expect(prepared.variables[2]).toMatchObject({ id: 'new-retired', deleted: true })
})

test('variable transfer rejects missing references and target collisions before mutation', () => {
  const invalidMode = structuredClone(variables)
  invalidMode[0].valuesByMode = { other: 12 }
  expect(() => prepareVariableTransfer(invalidMode, collections, references())).toThrow(
    'Unknown mode'
  )
  expect(() =>
    prepareVariableTransfer([...variables, variables[0]], collections, references())
  ).toThrow('Duplicate source')
  const missing = references()
  missing.variables.delete('color')
  expect(() => prepareVariableTransfer(variables, collections, missing)).toThrow(
    'Missing variable transfer mapping'
  )
  const collision = references()
  collision.variables.set('alias', 'new-color')
  expect(() => prepareVariableTransfer(variables, collections, collision)).toThrow(
    'Colliding variable'
  )
})
