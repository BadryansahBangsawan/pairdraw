import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'

import { fromUint8Array, toUint8Array } from 'js-base64'

import { SkiaRenderer } from '@open-pencil/core/canvas'
import { initCanvasKit } from '@open-pencil/core/io/formats/raster'
import { SceneGraph } from '@open-pencil/scene-graph'

import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { createAutomationCommandHandlers } from '@/app/automation/bridge/handlers'
import type { AutomationTarget } from '@/app/automation/bridge/target'
import { setImageAICredential } from '@/app/editor/image-ai/credentials'
import { imageAIProviderID } from '@/app/editor/image-ai/preferences'
import { createEditorStore, type EditorStore } from '@/app/editor/session/create'

import { fetchStub } from '#tests/helpers/fetch'

const { handleTargetCommand } = createAutomationCommandHandlers(makeFigmaFromStore)
const ck = await initCanvasKit()
/** A whole 1×1 PNG, as the image service answers. */
const PIXEL_PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
)

let stores: EditorStore[] = []

beforeEach(async () => {
  // The automation FigmaAPI reads the viewport size from the window; the edit's flash animates.
  Object.assign(globalThis, {
    window: { innerWidth: 1024, innerHeight: 768 },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => undefined
  })
  imageAIProviderID.value = 'openai'
  await setImageAICredential('openai', '')
})

afterEach(async () => {
  for (const store of stores) store.dispose()
  stores = []
  for (const name of ['window', 'requestAnimationFrame', 'cancelAnimationFrame']) {
    Reflect.deleteProperty(globalThis, name)
  }
  await setImageAICredential('openai', '')
})

function emptyDocument(): { store: EditorStore; target: AutomationTarget } {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const store = createEditorStore(graph)
  // Nothing is drawn, so a 1×1 surface does.
  const surface = ck.MakeSurface(1, 1)
  if (!surface) throw new Error('Could not create a CanvasKit surface')
  store.setCanvasKit(ck, new SkiaRenderer(ck, surface))
  stores.push(store)
  return {
    store,
    target: {
      store,
      documentId: 'tab-1',
      documentName: 'Document',
      pageId: page.id,
      pageName: page.name
    }
  }
}

function generateImage(target: AutomationTarget, args: Record<string, unknown>) {
  return handleTargetCommand(target, 'tool', { name: 'generate_image', args }) as Promise<{
    ok: boolean
    result: Record<string, unknown>
  }>
}

describe('image AI tools through the app bridge', () => {
  test('generate on the service and key saved in the app, and undo in one step', async () => {
    await setImageAICredential('openai', 'sk_test_1')
    const urls: string[] = []
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      fetchStub(async (input) => {
        urls.push(String(input))
        return Response.json({ data: [{ b64_json: fromUint8Array(PIXEL_PNG) }] })
      })
    )
    try {
      const { store, target } = emptyDocument()
      const response = await generateImage(target, { prompt: 'A red kite', width: 64 })

      expect(response.result).toMatchObject({ type: 'RECTANGLE', name: 'A red kite' })
      expect(urls.some((url) => url.includes('/images/generations'))).toBe(true)
      const layerId = String(response.result.id)
      expect(store.graph.getNode(layerId)).toMatchObject({ width: 64, height: 64 })

      store.undo.undo()
      expect(store.graph.getChildren(target.pageId)).toHaveLength(0)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  test('tell the agent to ask for a key when none is saved', async () => {
    const { store, target } = emptyDocument()
    const response = await generateImage(target, { prompt: 'A red kite' })

    expect(String(response.result.error)).toContain('Settings → Image services')
    expect(String(response.result.error)).not.toContain('sk_')
    expect(store.graph.getChildren(target.pageId)).toHaveLength(0)
  })
})
