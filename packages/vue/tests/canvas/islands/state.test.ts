import { describe, expect, test } from 'bun:test'

import type { ControlModel } from '@pairdraw/dom-css/export'
import { emptyBehaviour } from '@pairdraw/scene-graph/behaviours'

import { createIslandState, instanceStates } from '#vue/canvas/islands/state'

function tabsControl(): ControlModel {
  return {
    path: 'Feature tabs',
    kind: 'tabs',
    behaviour: { ...emptyBehaviour('tabs'), booleans: { value: { propertyId: 'tab' } } },
    booleans: {},
    choice: {
      definition: {
        id: 'tab',
        name: 'Tab',
        type: 'VARIANT',
        defaultValue: 'AI',
        variantOptions: ['AI', 'Browser']
      },
      options: ['AI', 'Browser'],
      designed: 0
    },
    states: null,
    parts: {},
    texts: {},
    items: [],
    reveal: [],
    panels: [],
    triggers: []
  }
}

describe('a tabs island bound to the Tab variant property', () => {
  test('starts on the drawn tab and switches the variant with the chosen trigger', () => {
    const control = tabsControl()
    const state = createIslandState(new Map([[control.path, control]]))
    const drawn = state.get(control.path)
    expect(drawn?.choice).toBe('0')
    if (!drawn) throw new Error('No island state')

    drawn.choice = '1'
    expect(
      instanceStates(new Map([[control.path, control]]), state).get(control.path)?.variants
    ).toEqual({
      Tab: 'Browser'
    })
  })
})
