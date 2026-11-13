import * as v from 'valibot'

/** The longest page address a browser node stores. A longer one is not a page address. */
export const BROWSER_NODE_URL_LIMIT = 2000

/** The largest viewport, in pixels, a browser node stores for either side. */
export const BROWSER_NODE_SIZE_LIMIT = 8192

/** The longest preset id a browser node stores. The toolbar's ids are shorter. */
export const BROWSER_NODE_PRESET_LIMIT = 40

/**
 * A stored page address: the canonical `href` of an `http` or `https` URL that has a host.
 * That is the form the browser window's address policy returns. Anything else, including a
 * `file:` address or a host with no scheme, does not decode, so the layer stays an image.
 */
function isStoredPageURL(value: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return (
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.hostname !== '' &&
    url.href === value
  )
}

/** `Date.toISOString()`, so a stored instant is not a sliced or local clock reading. */
function isIsoInstant(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}

const sizeSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1),
  v.maxValue(BROWSER_NODE_SIZE_LIMIT)
)

/**
 * What a browser snapshot node remembers besides its image fill: the page address, the viewport
 * it was shot at, which toolbar preset that size came from, and when it was last refreshed.
 */
export const browserNodeSchema = v.object({
  url: v.pipe(
    v.string(),
    v.minLength(1),
    v.maxLength(BROWSER_NODE_URL_LIMIT),
    v.check(isStoredPageURL)
  ),
  width: sizeSchema,
  height: sizeSchema,
  preset: v.pipe(v.string(), v.minLength(1), v.maxLength(BROWSER_NODE_PRESET_LIMIT)),
  refreshedAt: v.pipe(v.string(), v.check(isIsoInstant))
})

export type BrowserNodeRecord = v.InferOutput<typeof browserNodeSchema>
