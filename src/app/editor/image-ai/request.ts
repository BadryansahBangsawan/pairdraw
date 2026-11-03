import type { CanvasKit } from 'canvaskit-wasm'

import { getCanvasKit } from '@open-pencil/core/canvaskit'

import type { EditorStore } from '@/app/editor/active-store'
import { resolveVectorizeCredential } from '@/app/editor/vectorize/credentials'
import { vectorizeProviderID } from '@/app/editor/vectorize/preferences'
import { getVectorizeProvider } from '@/app/editor/vectorize/providers'

import { resolveImageAICredential } from './credentials'
import {
  editImage,
  generateImage,
  imageAIProviderDefinition,
  OPENAI_BASE_URL,
  REMOVE_BACKGROUND_PROMPT,
  replaceBackgroundPrompt
} from './openai'
import {
  backgroundServiceID,
  imageAIBaseURL,
  imageAIModel,
  imageAIProviderID,
  resolvedImageAIModel
} from './preferences'
import { prepareImageForService } from './prepare'
import { removeBackgroundWithRemoveBg, REMOVE_BG_NAME } from './remove-bg'
import { generateSVGWithService } from './svg'
import type {
  ImageAIConnection,
  ImageAIOutcome,
  ImageEditRequest,
  ImageGenerationRequest
} from './types'

type ConnectionOutcome =
  | { status: 'ok'; connection: ImageAIConnection }
  | Exclude<ImageAIOutcome<never>, { status: 'ok' }>

/**
 * The image service chosen in Settings. An OpenAI-compatible one goes by its server's host name,
 * which says more in a message than the kind of API it speaks.
 */
function selectedImageService() {
  const definition = imageAIProviderDefinition(imageAIProviderID.value)
  if (definition.id === 'openai') return { definition, baseURL: OPENAI_BASE_URL }
  const baseURL = imageAIBaseURL.value
  return { definition: { ...definition, name: serverName(baseURL, definition.name) }, baseURL }
}

/** A server's host name, or `fallback` for a missing or malformed address; requests check it. */
function serverName(baseURL: string, fallback: string): string {
  try {
    return new URL(baseURL).hostname || fallback
  } catch {
    return fallback
  }
}

/** The image service chosen in Settings, with its saved key read for this one request. */
export async function resolveImageAIConnection(): Promise<ConnectionOutcome> {
  const { definition: provider, baseURL } = selectedImageService()
  if (!baseURL) return { status: 'missing-base-url', service: provider.name }
  const apiKey = await resolveImageAICredential(provider.id)
  if (!apiKey) return { status: 'missing-key', service: provider.name }
  return {
    status: 'ok',
    connection: { provider, baseURL, model: resolvedImageAIModel(imageAIModel.value), apiKey }
  }
}

/** The name of the image service chosen in Settings, for messages before it is asked. */
export function imageServiceName(): string {
  return selectedImageService().definition.name
}

/** The name of the service that removes backgrounds, for messages before it is asked. */
export function backgroundServiceName(): string {
  return backgroundServiceID.value === 'remove-bg' ? REMOVE_BG_NAME : imageServiceName()
}

/** The name of the service that draws SVG: the vectorize service chosen in Settings. */
export function svgServiceName(): string {
  return getVectorizeProvider(vectorizeProviderID.value).name
}

/** The CanvasKit that prepares images; a document whose canvas never mounted loads its own. */
export async function imageAICanvasKit(store: EditorStore): Promise<CanvasKit> {
  const ck = store.renderer?.ck ?? (await getCanvasKit())
  return ck
}

function preparePNG(ck: CanvasKit, bytes: Uint8Array): Uint8Array {
  const prepared = prepareImageForService(ck, bytes)
  if (!prepared) throw new Error('This image could not be prepared for the image service')
  return prepared.png
}

/**
 * Generates one image; `onRequest` runs once the service is set up, as the request starts.
 * Rejects when the service fails, with `ImageAIAuthError` when it refuses the key.
 */
export async function requestImageGeneration(
  request: ImageGenerationRequest,
  onRequest?: () => void
): Promise<ImageAIOutcome<Uint8Array>> {
  const resolved = await resolveImageAIConnection()
  if (resolved.status !== 'ok') return resolved
  onRequest?.()
  const { connection } = resolved
  return {
    status: 'ok',
    value: await generateImage(connection, request),
    service: connection.provider.name
  }
}

/** Cuts an image's subject out onto transparency with the background service in Settings. */
export async function requestBackgroundRemoval(
  ck: CanvasKit,
  bytes: Uint8Array,
  onRequest?: () => void
): Promise<ImageAIOutcome<Uint8Array>> {
  if (backgroundServiceID.value === 'remove-bg') {
    const apiKey = await resolveImageAICredential('remove-bg')
    if (!apiKey) return { status: 'missing-key', service: REMOVE_BG_NAME }
    const png = preparePNG(ck, bytes)
    onRequest?.()
    return {
      status: 'ok',
      value: await removeBackgroundWithRemoveBg(png, apiKey),
      service: REMOVE_BG_NAME
    }
  }
  return requestImageEdit(
    ck,
    bytes,
    { prompt: REMOVE_BACKGROUND_PROMPT, transparent: true },
    onRequest
  )
}

/** Keeps an image's subject and paints the background `description` asks for. */
export async function requestBackgroundReplacement(
  ck: CanvasKit,
  bytes: Uint8Array,
  description: string,
  onRequest?: () => void
): Promise<ImageAIOutcome<Uint8Array>> {
  return requestImageEdit(ck, bytes, { prompt: replaceBackgroundPrompt(description) }, onRequest)
}

/** Edits an image as `edit` asks with the image service set up in Settings. */
async function requestImageEdit(
  ck: CanvasKit,
  bytes: Uint8Array,
  edit: Omit<ImageEditRequest, 'image'>,
  onRequest?: () => void
): Promise<ImageAIOutcome<Uint8Array>> {
  const resolved = await resolveImageAIConnection()
  if (resolved.status !== 'ok') return resolved
  const image = preparePNG(ck, bytes)
  onRequest?.()
  const { connection } = resolved
  return {
    status: 'ok',
    value: await editImage(connection, { ...edit, image }),
    service: connection.provider.name
  }
}

/** Draws `prompt` as SVG markup with the vectorize service and key set up in Settings. */
export async function requestSVGGeneration(
  prompt: string,
  onRequest?: () => void
): Promise<ImageAIOutcome<string>> {
  const provider = getVectorizeProvider(vectorizeProviderID.value)
  const apiKey = await resolveVectorizeCredential(provider.id)
  if (!apiKey) return { status: 'missing-key', service: provider.name }
  onRequest?.()
  return {
    status: 'ok',
    value: await generateSVGWithService(provider.id, provider.name, prompt, apiKey),
    service: provider.name
  }
}
