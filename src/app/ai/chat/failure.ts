import { APICallError, StreamProviderError, type UIMessage } from 'ai'

import { AgentSignInRequiredError } from '@/app/ai/agents/acp/auth/required'
import { AgentStartupTimeoutError } from '@/app/ai/transports/deadline'
import { ProviderStallError } from '@/app/ai/transports/stall'

type AIChatFailureReason =
  | 'authentication'
  | 'forbidden'
  | 'insufficient-credit'
  | 'cloud-credits-exhausted'
  | 'model-not-found'
  | 'network'
  | 'output-limit'
  | 'rate-limit'
  | 'request-failed'
  | 'sign-in-expired'
  | 'agent-unconfigured'
  | 'plan-forbidden'
  | 'timeout'
  | 'agent-timeout'
  | 'empty-reply'

export type AIChatFailure = {
  reason: AIChatFailureReason
  detail?: string
  statusCode?: number
  retryable?: boolean
  /** With `cloud-credits-exhausted`: when the workspace's allowance renews, if the service said. */
  resetsAt?: string
}

type ProviderErrorShape = {
  statusCode?: unknown
  status?: unknown
  responseStatusCode?: unknown
  responseStatus?: unknown
  code?: unknown
  response?: { status?: unknown }
}

function statusNumber(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return null
}

export function providerErrorStatus(error: unknown): number | null {
  if (APICallError.isInstance(error)) return error.statusCode ?? null
  if (typeof error !== 'object' || error === null) return null
  const value = error as ProviderErrorShape
  return (
    statusNumber(value.statusCode) ??
    statusNumber(value.status) ??
    statusNumber(value.responseStatusCode) ??
    statusNumber(value.responseStatus) ??
    statusNumber(value.code) ??
    statusNumber(value.response?.status)
  )
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function normalizedErrorText(error: unknown): string {
  return errorText(error).toLowerCase()
}

export function isInsufficientCreditError(error: unknown): boolean {
  if (providerErrorStatus(error) === 402) return true
  const text = normalizedErrorText(error)
  return [
    'insufficient credit',
    'insufficient balance',
    'insufficient quota',
    'credit balance',
    'payment required',
    'quota exceeded',
    'billing quota',
    'top up',
    'top-up'
  ].some((phrase) => text.includes(phrase))
}

function statusFailureReason(status: number | null): AIChatFailureReason | null {
  if (status === 401) return 'authentication'
  if (status === 402) return 'insufficient-credit'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'model-not-found'
  if (status === 408) return 'network'
  if (status === 429) return 'rate-limit'
  return null
}

/** The reasons a transport reports itself, which no provider status describes. */
function transportFailureReason(error: unknown): AIChatFailureReason | null {
  // A coding agent has no key: what it refuses is its own sign-in, or its own missing setup.
  if (error instanceof AgentSignInRequiredError) {
    return error.unconfigured ? 'agent-unconfigured' : 'sign-in-expired'
  }
  // A stream the provider stopped feeding is reported by the transport's own watchdog.
  if (error instanceof ProviderStallError) return 'timeout'
  // A coding agent that started but never answered, which has its own deadline.
  if (error instanceof AgentStartupTimeoutError) return 'agent-timeout'
  return null
}

function failureReason(error: unknown): AIChatFailureReason {
  const transportReason = transportFailureReason(error)
  if (transportReason) return transportReason
  const statusReason = statusFailureReason(providerErrorStatus(error))
  if (statusReason) return statusReason
  if (isInsufficientCreditError(error)) return 'insufficient-credit'
  const text = normalizedErrorText(error)
  if (
    (text.includes('expired') || text.includes('invalid') || text.includes('authentication')) &&
    (text.includes('key') || text.includes('token') || text.includes('credential'))
  ) {
    return 'authentication'
  }
  if (text.includes('rate limit') || text.includes('too many requests')) return 'rate-limit'
  if (text.includes('model not found') || text.includes('unknown model')) return 'model-not-found'
  if (
    text.includes('failed to fetch') ||
    text.includes('network') ||
    text.includes('cors') ||
    text.includes('connection')
  ) {
    return 'network'
  }
  return 'request-failed'
}

/**
 * A reply the model ended with neither an answer nor a tool call: nothing happened, and the turn
 * would otherwise end on an empty message with no explanation.
 */
export function isEmptyAIReply(message: Pick<UIMessage, 'parts'>): boolean {
  return !message.parts.some((part) => {
    if (part.type === 'text' || part.type === 'reasoning') return part.text.trim().length > 0
    return part.type === 'dynamic-tool' || part.type.startsWith('tool-') || part.type === 'file'
  })
}

export function classifyAIChatFinish(finishReason?: string): AIChatFailure | null {
  return finishReason === 'length' ? { reason: 'output-limit' } : null
}

/** Why a reply with no answer ended: its output budget, or a model that sent nothing at all. */
export function classifyEmptyReply(finishReason?: string): AIChatFailure {
  return classifyAIChatFinish(finishReason) ?? { reason: 'empty-reply' }
}

/** A provider signed in to has no key, so a refused credential is its sign-in or its plan. */
function signInFailureReason(reason: AIChatFailureReason): AIChatFailureReason {
  if (reason === 'authentication') return 'sign-in-expired'
  if (reason === 'forbidden') return 'plan-forbidden'
  return reason
}

export function classifyAIChatError(
  error: unknown,
  { signInOnly = false }: { signInOnly?: boolean } = {}
): AIChatFailure {
  const reason = failureReason(error)
  return {
    reason: signInOnly ? signInFailureReason(reason) : reason,
    detail: errorText(error),
    statusCode: providerErrorStatus(error) ?? undefined,
    // A provider error after the stream starts arrives as StreamProviderError, not APICallError.
    retryable:
      APICallError.isInstance(error) || StreamProviderError.isInstance(error)
        ? error.isRetryable
        : undefined
  }
}
