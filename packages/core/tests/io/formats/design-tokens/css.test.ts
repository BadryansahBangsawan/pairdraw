import { describe, expect, test } from 'bun:test'

import { tokenStylesheet } from '@open-pencil/dom-css/export'
import { SceneGraph, type Variable } from '@open-pencil/scene-graph'

import {
  countTokenImportChanges,
  defaultTokenImportOptions,
  importTokensIntoGraph,
  patchTokenStylesheet,
  planTokenImport,
  readCSSDesignTokens,
  syncTokenStylesheet,
  type CSSTokenReadOptions
} from '#core/io/formats/design-tokens'

function importCSS(graph: SceneGraph, css: string, options?: CSSTokenReadOptions) {
  const bundle = readCSSDesignTokens(graph, css, options)
  const plan = planTokenImport(graph, bundle, defaultTokenImportOptions(graph, bundle))
  importTokensIntoGraph(graph, graph.getPages()[0].id, plan)
  return { bundle, plan }
}

function variableNamed(graph: SceneGraph, name: string): Variable {
  const found = [...graph.variables.values()].find((variable) => variable.name === name)
  if (!found) throw new Error(`No variable ${name}`)
  return found
}

function collectionNamed(graph: SceneGraph, name: string) {
  const found = [...graph.variableCollections.values()].find((entry) => entry.name === name)
  if (!found) throw new Error(`No collection ${name}`)
  return found
}

function modeId(graph: SceneGraph, collection: string, mode: string): string {
  return collectionNamed(graph, collection).modes.find((entry) => entry.name === mode)?.modeId ?? ''
}

describe('reading custom properties into collections and modes', () => {
  test('a :root set and a .dark set become one collection with a default and a dark mode', () => {
    const graph = new SceneGraph()
    const { bundle } = importCSS(
      graph,
      `
        :root {
          --background: oklch(1 0 0);
          --foreground: #0a0a0a;
          --radius: 0.625rem;
        }
        .dark {
          --background: oklch(0.145 0 0);
          --foreground: #fafafa;
        }
      `
    )
    expect(bundle.collections.map((collection) => collection.name)).toEqual(['Theme'])
    const theme = collectionNamed(graph, 'Theme')
    expect(theme.modes.map((mode) => [mode.name, mode.condition])).toEqual([
      ['Default', undefined],
      ['dark', '.dark']
    ])
    const background = variableNamed(graph, 'background')
    expect(background.type).toBe('COLOR')
    expect(background.codeSyntax).toEqual({ WEB: 'var(--background)' })
    const dark = background.valuesByMode[modeId(graph, 'Theme', 'dark')]
    expect(dark).toMatchObject({ r: expect.closeTo(0.039, 3), a: 1 })
    const radius = variableNamed(graph, 'radius')
    expect(radius.type).toBe('FLOAT')
    expect(radius.unit).toBe('rem')
    expect(radius.valuesByMode[theme.defaultModeId]).toBe(10)
  })

  test('[data-theme] modes keep their attribute; @media modes keep their condition', () => {
    const graph = new SceneGraph()
    importCSS(
      graph,
      `
        :root { --surface: #fff; --gap: 16px }
        [data-theme="dark"] { --surface: #000 }
        @media (max-width: 640px) { :root { --gap: 8px } }
      `
    )
    const theme = collectionNamed(graph, 'Theme')
    expect(theme.modes.map((mode) => [mode.name, mode.condition])).toEqual([
      ['Default', undefined],
      ['dark', undefined],
      ['(max-width: 640px)', '@media (max-width: 640px)']
    ])
    expect(theme.modeAttribute).toBeUndefined()
    const gap = variableNamed(graph, 'gap')
    expect(gap.valuesByMode[modeId(graph, 'Theme', '(max-width: 640px)')]).toBe(8)
    expect(gap.unit).toBe('px')
  })

  test('an attribute other than the collection name is kept as its mode attribute', () => {
    const graph = new SceneGraph()
    importCSS(graph, ':root { --gap: 16px } [data-density="compact"] { --gap: 8px }')
    const density = collectionNamed(graph, 'Density')
    expect(density.modeAttribute).toBeUndefined()
    expect(density.modes.map((mode) => mode.name)).toEqual(['Default', 'compact'])

    const other = new SceneGraph()
    importCSS(other, '/* Spacing: Compact */ [data-density="compact"] { --gap: 8px }')
    const spacing = collectionNamed(other, 'Spacing')
    expect(spacing.modeAttribute).toBe('data-density')
    expect(spacing.modes[1]?.name).toBe('Compact')
    expect(spacing.modes[1]?.condition).toBeUndefined()
  })

  test('values read as the variable types they are written as', () => {
    const graph = new SceneGraph()
    const { plan } = importCSS(
      graph,
      `:root {
        --color-brand: #ff5b2e;
        --spacing-4: 1rem;
        --opacity-muted: 0.5;
        --duration-fast: 150ms;
        --font-sans: "Inter", system-ui, sans-serif;
        --label: "Hello";
        --shadow-card: 0 1px 2px #0000001a;
        --legacy-muted: 220 14% 96%;
      }`
    )
    expect(variableNamed(graph, 'color/brand').type).toBe('COLOR')
    const spacing = variableNamed(graph, 'spacing/4')
    expect([spacing.type, spacing.unit]).toEqual(['FLOAT', 'rem'])
    expect(Object.values(spacing.valuesByMode)).toEqual([16])
    const opacity = variableNamed(graph, 'opacity-muted')
    expect([opacity.unit, Object.values(opacity.valuesByMode)]).toEqual(['none', [0.5]])
    const duration = variableNamed(graph, 'duration-fast')
    expect([duration.unit, Object.values(duration.valuesByMode)]).toEqual(['ms', [150]])
    const font = variableNamed(graph, 'font/sans')
    expect([font.type, Object.values(font.valuesByMode), font.scopes]).toEqual([
      'STRING',
      ['Inter'],
      ['FONT_FAMILY']
    ])
    expect(Object.values(variableNamed(graph, 'label').valuesByMode)).toEqual(['Hello'])
    expect(variableNamed(graph, 'legacy-muted').type).toBe('COLOR')
    expect(plan.skipped).toEqual([
      { name: 'shadow/card', collection: 'Tokens', reason: 'unsupported-type' }
    ])
  })

  test('var() references become aliases, also into other collections and existing variables', () => {
    const graph = new SceneGraph()
    const primitives = graph.createCollection('Primitives')
    const blue = graph.createVariable('Blue/500', 'COLOR', primitives.id, {
      r: 0,
      g: 0.4,
      b: 0.8,
      a: 1
    })
    importCSS(
      graph,
      `
        :root { --primary: var(--color-blue-500); --ring: var(--primary) }
        .dark { --primary: var(--accent); --accent: #fff }
      `
    )
    const theme = collectionNamed(graph, 'Theme')
    const primary = variableNamed(graph, 'primary')
    const accent = variableNamed(graph, 'accent')
    expect(primary.collectionId).toBe(theme.id)
    expect(primary.valuesByMode[theme.defaultModeId]).toEqual({ aliasId: blue.id })
    expect(primary.valuesByMode[modeId(graph, 'Theme', 'dark')]).toEqual({ aliasId: accent.id })
    expect(variableNamed(graph, 'ring').valuesByMode[theme.defaultModeId]).toEqual({
      aliasId: primary.id
    })
  })

  test('numeric expressions keep their CSS with the number a CSS engine computes', () => {
    const graph = new SceneGraph()
    importCSS(graph, ':root { --space: 8px; --gutter: clamp(1rem, 4vw, 2rem) }', {
      resolveExpression: (css, unit, tokens) => {
        expect([css, unit, tokens.get('--space')]).toEqual(['clamp(1rem, 4vw, 2rem)', 'rem', '8px'])
        return 24
      }
    })
    const gutter = variableNamed(graph, 'gutter')
    const [modeKey] = Object.keys(gutter.valuesByMode)
    expect(gutter.valuesByMode[modeKey]).toBe(24)
    expect(gutter.unit).toBe('rem')
    expect(gutter.expressions?.[modeKey]).toEqual({ css: 'clamp(1rem, 4vw, 2rem)', resolved: 24 })
  })

  test('without an engine, a new expression is skipped', () => {
    const graph = new SceneGraph()
    const { plan } = importCSS(graph, ':root { --gutter: clamp(1rem, 4vw, 2rem) }')
    expect(plan.skipped).toEqual([
      { name: 'gutter', collection: 'Tokens', reason: 'invalid-value' }
    ])
  })

  test('rules that switch no mode are reported, as are modes that change another collection', () => {
    const graph = new SceneGraph()
    const bundle = readCSSDesignTokens(
      graph,
      `
        :root { --a: 1px; --b: 2px }
        [data-theme="dark"] { --a: 2px }
        [data-density="compact"] { --a: 3px; --b: 1px }
        .card .title { --c: 4px }
      `,
      { file: 'globals.css' }
    )
    expect(bundle.issues).toEqual([
      { kind: 'unsupported-css', file: 'globals.css', rule: '.card .title' },
      {
        kind: 'foreign-css-override',
        file: 'globals.css',
        rule: '[data-density="compact"]',
        property: '--a',
        collection: 'Theme'
      }
    ])
  })

  test('a mode inherits every base value its block leaves out, aliases included', () => {
    const graph = new SceneGraph()
    importCSS(
      graph,
      `
        :root { --a: 1px; --b: red; --background: #fff }
        @theme inline { --color-background: var(--background) }
        .dark { --b: blue; --background: #000 }
      `
    )
    const dark = modeId(graph, 'Theme', 'dark')
    expect(variableNamed(graph, 'a').valuesByMode[dark]).toBe(1)
    expect(variableNamed(graph, 'b').valuesByMode[dark]).toEqual({ r: 0, g: 0, b: 1, a: 1 })
    const background = variableNamed(graph, 'background')
    expect(variableNamed(graph, 'color/background').valuesByMode[dark]).toEqual({
      aliasId: background.id
    })
  })

  test('an ordinary comment above a mode does not name its collection', () => {
    const graph = new SceneGraph()
    const { bundle } = importCSS(
      graph,
      ':root { --a: #fff } /* TODO: fix later */ .dark { --a: #000 }'
    )
    expect(bundle.collections.map((collection) => collection.name)).toEqual(['Theme'])
    expect(collectionNamed(graph, 'Theme').modes.map((mode) => mode.name)).toEqual([
      'Default',
      'dark'
    ])
  })
})

/** A theme as a designer builds it, which the stylesheet round-trips through. */
function themedDocument() {
  const graph = new SceneGraph()
  const primitives = graph.createCollection('Primitives')
  const blue = graph.createVariable('Blue/500', 'COLOR', primitives.id, {
    r: 0,
    g: 0.4,
    b: 0.8,
    a: 1
  })
  const theme = graph.createCollection('Theme')
  graph.renameMode(theme.id, theme.defaultModeId, 'Light')
  const dark = graph.createMode(theme.id, 'Dark') ?? ''
  const narrow = graph.createMode(theme.id, 'Narrow') ?? ''
  const narrowMode = theme.modes.find((mode) => mode.modeId === narrow)
  if (narrowMode) narrowMode.condition = '@media (max-width: 640px)'
  const accent = graph.createVariable('Accent', 'COLOR', theme.id, { aliasId: blue.id })
  accent.valuesByMode[dark] = { r: 1, g: 1, b: 1, a: 1 }
  const space = graph.createVariable('Space/Gutter', 'FLOAT', theme.id, 24)
  space.unit = 'rem'
  space.valuesByMode[narrow] = 16
  return { graph, theme, accent, space, dark, narrow }
}

describe('round trips through the token stylesheet', () => {
  test('an exported stylesheet imports back onto the same variables and modes, changing nothing', async () => {
    const { graph } = themedDocument()
    const { css } = await tokenStylesheet(graph, { format: 'css' })
    const bundle = readCSSDesignTokens(graph, css)
    const options = defaultTokenImportOptions(graph, bundle)
    expect(options.collections.map((choice) => choice.target.kind)).toEqual([
      'existing',
      'existing'
    ])
    const plan = planTokenImport(graph, bundle, options)
    expect(plan.counts).toMatchObject({ added: 0, skipped: 0 })
    expect(countTokenImportChanges(graph, plan)).toBe(0)
  })

  test('an exported stylesheet imports into a new document with the same values in every mode', async () => {
    const { graph } = themedDocument()
    const { css } = await tokenStylesheet(graph, { format: 'css' })
    const fresh = new SceneGraph()
    importCSS(fresh, css)
    const gutter = variableNamed(fresh, 'spacing/gutter')
    const theme = collectionNamed(fresh, 'Theme')
    expect(theme.modes.map((mode) => mode.name)).toEqual(['Default', 'Dark', 'Narrow'])
    expect(theme.modes.map((mode) => gutter.valuesByMode[mode.modeId])).toEqual([24, 24, 16])
    const blue = variableNamed(fresh, 'color/blue-500')
    const accent = variableNamed(fresh, 'color/accent')
    expect(theme.modes.map((mode) => accent.valuesByMode[mode.modeId])).toEqual([
      { aliasId: blue.id },
      { r: 1, g: 1, b: 1, a: 1 },
      { aliasId: blue.id }
    ])
    expect(await syncTokenStylesheet(fresh, css)).toMatchObject({ css, updated: 0, added: 0 })
  })

  test('a changed CSS expression counts as a change where it comes to the same number', () => {
    const graph = new SceneGraph()
    const resolveExpression = () => 24
    importCSS(graph, ':root { --gap: clamp(1rem, 4vw, 1.5rem) }', { resolveExpression })
    const edited = ':root { --gap: clamp(1rem, 5vw, 1.5rem) }'
    const bundle = readCSSDesignTokens(graph, edited, { resolveExpression })
    const plan = planTokenImport(graph, bundle, defaultTokenImportOptions(graph, bundle))
    expect(countTokenImportChanges(graph, plan)).toBe(1)
    importTokensIntoGraph(graph, graph.getPages()[0].id, plan)
    const gap = variableNamed(graph, 'gap')
    expect(Object.values(gap.expressions ?? {}).map((expression) => expression.css)).toEqual([
      'clamp(1rem, 5vw, 1.5rem)'
    ])
  })

  test('a changed value in the stylesheet updates its variable in that mode', async () => {
    const { graph, accent, dark } = themedDocument()
    const { css } = await tokenStylesheet(graph, { format: 'css' })
    const edited = css.replace('--color-accent: #FFFFFF', '--color-accent: #ff0000')
    expect(edited).not.toBe(css)
    const bundle = readCSSDesignTokens(graph, edited)
    const plan = planTokenImport(graph, bundle, defaultTokenImportOptions(graph, bundle))
    expect(countTokenImportChanges(graph, plan)).toBe(1)
    importTokensIntoGraph(graph, graph.getPages()[0].id, plan)
    expect(accent.valuesByMode[dark]).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  })
})

describe('writing variables into a stylesheet', () => {
  test('changed values are rewritten in place in their notation, the rest stays as written', async () => {
    const { graph, accent, dark, space } = themedDocument()
    const source = [
      '/* Brand tokens */',
      '@layer base {',
      '  :root {',
      '    --color-blue-500: oklch(0.55 0.17 252);',
      '    --color-accent: var(--color-blue-500);',
      '    --spacing-gutter: 1.5rem; /* page edges */',
      '    --unrelated: 3px;',
      '  }',
      '  [data-theme="dark"] {',
      '    --color-accent: #ffffff;',
      '  }',
      '}',
      ''
    ].join('\n')
    accent.valuesByMode[dark] = { r: 1, g: 0, b: 0, a: 1 }
    space.valuesByMode[graph.variableCollections.get(space.collectionId)?.defaultModeId ?? ''] = 32
    const result = await syncTokenStylesheet(graph, source)
    expect(result.updated).toBe(3)
    expect(result.css).toContain('--color-blue-500: oklch(')
    expect(result.css).not.toContain('oklch(0.55 0.17 252)')
    expect(result.css).toContain('--spacing-gutter: 2rem; /* page edges */')
    expect(result.css).toContain('--color-accent: #ff0000;')
    expect(result.css).toContain('--unrelated: 3px;')
    expect(result.css.startsWith('/* Brand tokens */\n@layer base {')).toBe(true)
  })

  test('a stylesheet already in sync is left byte for byte', async () => {
    const { graph } = themedDocument()
    const { css } = await tokenStylesheet(graph, { format: 'css' })
    const once = await syncTokenStylesheet(graph, css)
    expect(once).toMatchObject({ css, updated: 0, added: 0 })
  })

  test('a stylesheet imported into a new document pushes back unchanged', async () => {
    const sheets = [
      ':root {\n  --brand: #ff5b2e;\n  --gap: 1rem;\n}\n.dark {\n  --brand: #ffffff;\n}\n',
      [
        ':root {',
        '  --radius: 0.625rem;',
        '  --background: oklch(1 0 0);',
        '  --primary: oklch(0.205 0 0);',
        '  --chart-1: oklch(0.646 0.222 41.116);',
        '}',
        '.dark {',
        '  --background: oklch(0.145 0 0);',
        '  --primary: oklch(0.922 0 0);',
        '}',
        '@theme inline {',
        '  --color-background: var(--background);',
        '  --color-primary: var(--primary);',
        '}',
        ''
      ].join('\n')
    ]
    for (const source of sheets) {
      const graph = new SceneGraph()
      importCSS(graph, source)
      expect(await syncTokenStylesheet(graph, source)).toMatchObject({
        css: source,
        updated: 0,
        added: 0
      })
    }
  })

  test('a mode block does not get a declaration it already inherits from the base set', () => {
    const { graph } = themedDocument()
    const generated = ':root {\n  --gap: 16px;\n}\n.dark {\n  --gap: 1rem;\n}\n'
    const source = ':root {\n  --gap: 1rem;\n}\n.dark {\n  --brand: #fff;\n}\n'
    expect(patchTokenStylesheet(graph, source, generated)).toMatchObject({
      css: source,
      updated: 0,
      added: 0
    })
  })

  test('missing variables are added to their scope, or in a new block when it has none', () => {
    const { graph } = themedDocument()
    const generated = [
      ':root {',
      '  --color-accent: #0066cc;',
      '  --spacing-gutter: 1.5rem;',
      '}',
      '',
      '/* Theme: Dark */',
      '[data-theme="dark"] {',
      '  --color-accent: #ffffff;',
      '}',
      ''
    ].join('\n')
    const result = patchTokenStylesheet(graph, ':root {\n  --color-accent: #0066cc\n}\n', generated)
    expect(result).toMatchObject({ updated: 0, added: 2 })
    expect(result.css).toBe(
      [
        ':root {',
        '  --color-accent: #0066cc;',
        '  --spacing-gutter: 1.5rem;',
        '}',
        '',
        '/* Theme: Dark */',
        '[data-theme="dark"] {',
        '  --color-accent: #ffffff;',
        '}',
        ''
      ].join('\n')
    )
  })

  test('a mode that matches its default again is written with the default value', () => {
    const { graph, narrow, space } = themedDocument()
    space.valuesByMode[narrow] = 24
    const generated = ':root {\n  --spacing-gutter: 1.5rem;\n}\n'
    const source = [
      ':root { --spacing-gutter: 1.5rem; }',
      '@media (max-width: 640px) {',
      '  :root { --spacing-gutter: 1rem; }',
      '}',
      ''
    ].join('\n')
    expect(patchTokenStylesheet(graph, source, generated).css).toBe(
      source.replace('1rem', '1.5rem')
    )
  })
})
