import type * as v from 'valibot'

import type { captureResponseSchema, imageResponseSchema } from './schema'

export type CaptureResponse = v.InferOutput<typeof captureResponseSchema>
export type ImageResponse = v.InferOutput<typeof imageResponseSchema>

/** The host permission the "include images from other sites" option asks for. */
export const ALL_SITES = { origins: ['<all_urls>'] }
