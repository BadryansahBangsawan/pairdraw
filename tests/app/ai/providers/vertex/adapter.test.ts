import { describe, expect, test } from 'bun:test'

import { generateText, jsonSchema, streamText, tool } from 'ai'
import * as v from 'valibot'

import { vertexAdapter, vertexAnthropicFetch } from '@/app/ai/providers/vertex/adapter'
import { parseVertexCredential } from '@/app/ai/providers/vertex/credential'
import {
  DEFAULT_VERTEX_LOCATION,
  parseVertexBaseURL,
  vertexBaseURL
} from '@/app/ai/providers/vertex/endpoint'
import type { FetchFunction } from '@/app/http/types'

type Sent = { url: string; headers: Headers; body: Record<string, unknown> }

const claudeMessage = {
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-5-5',
  content: [{ type: 'text', text: 'OK' }],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 }
}

const geminiResponse = {
  candidates: [{ content: { role: 'model', parts: [{ text: 'OK' }] }, finishReason: 'STOP' }],
  usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 }
}

const bodySchema = v.record(v.string(), v.unknown())

function recordingFetch(sent: Sent[], response: unknown): FetchFunction {
  return async (input, init) => {
    const text = typeof init?.body === 'string' ? init.body : ''
    sent.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: v.parse(v.pipe(v.string(), v.parseJson(), bodySchema), text)
    })
    return new Response(JSON.stringify(response), {
      headers: { 'content-type': 'application/json' }
    })
  }
}

function config(apiKey: string, customBaseURL: string, modelID: string) {
  return {
    providerID: 'google-vertex' as const,
    apiKey,
    modelID,
    customModelID: '',
    customBaseURL,
    customAPIType: 'completions' as const
  }
}

describe('Vertex AI endpoint', () => {
  test.each([
    ['global', 'https://aiplatform.googleapis.com/v1/projects/my-project/locations/global'],
    ['us', 'https://aiplatform.us.rep.googleapis.com/v1/projects/my-project/locations/us'],
    [
      'us-east5',
      'https://us-east5-aiplatform.googleapis.com/v1/projects/my-project/locations/us-east5'
    ]
  ])('stores the %s location in the host and path and reads it back', (location, expected) => {
    const base = vertexBaseURL({ project: 'my-project', location })
    expect(base).toBe(expected)
    expect(parseVertexBaseURL(base)).toEqual({ project: 'my-project', location })
  })

  test('uses express mode without a project and ignores foreign URLs', () => {
    expect(vertexBaseURL({ project: '', location: 'eu' })).toBe(
      'https://aiplatform.googleapis.com/v1'
    )
    const fallback = { project: '', location: DEFAULT_VERTEX_LOCATION }
    expect(parseVertexBaseURL('https://aiplatform.googleapis.com/v1')).toEqual(fallback)
    expect(
      parseVertexBaseURL('https://example.com/v1/projects/my-project/locations/global')
    ).toEqual(fallback)
    expect(vertexBaseURL({ project: '../evil', location: 'global' })).toBe(
      'https://aiplatform.googleapis.com/v1'
    )
  })
})

describe('Vertex AI credential', () => {
  test('sends access tokens as bearer tokens and anything else as an API key', () => {
    expect(parseVertexCredential('Bearer ya29.token')).toEqual({
      kind: 'access-token',
      token: 'ya29.token'
    })
    expect(parseVertexCredential(' AIzaKey ')).toEqual({ kind: 'api-key', key: 'AIzaKey' })
  })
})

describe('Vertex AI adapter', () => {
  const base = vertexBaseURL({ project: 'my-project', location: 'global' })

  test('sends Claude to rawPredict with the version in the body and no model', async () => {
    const sent: Sent[] = []
    const model = vertexAdapter.create(config('ya29.token', base, 'claude-sonnet-5-5'), {
      fetch: recordingFetch(sent, claudeMessage)
    })
    const result = await generateText({
      model,
      prompt: 'hi',
      tools: {
        rename: tool({
          description: 'Rename a layer',
          inputSchema: jsonSchema({ type: 'object', properties: { name: { type: 'string' } } })
        })
      }
    })

    expect(result.text).toBe('OK')
    expect(sent[0]?.url).toBe(`${base}/publishers/anthropic/models/claude-sonnet-5-5:rawPredict`)
    expect(sent[0]?.body.anthropic_version).toBe('vertex-2023-10-16')
    expect(sent[0]?.body).not.toHaveProperty('model')
    expect(sent[0]?.headers.get('authorization')).toBe('Bearer ya29.token')
    // Vertex AI's CORS answer rejects these headers, which would stop the browser build.
    expect(sent[0]?.headers.get('anthropic-version')).toBeNull()
    expect(sent[0]?.headers.get('anthropic-beta')).toBeNull()
    expect(sent[0]?.headers.get('x-goog-api-key')).toBeNull()
  })

  test('streams Claude from streamRawPredict as server-sent events', async () => {
    const urls: string[] = []
    const events = [
      { type: 'message_start', message: { ...claudeMessage, content: [], stop_reason: null } },
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } },
      { type: 'content_block_stop', index: 0 },
      {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn', stop_sequence: null },
        usage: { output_tokens: 1 }
      },
      { type: 'message_stop' }
    ]
    const stream = events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
    const model = vertexAdapter.create(config('ya29.token', base, 'claude-sonnet-5-5'), {
      fetch: async (input) => {
        urls.push(String(input))
        return new Response(stream.join(''), { headers: { 'content-type': 'text/event-stream' } })
      }
    })
    const result = streamText({ model, prompt: 'hi' })

    expect(await result.text).toBe('Hello')
    expect(urls[0]).toBe(`${base}/publishers/anthropic/models/claude-sonnet-5-5:streamRawPredict`)
  })

  test('keeps a dated snapshot’s @ in the model path', async () => {
    const sent: Sent[] = []
    const model = vertexAdapter.create(config('ya29.token', base, 'claude-haiku-4-5@20251001'), {
      fetch: recordingFetch(sent, claudeMessage)
    })
    await generateText({ model, prompt: 'hi' })
    expect(sent[0]?.url).toEndWith('/models/claude-haiku-4-5@20251001:rawPredict')
  })

  test('sends Gemini to generateContent with an API key in express mode', async () => {
    const sent: Sent[] = []
    const model = vertexAdapter.create(config('AIzaKey', '', 'gemini-3.8-flash'), {
      fetch: recordingFetch(sent, geminiResponse)
    })
    const result = await generateText({ model, prompt: 'hi' })

    expect(result.text).toBe('OK')
    expect(sent[0]?.url).toBe(
      'https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-3.8-flash:generateContent'
    )
    expect(sent[0]?.headers.get('x-goog-api-key')).toBe('AIzaKey')
    expect(sent[0]?.headers.get('authorization')).toBeNull()
  })

  test('sends Gemini under the project and location with an access token', async () => {
    const sent: Sent[] = []
    const model = vertexAdapter.create(config('ya29.token', base, 'gemini-3.8-flash'), {
      fetch: recordingFetch(sent, geminiResponse)
    })
    await generateText({ model, prompt: 'hi' })
    expect(sent[0]?.url).toBe(`${base}/publishers/google/models/gemini-3.8-flash:generateContent`)
    expect(sent[0]?.headers.get('authorization')).toBe('Bearer ya29.token')
  })
})

describe('Vertex AI Claude betas', () => {
  test('travel in the body, since the browser cannot send the header', async () => {
    const sent: Sent[] = []
    const send = vertexAnthropicFetch(recordingFetch(sent, claudeMessage))
    await send('https://vertex.example/rawPredict', {
      method: 'POST',
      headers: {
        'anthropic-beta': 'structured-outputs-2025-11-13, pdfs-2024-09-25',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ anthropic_version: 'vertex-2023-10-16', max_tokens: 8 })
    })

    expect(sent[0]?.headers.get('anthropic-beta')).toBeNull()
    expect(sent[0]?.headers.get('content-type')).toBe('application/json')
    expect(sent[0]?.body).toEqual({
      anthropic_version: 'vertex-2023-10-16',
      max_tokens: 8,
      anthropic_beta: ['pdfs-2024-09-25']
    })
  })

  test('leave the body as it is when only generally available betas were asked for', async () => {
    const sent: Sent[] = []
    const send = vertexAnthropicFetch(recordingFetch(sent, claudeMessage))
    const body = JSON.stringify({ max_tokens: 8 })
    await send('https://vertex.example/rawPredict', {
      method: 'POST',
      headers: { 'anthropic-beta': 'structured-outputs-2025-11-13' },
      body
    })
    expect(sent[0]?.headers.get('anthropic-beta')).toBeNull()
    expect(sent[0]?.body).toEqual({ max_tokens: 8 })
  })

  test('send a PDF to Claude with its beta in the body', async () => {
    const sent: Sent[] = []
    const base = vertexBaseURL({ project: 'my-project', location: 'global' })
    const model = vertexAdapter.create(config('ya29.token', base, 'claude-sonnet-5-5'), {
      fetch: recordingFetch(sent, claudeMessage)
    })
    await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Summarize' },
            { type: 'file', mediaType: 'application/pdf', data: new Uint8Array([37, 80, 68, 70]) }
          ]
        }
      ]
    })
    expect(sent[0]?.headers.get('anthropic-beta')).toBeNull()
    expect(sent[0]?.body.anthropic_beta).toEqual(['pdfs-2024-09-25'])
  })
})
