import { describe, expect, test } from 'bun:test'

import { APICallError, StreamProviderError } from 'ai'

import { AgentSignInRequiredError } from '@/app/ai/agents/acp/auth/required'
import {
  classifyAIChatError,
  classifyAIChatFinish,
  isInsufficientCreditError
} from '@/app/ai/chat/failure'
import { ProviderStallError } from '@/app/ai/transports/stall'

describe('AI chat failures', () => {
  test('recognizes provider credit and quota failures', () => {
    expect(isInsufficientCreditError({ statusCode: 402 })).toBe(true)
    expect(isInsufficientCreditError(new Error('Insufficient balance. Please top up.'))).toBe(true)
    expect(isInsufficientCreditError(new Error('Quota exceeded for this account'))).toBe(true)
    expect(isInsufficientCreditError(new Error('Rate limit reached'))).toBe(false)
  })

  test('classifies output-limit finishes', () => {
    expect(classifyAIChatFinish('length')).toEqual({ reason: 'output-limit' })
    expect(classifyAIChatFinish('stop')).toBeNull()
  })

  test('classifies actionable provider failures', () => {
    const apiError = (statusCode: number, message: string) =>
      new APICallError({
        message,
        url: 'https://provider.example/v1/chat',
        requestBodyValues: {},
        statusCode
      })

    expect(classifyAIChatError(apiError(401, 'API key expired.'))).toMatchObject({
      reason: 'authentication',
      statusCode: 401,
      retryable: false
    })
    expect(classifyAIChatError(apiError(403, 'Forbidden'))).toMatchObject({
      reason: 'forbidden',
      statusCode: 403
    })
    expect(classifyAIChatError(apiError(404, 'Model not found'))).toMatchObject({
      reason: 'model-not-found',
      statusCode: 404
    })
    expect(classifyAIChatError(apiError(429, 'Too many requests'))).toMatchObject({
      reason: 'rate-limit',
      statusCode: 429,
      retryable: true
    })
  })

  test('reports a refused sign-in or plan instead of a key for providers signed in to', () => {
    expect(classifyAIChatError({ statusCode: 401 }, { signInOnly: true }).reason).toBe(
      'sign-in-expired'
    )
    expect(classifyAIChatError({ statusCode: 403 }, { signInOnly: true }).reason).toBe(
      'plan-forbidden'
    )
    expect(classifyAIChatError({ statusCode: 429 }, { signInOnly: true }).reason).toBe('rate-limit')
  })

  test('reports a coding agent nobody is signed in to as its sign-in', () => {
    const signedOut = new AgentSignInRequiredError('Gemini CLI is not signed in.')
    expect(classifyAIChatError(signedOut)).toMatchObject({
      reason: 'sign-in-expired',
      detail: 'Gemini CLI is not signed in.'
    })
  })

  test('reports an agent that brings its own credentials as unconfigured, not signed out', () => {
    const unconfigured = new AgentSignInRequiredError(
      'omp found no provider credentials to use.',
      true
    )
    expect(classifyAIChatError(unconfigured)).toMatchObject({ reason: 'agent-unconfigured' })
  })

  test('classifies provider errors reported after the stream started', () => {
    const streamError = new StreamProviderError({
      message: 'Too many requests',
      statusCode: 429,
      isRetryable: true
    })
    expect(classifyAIChatError(streamError)).toMatchObject({
      reason: 'rate-limit',
      statusCode: 429,
      retryable: true
    })
  })

  test('reports a provider that stopped sending as a timeout', () => {
    expect(classifyAIChatError(new ProviderStallError(60_000)).reason).toBe('timeout')
  })

  test('classifies provider messages without exposing them as presentation copy', () => {
    expect(classifyAIChatError(new Error('API key expired.')).reason).toBe('authentication')
    expect(classifyAIChatError(new Error('Invalid API key.')).reason).toBe('authentication')
    expect(classifyAIChatError(new Error('Failed to fetch provider')).reason).toBe('network')
    expect(classifyAIChatError(new Error('Provider unavailable')).reason).toBe('request-failed')
  })

  test('retains request details for diagnostics', () => {
    expect(classifyAIChatError(new Error('Payment required'))).toMatchObject({
      reason: 'insufficient-credit',
      detail: 'Payment required'
    })
    expect(classifyAIChatError(new Error('Provider unavailable'))).toMatchObject({
      reason: 'request-failed',
      detail: 'Provider unavailable'
    })
  })
})
