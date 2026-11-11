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

  test('has no activation event before an editor or command needs one', async () => {
    const manifest = await readJSON('../package.json', manifestSchema)
    expect(manifest.activationEvents).toEqual([])
  })
})
