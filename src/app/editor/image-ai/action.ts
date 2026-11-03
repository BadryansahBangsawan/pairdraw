import { shallowReactive } from 'vue'

import { canHoldImageFill, layerNameFromPrompt } from '@open-pencil/core/tools'
import { vectorizableImageFill } from '@open-pencil/core/vector'

import type { EditorStore } from '@/app/editor/active-store'
import { notificationMessages } from '@/app/i18n/notifications'
import { openSettingsDialog } from '@/app/settings/dialog'
import { toast } from '@/app/shell/ui'

import {
  applyGeneratedImageFill,
  applyGeneratedImageToFill,
  placeGeneratedImage,
  placeGeneratedSVG,
  replaceImageFill,
  singleSelectedNode
} from './apply'
import {
  backgroundServiceName,
  imageAICanvasKit,
  imageServiceName,
  requestBackgroundRemoval,
  requestBackgroundReplacement,
  requestImageGeneration,
  requestSVGGeneration,
  svgServiceName
} from './request'
import {
  ImageAIAuthError,
  ImageAITimeoutError,
  type ImageAIOrientation,
  type ImageAIOutcome
} from './types'

/** Documents with an image request in flight; one at a time, so results never cross. */
const runningStores = shallowReactive(new Set<EditorStore>())
const ERROR_MAX_LENGTH = 240
const GENERATED_IMAGE_NAME = 'Generated image'

export function isImageAIRunning(store: EditorStore): boolean {
  return runningStores.has(store)
}

/** Whether the selection is one layer showing an image whose background can be changed. */
export function canEditImageBackground(store: EditorStore): boolean {
  const node = singleSelectedNode(store)
  return Boolean(node && vectorizableImageFill(node))
}

/** Whether the selection is one layer that can show a generated image fill. */
export function canGenerateImageFill(store: EditorStore): boolean {
  const node = singleSelectedNode(store)
  return Boolean(node && canHoldImageFill(node))
}

/** A failure's message for a toast: never a key, and short enough to read. */
function imageAIErrorMessage(error: unknown): string {
  let message = 'The request failed'
  if (error instanceof ImageAITimeoutError) message = error.message
  else if (error instanceof TypeError) message = error.message || 'Network request failed'
  else if (error instanceof Error) message = error.message
  return message.length <= ERROR_MAX_LENGTH ? message : `${message.slice(0, ERROR_MAX_LENGTH)}…`
}

type Progress =
  | 'imageAIRemovingBackground'
  | 'imageAIReplacingBackground'
  | 'imageAIGeneratingImage'
  | 'imageAIGeneratingSVG'

type Done =
  | 'imageAIBackgroundRemoved'
  | 'imageAIBackgroundReplaced'
  | 'imageAIImageGenerated'
  | 'imageAISVGGenerated'

interface ImageAIRun<T> {
  /** The service named in a failure that happens before it answers. */
  service: () => string
  progress: Progress
  done: Done
  request: (onRequest: () => void) => Promise<ImageAIOutcome<T>>
  /** Puts the result in the document as one undo step; false when it could not. */
  apply: (value: T) => boolean | Promise<boolean>
  /** Why `apply` could not put it there; by default, its layer changed meanwhile. */
  notApplied?: 'imageAITargetChanged' | 'imageAIPlaceFailed'
}

/**
 * Runs one image request for a document: says it started once the service is set up, sends the
 * person to Settings when a key or address is missing, and reports the outcome in a toast, since
 * the menu or dialog that started it has closed by then. True when the result was applied.
 */
async function runImageAI<T>(store: EditorStore, run: ImageAIRun<T>): Promise<boolean> {
  const messages = () => notificationMessages.get()
  if (runningStores.has(store)) {
    toast.info(messages().imageAIBusy)
    return false
  }
  runningStores.add(store)
  let service = run.service()
  try {
    const outcome = await run.request(() => toast.info(messages()[run.progress]))
    service = outcome.service
    if (outcome.status === 'missing-key') {
      toast.error(messages().imageAICredentialRequired({ service }))
      openSettingsDialog('services')
      return false
    }
    if (outcome.status === 'missing-base-url') {
      toast.error(messages().imageAIBaseURLRequired({ service }))
      openSettingsDialog('services')
      return false
    }
    if (!(await run.apply(outcome.value))) {
      toast.error(messages()[run.notApplied ?? 'imageAITargetChanged'])
      return false
    }
    toast.info(messages()[run.done])
    return true
  } catch (error) {
    if (error instanceof ImageAIAuthError) {
      toast.error(messages().imageAICredentialRejected({ service: error.service }))
      openSettingsDialog('services')
    } else {
      console.error('[Image AI] Request failed:', error)
      toast.error(messages().imageAIFailed({ service, error: imageAIErrorMessage(error) }))
    }
    return false
  } finally {
    runningStores.delete(store)
  }
}

/** The image a layer shows, read when the request starts, or null after saying why not. */
function sourceImage(store: EditorStore, nodeId: string) {
  const node = store.graph.getNode(nodeId)
  const fill = node ? vectorizableImageFill(node) : null
  if (!node || !fill) return null
  const bytes = store.graph.images.get(fill.imageHash)
  if (!bytes) {
    toast.error(notificationMessages.get().vectorizeImageMissing)
    return null
  }
  return { imageHash: fill.imageHash, bytes }
}

/** Replaces a layer's image with its subject on a transparent background, as one undo step. */
export async function removeImageBackground(store: EditorStore, nodeId: string): Promise<boolean> {
  const source = sourceImage(store, nodeId)
  if (!source) return false
  return runImageAI(store, {
    service: backgroundServiceName,
    progress: 'imageAIRemovingBackground',
    done: 'imageAIBackgroundRemoved',
    request: async (onRequest) =>
      requestBackgroundRemoval(await imageAICanvasKit(store), source.bytes, onRequest),
    apply: (bytes) => replaceImageFill(store, nodeId, source.imageHash, bytes, 'Remove background')
  })
}

/** Keeps a layer's subject and paints the background `description` asks for, as one step. */
export async function replaceImageBackground(
  store: EditorStore,
  nodeId: string,
  description: string
): Promise<boolean> {
  const source = sourceImage(store, nodeId)
  if (!source || !description.trim()) return false
  return runImageAI(store, {
    service: imageServiceName,
    progress: 'imageAIReplacingBackground',
    done: 'imageAIBackgroundReplaced',
    request: async (onRequest) =>
      requestBackgroundReplacement(
        await imageAICanvasKit(store),
        source.bytes,
        description,
        onRequest
      ),
    apply: (bytes) => replaceImageFill(store, nodeId, source.imageHash, bytes, 'Replace background')
  })
}

export interface ImageGenerationOptions {
  orientation: ImageAIOrientation
  transparent?: boolean
}

export interface ImageFillGenerationOptions extends ImageGenerationOptions {
  /** The image fill to show it in, as the fill picker edits one; by default the layer's image. */
  fillIndex?: number
}

/**
 * Generates an image into a layer's fill: the image fill at `fillIndex`, or else in place of its
 * image, in its image fill with no image yet, or over its other paints.
 */
export async function generateImageFill(
  store: EditorStore,
  nodeId: string,
  prompt: string,
  { fillIndex, ...options }: ImageFillGenerationOptions
): Promise<boolean> {
  if (!prompt.trim()) return false
  const label = 'Generate image fill'
  let apply = (bytes: Uint8Array) => applyGeneratedImageFill(store, nodeId, bytes, label)
  if (fillIndex !== undefined) {
    // The fill as the request starts: the result goes there only while it still shows that image.
    const target = store.graph.getNode(nodeId)?.fills.at(fillIndex)
    if (fillIndex < 0 || target?.type !== 'IMAGE') return false
    const previousHash = target.imageHash
    apply = (bytes) =>
      applyGeneratedImageToFill(store, nodeId, fillIndex, previousHash, bytes, label)
  }
  return runImageAI(store, {
    service: imageServiceName,
    progress: 'imageAIGeneratingImage',
    done: 'imageAIImageGenerated',
    request: (onRequest) => requestImageGeneration({ prompt, ...options }, onRequest),
    apply
  })
}

/** Generates an image as a new layer in the middle of the view, selected, as one step. */
export async function generateImageLayer(
  store: EditorStore,
  prompt: string,
  options: ImageGenerationOptions
): Promise<boolean> {
  if (!prompt.trim()) return false
  return runImageAI(store, {
    service: imageServiceName,
    progress: 'imageAIGeneratingImage',
    done: 'imageAIImageGenerated',
    request: (onRequest) => requestImageGeneration({ prompt, ...options }, onRequest),
    apply: (bytes) =>
      placeGeneratedImage(store, bytes, layerNameFromPrompt(prompt, GENERATED_IMAGE_NAME)),
    notApplied: 'imageAIPlaceFailed'
  })
}

/** Generates SVG and places it as editable layers in the middle of the view, as one step. */
export async function generateSVGLayers(store: EditorStore, prompt: string): Promise<boolean> {
  if (!prompt.trim()) return false
  return runImageAI(store, {
    service: svgServiceName,
    progress: 'imageAIGeneratingSVG',
    done: 'imageAISVGGenerated',
    request: (onRequest) => requestSVGGeneration(prompt, onRequest),
    apply: (svg) => placeGeneratedSVG(store, svg),
    notApplied: 'imageAIPlaceFailed'
  })
}
