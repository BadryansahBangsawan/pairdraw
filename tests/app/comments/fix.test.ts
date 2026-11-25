import { afterAll, afterEach, expect, spyOn, test } from 'bun:test'

import type { CommentRegion, CommentThread } from '@pairdraw/scene-graph'
import { SceneGraph } from '@pairdraw/scene-graph'

import type { ImageAttachmentDraft } from '@/app/ai/attachment/image/types'
import {
  hasPendingPrompt,
  promptSubmission,
  setPendingPrompt,
  takePendingPrompt
} from '@/app/ai/chat/pending-prompt'
import type { FixAgentDeps } from '@/app/comments/fix'
import { fixThreadWithAgent, regionCrop } from '@/app/comments/fix'
import type { EditorStore } from '@/app/editor/active-store'

import { asDouble } from '#tests/helpers/doubles'

/** The crop's bound, as the region carries it. */
type RegionBounds = CommentRegion['bounds']

/** What the fake renderer was asked to draw: enough to check the crop and its bound. */
const rendered: Array<{ pageId: string; bounds: RegionBounds; scale: number }> = []

/** PNG magic bytes; the fake renderer's output stands in for a real render. */
const PNG = new Uint8Array([137, 80, 78, 71])
let renderResult: Uint8Array | null = PNG
let accepts = true
let sendSucceeds = true

/** Object URLs this test's stubbed URL API handed out, and the ones revoked. */
const createdURLs: string[] = []
const revokedURLs: string[] = []
let urlCount = 0
const createURL = spyOn(URL, 'createObjectURL').mockImplementation((_blob: Blob | MediaSource) => {
  const url = `blob:test-${++urlCount}`
  createdURLs.push(url)
  return url
})
const revokeURL = spyOn(URL, 'revokeObjectURL').mockImplementation((url: string) => {
  revokedURLs.push(url)
})

/** The outside of a fix click: the renderer, and a chat that records what it receives. */
function agentDeps(): FixAgentDeps {
  return asDouble<FixAgentDeps>({
    accepts: () => accepts,
    renderRegion: async (
      _ck: unknown,
      _graph: unknown,
      pageId: string,
      bounds: RegionBounds,
      scale: number
    ) => {
      rendered.push({ pageId, bounds, scale })
      return renderResult
    },
    send: async (
      store: EditorStore,
      text: string,
      options: { images?: ImageAttachmentDraft[] } = {}
    ) => {
      if (!sendSucceeds) return false
      setPendingPrompt(store, promptSubmission(text, [], options.images ?? []))
      return true
    }
  })
}

afterEach(() => {
  rendered.length = 0
  createdURLs.length = 0
  revokedURLs.length = 0
  urlCount = 0
  renderResult = PNG
  accepts = true
  sendSucceeds = true
})

afterAll(() => {
  createURL.mockRestore()
  revokeURL.mockRestore()
})

const region = (width: number, height: number): CommentRegion => ({
  points: [
    [0, 0],
    [width, 0],
    [width, height]
  ],
  width: 2,
  bounds: { minX: 0, minY: 0, maxX: width, maxY: height }
})

function thread(graph: SceneGraph, overrides: Partial<CommentThread> = {}): CommentThread {
  return {
    id: 'c-1',
    pageId: graph.getPages()[0].id,
    x: 100,
    y: 200,
    author: 'Ana',
    text: 'contrast is too low',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    resolved: false,
    replies: [],
    ...overrides
  }
}

function documentStore(graph = new SceneGraph()): EditorStore {
  return asDouble<EditorStore>({
    graph,
    state: { activeRibbonTab: 'panels', mobileDrawerSnap: 'closed' },
    renderer: { ck: {}, pageColor: { r: 1, g: 1, b: 1, a: 1 } }
  })
}

test('a region’s crop is its box plus a margin, cropped at full size when it is small', () => {
  expect(regionCrop(region(40, 20), { x: 100, y: 200 })).toEqual({
    bounds: { minX: 84, minY: 184, maxX: 156, maxY: 236 },
    scale: 1
  })
})

test('a wide region is cropped smaller so its longest edge stays within the attachment limit', () => {
  const crop = regionCrop(region(4000, 100), { x: 0, y: 0 })
  expect(crop?.bounds).toEqual({ minX: -16, minY: -16, maxX: 4016, maxY: 116 })
  expect(crop?.scale).toBeCloseTo(768 / 4032, 6)
})

test('fixing a drawn thread sends one crop of its area, no larger than the attachment bound', async () => {
  const graph = new SceneGraph()
  const store = documentStore(graph)
  const marked = thread(graph, { region: region(4000, 100) })

  expect(await fixThreadWithAgent(store, marked, agentDeps())).toBe(true)
  expect(rendered).toHaveLength(1)
  expect(rendered[0]?.pageId).toBe(marked.pageId)
  expect(rendered[0]?.bounds).toEqual({ minX: 84, minY: 184, maxX: 4116, maxY: 316 })
  const { bounds, scale } = rendered[0] ?? { bounds: region(0, 0).bounds, scale: 0 }
  const longestEdge = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
  expect(Math.round(longestEdge * scale)).toBeLessThanOrEqual(768)

  const prompt = takePendingPrompt(store)
  expect(prompt?.images).toHaveLength(1)
  expect(prompt?.images[0]?.file.name).toBe('marked-area.png')
  expect(prompt?.images[0]?.file.type).toBe('image/png')
  expect(prompt?.modelText).toContain('Marked area: x 100 to 4100, y 200 to 300 on the page')
  expect(prompt?.modelText).toContain('An image of the marked area is attached as a crop.')
})

test('when the crop cannot be rendered the prompt still goes, without claiming an image', async () => {
  const store = documentStore()
  renderResult = null

  expect(
    await fixThreadWithAgent(store, thread(store.graph, { region: region(40, 20) }), agentDeps())
  ).toBe(true)
  expect(rendered).toHaveLength(1)
  const prompt = takePendingPrompt(store)
  expect(prompt?.images).toEqual([])
  expect(prompt?.modelText).toContain('Marked area:')
  expect(prompt?.modelText).not.toContain('An image of the marked area is attached')
})

test('a thread with no region is sent without rendering or an attachment', async () => {
  const store = documentStore()

  expect(await fixThreadWithAgent(store, thread(store.graph), agentDeps())).toBe(true)
  expect(rendered).toHaveLength(0)
  expect(createdURLs).toEqual([])
  const prompt = takePendingPrompt(store)
  expect(prompt?.images).toEqual([])
  expect(prompt?.modelText).not.toContain('Marked area')
})

test('a replaced crop revokes the URL of the submission it replaces', async () => {
  const graph = new SceneGraph()
  const store = documentStore(graph)
  const deps = agentDeps()

  await fixThreadWithAgent(store, thread(graph, { id: 'c-1', region: region(40, 20) }), deps)
  await fixThreadWithAgent(store, thread(graph, { id: 'c-2', region: region(50, 30) }), deps)

  expect(createdURLs).toHaveLength(2)
  expect(revokedURLs).toEqual([createdURLs[0] as string])
  expect(takePendingPrompt(store)?.images[0]?.previewURL).toBe(createdURLs[1] as string)
})

test('a crop is revoked when the chat refuses the prompt, as when setup is dismissed', async () => {
  const store = documentStore()
  const marked = thread(store.graph, { region: region(40, 20) })
  sendSucceeds = false

  expect(await fixThreadWithAgent(store, marked, agentDeps())).toBe(false)
  expect(revokedURLs).toEqual([createdURLs[0] as string])
  expect(hasPendingPrompt(store)).toBe(false)
})

test('a document that takes no prompts renders nothing', async () => {
  const store = documentStore()
  accepts = false

  expect(
    await fixThreadWithAgent(store, thread(store.graph, { region: region(40, 20) }), agentDeps())
  ).toBe(false)
  expect(rendered).toHaveLength(0)
  expect(createdURLs).toEqual([])
})
