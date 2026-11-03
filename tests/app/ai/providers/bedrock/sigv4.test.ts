import { describe, expect, test } from 'bun:test'

import { bedrockSignedFetch } from '@/app/ai/providers/bedrock/adapter'
import { amzDate, signRequest } from '@/app/ai/providers/bedrock/sigv4'
import type { FetchFunction } from '@/app/http/types'

// The credentials and time of AWS's published Signature Version 4 test suite.
const credentials = {
  accessKeyId: 'AKIDEXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY'
}
const now = new Date('2015-08-30T12:36:00Z')
const scope = { region: 'us-east-1', service: 'service', credentials, now }

function signatureOf(authorization: string | undefined): string {
  return /Signature=([0-9a-f]{64})$/.exec(authorization ?? '')?.[1] ?? ''
}

describe('SigV4', () => {
  test('formats the signing time in the basic ISO 8601 form', () => {
    expect(amzDate(now)).toBe('20150830T123600Z')
  })

  test.each([
    [
      'get-vanilla',
      'GET',
      'https://example.amazonaws.com/',
      '5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31'
    ],
    [
      'post-vanilla',
      'POST',
      'https://example.amazonaws.com/',
      '5da7c1a2acd57cee7505fc6676e4e544621c30862966e37dddb68e92efbe5d6b'
    ],
    [
      'get-vanilla-query-order-key-case',
      'GET',
      'https://example.amazonaws.com/?Param2=value2&Param1=value1',
      'b97d918cfa904a5beff61c982a1b6f458b799221646efd99d3219ec94cdf2500'
    ]
  ])('matches the AWS test suite case %s', async (_name, method, url, signature) => {
    const headers = await signRequest(
      { method, url: new URL(url), headers: new Headers(), body: '' },
      scope
    )
    expect(headers['x-amz-date']).toBe('20150830T123600Z')
    expect(headers.authorization).toBe(
      `AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=${signature}`
    )
  })

  test('signs the session token of temporary credentials', async () => {
    const headers = await signRequest(
      {
        method: 'POST',
        url: new URL('https://example.amazonaws.com/'),
        headers: new Headers(),
        body: ''
      },
      { ...scope, credentials: { ...credentials, sessionToken: 'session' } }
    )
    expect(headers['x-amz-security-token']).toBe('session')
    expect(headers.authorization).toContain('SignedHeaders=host;x-amz-date;x-amz-security-token,')
  })

  test('covers the body, so a changed payload changes the signature', async () => {
    const request = {
      method: 'POST',
      url: new URL('https://example.amazonaws.com/'),
      headers: new Headers()
    }
    const first = await signRequest({ ...request, body: '{"a":1}' }, scope)
    const second = await signRequest({ ...request, body: '{"a":2}' }, scope)
    expect(signatureOf(first.authorization)).not.toBe(signatureOf(second.authorization))
  })
})

describe('Bedrock signed fetch', () => {
  test('signs content-type and the body, leaves other headers unsigned, and keeps the URL', async () => {
    const sent: { url: string; headers: Headers }[] = []
    const fetchSpy: FetchFunction = async (input, init) => {
      sent.push({ url: String(input), headers: new Headers(init?.headers) })
      return new Response('{}')
    }
    const url = 'https://bedrock-mantle.eu-west-1.api.aws/anthropic/v1/messages'
    const body = '{"model":"anthropic.claude-sonnet-5-5"}'
    await bedrockSignedFetch(
      credentials,
      'eu-west-1',
      fetchSpy,
      () => now
    )(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01' },
      body
    })

    const expected = await signRequest(
      {
        method: 'POST',
        url: new URL(url),
        headers: new Headers({ 'content-type': 'application/json' }),
        body
      },
      { region: 'eu-west-1', service: 'bedrock-mantle', credentials, now }
    )
    expect(sent[0]?.url).toBe(url)
    expect(sent[0]?.headers.get('authorization')).toBe(expected.authorization)
    expect(sent[0]?.headers.get('authorization')).toContain(
      'Credential=AKIDEXAMPLE/20150830/eu-west-1/bedrock-mantle/aws4_request, SignedHeaders=content-type;host;x-amz-date,'
    )
    expect(sent[0]?.headers.get('anthropic-version')).toBe('2023-06-01')
    expect(sent[0]?.headers.get('x-api-key')).toBeNull()
  })

  test('refuses a body it cannot sign as text', async () => {
    const signed = bedrockSignedFetch(credentials, 'us-east-1', async () => new Response('{}'))
    await expect(
      signed('https://bedrock-mantle.us-east-1.api.aws/anthropic/v1/messages', {
        method: 'POST',
        body: new Uint8Array([1])
      })
    ).rejects.toThrow(TypeError)
  })
})
