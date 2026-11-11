import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

const manifestSchema = v.looseObject({
  name: v.string(),
  publisher: v.string(),
  version: v.string(),
  private: v.boolean(),
  engines: v.object({ vscode: v.string() }),
  main: v.string(),
  files: v.array(v.string()),
  activationEvents: v.array(v.string()),
  contributes: v.looseObject({
    customEditors: v.array(
      v.looseObject({
        viewType: v.string(),
        displayName: v.string(),
        selector: v.array(v.looseObject({ filenamePattern: v.string() })),
        priority: v.string()
      })
    ),
    commands: v.optional(
      v.array(v.looseObject({ command: v.string(), title: v.string(), category: v.optional(v.string()) }))
    ),
    menus: v.optional(
      v.record(
        v.string(),
        v.array(v.looseObject({ command: v.string(), when: v.optional(v.string()), group: v.optional(v.string()) }))
      )
    ),
    configuration: v.looseObject({
      properties: v.record(
        v.string(),
        v.looseObject({ type: v.string(), default: v.string(), scope: v.optional(v.string()) })
      )
    })
  }),
  scripts: v.record(v.string(), v.string()),
  devDependencies: v.record(v.string(), v.string())
})
const versionSchema = v.looseObject({ version: v.string() })

async function readJSON<TSchema extends v.GenericSchema>(path: string, schema: TSchema) {
  const text = await Bun.file(new URL(path, import.meta.url)).text()
  return v.parse(v.pipe(v.string(), v.parseJson(), schema), text)
}

describe('VS Code extension manifest', () => {
  test('is a private extension that loads the built entrypoint', async () => {
    const manifest = await readJSON('../package.json', manifestSchema)
    expect(manifest.name).toBe('pairdraw')
    expect(manifest.publisher).toBe('pairdraw')
    expect(manifest.private).toBe(true)
    expect(manifest.main).toBe('./dist/extension.js')
    expect(manifest.files).toContain('dist')
    expect(manifest.engines.vscode).toMatch(/^\^\d+\.\d+\.\d+$/)
  })

  test('carries the application version', async () => {
    const manifest = await readJSON('../package.json', manifestSchema)
    const app = await readJSON('../../../package.json', versionSchema)
    expect(manifest.version).toBe(app.version)
  })

  test('builds and typechecks from the package scripts', async () => {
    const manifest = await readJSON('../package.json', manifestSchema)
    expect(manifest.scripts.build).toBe('bun build.ts')
    expect(manifest.scripts.typecheck).toBe('bunx tsc --noEmit -p tsconfig.json')
    expect(manifest.devDependencies['@types/vscode']).toBe('1.90.0')
  })

  test('opens .fig as the default editor and .pen as an option beside the text editor', async () => {
    const manifest = await readJSON('../package.json', manifestSchema)
    expect(manifest.activationEvents).toEqual([
      'onCustomEditor:pairdraw.fig',
      'onCustomEditor:pairdraw.pen',
      'onCommand:pairdraw.toggleDesignMode'
    ])
    expect(manifest.contributes.customEditors).toEqual([
      {
        viewType: 'pairdraw.fig',
        displayName: 'Pairdraw Design',
        selector: [{ filenamePattern: '*.fig' }],
        priority: 'default'
      },
      {
        viewType: 'pairdraw.pen',
        displayName: 'Pairdraw Design',
        selector: [{ filenamePattern: '*.pen' }],
        priority: 'option'
      }
    ])
  })

  test('offers the design mode toggle on .pen title bars', async () => {
    const manifest = await readJSON('../package.json', manifestSchema)
    expect(manifest.contributes.commands).toEqual([
      { command: 'pairdraw.toggleDesignMode', title: 'Toggle Design Mode', category: 'Pairdraw' }
    ])
    expect(manifest.contributes.menus?.['editor/title']).toEqual([
      { command: 'pairdraw.toggleDesignMode', when: 'resourceExtname == .pen', group: 'navigation' }
    ])
  })

  test('keeps the editor URL out of workspace settings', async () => {
    const manifest = await readJSON('../package.json', manifestSchema)
    expect(manifest.contributes.configuration.properties['pairdraw.editorUrl']).toMatchObject({
      type: 'string',
      default: 'http://localhost:1420',
      scope: 'application'
    })
  })
})
