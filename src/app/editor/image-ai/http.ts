import { IS_TAURI } from '@pairdraw/core/constants'

import { readBoundedBody } from '@/app/document/io/browser'
import { tauriFetch } from '@/app/tauri/http'

import { ImageAIAuthError, ImageAITimeoutError } from './types'

/** Image models take a while; a large edit can run past a minute. */
const IMAGE_AI_TIMEOUT_MS = 180_000
const NATIVE_TIMEOUT_GRACE_MS = 1000
/** gpt-image answers carry base64 PNGs of up to a few megapixels. */
const MAX_IMAGE_AI_RESPONSE_BYTES = 64 * 1024 * 1024
/** How much of a failure's body is read, and how much of it a message quotes. */
const ERROR_DETAIL_BYTES = 4096
const ERROR_DETAIL_CHARS = 300

/** An answer read in full: a success's body, or the start of a failure's for its message. */
export interface ImageAIResponse {
  ok: boolean
  status: number
  url: string
  contentType: string
  bytes: Uint8Array
}

interface ImageAIFetchOptions {
  maxResponseBytes?: number
  timeoutMs?: number
  sizeError?: string
}

/**
 * Sends a request and reads its answer under one deadline, through the desktop app's native
 * proxy where there is one. A browser's fetch resolves on the headers, so a service that stalls
 * in the body would otherwise hold the request open with no timeout left.
 */
export async function imageAIFetch(
  input: string,
  init: RequestInit,
  {
    maxResponseBytes = MAX_IMAGE_AI_RESPONSE_BYTES,
    timeoutMs = IMAGE_AI_TIMEOUT_MS,
    sizeError = 'The image service answered with too much data'
  }: ImageAIFetchOptions = {}
): Promise<ImageAIResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const requestInit: RequestInit = {
      ...init,
      credentials: 'omit',
      redirect: 'error',
      signal: controller.signal
    }
    const response = await (IS_TAURI
      ? tauriFetch(input, requestInit, maxResponseBytes, timeoutMs + NATIVE_TIMEOUT_GRACE_MS)
      : fetch(input, requestInit))
    const bytes = response.ok
      ? await readBoundedBody(response, maxResponseBytes, { sizeError })
      : await readBoundedBody(response, ERROR_DETAIL_BYTES, { sizeError }).catch(
          () => new Uint8Array()
        )
    if (controller.signal.aborted) throw new ImageAITimeoutError()
    return {
      ok: response.ok,
      status: response.status,
      url: response.url,
      contentType: response.headers.get('content-type') ?? '',
      bytes
    }
  } catch (error) {
    if (controller.signal.aborted) throw new ImageAITimeoutError()
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export function responseText(response: ImageAIResponse): string {
  return new TextDecoder().decode(response.bytes)
}

/** `text` with every copy of `secret` masked, for messages that may quote a service's answer. */
export function redactSecret(text: string, secret: string): string {
  return secret ? text.split(secret).join('•••') : text
}

/**
 * The error a failed answer stands for: a refused key without anything the service said, since
 * services echo part of the key back, or the start of its message with the key masked.
 */
export function imageAIFailure(
  service: string,
  response: ImageAIResponse,
  secret: string,
  authStatuses: readonly number[] = [401, 403]
): Error {
  if (authStatuses.includes(response.status)) return new ImageAIAuthError(service)
  const detail = redactSecret(responseText(response).trim(), secret).slice(0, ERROR_DETAIL_CHARS)
  return new Error(
    detail
      ? `${service} failed (${response.status}): ${detail}`
      : `${service} failed (${response.status})`
  )
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47]
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46]
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50]

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

/** Whether `bytes` are a PNG, JPEG or WebP image, the kinds image services answer with. */
export function isRasterImage(bytes: Uint8Array): boolean {
  return (
    startsWith(bytes, PNG_SIGNATURE) ||
    startsWith(bytes, JPEG_SIGNATURE) ||
    (startsWith(bytes, RIFF_SIGNATURE) && startsWith(bytes, WEBP_SIGNATURE, 8))
  )
}

/** A Blob of `bytes` for a multipart upload, without sharing the caller's buffer. */
export function pngBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes.slice()], { type: 'image/png' })
}
