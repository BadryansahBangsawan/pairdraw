import { MAX_CAPTURE_IMAGE_BYTES, MAX_CAPTURE_IMAGES_BYTES } from '#web-capture/limits'
import { fromUint8Array } from 'js-base64'

/**
 * Fetches an image the page itself may not read, such as one from another site without CORS
 * headers. An extension passes one that fetches with its own host permission.
 */
export type CaptureImageFetcher = (url: string) => Promise<Blob | null>

/** The page's window, whose constructors and network the capturer uses. */
export type CaptureWindow = Window & typeof globalThis

export interface ImageInlinerOptions {
  fetchImage?: CaptureImageFetcher
  maxImageBytes?: number
  maxTotalBytes?: number
  signal?: AbortSignal
}

export interface ImageSize {
  width: number
  height: number
}

/** Turns page images into raster data URLs, the only images a capture carries inside it. */
export interface ImageInliner {
  /** The image at `url` as a raster data URL, or null when it cannot be read or is too large. */
  inline(url: string, size?: ImageSize): Promise<string | null>
  /** SVG markup drawn at `size`, as a PNG data URL. */
  rasterizeSVG(markup: string, size: ImageSize): Promise<string | null>
  /** A data URL a page already produced, such as a canvas's, if the budget still allows it. */
  accept(dataURL: string): string | null
}

const RASTER_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/x-icon',
  'image/vnd.microsoft.icon'
])

/** Larger scales add bytes but no detail a design layer can use. */
const MAX_RASTER_SCALE = 2
/** Images fetched at once, so a long page does not flood the network. */
const CONCURRENT_FETCHES = 6

function createLimiter(limit: number) {
  let active = 0
  const waiting: Array<() => void> = []
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= limit) {
      await new Promise<void>((resolve) => {
        waiting.push(resolve)
      })
    }
    active++
    try {
      return await task()
    } finally {
      active--
      waiting.shift()?.()
    }
  }
}

export function createImageInliner(
  view: CaptureWindow,
  options: ImageInlinerOptions = {}
): ImageInliner {
  const maxImageBytes = options.maxImageBytes ?? MAX_CAPTURE_IMAGE_BYTES
  const maxTotalBytes = options.maxTotalBytes ?? MAX_CAPTURE_IMAGES_BYTES
  const cache = new Map<string, Promise<string | null>>()
  const limit = createLimiter(CONCURRENT_FETCHES)
  let totalBytes = 0

  /** Counts an image against the capture's budget; false when it does not fit. */
  function reserve(bytes: number): boolean {
    if (bytes > maxImageBytes || totalBytes + bytes > maxTotalBytes) return false
    totalBytes += bytes
    return true
  }

  function accept(dataURL: string): string | null {
    // Base64 holds three bytes in four characters.
    return reserve(Math.ceil((dataURL.length * 3) / 4)) ? dataURL : null
  }

  async function rasterize(blob: Blob, size?: ImageSize): Promise<string | null> {
    const url = view.URL.createObjectURL(blob)
    try {
      const image = new view.Image()
      image.src = url
      await image.decode()
      const width = size?.width || image.naturalWidth
      const height = size?.height || image.naturalHeight
      if (!width || !height) return null
      const scale = Math.min(view.devicePixelRatio || 1, MAX_RASTER_SCALE)
      const canvas = view.document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const context = canvas.getContext('2d')
      if (!context) return null
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      return accept(canvas.toDataURL('image/png'))
    } catch {
      return null
    } finally {
      view.URL.revokeObjectURL(url)
    }
  }

  async function fromBlob(blob: Blob, size?: ImageSize): Promise<string | null> {
    if (blob.size > maxImageBytes) return null
    const type = blob.type.toLowerCase()
    if (!RASTER_TYPES.has(type)) return rasterize(blob, size)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    if (!reserve(bytes.length)) return null
    return `data:${type};base64,${fromUint8Array(bytes)}`
  }

  async function fetchBlob(url: string): Promise<Blob | null> {
    // Another site's image without CORS headers fails here; the injected fetcher may read it.
    const response = await view
      .fetch(url, { credentials: 'same-origin', signal: options.signal })
      .catch(() => null)
    if (response?.ok) return response.blob()
    if (!options.fetchImage || url.startsWith('data:')) return null
    return options.fetchImage(url).catch(() => null)
  }

  function inline(url: string, size?: ImageSize): Promise<string | null> {
    const key = size ? `${url}#${size.width}x${size.height}` : url
    const cached = cache.get(key)
    if (cached) return cached
    const task = limit(async () => {
      options.signal?.throwIfAborted()
      const blob = await fetchBlob(url)
      return blob ? fromBlob(blob, size) : null
    }).catch(() => null)
    cache.set(key, task)
    return task
  }

  function rasterizeSVG(markup: string, size: ImageSize): Promise<string | null> {
    return rasterize(new view.Blob([markup], { type: 'image/svg+xml' }), size)
  }

  return { inline, rasterizeSVG, accept }
}
