import * as v from 'valibot'

/** What the popup asks the capture script in the page to do. */
export const captureRequestSchema = v.variant('type', [
  v.object({ type: v.literal('capture-page'), images: v.boolean() }),
  v.object({ type: v.literal('pick-element'), images: v.boolean() })
])

/** The clipboard payload of a page capture, or why it failed. */
export const captureResponseSchema = v.variant('ok', [
  v.object({ ok: v.literal(true), html: v.string(), text: v.string() }),
  v.object({ ok: v.literal(false), error: v.string() })
])

/** The capture script asking the service worker for an image the page may not read. */
export const imageRequestSchema = v.object({
  type: v.literal('fetch-image'),
  url: v.pipe(v.string(), v.url())
})

export const imageResponseSchema = v.variant('ok', [
  v.object({ ok: v.literal(true), dataURL: v.pipe(v.string(), v.startsWith('data:image/')) }),
  v.object({ ok: v.literal(false) })
])
