import { expect, test } from 'bun:test'

import {
  displayNumberFromStored,
  storedNumberFromDisplay,
  textLengthVariableValue
} from '@pairdraw/vue/controls/number-variable-binding'

test('a variable created from an opacity of 50% holds the stored 0.5', () => {
  expect(storedNumberFromDisplay(50, 100)).toBe(0.5)
  expect(displayNumberFromStored(0.5, 100)).toBe(50)
})

test('a field without a display scale stores what it shows', () => {
  expect(storedNumberFromDisplay(12)).toBe(12)
  expect(displayNumberFromStored(12)).toBe(12)
})

test('a variable created from a percent line height holds its pixels at the font size', () => {
  expect(textLengthVariableValue(120, 'PERCENT', 16)).toBe(19.2)
  expect(textLengthVariableValue(140, 'PERCENT', 14)).toBe(19.6)
})

test('a variable created from a percent letter spacing holds its pixels at the font size', () => {
  expect(textLengthVariableValue(-2, 'PERCENT', 22)).toBe(-0.44)
})

test('a variable created from a pixel text length holds what the field shows', () => {
  expect(textLengthVariableValue(24, 'PIXELS', 16)).toBe(24)
})
