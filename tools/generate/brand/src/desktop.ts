import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'

import { appArtwork, loadArtwork, markLayer } from './artwork.ts'
import { desktopFiles, pairdraw } from './config.ts'
import { canonicalIcns } from './validate.ts'
import type { BrandFiles } from './web.ts'

/** `#RRGGBB` as an Icon Composer color. */
function iconColor(hex: string): string {
  const channels = [1, 3, 5].map((offset) =>
    (Number.parseInt(hex.slice(offset, offset + 2), 16) / 255).toFixed(5)
  )
  return `srgb:${channels.join(',')},1.00000`
}

/**
 * Icon Composer manifest for macOS 26. Without a dark appearance of its own, the system segments
 * the ICNS and swaps its flat orange tile for a dark one; this keeps the tile and the white mark
 * in the default and dark appearances. Earlier macOS versions read `icon.icns`.
 *
 * Every field matches what real Icon Composer files ship: a plain `fill` with an appearance
 * specialization, one flat bitmap layer, a `neutral` shadow, and no glass or translucency.
 * Xcode 26's actool crashed on the first attempt's `shadow.kind: "none"` — a value no exported
 * Icon Composer file uses — so the shadow stays neutral at opacity 0, which draws nothing.
 */
function iconComposerManifest(artwork: typeof pairdraw): string {
  const fill = { solid: iconColor(artwork.background) }
  return `${JSON.stringify(
    {
      fill,
      'fill-specializations': [{ appearance: 'dark', value: fill }],
      groups: [
        {
          layers: [
            {
              fill: { solid: iconColor(artwork.tileMark) },
              glass: false,
              'image-name': 'mark.png',
              name: 'mark'
            }
          ],
          shadow: { kind: 'neutral', opacity: 0 },
          translucency: { enabled: false, value: 0.5 }
        }
      ],
      'supported-platforms': { squares: ['macOS'] }
    },
    null,
    2
  )}\n`
}

export async function generateDesktop(root: string): Promise<BrandFiles> {
  const directory = await mkdtemp(join(tmpdir(), 'pairdraw-icons-'))
  try {
    const { adapter, main } = await loadArtwork(root, pairdraw)
    const source = join(directory, 'app.svg')
    await writeFile(source, appArtwork(main, adapter, pairdraw, 'desktop'))
    // Direct native CLI API: no shell, package download, recursive npm script, or Rust build.
    const { run } = await import('@tauri-apps/cli')
    await run(['icon', source, '--output', join(directory, 'icons')], 'tauri')
    const files: BrandFiles = new Map()
    for (const name of desktopFiles) {
      // Tauri writes no Icon Composer icon; it is composed below.
      if (name.startsWith('icon.icon/')) continue
      const bytes = await readFile(join(directory, 'icons', name))
      files.set(name, name.endsWith('.icns') ? canonicalIcns(bytes) : bytes)
    }
    files.set('icon.icon/icon.json', Buffer.from(iconComposerManifest(pairdraw)))
    // A bitmap layer: Icon Composer reads only part of SVG, and 1024px is 1024pt at scale 1.
    const layer = Buffer.from(markLayer(main, adapter, pairdraw))
    files.set('icon.icon/Assets/mark.png', await sharp(layer).png().toBuffer())
    return files
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
