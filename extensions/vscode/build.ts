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

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}
