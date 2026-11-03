/**
 * Builds the unpacked extension into `dist/`, which Chrome loads from chrome://extensions with
 * "Load unpacked". Scripts are bundled as classic scripts, since `executeScript` injects files
 * that are not modules. Icons come from the app's brand artwork, so none are committed here.
 *
 *   bun extensions/chrome/build.ts [outdir]
 */
import { existsSync } from 'node:fs'
import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const extensionDir = import.meta.dir
const outDir = resolve(process.argv[2] ?? join(extensionDir, 'dist'))

/** The repository root: the nearest folder above with the workspace lockfile. */
function repositoryRoot(from: string): string {
  let directory = from
  while (!existsSync(join(directory, 'bun.lock'))) {
    const parent = dirname(directory)
    if (parent === directory) throw new Error('No repository root above the extension')
    directory = parent
  }
  return directory
}

const brandDir = join(repositoryRoot(extensionDir), 'public', 'brand')

await rm(outDir, { recursive: true, force: true })
await mkdir(join(outDir, 'icons'), { recursive: true })

const result = await Bun.build({
  entrypoints: ['popup.ts', 'content.ts', 'worker.ts'].map((file) =>
    join(extensionDir, 'src', file)
  ),
  outdir: outDir,
  target: 'browser',
  format: 'iife',
  minify: true,
  sourcemap: 'linked',
  naming: '[name].[ext]'
})
if (!result.success) {
  for (const log of result.logs) console.error(log)
  throw new Error('Building the extension failed')
}

await Promise.all([
  cp(join(extensionDir, 'manifest.json'), join(outDir, 'manifest.json')),
  cp(join(extensionDir, 'src', 'popup.html'), join(outDir, 'popup.html')),
  cp(join(extensionDir, 'src', 'popup.css'), join(outDir, 'popup.css')),
  cp(join(extensionDir, '_locales'), join(outDir, '_locales'), { recursive: true }),
  cp(join(brandDir, 'favicon-96x96.png'), join(outDir, 'icons', 'icon-96.png')),
  cp(join(brandDir, 'pwa-192.png'), join(outDir, 'icons', 'icon-192.png'))
])

process.stdout.write(`Built the Pairdraw Web Capture extension into ${outDir}\n`)
