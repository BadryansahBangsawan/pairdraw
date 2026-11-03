import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import {
  captureRequestSchema,
  captureResponseSchema,
  imageRequestSchema,
  imageResponseSchema
} from '../src/schema'

describe('extension messages', () => {
  test('accepts the requests the popup sends and nothing else', () => {
    expect(v.is(captureRequestSchema, { type: 'capture-page', images: false })).toBe(true)
    expect(v.is(captureRequestSchema, { type: 'pick-element', images: true })).toBe(true)
    expect(v.is(captureRequestSchema, { type: 'run', code: 'alert(1)' })).toBe(false)
  })

  test('accepts image requests only for addresses', () => {
    expect(
      v.is(imageRequestSchema, { type: 'fetch-image', url: 'https://cdn.example.com/a.png' })
    ).toBe(true)
    expect(v.is(imageRequestSchema, { type: 'fetch-image', url: 'not a url' })).toBe(false)
  })

  test('accepts only image data URLs back from the worker', () => {
    expect(v.is(imageResponseSchema, { ok: true, dataURL: 'data:image/png;base64,AAAA' })).toBe(
      true
    )
    expect(v.is(imageResponseSchema, { ok: true, dataURL: 'data:text/html,<script>' })).toBe(false)
    expect(v.is(imageResponseSchema, { ok: false })).toBe(true)
  })

  test('reads capture responses with their payload or error', () => {
    expect(v.is(captureResponseSchema, { ok: true, html: '<p>', text: 'Page' })).toBe(true)
    expect(v.is(captureResponseSchema, { ok: false, error: 'unavailable' })).toBe(true)
    expect(v.is(captureResponseSchema, { ok: true })).toBe(false)
  })
})
