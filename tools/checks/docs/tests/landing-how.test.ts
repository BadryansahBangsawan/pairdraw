import { describe, expect, test } from 'bun:test'

import { en } from '#docs-config/theme/landing/content/messages/en'
import { goalFills, savedFraction } from '#docs-config/theme/landing/how/card-values'

describe('the Goals card follows its catalog', () => {
  test('fills each bar by the spent and total in its detail', () => {
    expect(goalFills(en.how.card.goals)).toEqual([900 / 1400, 1100 / 1500, 400 / 600])
  })

  test('shows the saved share of the catalog total', () => {
    expect(savedFraction(en.how.card.amount, en.how.card.saved)).toBe(2400 / 3500)
  })

  test('reads edited figures instead of the ones it shipped with', () => {
    expect(savedFraction('$1,000', 'of $4,000 saved')).toBe(0.25)
    expect(goalFills([{ detail: '$300 / $1,200' }])).toEqual([0.25])
    expect(goalFills([{ detail: '$2,000 / $1,000' }])).toEqual([1])
    expect(goalFills([{ detail: 'no amount' }])).toEqual([0])
  })
})
