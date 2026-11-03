import { AnthropicLanguageModel } from '@ai-sdk/anthropic/internal'

import type { ModelProviderAdapter } from '@/app/ai/providers/types'
import type { FetchFunction } from '@/app/http/types'

import { parseBedrockCredential } from './credential'
import { BEDROCK_SIGNING_SERVICE, bedrockBaseURL, bedrockRegion } from './endpoint'
import { signRequest, type AWSCredentials } from './sigv4'

const ANTHROPIC_VERSION = '2023-06-01'

function requestURL(input: RequestInfo | URL): URL {
  if (input instanceof URL) return input
  return new URL(typeof input === 'string' ? input : input.url)
}

/**
 * A fetch that signs each request with AWS access keys. Only `content-type` is signed besides
 * the host and the `x-amz-*` headers, so a transport that adds its own headers keeps the
 * signature valid. Browsers do not let a wildcard CORS answer cover `authorization`, so signed
 * requests need the desktop app; Bedrock API keys work in both.
 */
export function bedrockSignedFetch(
  credentials: AWSCredentials,
  region: string,
  fetchImpl?: FetchFunction,
  now?: () => Date
): FetchFunction {
  return async (input, init) => {
    const body = init?.body ?? ''
    if (typeof body !== 'string') throw new TypeError('Bedrock requests are signed as text')
    const url = requestURL(input)
    const headers = new Headers(init?.headers)
    const signed = new Headers()
    const contentType = headers.get('content-type')
    if (contentType) signed.set('content-type', contentType)
    const signature = await signRequest(
      { method: init?.method ?? 'GET', url, headers: signed, body },
      { region, service: BEDROCK_SIGNING_SERVICE, credentials, now: now?.() }
    )
    for (const [name, value] of Object.entries(signature)) headers.set(name, value)
    return (fetchImpl ?? globalThis.fetch)(url.href, { ...init, headers })
  }
}

/** Claude in Amazon Bedrock, through the Messages API it serves under its own model IDs. */
export const bedrockAdapter: ModelProviderAdapter = {
  create(config, runtime) {
    const region = bedrockRegion(config.customBaseURL)
    const credential = parseBedrockCredential(config.apiKey)
    return new AnthropicLanguageModel(config.customModelID.trim() || config.modelID, {
      provider: 'bedrock.anthropic.messages',
      baseURL: `${bedrockBaseURL(region)}/v1`,
      headers: {
        'anthropic-version': ANTHROPIC_VERSION,
        ...(credential.kind === 'api-key' ? { 'x-api-key': credential.apiKey } : {})
      },
      fetch:
        credential.kind === 'aws'
          ? bedrockSignedFetch(credential.credentials, region, runtime.fetch)
          : runtime.fetch,
      // Bedrock reads images and documents only from the request, never from a URL.
      supportedUrls: () => ({})
    })
  }
}
