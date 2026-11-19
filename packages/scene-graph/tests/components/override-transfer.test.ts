import { expect, test } from 'bun:test'

import {
  assignmentOverrideField,
  createInstanceOverrideState,
  remapInstanceOverrideState
} from '@pairdraw/scene-graph/instances/overrides'

test('override transfer remaps typed identities without rewriting equal text', () => {
  const state = createInstanceOverrideState()
  state.self.set('componentId', 'source')
  state.self.set('text', 'source')
  state.descendants.set(
    'child',
    new Map<string, unknown>([
      ['sourceComponentId', 'source'],
      ['boundVariables/paddingLeft', 'token'],
      ['boundVariables/paddingRight', undefined],
      ['visible', false],
      ['fills', [{ marker: 'source' }]]
    ])
  )
  const before = structuredClone(state)
  const result = remapInstanceOverrideState(state, {
    node: (id) => `node/${id}`,
    variable: (id) => `variable/${id}`
  })
  expect(result.self.get('componentId')).toBe('node/source')
  expect(result.self.get('text')).toBe('source')
  expect(result.descendants.get('node/child')).toEqual(
    new Map<string, unknown>([
      ['sourceComponentId', 'node/source'],
      ['boundVariables/paddingLeft', 'variable/token'],
      ['boundVariables/paddingRight', undefined],
      ['visible', false],
      ['fills', [{ marker: 'source' }]]
    ])
  )
  expect(state).toEqual(before)
})

test('override transfer rejects colliding target mappings', () => {
  const state = createInstanceOverrideState()
  state.descendants.set('a', new Map())
  state.descendants.set('b', new Map())
  expect(() =>
    remapInstanceOverrideState(state, { node: () => 'same', variable: (id) => id })
  ).toThrow('Duplicate remapped override target')
})

test('override transfer remaps the property an assignment override is keyed by', () => {
  const state = createInstanceOverrideState()
  state.descendants.set(
    'badge',
    new Map<string, unknown>([
      [assignmentOverrideField('label'), 'Bonus'],
      [assignmentOverrideField('gone'), 'x']
    ])
  )
  const result = remapInstanceOverrideState(state, {
    node: (id) => id,
    variable: (id) => id,
    property: (id) => (id === 'label' ? 'pasted-label' : undefined)
  })
  expect(result.descendants.get('badge')).toEqual(
    new Map<string, unknown>([[assignmentOverrideField('pasted-label'), 'Bonus']])
  )
})
