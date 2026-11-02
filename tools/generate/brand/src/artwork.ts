import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { stringToSvg as stringToSVG } from '@realfavicongenerator/generate-favicon'
import type { ImageAdapter } from '@realfavicongenerator/generate-favicon'
import { getNodeImageAdapter } from '@realfavicongenerator/image-adapter-node'

import type { AppArtworkKind, BrandArtwork } from './config.ts'

export async function loadArtwork(root: string, artwork: BrandArtwork) {
  const adapter = await getNodeImageAdapter()
  const main = await readFile(join(root, artwork.masters, 'mark.svg'), 'utf8')
  const micro = await readFile(join(root, artwork.masters, 'mark-micro.svg'), 'utf8')
  return { adapter, main, micro }
}

type ArtworkMode = 'dark' | 'mono' | 'mono-dark' | 'tile'

/** Derive a variant by filling the master's `data-part` elements. */
export function recolor(
  source: string,
  adapter: ImageAdapter,
  artwork: BrandArtwork,
  mode: ArtworkMode
) {
  const svg = stringToSVG(source, adapter)
  if (mode === 'dark') {
    for (const [part, color] of Object.entries(artwork.darkPalette)) {
      for (const path of svg.find(`[data-part="${part}"]`)) path.fill(color)
    }
    if (artwork.darkGridOpacity !== undefined) {
      for (const grid of svg.find('[data-detail="grid"]')) grid.opacity(artwork.darkGridOpacity)
    }
    return svg.svg()
  }
  const color = { mono: artwork.ink, 'mono-dark': artwork.paper, tile: artwork.tileMark }[mode]
  if (color === undefined) return source
  for (const detail of svg.find('[data-detail]')) detail.remove()
  for (const path of svg.find('[data-part]')) path.fill(color)
  return svg.svg()
}

/**
 * Shared app icon: the mark on the artwork's tile, in `tileMark` when it sets one. Touch and
 * maskable variants leave cropping to the platform.
 */
export function appArtwork(
  source: string,
  adapter: ImageAdapter,
  artwork: BrandArtwork,
  kind: AppArtworkKind
) {
  const svg = adapter.createSvg().size(1024, 1024).viewbox(0, 0, 1024, 1024)
  const rounded = kind !== 'web' && kind !== 'maskable'
  const inset = kind === 'desktop' ? artwork.tileInset : 0
  const background = svg
    .rect(1024 - inset * 2, 1024 - inset * 2)
    .move(inset, inset)
    .fill(artwork.background)
  if (rounded) background.radius(artwork.tileRadius)
  const scale = artwork.scales[kind]
  const mark = stringToSVG(recolor(source, adapter, artwork, 'tile'), adapter).size(
    1024 * scale,
    1024 * scale
  )
  mark.move((1024 * (1 - scale)) / 2, (1024 * (1 - scale)) / 2)
  svg.add(mark)
  return svg.svg()
}
