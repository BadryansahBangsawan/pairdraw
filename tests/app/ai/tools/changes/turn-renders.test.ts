import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { extractExportGraph } from '@pairdraw/core/io'
import { type SceneNode } from '@pairdraw/scene-graph'

import { queueTurnRenders, turnRendersDrained } from '@/app/ai/tools/changes/turn-renders'
import { freeTurnRenders, readTurnRenders } from '@/app/ai/tools/changes/turn-store'
import * as figmaFactory from '@/app/automation/bridge/figma-factory'
import { createEditorStore } from '@/app/editor/session/create'

type EditorStore = ReturnType<typeof createEditorStore>

interface Rendered {
  nodeIds: string[]
  scale: number
}

let store: EditorStore
let rendered: Rendered[] = []
let factory: ReturnType<typeof spyOn>

/** Draws every image the queue asks for, recording which node and scale it used. */
function drawImages(): void {
  factory.mockImplementation((editor: EditorStore) => {
    const api = new FigmaAPI(editor.graph)
    api.exportGraphImage = async (_graph, _pageId, nodeIds, options) => {
      rendered.push({ nodeIds: [...nodeIds], scale: options.scale ?? 1 })
      return new Uint8Array([1, 2, 3])
    }
    return api
  })
}

beforeEach(() => {
  store = createEditorStore()
  rendered = []
  // No images unless a test asks for them, as a document whose renderer is not ready.
  factory = spyOn(figmaFactory, 'makeFigmaFromStore').mockImplementation((editor) => {
    const api = new FigmaAPI(editor.graph)
    api.exportGraphImage = async () => null
    return api
  })
})

afterEach(() => {
  factory.mockRestore()
  store.dispose()
})

function hero(name = 'Hero') {
  return store.graph.createNode('FRAME', store.state.currentPageId, {
    name,
    width: 900,
    height: 600,
    layoutMode: 'HORIZONTAL'
  })
}

/** The batch a caller freezes, as `queueTurnRenders` expects it. */
function batch(frames: SceneNode[]) {
  const pageId = store.state.currentPageId
  return {
    frames: frames.map((node) => {
      const copy = extractExportGraph(store.graph, { scope: 'node', nodeId: node.id })
      return { frameId: node.id, pageId, before: copy.graph, name: node.name }
    }),
    changed: frames.length
  }
}

/** The newest scale the queue asked for, so a test can tell which width was drawn. */
function scales(): number[] {
  return rendered.map((entry) => entry.scale)
}

test('reports renders unavailable when no image can be drawn', async () => {
  const frame = hero()

  queueTurnRenders(store, 'reply-1', batch([frame]))
  await turnRendersDrained(store)

  expect(readTurnRenders('reply-1')?.status).toBe('unavailable')
  expect(rendered).toHaveLength(0)
})

test('drops a width the frame’s min width clamps', async () => {
  drawImages()
  const frame = hero()
  store.graph.updateNode(frame.id, { minWidth: 500 })
  store.graph.createNode('FRAME', frame.id, { name: 'Body', width: 100, layoutGrow: 1 })

  queueTurnRenders(store, 'reply-2', batch([frame]))
  await turnRendersDrained(store)

  const record = readTurnRenders('reply-2')
  if (record?.status !== 'ready') throw new Error('renders did not finish')
  expect(record.frames[0]?.widths.map((width) => width.width)).toEqual([768])
  // Before and after at the frame's own width, then the one width that fit.
  expect(rendered).toHaveLength(3)
})

test('stops at the next image once the card is freed mid-pass', async () => {
  drawImages()
  factory.mockImplementation((editor: EditorStore) => {
    const api = new FigmaAPI(editor.graph)
    api.exportGraphImage = async (_graph, _pageId, nodeIds, options) => {
      rendered.push({ nodeIds: [...nodeIds], scale: options.scale ?? 1 })
      if (rendered.length === 1) freeTurnRenders('reply-3')
      return new Uint8Array([1, 2, 3])
    }
    return api
  })
  const first = hero('First')
  const second = hero('Second')

  queueTurnRenders(store, 'reply-3', batch([first, second]))
  await turnRendersDrained(store)

  // The before image drew; freeing the card stopped the pass before the after image.
  expect(rendered).toHaveLength(1)
  expect(readTurnRenders('reply-3')).toBeNull()
})

test('drops queued renders when the document closes', async () => {
  drawImages()
  const frame = hero()

  queueTurnRenders(store, 'reply-4', batch([frame]))
  store.dispose()
  await turnRendersDrained(store)

  expect(rendered).toHaveLength(0)
  expect(readTurnRenders('reply-4')).toBeNull()
})

test('draws a wide frame within the thumbnail edge', async () => {
  drawImages()
  const frame = hero()

  queueTurnRenders(store, 'reply-5', batch([frame]))
  await turnRendersDrained(store)

  expect(scales()[0]).toBeCloseTo(320 / 900, 5)
})
