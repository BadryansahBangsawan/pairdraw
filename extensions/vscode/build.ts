/**
 * Builds the extension into `dist/`, which VS Code loads with
 * `code --extensionDevelopmentPath=extensions/vscode` or from a copied extension folder.
 *
 *   bun extensions/vscode/build.ts [outdir]
 */
import { mkdir, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const extensionDir = import.meta.dir
const outDir = resolve(process.argv[2] ?? join(extensionDir, 'dist'))

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

/** The async host: Node, with `vscode` provided by the editor. */
async function buildHost(): Promise<void> {
  const result = await Bun.build({
    entrypoints: [join(extensionDir, 'src', 'extension.ts')],
    outdir: outDir,
    target: 'node',
    format: 'cjs',
    external: ['vscode'],
    minify: false,
    sourcemap: 'linked',
    naming: '[name].js'
  })
  if (!result.success) throw new AggregateError(result.logs, 'The extension host did not build')
}

/** The webview page's script: a browser IIFE, which VS Code loads as a classic script. */
async function buildWebview(): Promise<void> {
  const result = await Bun.build({
    entrypoints: [join(extensionDir, 'src', 'webview', 'main.ts')],
    outdir: outDir,
    target: 'browser',
    format: 'iife',
    minify: false,
    sourcemap: 'linked',
    naming: 'webview.js'
  })
  if (!result.success) throw new AggregateError(result.logs, 'The webview script did not build')
}

try {
  await buildHost()
  await buildWebview()
} catch (error) {
  console.error(error)
  process.exit(1)
}