import { describe, expect, test } from 'bun:test'

import {
  GENERIC_FONT_FAMILIES_BY_CLASS,
  genericFontFamilyClass,
  parseCSSFontFamily,
  parseCSSLetterSpacing,
  parseCSSLineHeight,
  type GenericFontClass
} from '@pairdraw/scene-graph/css'
import { percentLength, pixelLength } from '@pairdraw/scene-graph/text'

const GENERIC_CLASS_CASES: Array<[string, GenericFontClass]> = [
  ['ui-monospace', 'monospace'],
  ['  UI-MonoSpace ', 'monospace'],
  ['SERIF', 'serif'],
  ['System-UI', 'sans-serif']
]

describe('genericFontFamilyClass', () => {
  test.each(GENERIC_CLASS_CASES)('%s maps to its class', (family, expected) => {
    expect(genericFontFamilyClass(family)).toBe(expected)
  })

  test.each(['cursive', 'Inter', ''])("'%s' is not a mapped keyword", (family) => {
    expect(genericFontFamilyClass(family)).toBeNull()
  })

  test('each class lists the common faces of macOS, Windows, and Linux', () => {
    expect(GENERIC_FONT_FAMILIES_BY_CLASS.monospace).toEqual(
      expect.arrayContaining(['Menlo', 'Consolas', 'DejaVu Sans Mono', 'Ubuntu Mono'])
    )
    expect(GENERIC_FONT_FAMILIES_BY_CLASS.serif).toEqual(
      expect.arrayContaining(['Georgia', 'Times New Roman', 'DejaVu Serif', 'Noto Serif'])
    )
  })
})

describe('parseCSSFontFamily', () => {
  test.each([
    ["'Noto Sans KR', sans-serif", 'Noto Sans KR'],
    ['"Fira Code", monospace', 'Fira Code'],
    ['"Foo, Bar", serif', 'Foo, Bar'],
    ['"O\'Reilly"', "O'Reilly"],
    ['Noto   Sans KR, Arial', 'Noto Sans KR'],
    ["O'Reilly, Arial", "O'Reilly"],
    ["'O\\'Reilly', serif", "O'Reilly"],
    ['"A\\26 B"', 'A&B'],
    ['Foo\\,Bar, serif', 'Foo,Bar'],
    ['Inter', 'Inter'],
    ['', null]
  ])('%s', (value, expected) => {
    expect(parseCSSFontFamily(value)).toBe(expected)
  })
})

describe('parseCSSLineHeight', () => {
  test.each([
    ['1.5', percentLength(150)],
    ['120%', percentLength(120)],
    ['24px', pixelLength(24)],
    ['1.5rem', pixelLength(24)],
    ['normal', null],
    ['2em', percentLength(200)],
    ['2vh', undefined],
    ['', undefined]
  ])('%s', (value, expected) => {
    expect(parseCSSLineHeight(value)).toEqual(expected)
  })
})

describe('parseCSSLetterSpacing', () => {
  test.each([
    ['0.1em', percentLength(10)],
    ['2px', pixelLength(2)],
    ['normal', pixelLength(0)],
    ['10%', undefined]
  ])('%s', (value, expected) => {
    expect(parseCSSLetterSpacing(value)).toEqual(expected)
  })
})
