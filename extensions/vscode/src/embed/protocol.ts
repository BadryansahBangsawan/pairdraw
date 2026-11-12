import * as v from 'valibot'

/**
 * The host side of the editor's embed protocol. The app owns the canonical definition
 * (`src/app/embed/protocol.ts`); the extension restates only what it sends and accepts, so a
 * protocol change fails the bridge tests instead of silently reaching the editor.
 */
export const EMBED_PROTOCOL = 'openpencil-embed'
export const EMBED_PROTOCOL_VERSION = 1

export const embedReadySchema = v.object({
  protocol: v.literal(EMBED_PROTOCOL),
  type: v.literal('ready'),
  version: v.literal(EMBED_PROTOCOL_VERSION)
})

export type EmbedReady = v.InferOutput<typeof embedReadySchema>

const requestIdSchema = v.union([v.string(), v.number()])

export const embedResponseSchema = v.variant('ok', [
  v.object({ id: requestIdSchema, ok: v.literal(true), result: v.unknown() }),
  v.object({
    id: requestIdSchema,
    ok: v.literal(false),
    error: v.object({ code: v.string(), message: v.string() })
  })
])

export type EmbedResponse = v.InferOutput<typeof embedResponseSchema>

export const EMBED_EVENT_NAMES = [
  'connected',
  'documentload',
  'documentchange',
  'selectionchange',
  'pagechange',
  'editablechange'
] as const

export const embedEventSchema = v.object({
  event: v.picklist(EMBED_EVENT_NAMES),
  data: v.unknown()
})

export type EmbedEvent = v.InferOutput<typeof embedEventSchema>

export const embedConnectedSchema = v.object({
  version: v.literal(EMBED_PROTOCOL_VERSION),
  editable: v.boolean(),
  allowEdit: v.boolean()
})

export const embedLoadResultSchema = v.object({ name: v.string() })

/** The formats `getDocument` can write; `fig` is the archive, `pen` the JSON text. */
export const EMBED_DOCUMENT_FORMATS = ['fig', 'pen'] as const
export type EmbedDocumentFormat = (typeof EMBED_DOCUMENT_FORMATS)[number]

export const embedDocumentSchema = v.object({
  name: v.string(),
  data: v.union([v.instance(Uint8Array), v.instance(ArrayBuffer)])
})

export type EmbedDocument = v.InferOutput<typeof embedDocumentSchema>

/** The image formats `exportImage` rasterizes; the app owns the canonical list. */
export const EMBED_IMAGE_FORMATS = ['PNG', 'JPG', 'WEBP'] as const
export type EmbedImageFormat = (typeof EMBED_IMAGE_FORMATS)[number]

export const embedImageSchema = v.object({
  data: v.union([v.instance(Uint8Array), v.instance(ArrayBuffer)]),
  mimeType: v.string()
})

export type EmbedImage = v.InferOutput<typeof embedImageSchema>
