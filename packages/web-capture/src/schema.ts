import * as v from 'valibot'

import { MAX_CAPTURE_JSON_LENGTH, WEB_CAPTURE_FORMAT, WEB_CAPTURE_VERSION } from './limits'
import type { WebCaptureElement, WebCaptureNode } from './types'

const finiteSchema = v.pipe(v.number(), v.finite())
const sizeSchema = v.pipe(v.number(), v.finite(), v.minValue(0))
const shortStringSchema = v.pipe(v.string(), v.maxLength(4096))

export const webCaptureBoxSchema = v.object({
  x: finiteSchema,
  y: finiteSchema,
  width: sizeSchema,
  height: sizeSchema
})

export const webCaptureTextSchema = v.object({
  type: v.literal('text'),
  text: v.pipe(v.string(), v.maxLength(1_000_000))
})

/** HTML and SVG tag names, lowercase as a capturer writes them. */
const tagNameSchema = v.pipe(v.string(), v.regex(/^[a-z][a-z0-9-]{0,63}$/))
/** Attribute names; which of them an import keeps is decided when a capture is read. */
const attributeNameSchema = v.pipe(v.string(), v.regex(/^[a-z][a-z0-9:_-]{0,63}$/))
/** Attribute values hold inlined images as data URLs, so they may be large. */
const attributeValueSchema = v.pipe(v.string(), v.maxLength(MAX_CAPTURE_JSON_LENGTH))
const propertyNameSchema = v.pipe(v.string(), v.regex(/^-?[a-z][a-z-]{0,63}$/))

export const webCaptureElementSchema: v.GenericSchema<unknown, WebCaptureElement> = v.object({
  type: v.literal('element'),
  tagName: tagNameSchema,
  attrs: v.record(attributeNameSchema, attributeValueSchema),
  computedStyle: v.record(propertyNameSchema, shortStringSchema),
  box: v.optional(webCaptureBoxSchema),
  children: v.array(v.lazy(() => webCaptureNodeSchema))
})

export const webCaptureNodeSchema: v.GenericSchema<unknown, WebCaptureNode> = v.union([
  webCaptureTextSchema,
  webCaptureElementSchema
])

export const webCaptureFontSchema = v.object({
  family: shortStringSchema,
  weight: shortStringSchema,
  style: shortStringSchema
})

export const webCaptureViewportSchema = v.object({
  width: sizeSchema,
  height: sizeSchema,
  devicePixelRatio: v.pipe(v.number(), v.finite(), v.minValue(0))
})

export const webCaptureSourceSchema = v.object({
  url: v.optional(shortStringSchema),
  title: v.optional(shortStringSchema)
})

/** A page or element captured with the styles the browser computed for it. */
export const webCaptureSchema = v.object({
  format: v.literal(WEB_CAPTURE_FORMAT),
  version: v.literal(WEB_CAPTURE_VERSION),
  /** Whether a whole page or one element of it was captured. */
  scope: v.picklist(['page', 'element']),
  source: webCaptureSourceSchema,
  /** When the capture was made, as an ISO 8601 timestamp. */
  capturedAt: shortStringSchema,
  viewport: webCaptureViewportSchema,
  root: webCaptureElementSchema,
  fonts: v.array(webCaptureFontSchema),
  /** Whether the capturer stopped at its element limit, leaving later content out. */
  truncated: v.boolean()
})
