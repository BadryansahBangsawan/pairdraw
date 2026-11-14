import { describe, expect, test } from 'bun:test'

import { fromUint8Array, toUint8Array } from 'js-base64'

import { MAX_IMAGE_FETCH_BYTES } from '@pairdraw/core/figma-api'

import { downloadImageURL, parseImageURL } from '@/app/editor/images/url'

/** A whole 1×1 PNG. */
const PIXEL_PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
)

function answering(response: () => Response) {
  const requested: string[] = []
  const fetcher = async (input: RequestInfo | URL) => {
    requested.push(input instanceof Request ? input.url : input.toString())
    return response()
  }
  return { requested, fetcher }
}

describe('image fill from a URL', () => {
  test('takes absolute HTTP(S) and data URLs, trimmed, and nothing else', () => {
    expect(parseImageURL('  https://images.example/a.png ')?.href).toBe(
      'https://images.example/a.png'
    )
    expect(parseImageURL('http://images.example/a.png')).not.toBeNull()
    expect(parseImageURL('data:image/png;base64,AA==')).not.toBeNull()
    expect(parseImageURL('images.example/a.png')).toBeNull()
    expect(parseImageURL('file:///Users/me/a.png')).toBeNull()
    expect(parseImageURL('ftp://images.example/a.png')).toBeNull()
  })

  test('fetches the image through the host fetch', async () => {
    const { requested, fetcher } = answering(() => new Response(PIXEL_PNG.slice()))
    const result = await downloadImageURL('https://images.example/photo.png', fetcher)
    expect(requested).toEqual(['https://images.example/photo.png'])
    expect(result).toEqual({ ok: true, bytes: PIXEL_PNG })
  })

  test('reads a data URL itself, without the host fetch', async () => {
    const { requested, fetcher } = answering(() => new Response('unused'))
    const result = await downloadImageURL(
      `data:image/png;base64,${fromUint8Array(PIXEL_PNG)}`,
      fetcher
    )
    expect(requested).toEqual([])
    expect(result).toEqual({ ok: true, bytes: PIXEL_PNG })
  })

  test('names why it gave no image', async () => {
    expect(await downloadImageURL('not a url')).toEqual({ ok: false, reason: 'invalid-url' })

    const missing = answering(() => new Response('missing', { status: 404 }))
    expect(await downloadImageURL('https://a.example/x.png', missing.fetcher)).toEqual({
      ok: false,
      reason: 'status',
      status: 404
    })

    const offline = async () => {
      throw new TypeError('fetch failed')
    }
    expect(await downloadImageURL('https://a.example/x.png', offline)).toEqual({
      ok: false,
      reason: 'unreachable'
    })

    const page = answering(() => new Response('<html></html>'))
    expect(await downloadImageURL('https://a.example/', page.fetcher)).toEqual({
      ok: false,
      reason: 'unsupported'
    })

    const huge = answering(
      () =>
        new Response(PIXEL_PNG.slice(), {
          headers: { 'content-length': String(MAX_IMAGE_FETCH_BYTES + 1) }
        })
    )
    expect(await downloadImageURL('https://a.example/x.png', huge.fetcher)).toEqual({
      ok: false,
      reason: 'too-large'
    })
  })

  test('stops reading a body without a length once it passes the cap', async () => {
    // One megabyte, sent again and again: the body never ends and never says how long it is.
    const chunk = new Uint8Array(1024 * 1024)
    let sent = 0
    let cancelled = false
    const endless = answering(
      () =>
        new Response(
          new ReadableStream<Uint8Array>({
            pull(controller) {
              sent += chunk.byteLength
              controller.enqueue(chunk)
            },
            cancel() {
              cancelled = true
            }
          })
        )
    )

    expect(await downloadImageURL('https://a.example/x.png', endless.fetcher)).toEqual({
      ok: false,
      reason: 'too-large'
    })
    expect(cancelled).toBe(true)
    expect(sent).toBeLessThan(MAX_IMAGE_FETCH_BYTES + 4 * chunk.byteLength)
  })
})
