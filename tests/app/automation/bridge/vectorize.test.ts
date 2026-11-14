import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'

import { toUint8Array } from 'js-base64'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { SceneGraph } from '@pairdraw/scene-graph'

import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { createAutomationCommandHandlers } from '@/app/automation/bridge/handlers'
import type { AutomationTarget } from '@/app/automation/bridge/target'
import { createEditorStore, type EditorStore } from '@/app/editor/session/create'
import { setVectorizeCredential, vectorizeProviderID } from '@/app/editor/vectorize'

import { fetchStub } from '#tests/helpers/fetch'

const { handleTargetCommand } = createAutomationCommandHandlers(makeFigmaFromStore)
const ck = await initCanvasKit()
/** A whole 1×1 PNG, which the service is sent after preparation. */
const PIXEL_PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
)
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0H100V100H0Z" fill="#336699"/></svg>'

let stores: EditorStore[] = []

beforeEach(async () => {
  // The automation FigmaAPI reads the viewport size from the window; the edit's flash animates.
  Object.assign(globalThis, {
    window: { innerWidth: 1024, innerHeight: 768 },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => undefined
  })
  vectorizeProviderID.value = 'quiver'
  await setVectorizeCredential('quiver', '')
})

afterEach(async () => {
  for (const store of stores) store.dispose()
  stores = []
  for (const name of ['window', 'requestAnimationFrame', 'cancelAnimationFrame']) {
    Reflect.deleteProperty(globalThis, name)
  }
  await setVectorizeCredential('quiver', '')
  vectorizeProviderID.value = 'recraft'
})

/** A document with one ellipse showing an image, on a store that can prepare images. */
function storeWithImage(): { store: EditorStore; target: AutomationTarget; imageId: string } {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  graph.images.set('photo', PIXEL_PNG)
  const image = graph.createNode('ELLIPSE', page.id, {
    name: 'Photo',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    fills: [
      {
        type: 'IMAGE',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
        imageHash: 'photo',
        imageScaleMode: 'FILL'
      }
    ]
  })
  const store = createEditorStore(graph)
  // Preparing an image needs CanvasKit; nothing is drawn, so a 1×1 surface does.
  const surface = ck.MakeSurface(1, 1)
  if (!surface) throw new Error('Could not create a CanvasKit surface')
  store.setCanvasKit(ck, new SkiaRenderer(ck, surface))
  stores.push(store)
  return {
    store,
    imageId: image.id,
    target: {
      store,
      documentId: 'tab-1',
      documentName: 'Document',
      pageId: page.id,
      pageName: page.name
    }
  }
}

function vectorize(target: AutomationTarget, id: string) {
  return handleTargetCommand(target, 'tool', {
    name: 'vectorize_image',
    args: { id }
  }) as Promise<{ ok: boolean; result: Record<string, unknown> }>
}

describe('vectorize_image through the app bridge', () => {
  test('uses the service and key saved in the app, keeps the image, and undoes in one step', async () => {
    await setVectorizeCredential('quiver', 'sk_test_1')
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      fetchStub(async () => Response.json({ id: 'resp_1', created: 1, data: [{ svg: SVG }] }))
    )
    try {
      const { store, target, imageId } = storeWithImage()
      const response = await vectorize(target, imageId)

      const frameId = String(response.result.id)
      expect(response.result).toMatchObject({ type: 'FRAME', source_id: imageId, paths: 1 })
      expect(store.graph.getChildren(target.pageId).map((node) => node.id)).toEqual([
        imageId,
        frameId
      ])

      store.undo.undo()
      expect(store.graph.getChildren(target.pageId).map((node) => node.id)).toEqual([imageId])
    } finally {
      fetchSpy.mockRestore()
    }
  })

  test('tells the agent to ask for a key when none is saved', async () => {
    const { store, target, imageId } = storeWithImage()
    const response = await vectorize(target, imageId)

    expect(String(response.result.error)).toContain(
      'No QuiverAI API key is saved. Ask the user to add one in Settings → Image services'
    )
    expect(store.graph.getChildren(target.pageId)).toHaveLength(1)
  })
})
