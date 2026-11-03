import { afterEach, describe, expect, spyOn, test } from 'bun:test'

import { fromUint8Array, toUint8Array } from 'js-base64'

import {
  editImage,
  generateImage,
  imageAIProviderDefinition,
  OPENAI_BASE_URL,
  validateImageAIBaseURL
} from '@/app/editor/image-ai/openai'
import { removeBackgroundWithRemoveBg } from '@/app/editor/image-ai/remove-bg'
import { generateSVGWithService } from '@/app/editor/image-ai/svg'
import { ImageAIAuthError, type ImageAIConnection } from '@/app/editor/image-ai/types'
import { appCredentialRefs } from '@/app/settings/credentials/persistence'
import { credentialKey } from '@/app/settings/credentials/reference'

import { fetchStub } from '#tests/helpers/fetch'

/** A whole 1×1 PNG, which stands for every image a service sends or receives here. */
const PIXEL_PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
)
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><path d="M0 0h4v4z"/></svg>'
const KEY = 'sk-test-secret-123'

function connection(overrides: Partial<ImageAIConnection> = {}): ImageAIConnection {
  return {
    provider: imageAIProviderDefinition('openai'),
    baseURL: OPENAI_BASE_URL,
    model: 'gpt-image-1',
    apiKey: KEY,
    ...overrides
  }
}

interface Captured {
  url: string
  init?: RequestInit
}

function mockFetch(answer: (request: Captured) => Response | Promise<Response>) {
  const requests: Captured[] = []
  const spy = spyOn(globalThis, 'fetch').mockImplementation(
    fetchStub(async (input, init) => {
      const request = { url: String(input), init }
      requests.push(request)
      return answer(request)
    })
  )
  return { requests, spy }
}

let restore: (() => void) | null = null
afterEach(() => {
  restore?.()
  restore = null
})

function stubFetch(answer: (request: Captured) => Response | Promise<Response>) {
  const mocked = mockFetch(answer)
  restore = () => mocked.spy.mockRestore()
  return mocked.requests
}

function jsonBody(request: Captured): unknown {
  return typeof request.init?.body === 'string' ? JSON.parse(request.init.body) : null
}

describe('OpenAI Images', () => {
  test('generates with the shape, a transparent background and the key, and decodes the PNG', async () => {
    const requests = stubFetch(() =>
      Response.json({ data: [{ b64_json: fromUint8Array(PIXEL_PNG) }] })
    )
    const bytes = await generateImage(connection(), {
      prompt: 'a cup',
      orientation: 'landscape',
      transparent: true
    })
    expect(bytes).toEqual(PIXEL_PNG)
    expect(requests[0]?.url).toBe('https://api.openai.com/v1/images/generations')
    expect(new Headers(requests[0]?.init?.headers).get('authorization')).toBe(`Bearer ${KEY}`)
    expect(jsonBody(requests[0] ?? { url: '' })).toEqual({
      model: 'gpt-image-1',
      prompt: 'a cup',
      n: 1,
      size: '1536x1024',
      output_format: 'png',
      background: 'transparent'
    })
  })

  test('asks other models of a compatible server for base64 at their own address', async () => {
    const requests = stubFetch(() =>
      Response.json({ data: [{ b64_json: fromUint8Array(PIXEL_PNG) }] })
    )
    await generateImage(
      connection({
        provider: imageAIProviderDefinition('openai-compatible'),
        baseURL: 'https://images.example.com/v1/',
        model: 'flux-dev'
      }),
      { prompt: 'a cup', orientation: 'square' }
    )
    expect(requests[0]?.url).toBe('https://images.example.com/v1/images/generations')
    expect(jsonBody(requests[0] ?? { url: '' })).toEqual({
      model: 'flux-dev',
      prompt: 'a cup',
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json'
    })
  })

  test('edits by sending the image as a multipart upload', async () => {
    const requests = stubFetch(() =>
      Response.json({ data: [{ b64_json: fromUint8Array(PIXEL_PNG) }] })
    )
    await editImage(connection(), { image: PIXEL_PNG, prompt: 'remove it', transparent: true })
    const body = requests[0]?.init?.body
    expect(requests[0]?.url).toBe('https://api.openai.com/v1/images/edits')
    expect(body).toBeInstanceOf(FormData)
    if (!(body instanceof FormData)) return
    expect(body.get('prompt')).toBe('remove it')
    expect(body.get('background')).toBe('transparent')
    expect(body.get('image')).toBeInstanceOf(Blob)
  })

  test('a refused key fails without quoting what the service said', async () => {
    stubFetch(
      () =>
        new Response(JSON.stringify({ error: { message: `Incorrect API key provided: ${KEY}` } }), {
          status: 401
        })
    )
    const failure = generateImage(connection(), { prompt: 'a cup', orientation: 'square' })
    await expect(failure).rejects.toBeInstanceOf(ImageAIAuthError)
    await expect(failure).rejects.not.toThrow(KEY)
  })

  test('other failures quote the service with the key masked', async () => {
    stubFetch(() => new Response(`quota exceeded for ${KEY}`, { status: 429 }))
    const failure = generateImage(connection(), { prompt: 'a cup', orientation: 'square' })
    await expect(failure).rejects.toThrow('OpenAI failed (429): quota exceeded for •••')
  })

  test('an answer without image data fails', async () => {
    stubFetch(() => Response.json({ data: [{ b64_json: fromUint8Array(new Uint8Array([1, 2])) }] }))
    await expect(
      generateImage(connection(), { prompt: 'a cup', orientation: 'square' })
    ).rejects.toThrow('OpenAI returned no image')
  })

  test('sends keys only over HTTPS, or HTTP to this computer', () => {
    expect(validateImageAIBaseURL('https://example.com/v1').hostname).toBe('example.com')
    expect(validateImageAIBaseURL('http://localhost:8080/v1').port).toBe('8080')
    expect(() => validateImageAIBaseURL('http://example.com/v1')).toThrow('HTTPS')
    expect(() => validateImageAIBaseURL('https://user:pass@example.com/v1')).toThrow('credentials')
  })
})

describe('remove.bg', () => {
  test('sends the image with its key and returns the PNG it answers with', async () => {
    const requests = stubFetch(
      () => new Response(PIXEL_PNG.slice(), { headers: { 'content-type': 'image/png' } })
    )
    expect(await removeBackgroundWithRemoveBg(PIXEL_PNG, KEY)).toEqual(PIXEL_PNG)
    expect(requests[0]?.url).toBe('https://api.remove.bg/v1.0/removebg')
    expect(new Headers(requests[0]?.init?.headers).get('x-api-key')).toBe(KEY)
  })

  test('says what remove.bg reports, and refuses a rejected key as such', async () => {
    stubFetch(() => Response.json({ errors: [{ title: 'Insufficient credits' }] }, { status: 402 }))
    await expect(removeBackgroundWithRemoveBg(PIXEL_PNG, KEY)).rejects.toThrow(
      'remove.bg failed (402): Insufficient credits'
    )
    restore?.()
    stubFetch(() => Response.json({ errors: [{ title: 'API Key invalid' }] }, { status: 403 }))
    await expect(removeBackgroundWithRemoveBg(PIXEL_PNG, KEY)).rejects.toBeInstanceOf(
      ImageAIAuthError
    )
  })
})

describe('text to SVG', () => {
  test('QuiverAI draws with Arrow and returns its markup', async () => {
    const requests = stubFetch(() => Response.json({ id: 'r', created: 1, data: [{ svg: SVG }] }))
    expect(await generateSVGWithService('quiver', 'QuiverAI', 'a rocket', KEY)).toBe(SVG)
    expect(requests[0]?.url).toBe('https://api.quiver.ai/v1/svgs/generations')
    expect(jsonBody(requests[0] ?? { url: '' })).toEqual({
      model: 'arrow-2',
      prompt: 'a rocket',
      n: 1,
      stream: false
    })
  })

  test('Recraft draws a vector illustration and the SVG is downloaded from its host', async () => {
    const requests = stubFetch(({ url }) =>
      url.startsWith('https://external.api.recraft.ai')
        ? Response.json({ data: [{ url: 'https://img.recraft.ai/rocket.svg' }] })
        : new Response(SVG, { headers: { 'content-type': 'image/svg+xml' } })
    )
    expect(await generateSVGWithService('recraft', 'Recraft', 'a rocket', KEY)).toBe(SVG)
    expect(jsonBody(requests[0] ?? { url: '' })).toMatchObject({ style: 'vector_illustration' })
    expect(requests[1]?.url).toBe('https://img.recraft.ai/rocket.svg')
  })

  test('a failure masks the whole key before quoting at most 300 characters', async () => {
    // The key straddles character 300, where a quote cut before masking would leave part of it.
    const body = `${'x'.repeat(290)} ${KEY} ${'y'.repeat(400)}`
    stubFetch(() => new Response(body, { status: 500 }))
    const failure = generateSVGWithService('recraft', 'Recraft', 'a rocket', KEY)
    await expect(failure).rejects.toThrow(`Recraft failed (500): ${'x'.repeat(290)} •••`)
    const message = await failure.catch((error: unknown) =>
      error instanceof Error ? error.message : ''
    )
    expect(message).not.toContain(KEY.slice(0, 6))
    expect(message.length).toBeLessThanOrEqual('Recraft failed (500): '.length + 300)
  })

  test('QuiverAI refuses a key with 401 only; its 403 is quoted as a failure', async () => {
    stubFetch(() => new Response('account frozen', { status: 403 }))
    await expect(generateSVGWithService('quiver', 'QuiverAI', 'a rocket', KEY)).rejects.toThrow(
      'QuiverAI failed (403): account frozen'
    )
  })

  test('a raster in place of SVG fails', async () => {
    stubFetch(({ url }) =>
      url.startsWith('https://fal.run')
        ? Response.json({ images: [{ url: 'https://v3.fal.media/rocket.webp' }] })
        : new Response('RIFF....WEBP')
    )
    await expect(generateSVGWithService('fal', 'fal.ai', 'a rocket', KEY)).rejects.toThrow(
      'fal.ai returned no SVG'
    )
  })
})

test('image AI keys follow the browser persistence setting', () => {
  const keys = appCredentialRefs().map(credentialKey)
  expect(keys).toContain('v1:image-ai-openai:default:api-key')
  expect(keys).toContain('v1:image-ai-openai-compatible:default:api-key')
  expect(keys).toContain('v1:remove-bg:default:api-key')
})
