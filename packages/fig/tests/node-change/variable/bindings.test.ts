import { expect, test } from 'bun:test'

import { textRunVariableBindings } from '#fig/node-change/variable/bindings'

import type { NodeChange, VariableDataEntry } from '@pairdraw/kiwi/fig/codec'

const GUID = { sessionID: 7, localID: 3 }
const ALIAS: VariableDataEntry = {
  dataType: 'ALIAS',
  resolvedDataType: 'FLOAT',
  value: { alias: { guid: GUID } }
}

function lineHeightOverride(variableData: VariableDataEntry): NodeChange {
  return { parameterConsumptionMap: { entries: [{ variableField: 'LINE_HEIGHT', variableData }] } }
}

test('a range bound with a plain alias keeps no scale, so it resolves with the layer scale', () => {
  expect(textRunVariableBindings(lineHeightOverride(ALIAS))).toEqual({
    boundVariables: { lineHeight: '7:3' },
    variableBindingScales: {}
  })
})

test('a range bound with a scaled binding keeps its multiplier, even 1', () => {
  for (const multiplier of [1, 2.5]) {
    const scaled: VariableDataEntry = {
      dataType: 'EXPRESSION',
      resolvedDataType: 'FLOAT',
      value: {
        expressionValue: {
          expressionFunction: 'MULTIPLY',
          expressionArguments: [
            { dataType: 'FLOAT', resolvedDataType: 'FLOAT', value: { floatValue: multiplier } },
            ALIAS
          ]
        }
      }
    }
    expect(textRunVariableBindings(lineHeightOverride(scaled))).toEqual({
      boundVariables: { lineHeight: '7:3' },
      variableBindingScales: { lineHeight: multiplier }
    })
  }
})
