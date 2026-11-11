import * as v from 'valibot'

import {
  EMBED_DOCUMENT_FORMATS,
  EMBED_IMAGE_FORMATS,
  EMBED_PROTOCOL,
  EMBED_PROTOCOL_VERSION,
  MAX_EMBED_EXPORT_SCALE,
  MAX_EMBED_NODE_IDS,
  MAX_EMBED_REQUEST_ID_LENGTH,
  MIN_EMBED_EXPORT_SCALE
} from './protocol'

/** Node and page IDs are short; anything longer cannot name a layer. */
const MAX_ID_LENGTH = 64
const MAX_NAME_LENGTH = 255

const requestIdSchema = v.union([
  v.pipe(v.string(), v.maxLength(MAX_EMBED_REQUEST_ID_LENGTH)),
  v.pipe(v.number(), v.safeInteger())
])
const graphIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(MAX_ID_LENGTH))
const nodeIdsSchema = v.pipe(v.array(graphIdSchema), v.maxLength(MAX_EMBED_NODE_IDS))
const noParamsSchema = v.optional(v.object({}))

/** The host's answer to `ready`: it carries the port the session runs on. */
export const embedConnectMessageSchema = v.object({
  protocol: v.literal(EMBED_PROTOCOL),
  type: v.literal('connect'),
  version: v.literal(EMBED_PROTOCOL_VERSION),
  /** Asks to edit from the start; granted only when the embed URL allows editing. */
  editable: v.optional(v.boolean(), false)
})
export type EmbedConnectMessage = v.InferOutput<typeof embedConnectMessageSchema>

/** Enough of a request to answer it, even when the rest is malformed. */
export const embedRequestEnvelopeSchema = v.object({
  id: requestIdSchema,
  method: v.pipe(v.string(), v.maxLength(64))
})

export const embedRequestSchema = v.variant('method', [
  v.object({
    id: requestIdSchema,
    method: v.literal('load'),
    params: v.object({
      name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(MAX_NAME_LENGTH)),
      data: v.union([v.instance(Uint8Array), v.instance(ArrayBuffer)])
    })
  }),
  v.object({
    id: requestIdSchema,
    method: v.literal('getDocument'),
    params: v.optional(
      v.object({ format: v.optional(v.picklist(EMBED_DOCUMENT_FORMATS), 'fig') }),
      { format: 'fig' }
    )
  }),
  v.object({ id: requestIdSchema, method: v.literal('getPages'), params: noParamsSchema }),
  v.object({
    id: requestIdSchema,
    method: v.literal('setPage'),
    params: v.object({ pageId: graphIdSchema })
  }),
  v.object({ id: requestIdSchema, method: v.literal('getSelection'), params: noParamsSchema }),
  v.object({
    id: requestIdSchema,
    method: v.literal('select'),
    params: v.object({ nodeIds: nodeIdsSchema })
  }),
  v.object({ id: requestIdSchema, method: v.literal('zoomToFit'), params: noParamsSchema }),
  v.object({
    id: requestIdSchema,
    method: v.literal('exportImage'),
    params: v.optional(
      v.object({
        nodeIds: v.optional(nodeIdsSchema),
        format: v.optional(v.picklist(EMBED_IMAGE_FORMATS), 'PNG'),
        scale: v.optional(
          v.pipe(
            v.number(),
            v.finite(),
            v.minValue(MIN_EMBED_EXPORT_SCALE),
            v.maxValue(MAX_EMBED_EXPORT_SCALE)
          ),
          1
        )
      }),
      {}
    )
  }),
  v.object({
    id: requestIdSchema,
    method: v.literal('setEditable'),
    params: v.object({ editable: v.boolean() })
  })
])
export type EmbedRequest = v.InferOutput<typeof embedRequestSchema>
