import { describe, expect, test } from 'bun:test'

import { modeConditionKey, readCustomProperties } from '#dom-css/tokens/custom-properties'
import { cssNameVariableName } from '#dom-css/tokens/names'

function scopes(css: string) {
  return readCustomProperties(css).scopes.map((scope) => ({
    condition: scope.condition,
    attribute: scope.attribute,
    label: scope.label,
    values: Object.fromEntries(scope.declarations.map(({ name, value }) => [name, value]))
  }))
}

describe('reading custom properties', () => {
  test(':root, html, :host and Tailwind @theme are the base set', () => {
    const read = scopes(`
      :root { --a: 1px; color: red }
      html { --b: #fff }
      :host { --c: 2 }
      @theme inline { --color-brand: oklch(0.7 0.2 40) }
    `)
    expect(read.map((scope) => scope.condition)).toEqual([null, null, null, null])
    expect(read.map((scope) => scope.values)).toEqual([
      { a: '1px' },
      { b: '#fff' },
      { c: '2' },
      { 'color-brand': 'oklch(0.7 0.2 40)' }
    ])
  })

  test('a lone attribute selector names its attribute, with the root it sits on taken off', () => {
    const read = scopes(`
      [data-theme="dark"] { --a: #000 }
      :root[data-density=compact] { --gap: 4px }
      html.dark { --a: #111 }
    `)
    expect(read).toEqual([
      {
        condition: '[data-theme="dark"]',
        attribute: { name: 'data-theme', value: 'dark' },
        label: undefined,
        values: { a: '#000' }
      },
      {
        condition: '[data-density="compact"]',
        attribute: { name: 'data-density', value: 'compact' },
        label: undefined,
        values: { gap: '4px' }
      },
      { condition: '.dark', attribute: undefined, label: undefined, values: { a: '#111' } }
    ])
  })

  test('a :root block inside @media, @supports or @container is a mode of that condition', () => {
    const read = scopes(`
      @media (prefers-color-scheme:dark) { :root { --a: #000 } }
      @media screen and (min-width: 40rem) { :root { --gap: 24px } }
      @container (max-width: 640px) { :root { --gap: 8px } }
    `)
    expect(read.map((scope) => scope.condition)).toEqual([
      '@media (prefers-color-scheme: dark)',
      '@media screen and (min-width: 40rem)',
      '@container (max-width: 640px)'
    ])
  })

  test('@layer is read through, and the comment above a mode labels it', () => {
    const read = scopes(`
      @layer base {
        :root { --a: #fff }
        /* Theme: Dark */
        [data-theme="dark"] { --a: #000 }
      }
      /* Theme: High contrast */
      @media (prefers-contrast: more) { :root { --a: #111 } }
    `)
    expect(read.map((scope) => scope.label)).toEqual([
      undefined,
      { collection: 'Theme', mode: 'Dark' },
      { collection: 'Theme', mode: 'High contrast' }
    ])
  })

  test('a comment is a label only where its mode is the one the condition names', () => {
    const read = scopes(`
      /* TODO: fix later */
      .dark { --a: #000 }
      /* Dark mode: overrides */
      [data-theme="dark"] { --a: #111 }
      /* Theme: Dark */
      .dark { --a: #222 }
      /* Density: Tight */
      [data-density="compact"] { --gap: 2px }
    `)
    expect(read.map((scope) => scope.label)).toEqual([
      undefined,
      undefined,
      { collection: 'Theme', mode: 'Dark' },
      { collection: 'Density', mode: 'Tight' }
    ])
  })

  test('Tailwind @theme is read as declarations, also around a nested @keyframes', () => {
    const css = `@theme {
      --color-*: initial;
      --color-brand: #3b82f6;
      --animate-spin: spin 1s linear infinite;
      @keyframes spin { to { transform: rotate(360deg) } }
      --x: 1px;
    }`
    const sheet = readCustomProperties(css)
    expect(sheet.skipped).toEqual([])
    const [scope] = sheet.scopes
    expect(scope?.condition).toBeNull()
    expect(scope?.declarations.map(({ name, value }) => [name, value])).toEqual([
      ['color-brand', '#3b82f6'],
      ['animate-spin', 'spin 1s linear infinite'],
      ['x', '1px']
    ])
    for (const declaration of scope?.declarations ?? [])
      expect(css.slice(declaration.start, declaration.end)).toBe(declaration.value)
    expect(css[scope?.insertAt ?? 0]).toBe('}')
  })

  test('an at-rule that declares custom properties but names no mode is skipped, not lost', () => {
    const sheet = readCustomProperties(
      '@starting-style { --a: 1px } @keyframes x { to { top: 0 } }'
    )
    expect(sheet.scopes).toEqual([])
    expect(sheet.skipped).toEqual(['@starting-style'])
  })

  test('values keep how they are written, without !important, with their source ranges', () => {
    const css = ':root { --font: "Inter", sans-serif !important; --space:  calc(var(--a) * 2) ; }'
    const [scope] = readCustomProperties(css).scopes
    expect(scope.declarations.map(({ name, value }) => [name, value])).toEqual([
      ['font', '"Inter", sans-serif'],
      ['space', 'calc(var(--a) * 2)']
    ])
    for (const declaration of scope.declarations)
      expect(css.slice(declaration.start, declaration.end)).toBe(declaration.value)
    expect(css[scope.insertAt]).toBe('}')
  })

  test('scopes that switch no mode are skipped, and rules without custom properties ignored', () => {
    const sheet = readCustomProperties(`
      .card .title { --a: 1px }
      @media (prefers-color-scheme: dark) { .dark { --a: 2px } }
      body { color: red }
      @font-face { font-family: X; src: url(x.woff2) }
    `)
    expect(sheet.scopes).toEqual([])
    expect(sheet.skipped).toEqual(['.card .title', '@media (prefers-color-scheme: dark) .dark'])
  })
})

describe('mode condition keys', () => {
  test.each([
    [':root[data-theme=dark]', '[data-theme="dark"]'],
    ["[data-theme='dark']", '[data-theme="dark"]'],
    ['@media (prefers-color-scheme:dark)', '@media (prefers-color-scheme: dark)'],
    ['@media  (max-width:640px)', '@media (max-width: 640px)'],
    ['.dark', '.dark']
  ])('%s reads as %s', (condition, key) => {
    expect(modeConditionKey(condition)).toBe(key)
  })
})

describe('variable names from custom properties', () => {
  test.each([
    ['color-gray-50', 'color/gray-50'],
    ['font-weight-bold', 'font-weight/bold'],
    ['radius-md', 'radius/md'],
    ['background', 'background'],
    ['sidebar-primary', 'sidebar-primary']
  ])('%s is %s', (name, expected) => {
    expect(cssNameVariableName(name)).toBe(expected)
  })
})
