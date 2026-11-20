import { expect, test } from 'bun:test'

import { panelMessages } from '@pairdraw/vue/i18n'

import { featureLabel } from '@/app/editor/tokens/feature-label'

const panels = panelMessages.get()

test('common features read their Figma names', () => {
  expect(featureLabel(panels, 'LIGA')).toBe('Standard ligatures')
  expect(featureLabel(panels, 'CALT')).toBe('Contextual alternates')
  expect(featureLabel(panels, 'TNUM')).toBe('Tabular figures')
  expect(featureLabel(panels, 'ONUM')).toBe('Oldstyle figures')
  expect(featureLabel(panels, 'FRAC')).toBe('Fractions')
  expect(featureLabel(panels, 'SMCP')).toBe('Small caps')
  expect(featureLabel(panels, 'ZERO')).toBe('Slashed zero')
  expect(featureLabel(panels, 'KERN')).toBe('Kerning')
})

test('stylistic sets and character variants are numbered', () => {
  expect(featureLabel(panels, 'SS01')).toBe('Stylistic set 1')
  expect(featureLabel(panels, 'SS20')).toBe('Stylistic set 20')
  expect(featureLabel(panels, 'CV11')).toBe('Character variant 11')
})

test('a tag without a name of its own reads as its tag', () => {
  expect(featureLabel(panels, 'RCLT')).toBe('Feature RCLT')
})
