import type * as v from 'valibot'

import type { webCaptureFontSchema, webCaptureSchema, webCaptureViewportSchema } from './schema'

/** A page or element captured with the styles the browser computed for it. */
export type WebCapture = v.InferOutput<typeof webCaptureSchema>

export type WebCaptureFont = v.InferOutput<typeof webCaptureFontSchema>

export type WebCaptureViewport = v.InferOutput<typeof webCaptureViewportSchema>

/** Why a capture could not be read. */
export type WebCaptureReadError = 'invalid' | 'too-large' | 'unsupported-version'

export type WebCaptureReadResult =
  | { ok: true; capture: WebCapture }
  | { ok: false; error: WebCaptureReadError }
