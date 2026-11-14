const LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const IMAGE_PROTOCOLS = new Set(['http:', 'https:'])
/** Raster images the canvas decodes; SVG is rasterized by the capturer instead. */
const DATA_IMAGE =
  /^data:image\/(?:png|jpeg|gif|webp|avif|bmp|x-icon|vnd\.microsoft\.icon);base64,/i

function resolve(value: string, base: string | undefined): URL | null {
  try {
    return new URL(value.trim(), base)
  } catch {
    return null
  }
}

/** A link a layer may keep: http, https, or mailto, resolved against the page; never script. */
export function safeLinkURL(value: string, base?: string): string | null {
  const url = resolve(value, base)
  return url && LINK_PROTOCOLS.has(url.protocol) ? url.href : null
}

/** An image source a layer may keep: an inlined raster image, or an http(s) address. */
export function safeImageSource(value: string, base?: string): string | null {
  const trimmed = value.trim()
  if (DATA_IMAGE.test(trimmed)) return trimmed
  const url = resolve(trimmed, base)
  return url && IMAGE_PROTOCOLS.has(url.protocol) ? url.href : null
}
