import type { RemoteFontSource, ResolveFontResult } from 'unifont'

import type { WebFontFaceAsset, WebFontFaceRequest } from '@open-pencil/dom-css/export'
import { faceLoadKey } from '@open-pencil/scene-graph/font-style'

import { documentFontData } from '#core/text/font/document'
import {
  createProviderUnifont,
  isRemoteFontSource,
  type WebFontResolveOptions
} from '#core/text/web-font/providers'
import {
  WEB_FONT_PROVIDER_IDS,
  type WebFontFetch,
  type WebFontProviderId
} from '#core/text/web-font/resolver'

/**
 * A document font's file extension and `@font-face` format, read from its signature: TrueType,
 * OpenType, WOFF, or WOFF2. Null for bytes no document font holds, which registration rejects.
 */
function documentFontFile(
  data: Uint8Array
): { extension: string; format: WebFontFaceAsset['format'] } | null {
  if (data.byteLength < 4) return null
  const signature = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3]
  switch (signature) {
    case 0x00010000:
    case 0x74727565:
      return { extension: 'ttf', format: 'truetype' }
    case 0x4f54544f:
      return { extension: 'otf', format: 'opentype' }
    case 0x774f4646:
      return { extension: 'woff', format: 'woff' }
    case 0x774f4632:
      return { extension: 'woff2', format: 'woff2' }
    default:
      return null
  }
}

/**
 * A document font's file as an export asset, when the document carries the requested face: the
 * bytes it was registered from, rather than a provider's download. A request names a weight, so
 * the face is looked up by the style key that weight loads as.
 */
function documentFontAsset(
  request: WebFontFaceRequest,
  assetBasePath: string
): WebFontFaceAsset | null {
  const family = request.family
  const style = faceLoadKey(request.weight, request.style === 'italic')
  const data = documentFontData(family, style)
  if (!data) return null
  const file = documentFontFile(data)
  if (!file) return null
  const requestStyle = request.style ?? 'normal'
  return {
    family,
    weight: request.weight,
    style: requestStyle,
    format: file.format,
    path: `${assetBasePath}/${slugFontFamily(family)}-${request.weight}-${requestStyle}.${file.extension}`,
    content: data
  }
}
export interface ExportWebFontFaceAssetsOptions {
  fonts: WebFontFaceRequest[]
  providers?: WebFontProviderId[]
  assetBasePath?: string
  fetcher?: WebFontFetch
}

export interface ExportWebFontFaceAssetsResult {
  assets: WebFontFaceAsset[]
}

function fontAssetExtension(source: RemoteFontSource): string {
  if (source.format === 'woff2') return 'woff2'
  if (source.format === 'woff') return 'woff'
  if (source.format === 'opentype' || source.format === 'otf') return 'otf'
  return 'ttf'
}

function fontAssetFormat(source: RemoteFontSource): WebFontFaceAsset['format'] {
  if (source.format === 'woff2') return 'woff2'
  if (source.format === 'woff') return 'woff'
  if (source.format === 'opentype' || source.format === 'otf') return 'opentype'
  return 'truetype'
}

function slugFontFamily(family: string): string {
  let slug = ''
  let previousDash = false
  for (const char of family.toLowerCase()) {
    const code = char.charCodeAt(0)
    const isAlpha = code >= 97 && code <= 122
    const isDigit = code >= 48 && code <= 57
    if (isAlpha || isDigit) {
      slug += char
      previousDash = false
      continue
    }
    if (slug.length > 0 && !previousDash) {
      slug += '-'
      previousDash = true
    }
  }
  return slug.endsWith('-') ? slug.slice(0, -1) : slug
}

async function resolveRemoteFontSource(
  family: string,
  request: WebFontFaceRequest,
  provider: WebFontProviderId
): Promise<{ source: RemoteFontSource; face: ResolveFontResult['fonts'][number] } | undefined> {
  const unifont = await createProviderUnifont(provider)
  const options = {
    weights: [String(request.weight)],
    styles: [request.style ?? 'normal'],
    formats: ['woff2', 'woff', 'ttf'],
    subsets: ['latin']
  } satisfies WebFontResolveOptions
  const result = await unifont.resolveFont(family, options)
  for (const face of result.fonts.toSorted(
    (a, b) => (a.meta?.priority ?? 0) - (b.meta?.priority ?? 0)
  )) {
    const source = face.src.find(isRemoteFontSource)
    if (source) return { source, face }
  }
  return undefined
}

export async function exportWebFontFaceAssets({
  fonts,
  providers = WEB_FONT_PROVIDER_IDS.slice(),
  assetBasePath = 'assets/fonts',
  fetcher = fetch
}: ExportWebFontFaceAssetsOptions): Promise<ExportWebFontFaceAssetsResult> {
  const assets: WebFontFaceAsset[] = []
  const seen = new Set<string>()

  for (const request of fonts) {
    const family = request.family
    const requestStyle = request.style ?? 'normal'
    const key = `${family}|${request.weight}|${requestStyle}`
    if (seen.has(key)) continue
    seen.add(key)
    const docFont = documentFontAsset(request, assetBasePath)
    if (docFont) {
      assets.push(docFont)
      continue
    }

    for (const provider of providers) {
      try {
        const resolved = await resolveRemoteFontSource(family, request, provider)
        if (!resolved) continue
        const response = await fetcher(resolved.source.url, resolved.face.meta?.init)
        if (!response.ok) continue
        const extension = fontAssetExtension(resolved.source)
        const path = `${assetBasePath}/${slugFontFamily(family)}-${request.weight}-${requestStyle}.${extension}`
        assets.push({
          family,
          weight: resolved.face.weight ?? request.weight,
          style: resolved.face.style ?? requestStyle,
          display: resolved.face.display,
          stretch: resolved.face.stretch,
          unicodeRange: resolved.face.unicodeRange,
          format: fontAssetFormat(resolved.source),
          path,
          content: new Uint8Array(await response.arrayBuffer())
        })
        break
      } catch (error) {
        console.warn(`Failed to export ${family} from ${provider} fonts`, error)
      }
    }
  }

  return { assets }
}
