import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  importDesignSystemFolder,
  readDesignSystemFolder
} from '@open-pencil/core/node/design-system'
import { SceneGraph, type Variable } from '@open-pencil/scene-graph'

import {
  DESIGN_SYSTEM_MAX_FILE_BYTES,
  DESIGN_SYSTEM_MAX_FILES,
  DESIGN_SYSTEM_MAX_TOTAL_BYTES,
  importDesignSystemFiles
} from '#core/io/formats/design-tokens'

async function project(files: Record<string, string | Uint8Array>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'open-pencil-design-system-'))
  for (const [path, text] of Object.entries(files)) {
    const full = join(root, path)
    await mkdir(join(full, '..'), { recursive: true })
    await writeFile(full, text)
  }
  return root
}

function variableNamed(graph: SceneGraph, name: string): Variable | undefined {
  return [...graph.variables.values()].find((variable) => variable.name === name)
}

function collectionNamed(graph: SceneGraph, name: string) {
  return [...graph.variableCollections.values()].find((collection) => collection.name === name)
}

describe('importing a project folder as variables', () => {
  test('reads a Tailwind v4 theme and reports a value it cannot use', async () => {
    const root = await project({
      'src/app.css': `
        @theme {
          --color-brand: #2947ff;
          --spacing-md: 1rem;
          --font-sans: "Inter", ui-sans-serif, system-ui;
          --unsupported: hamburger;
        }
      `,
      'tailwind.config.ts': 'export default { theme: { colors: { onlyInConfig: "#000" } } }\n'
    })
    const graph = new SceneGraph()

    const result = await importDesignSystemFolder(graph, root)

    expect(result.issues).toContainEqual({
      kind: 'unsupported-config',
      path: 'tailwind.config.ts'
    })
    expect(result.issues).toContainEqual(
      expect.objectContaining({ kind: 'unsupported-value', name: 'unsupported' })
    )
    expect(variableNamed(graph, 'color/brand')?.type).toBe('COLOR')
    expect(variableNamed(graph, 'spacing/md')).toMatchObject({ type: 'FLOAT', unit: 'rem' })
    expect(variableNamed(graph, 'font/sans')).toMatchObject({
      type: 'STRING',
      scopes: ['FONT_FAMILY']
    })
    expect(variableNamed(graph, 'unsupported')).toBeUndefined()
    expect(variableNamed(graph, 'onlyInConfig')).toBeUndefined()
    expect(collectionNamed(graph, 'Tokens')?.modes.map((mode) => mode.name)).toEqual(['Default'])
  })

  test('reads shadcn light and dark custom properties as one collection', async () => {
    const root = await project({
      'components.json': JSON.stringify({
        style: 'new-york',
        tailwind: { css: 'src/app/globals.css', config: 'tailwind.config.js' },
        aliases: { ui: '@/components/ui' }
      }),
      'src/app/globals.css': `
        :root { --background: #ffffff; --radius: 0.5rem; }
        .dark { --background: #111111; }
      `,
      'src/other.css': ':root { --extra: #abc; }\n',
      'components/ui/button.tsx': 'export const Button = () => null\n'
    })
    const graph = new SceneGraph()

    const result = await importDesignSystemFolder(graph, root)
    const theme = collectionNamed(graph, 'Theme')

    expect(theme?.modes.map((mode) => [mode.name, mode.condition])).toEqual([
      ['Light', undefined],
      ['Dark', '.dark']
    ])
    expect(variableNamed(graph, 'background')?.type).toBe('COLOR')
    expect(variableNamed(graph, 'radius')).toMatchObject({ type: 'FLOAT', unit: 'rem' })
    expect(variableNamed(graph, 'extra')).toBeUndefined()
    expect(result.issues).toContainEqual({
      kind: 'unsupported-config',
      path: 'tailwind.config.js'
    })
    expect(result.issues).toContainEqual({
      kind: 'components-not-imported',
      path: 'components.json'
    })
  })

  test('keeps importing stylesheets when components.json is malformed', async () => {
    const root = await project({
      'components.json': '{ "tailwind": ',
      'src/theme.css': ':root { --brand: #2947ff; }\n'
    })
    const graph = new SceneGraph()

    const result = await importDesignSystemFolder(graph, root)

    expect(result.issues).toContainEqual({ kind: 'invalid-manifest', path: 'components.json' })
    expect(variableNamed(graph, 'brand')?.type).toBe('COLOR')
    expect(result.issues).toContainEqual({
      kind: 'components-not-imported',
      path: 'components.json'
    })
  })

  test('does not read a stylesheet a symlink points at outside the folder', async () => {
    const root = await project({ 'src/theme.css': ':root { --brand: #2947ff; }\n' })
    const outside = await mkdtemp(join(tmpdir(), 'open-pencil-design-system-outside-'))
    await writeFile(join(outside, 'secret.css'), ':root { --secret: #fff; }\n')
    await symlink(join(outside, 'secret.css'), join(root, 'secret.css'))
    await symlink(root, join(root, 'loop'))
    const graph = new SceneGraph()

    const result = await importDesignSystemFolder(graph, root)

    expect(result.issues).toContainEqual({ kind: 'escaped-path', path: 'secret.css' })
    expect(variableNamed(graph, 'secret')).toBeUndefined()
    expect(variableNamed(graph, 'brand')?.type).toBe('COLOR')
  })

  test('does not read a file past the size cap', async () => {
    const bytes = new Uint8Array(1_048_577)
    bytes.set(new TextEncoder().encode(':root { --huge: #fff; }\n'))
    const root = await project({ 'src/huge.css': bytes })
    const graph = new SceneGraph()

    const result = await importDesignSystemFolder(graph, root)

    expect(result.issues).toContainEqual({ kind: 'file-too-large', path: 'src/huge.css' })
    expect(variableNamed(graph, 'huge')).toBeUndefined()
  })

  test('stops after the file-count cap and reports the file that crosses it', async () => {
    const files: Record<string, string> = {}
    for (let index = 0; index < DESIGN_SYSTEM_MAX_FILES + 1; index += 1) {
      files[`src/token-${index}.css`] = ':root { --n: 1; }\n'
    }
    const root = await project(files)

    const folder = await readDesignSystemFolder(root)

    expect(folder.issues.filter((issue) => issue.kind === 'too-many-files')).toHaveLength(1)
    expect(folder.files).toHaveLength(DESIGN_SYSTEM_MAX_FILES)
  })

  test('stops after the total byte cap and reports the file that crosses it', async () => {
    const files: Record<string, Uint8Array> = {}
    const count = Math.floor(DESIGN_SYSTEM_MAX_TOTAL_BYTES / DESIGN_SYSTEM_MAX_FILE_BYTES) + 1
    for (let index = 0; index < count; index += 1) {
      files[`src/chunk-${index}.css`] = new Uint8Array(DESIGN_SYSTEM_MAX_FILE_BYTES)
    }
    const root = await project(files)

    const folder = await readDesignSystemFolder(root)

    expect(folder.issues.filter((issue) => issue.kind === 'total-too-large')).toHaveLength(1)
    expect(folder.issues.some((issue) => issue.kind === 'too-many-files')).toBe(false)
    expect(folder.files).toHaveLength(count - 1)
  })

  test('refuses a source path that leaves the folder', () => {
    const graph = new SceneGraph()

    const result = importDesignSystemFiles(graph, {
      files: [{ path: '../secret.css', text: ':root { --secret: #fff; }\n' }],
      issues: []
    })

    expect(result.issues).toContainEqual({ kind: 'escaped-path', path: '../secret.css' })
    expect(variableNamed(graph, 'secret')).toBeUndefined()
  })
})
