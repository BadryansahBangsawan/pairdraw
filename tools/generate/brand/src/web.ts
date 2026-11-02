import {
  generateFaviconFiles,
  initFaviconIconSettings,
  stringToSvg as stringToSVG
} from '@realfavicongenerator/generate-favicon'
import sharp from 'sharp'

import { appArtwork, loadArtwork, recolor } from './artwork.ts'
import { targetArtwork } from './config.ts'

export type BrandFiles = Map<string, Buffer>

/** The app's or the documentation's browser assets, each from its own artwork. */
export async function generateWeb(
  root: string,
  target: 'web' | 'docs' = 'web'
): Promise<BrandFiles> {
  const artwork = targetArtwork(target)
  const { adapter, main, micro } = await loadArtwork(root, artwork)
  const darkMicro = recolor(micro, adapter, artwork, 'dark')
  const app = appArtwork(main, adapter, artwork, 'web')
  const tile = appArtwork(main, adapter, artwork, 'tile')
  const favicon = appArtwork(micro, adapter, artwork, 'favicon')
  const maskable = appArtwork(main, adapter, artwork, 'maskable')
  const icon = initFaviconIconSettings()
  icon.desktop.darkIconType = 'specific'
  // Use precomposed tiles with no generator background/clip transforms. This also
  // avoids SVG.js process-global clip IDs leaking into reproducible output.
  icon.touch.icon = stringToSVG(app, adapter)
  icon.webAppManifest.icon = stringToSVG(maskable, adapter)
  const generated = await generateFaviconFiles(
    { icon: stringToSVG(favicon, adapter), darkIcon: stringToSVG(favicon, adapter) },
    { icon, path: '/brand/', skipMetadataInjection: true },
    adapter
  )
  const files: BrandFiles = new Map()
  for (const [name, content] of Object.entries(generated)) {
    // VitePWA owns the application's manifest; the docs are not an installable app.
    if (name === 'site.webmanifest' || name === 'web-app-manifest-192x192.png') continue
    let path = `brand/${name}`
    if (name === 'favicon.ico' || name === 'apple-touch-icon.png') path = name
    if (name === 'web-app-manifest-512x512.png') path = 'brand/pwa-maskable-512.png'
    files.set(
      path,
      content instanceof Blob ? Buffer.from(await content.arrayBuffer()) : Buffer.from(content)
    )
  }
  files.set('brand/app-icon.svg', Buffer.from(tile))
  files.set('brand/app-icon-1024.png', await sharp(Buffer.from(tile)).png().toBuffer())
  files.set('brand/mark.svg', Buffer.from(main))
  files.set('brand/mark-dark.svg', Buffer.from(recolor(main, adapter, artwork, 'dark')))
  files.set('brand/mark-micro.svg', Buffer.from(micro))
  files.set('brand/mark-micro-dark.svg', Buffer.from(darkMicro))
  files.set('brand/mark-mono.svg', Buffer.from(recolor(main, adapter, artwork, 'mono')))
  files.set('brand/mark-mono-dark.svg', Buffer.from(recolor(main, adapter, artwork, 'mono-dark')))
  for (const size of [192, 512]) {
    files.set(
      `brand/pwa-${size}.png`,
      await sharp(Buffer.from(tile)).resize(size, size).png().toBuffer()
    )
  }
  return files
}
