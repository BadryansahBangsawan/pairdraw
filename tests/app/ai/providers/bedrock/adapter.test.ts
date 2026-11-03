import { describe, expect, test } from 'bun:test'

import { generateText } from 'ai'
import * as v from 'valibot'

import { bedrockAdapter } from '@/app/ai/providers/bedrock/adapter'
import {
  parseBedrockCredential,
  serializeAWSCredentials
} from '@/app/ai/providers/bedrock/credential'
import {
  bedrockBaseURL,
  bedrockRegion,
  DEFAULT_BEDROCK_REGION
} from '@/app/ai/providers/bedrock/endpoint'
import type { FetchFunction } from '@/app/http/types'

interface Sent extends Pick<Request, 'url' | 'headers'> {
  body: unknown
}

const message = {
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'anthropic.claude-sonnet-5-5',
  content: [{ type: 'text', text: 'OK' }],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 }
}

const bodySchema = v.looseObject({ model: v.string() })

function recordingFetch(sent: Sent[]): FetchFunction {
  return async (input, init) => {
    const text = typeof init?.body === 'string' ? init.body : ''
    sent.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: v.parse(v.pipe(v.string(), v.parseJson(), bodySchema), text)
    })
    return new Response(JSON.stringify(message), {
      headers: { 'content-type': 'application/json' }
    })
  }
}

function config(apiKey: string, customBaseURL: string, customModelID = '') {
  return {
    providerID: 'amazon-bedrock' as const,
    apiKey,
    modelID: 'anthropic.claude-sonnet-5-5',
    customModelID,
    customBaseURL,
    customAPIType: 'completions' as const
  }
}

describe('Bedrock endpoint', () => {
  test('stores the region in the base URL and reads it back', () => {
    const base = bedrockBaseURL('eu-central-1')
    expect(base).toBe('https://bedrock-mantle.eu-central-1.api.aws/anthropic')
    expect(bedrockRegion(base)).toBe('eu-central-1')
  })

  test('falls back to the default region for an empty, invalid, or foreign URL', () => {
    expect(bedrockRegion('')).toBe(DEFAULT_BEDROCK_REGION)
    expect(bedrockRegion('not a url')).toBe(DEFAULT_BEDROCK_REGION)
    expect(bedrockRegion('https://example.com/anthropic')).toBe(DEFAULT_BEDROCK_REGION)
    expect(bedrockBaseURL('evil.example.com/')).toBe(bedrockBaseURL(DEFAULT_BEDROCK_REGION))
  })
})

describe('Bedrock credential', () => {
  test('reads AWS access keys as JSON and anything else as an API key', () => {
    const keys = serializeAWSCredentials({
      accessKeyId: ' AKID ',
      secretAccessKey: 'secret',
      sessionToken: ''
    })
    expect(parseBedrockCredential(keys)).toEqual({
      kind: 'aws',
      credentials: { accessKeyId: 'AKID', secretAccessKey: 'secret' }
    })
    expect(parseBedrockCredential(' ABSKexample ')).toEqual({
      kind: 'api-key',
      apiKey: 'ABSKexample'
    })
  })

  test('serializes nothing until both required keys are present', () => {
    expect(serializeAWSCredentials({ accessKeyId: 'AKID', secretAccessKey: ' ' })).toBe('')
  })
})

describe('Bedrock adapter', () => {
  test('sends a Bedrock API key as x-api-key to the region’s Messages endpoint', async () => {
    const sent: Sent[] = []
    const model = bedrockAdapter.create(config('ABSKexample', bedrockBaseURL('eu-west-1')), {
      fetch: recordingFetch(sent)
    })
    const result = await generateText({ model, prompt: 'hi' })

    expect(result.text).toBe('OK')
    expect(sent[0]?.url).toBe('https://bedrock-mantle.eu-west-1.api.aws/anthropic/v1/messages')
    expect(sent[0]?.headers.get('x-api-key')).toBe('ABSKexample')
    expect(sent[0]?.headers.get('anthropic-version')).toBe('2023-06-01')
    expect(sent[0]?.headers.get('authorization')).toBeNull()
    expect(sent[0]?.body).toMatchObject({ model: 'anthropic.claude-sonnet-5-5' })
  })

  test('signs with AWS access keys instead of sending a key', async () => {
    const sent: Sent[] = []
    const keys = serializeAWSCredentials({
      accessKeyId: 'AKIDEXAMPLE',
      secretAccessKey: 'secret',
      sessionToken: 'session'
    })
    const model = bedrockAdapter.create(
      config(keys, bedrockBaseURL('us-west-2'), 'us.anthropic.claude-opus-5-5'),
      { fetch: recordingFetch(sent) }
    )
    await generateText({ model, prompt: 'hi' })

    const authorization = sent[0]?.headers.get('authorization') ?? ''
    expect(authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/us-west-2\/bedrock-mantle\/aws4_request, SignedHeaders=content-type;host;x-amz-date;x-amz-security-token, Signature=[0-9a-f]{64}$/
    )
    expect(sent[0]?.headers.get('x-amz-security-token')).toBe('session')
    expect(sent[0]?.headers.get('x-api-key')).toBeNull()
    expect(sent[0]?.body).toMatchObject({ model: 'us.anthropic.claude-opus-5-5' })
  })
})
