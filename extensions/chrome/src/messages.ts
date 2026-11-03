import type * as v from 'valibot'

import type {
  captureRequestSchema,
  captureResponseSchema,
  imageRequestSchema,
  imageResponseSchema
} from './schema'

export type CaptureRequest = v.InferOutput<typeof captureRequestSchema>
export type CaptureResponse = v.InferOutput<typeof captureResponseSchema>
export type ImageRequest = v.InferOutput<typeof imageRequestSchema>
export type ImageResponse = v.InferOutput<typeof imageResponseSchema>

/** The host permission the "include images from other sites" option asks for. */
export const ALL_SITES = { origins: ['<all_urls>'] }
