import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'

import { fromUint8Array } from 'js-base64'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { getCanvasKit } from '@pairdraw/core/canvaskit'
import type { Fill } from '@pairdraw/scene-graph'

import {
  generateImageFill,
  generateImageLayer,
  generateSVGLayers,
  removeImageBackground,
  replaceImageBackground
} from '@/app/editor/image-ai'
import { createAgentImageAIService } from '@/app/editor/image-ai/agent'
import { setImageAICredential } from '@/app/editor/image-ai/credentials'
import {
  backgroundServiceID,
  imageAIBaseURL,
  imageAIProviderID
} from '@/app/editor/image-ai/preferences'
import { createEditorStore } from '@/app/editor/session/create'
import { setVectorizeCredential, vectorizeProviderID } from '@/app/editor/vectorize'
import { notificationMessages } from '@/app/i18n/notifications'
import { settingsDialogOpen } from '@/app/settings/dialog'
import { toast } from '@/app/shell/ui'

import { fetchStub } from '#tests/helpers/fetch'

const ck = await getCanvasKit()

/** A PNG of one flat colour, so each colour hashes to an image of its own. */
function solidPNG(r: number, g: number, b: number, a = 1): Uint8Array {
  const surface = ck.MakeSurface(4, 4)
  if (!surface) throw new Error('No raster surface')
  surface.getCanvas().clear(ck.Color(r, g, b, a))
  const image = surface.makeImageSnapshot()
  const bytes = image.encodeToBytes(ck.ImageFormat.PNG, 100)
  image.delete()
  surface.delete()
  if (!bytes) throw new Error('Could not encode the PNG')
  return new Uint8Array(bytes)
}

const PHOTO = solidPNG(40, 120, 200)
const CUTOUT = solidPNG(0, 0, 0, 0)
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="20" fill="#f00"/><circle cx="20" cy="30" r="8" fill="#00f"/></svg>'

const stores: ReturnType<typeof createEditorStore>[] = []
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>> | null = null

function imageAnswer(bytes: Uint8Array) {
  return Response.json({ data: [{ b64_json: fromUint8Array(bytes) }] })
}

function answerWith(answer: (url: string) => Response) {
  const urls: string[] = []
  fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
    fetchStub(async (input) => {
      urls.push(String(input))
      return answer(String(input))
    })
  )
  return urls
}

/** A document with one selected rectangle, showing a photo unless `fills` says otherwise. */
function documentWithLayer(fills?: Fill[]) {
  const store = createEditorStore()
  stores.push(store)
  const imageHash = store.storeImage(PHOTO)
  const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
    name: 'Photo',
    width: 160,
    height: 90,
    fills: fills ?? [
      {
        type: 'IMAGE',
        imageHash,
        imageScaleMode: 'FIT',
        color: { r: 0, g: 0, b: 0, a: 0 },
        opacity: 1,
        visible: true
      }
    ]
  })
  store.select([node.id])
  return { store, nodeId: node.id, imageHash }
}

/** An image fill showing `imageHash`, or none yet, as the picker leaves a paint switched to Image. */
function imageFill(imageHash: string | undefined, imageScaleMode: Fill['imageScaleMode']): Fill {
  return {
    type: 'IMAGE',
    ...(imageHash ? { imageHash } : {}),
    imageScaleMode,
    color: { r: 0, g: 0, b: 0, a: 0 },
    opacity: 1,
    visible: true
  }
}

function lastErrorToast(): string | undefined {
  return toast.toasts.value.findLast((entry) => entry.variant === 'error')?.message
}

function imageHashes(store: ReturnType<typeof createEditorStore>, nodeId: string) {
  return (store.graph.getNode(nodeId)?.fills ?? []).map((fill) => fill.imageHash ?? fill.type)
}

beforeEach(async () => {
  imageAIProviderID.value = 'openai'
  backgroundServiceID.value = 'image-ai'
  await setImageAICredential('openai', 'sk-test')
})

afterEach(async () => {
  fetchSpy?.mockRestore()
  fetchSpy = null
  for (const store of stores.splice(0)) store.dispose()
  settingsDialogOpen.value = false
  await setImageAICredential('openai', '')
  await setImageAICredential('openai-compatible', '')
  await setVectorizeCredential('quiver', '')
  imageAIBaseURL.value = ''
  vectorizeProviderID.value = 'recraft'
})

describe('image AI on the canvas', () => {
  test('removing a background swaps the image, keeps its framing, and undoes in one step', async () => {
    const { store, nodeId, imageHash } = documentWithLayer()
    const urls = answerWith(() => imageAnswer(CUTOUT))

    expect(await removeImageBackground(store, nodeId)).toBe(true)
    expect(urls).toEqual(['https://api.openai.com/v1/images/edits'])
    const [fill] = store.graph.getNode(nodeId)?.fills ?? []
    expect(fill?.imageHash).not.toBe(imageHash)
    expect(fill?.imageScaleMode).toBe('FIT')
    expect(fill?.imageHash && store.graph.images.get(fill.imageHash)).toEqual(CUTOUT)

    store.undoAction()
    expect(imageHashes(store, nodeId)).toEqual([imageHash])
    store.redoAction()
    expect(imageHashes(store, nodeId)).toEqual([fill?.imageHash ?? 'missing'])
  })

  test('with no key saved nothing is sent, the layer stays, and Settings opens', async () => {
    await setImageAICredential('openai', '')
    const { store, nodeId, imageHash } = documentWithLayer()
    const urls = answerWith(() => imageAnswer(CUTOUT))

    expect(await replaceImageBackground(store, nodeId, 'a beach')).toBe(false)
    expect(urls).toEqual([])
    expect(imageHashes(store, nodeId)).toEqual([imageHash])
    expect(settingsDialogOpen.value).toBe(true)
  })

  test('an OpenAI-compatible service without an address is never asked', async () => {
    imageAIProviderID.value = 'openai-compatible'
    await setImageAICredential('openai-compatible', 'sk-other')
    const { store, nodeId } = documentWithLayer()
    const urls = answerWith(() => imageAnswer(CUTOUT))

    expect(await generateImageFill(store, nodeId, 'a beach', { orientation: 'square' })).toBe(false)
    expect(urls).toEqual([])
  })

  test('an image that changes while the service works is left as the person made it', async () => {
    const { store, nodeId } = documentWithLayer()
    const replacement = store.storeImage(solidPNG(250, 10, 10))
    answerWith(() => {
      store.updateNode(nodeId, {
        fills: [
          {
            type: 'IMAGE',
            imageHash: replacement,
            imageScaleMode: 'FILL',
            color: { r: 0, g: 0, b: 0, a: 0 },
            opacity: 1,
            visible: true
          }
        ]
      })
      return imageAnswer(CUTOUT)
    })

    expect(await removeImageBackground(store, nodeId)).toBe(false)
    expect(imageHashes(store, nodeId)).toEqual([replacement])
  })

  test('a generated fill goes over the paints a layer has, as one step', async () => {
    const solid: Fill = {
      type: 'SOLID',
      color: { r: 1, g: 1, b: 1, a: 1 },
      opacity: 1,
      visible: true
    }
    const { store, nodeId } = documentWithLayer([solid])
    const urls = answerWith(() => imageAnswer(CUTOUT))

    expect(await generateImageFill(store, nodeId, 'a beach', { orientation: 'landscape' })).toBe(
      true
    )
    expect(urls).toEqual(['https://api.openai.com/v1/images/generations'])
    const fills = store.graph.getNode(nodeId)?.fills ?? []
    expect(fills.map((fill) => fill.type)).toEqual(['SOLID', 'IMAGE'])
    store.undoAction()
    expect(store.graph.getNode(nodeId)?.fills.map((fill) => fill.type)).toEqual(['SOLID'])
  })

  test('a fill the picker switched to Image gets the generated image, as one step', async () => {
    const solid: Fill = {
      type: 'SOLID',
      color: { r: 1, g: 1, b: 1, a: 1 },
      opacity: 1,
      visible: true
    }
    const { store, nodeId } = documentWithLayer([solid, imageFill(undefined, 'FIT')])
    answerWith(() => imageAnswer(CUTOUT))

    expect(
      await generateImageFill(store, nodeId, 'a beach', { orientation: 'landscape', fillIndex: 1 })
    ).toBe(true)
    const fills = store.graph.getNode(nodeId)?.fills ?? []
    expect(fills.map((fill) => fill.type)).toEqual(['SOLID', 'IMAGE'])
    expect(fills[1]?.imageScaleMode).toBe('FIT')
    expect(fills[1]?.imageHash && store.graph.images.get(fills[1].imageHash)).toEqual(CUTOUT)

    store.undoAction()
    expect(imageHashes(store, nodeId)).toEqual(['SOLID', 'IMAGE'])
  })

  test('without a fill named, an image fill with no image yet is filled, not covered', async () => {
    const { store, nodeId } = documentWithLayer([imageFill(undefined, 'TILE')])
    answerWith(() => imageAnswer(CUTOUT))

    expect(await generateImageFill(store, nodeId, 'a beach', { orientation: 'square' })).toBe(true)
    const fills = store.graph.getNode(nodeId)?.fills ?? []
    expect(fills).toHaveLength(1)
    expect(fills[0]?.imageScaleMode).toBe('TILE')
    expect(fills[0]?.imageHash).toBeString()
  })

  test('the picker’s lower image fill gets the image, and the one above it stays', async () => {
    const { store, nodeId, imageHash } = documentWithLayer()
    const upper = store.storeImage(solidPNG(250, 10, 10))
    store.updateNode(nodeId, { fills: [imageFill(imageHash, 'FIT'), imageFill(upper, 'FILL')] })
    answerWith(() => imageAnswer(CUTOUT))

    expect(
      await generateImageFill(store, nodeId, 'a beach', { orientation: 'square', fillIndex: 0 })
    ).toBe(true)
    const [lower, top] = store.graph.getNode(nodeId)?.fills ?? []
    expect(lower?.imageHash).not.toBe(imageHash)
    expect(lower?.imageScaleMode).toBe('FIT')
    expect(top?.imageHash).toBe(upper)
  })

  test('a picker fill that changes while the service works is left alone', async () => {
    const { store, nodeId } = documentWithLayer([imageFill(undefined, 'FILL')])
    const chosen = store.storeImage(solidPNG(250, 10, 10))
    answerWith(() => {
      store.updateNode(nodeId, { fills: [imageFill(chosen, 'FILL')] })
      return imageAnswer(CUTOUT)
    })

    expect(
      await generateImageFill(store, nodeId, 'a beach', { orientation: 'square', fillIndex: 0 })
    ).toBe(false)
    expect(imageHashes(store, nodeId)).toEqual([chosen])
  })

  test('a generated image lands as a new selected layer that one undo removes', async () => {
    const { store } = documentWithLayer()
    // Placing reads the image's size with CanvasKit; nothing is drawn, so a 1×1 surface does.
    const surface = ck.MakeSurface(1, 1)
    if (!surface) throw new Error('Could not create a CanvasKit surface')
    store.setCanvasKit(ck, new SkiaRenderer(ck, surface))
    spyOn(store, 'viewportCanvasCenter').mockReturnValue({ x: 400, y: 300 })
    const before = store.graph.getChildren(store.state.currentPageId).length
    const urls = answerWith(() => imageAnswer(PHOTO))

    expect(await generateImageLayer(store, 'a red cup', { orientation: 'square' })).toBe(true)
    expect(urls).toEqual(['https://api.openai.com/v1/images/generations'])
    const [layerId] = store.state.selectedIds
    const layer = layerId ? store.graph.getNode(layerId) : undefined
    expect(layer?.type).toBe('RECTANGLE')
    expect(layer?.name).toBe('a red cup')
    expect(layer?.fills.map((fill) => fill.type)).toEqual(['IMAGE'])
    expect(store.graph.getChildren(store.state.currentPageId)).toHaveLength(before + 1)

    store.undoAction()
    expect(store.graph.getChildren(store.state.currentPageId)).toHaveLength(before)
  })

  test('a generated image that cannot be placed says so, not that a layer changed', async () => {
    const { store } = documentWithLayer()
    spyOn(store, 'viewportCanvasCenter').mockReturnValue({ x: 400, y: 300 })
    const before = store.graph.getChildren(store.state.currentPageId).length
    answerWith(() => imageAnswer(PHOTO))

    expect(await generateImageLayer(store, 'a red cup', { orientation: 'square' })).toBe(false)
    expect(lastErrorToast()).toBe(notificationMessages.get().imageAIPlaceFailed)
    expect(store.graph.getChildren(store.state.currentPageId)).toHaveLength(before)
  })

  test('generated SVG lands as editable layers, selected, and one undo removes them', async () => {
    vectorizeProviderID.value = 'quiver'
    await setVectorizeCredential('quiver', 'qv-test')
    const { store } = documentWithLayer()
    // The view's middle comes from the canvas element, which a headless document has none of.
    spyOn(store, 'viewportCanvasCenter').mockReturnValue({ x: 400, y: 300 })
    const before = store.graph.getChildren(store.state.currentPageId).length
    answerWith(() => Response.json({ id: 'r', created: 1, data: [{ svg: SVG }] }))

    expect(await generateSVGLayers(store, 'a flag')).toBe(true)
    const [frameId] = store.state.selectedIds
    const frame = frameId ? store.graph.getNode(frameId) : undefined
    expect(frame?.childIds.length).toBeGreaterThan(0)
    expect(store.graph.getChildren(store.state.currentPageId)).toHaveLength(before + 1)

    store.undoAction()
    expect(store.graph.getChildren(store.state.currentPageId)).toHaveLength(before)
  })
})

describe('the image services agents reach', () => {
  test('ask for a key in Settings without calling the service', async () => {
    await setImageAICredential('openai', '')
    const { store } = documentWithLayer()
    const urls = answerWith(() => imageAnswer(CUTOUT))
    await expect(
      createAgentImageAIService(store).generateImage({ prompt: 'a cup', orientation: 'square' })
    ).rejects.toThrow(
      'No OpenAI API key is saved. Ask the user to add one in Settings → Image services'
    )
    expect(urls).toEqual([])
  })

  test('relay a refused key as something the user can fix, never the key', async () => {
    const { store } = documentWithLayer()
    answerWith(
      () => new Response('{"error":"Incorrect API key provided: sk-test"}', { status: 401 })
    )
    const failure = createAgentImageAIService(store).removeBackground({
      imageHash: 'photo',
      bytes: PHOTO
    })
    await expect(failure).rejects.toThrow(
      'OpenAI rejected the saved API key. Ask the user to update it in Settings → Image services.'
    )
    await expect(failure).rejects.not.toThrow('sk-test')
  })

  test('return the bytes and markup the services answer with', async () => {
    const { store } = documentWithLayer()
    answerWith((url) =>
      url.includes('quiver')
        ? Response.json({ id: 'r', created: 1, data: [{ svg: SVG }] })
        : imageAnswer(CUTOUT)
    )
    vectorizeProviderID.value = 'quiver'
    await setVectorizeCredential('quiver', 'qv-test')
    const service = createAgentImageAIService(store)
    expect(
      await service.replaceBackground({ imageHash: 'photo', bytes: PHOTO, prompt: 'a beach' })
    ).toEqual(CUTOUT)
    expect(await service.generateSVG({ prompt: 'a flag' })).toBe(SVG)
  })
})
