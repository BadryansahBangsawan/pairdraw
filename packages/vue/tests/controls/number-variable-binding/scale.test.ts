import { expect, test } from 'bun:test'

import {
  displayNumberFromStored,
  storedNumberFromDisplay
} from '@pairdraw/vue/controls/number-variable-binding'

test('a variable created from an opacity of 50% holds the stored 0.5', () => {
  expect(storedNumberFromDisplay(50, 100)).toBe(0.5)
  expect(displayNumberFromStored(0.5, 100)).toBe(50)
})

test('a field without a display scale stores what it shows', () => {
  expect(storedNumberFromDisplay(12)).toBe(12)
  expect(displayNumberFromStored(12)).toBe(12)
})
