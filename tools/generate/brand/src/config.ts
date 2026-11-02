import { fileURLToPath } from 'node:url'

import { resolveWorkspaceRoot } from '@open-pencil/package-artifacts-tools/workspace'

export const repositoryRoot = await resolveWorkspaceRoot(fileURLToPath(import.meta.url))
export const targets = ['web', 'docs', 'desktop'] as const
export type BrandTarget = (typeof targets)[number]

/** The compositions an app-icon tile is drawn in. */
export type AppArtworkKind = 'web' | 'maskable' | 'tile' | 'favicon' | 'desktop'

export interface BrandArtwork {
  /** Folder holding the `mark.svg` and `mark-micro.svg` masters. */
  masters: string
  /** The app-icon tile; touch and maskable icons fill with it. */
  background: string
  /** Fills every part of the mark on the tile; without it the tile keeps the master's colors. */
  tileMark?: string
  /** Flat monochrome artwork for light and dark surfaces. */
  ink: string
  paper: string
  /** Dark artwork recolors these `data-part`s; the others keep their color. */
  darkPalette: Readonly<Record<string, string>>
  /** Dark artwork's opacity for a master's `data-detail="grid"`. */
  darkGridOpacity?: number
  tileInset: number
  tileRadius: number
  /** The mark's share of the 1024px canvas, per composition. */
  scales: Readonly<Record<AppArtworkKind, number>>
}

/** Pairdraw, for the app and the native icons. */
export const pairdraw = {
  masters: 'assets/brand',
  /** Pair Orange in both themes. */
  background: '#FF5B2E',
  tileMark: '#FFFFFF',
  ink: '#17171C',
  paper: '#FFFFFF',
  /** Dark artwork lightens the ink parts; the orange anchor keeps its color. */
  darkPalette: { square: '#FFFFFF', curve: '#FFFFFF' },
  tileInset: 64,
  tileRadius: 200,
  scales: {
    web: 0.62,
    tile: 0.62,
    // Larger in favicons, so the square's counter still reads at 16px.
    favicon: 0.7,
    desktop: 0.54,
    // The square's outer corner sits 0.70 of the mark's size from its centre, so this stays
    // below 0.57 to keep the mark inside the 0.4-radius safe circle.
    maskable: 0.54
  }
} as const satisfies BrandArtwork

/** OpenPencil, which the documentation site is still named after, so it keeps this artwork. */
export const openpencil = {
  masters: 'assets/brand/openpencil',
  /** Ivory in both themes; the tile shows the light-palette mark. */
  background: '#F5F5EF',
  ink: '#202B2D',
  paper: '#F5F5EF',
  darkPalette: {
    body: '#55BAAC',
    upper: '#258E83',
    middle: '#86D5C6',
    lower: '#45AFA0',
    point: '#29978A',
    handle: '#438CFF',
    'handle-surface': '#F4FBFA'
  },
  darkGridOpacity: 0.6,
  tileInset: 64,
  tileRadius: 200,
  scales: { web: 0.82, tile: 0.88, favicon: 0.88, desktop: 0.82, maskable: 0.66 }
} as const satisfies BrandArtwork

export function targetArtwork(target: BrandTarget): BrandArtwork {
  return target === 'docs' ? openpencil : pairdraw
}

export const webFiles = [
  'brand/favicon.svg',
  'brand/favicon-96x96.png',
  'favicon.ico',
  'apple-touch-icon.png',
  'brand/app-icon.svg',
  'brand/app-icon-1024.png',
  'brand/mark.svg',
  'brand/mark-dark.svg',
  'brand/mark-micro.svg',
  'brand/mark-micro-dark.svg',
  'brand/mark-mono.svg',
  'brand/mark-mono-dark.svg'
] as const

export const pwaFiles = [
  'brand/pwa-192.png',
  'brand/pwa-512.png',
  'brand/pwa-maskable-512.png'
] as const

export const desktopFiles = [
  '32x32.png',
  '128x128.png',
  '128x128@2x.png',
  'icon.png',
  'icon.icns',
  'icon.ico',
  'Square30x30Logo.png',
  'Square44x44Logo.png',
  'Square71x71Logo.png',
  'Square89x89Logo.png',
  'Square107x107Logo.png',
  'Square142x142Logo.png',
  'Square150x150Logo.png',
  'Square284x284Logo.png',
  'Square310x310Logo.png',
  'StoreLogo.png'
] as const

export function targetDirectory(target: BrandTarget): string {
  switch (target) {
    case 'web':
      return 'public'
    case 'docs':
      return 'packages/docs/public'
    case 'desktop':
      return 'desktop/icons'
  }
}

export function targetFiles(target: BrandTarget): readonly string[] {
  if (target === 'desktop') return desktopFiles
  if (target === 'web') return [...webFiles, ...pwaFiles]
  return webFiles
}
