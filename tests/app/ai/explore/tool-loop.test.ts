import 'fake-indexeddb/auto'
import { expect, spyOn, test } from 'bun:test'

import { simulateReadableStream } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { toRaw } from 'vue'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import type { SceneNode } from '@pairdraw/scene-graph'

import { appendCanvasNotes } from '@/app/ai/chat/submission/notes'
import { aiToolOverrides } from '@/app/ai/tools/preferences'
import { createToolLoopTransport } from '@/app/ai/transports/tool-loop'
import * as figmaFactory from '@/app/automation/bridge/figma-factory'
import type { EditorStore } from '@/app/editor/active-store'
import { createEditorStore } from '@/app/editor/session/create'
import { appPreferences } from '@/app/settings/preferences/store'

import { MOCK_USAGE } from '#tests/helpers/chat/usage'

// `@ai-sdk/provider` is not a direct dependency, so its types come through the mock model.
type LanguageModelV4CallOptions = Parameters<MockLanguageModelV4['doStream']>[0]
type LanguageModelV4StreamPart =
  Awaited<ReturnType<MockLanguageModelV4['doStream']>>['stream'] extends ReadableStream<infer Chunk>
    ? Chunk
    : never

const VARIANT = { width: 320, height: 200 }

/** The text of the last user message a request carries. */
function lastUserText(options: LanguageModelV4CallOptions): string {
  const user = options.prompt.findLast((message) => message.role === 'user')
  if (!user || typeof user.content === 'string') return ''
  return user.content.map((part) => (part.type === 'text' ? part.text : '')).join('')
}

function attribute(text: string, name: string): number {
  const match = new RegExp(`<explore[^>]* ${name}="(-?\\d+)"`).exec(text)
  return Number(match?.[1])
}

/**
 * A model that does what an exploration note asks, as a capable model would: it makes the
 * variants the note counts, where the note places them, then answers.
 */
function explorerModel() {
  let step = 0
  return new MockLanguageModelV4({
    doStream: async (options) => {
      step++
      const text = lastUserText(options)
      const chunks: LanguageModelV4StreamPart[] = []
      if (step === 1 && text.includes('<explore')) {
        const count = attribute(text, 'count')
        const x = attribute(text, 'x')
        const y = attribute(text, 'y')
        const gap = attribute(text, 'gap')
        for (let index = 0; index < count; index++) {
          chunks.push({
            type: 'tool-call',
            toolCallId: `variant-${index + 1}`,
            toolName: 'render',
            input: JSON.stringify({
              x: x + index * (VARIANT.width + gap),
              y,
              jsx: `<Frame name="Card — Variant ${index + 1}" w={${VARIANT.width}} h={${VARIANT.height}} bg="#FFFFFF" />`
            })
          })
        }
        chunks.push({
          type: 'finish',
          finishReason: { unified: 'tool-calls', raw: undefined },
          usage: MOCK_USAGE
        })
      } else {
        chunks.push(
          { type: 'text-start', id: 'reply' },
          { type: 'text-delta', id: 'reply', delta: 'Three variants are ready.' },
          { type: 'text-end', id: 'reply' },
          { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage: MOCK_USAGE }
        )
      }
      return {
        stream: simulateReadableStream({ initialDelayInMs: null, chunkDelayInMs: null, chunks })
      }
    }
  })
}

function toolCall(id: string, toolName: string, input: unknown): LanguageModelV4StreamPart {
  return { type: 'tool-call', toolCallId: id, toolName, input: JSON.stringify(input) }
}

const TOOL_STEP: LanguageModelV4StreamPart = {
  type: 'finish',
  finishReason: { unified: 'tool-calls', raw: undefined },
  usage: MOCK_USAGE
}

/**
 * A model that starts variants from the layer the note links, as the note says: it runs the
 * note's copy script for each variant, places the copy in the row, then answers.
 */
function clonerModel() {
  let step = 0
  return new MockLanguageModelV4({
    doStream: async (options) => {
      step++
      const text = lastUserText(options)
      const chunks: LanguageModelV4StreamPart[] = []
      const script = /in `eval`, `([^`]+)`/.exec(text)?.[1]
      if (step === 1 && script) {
        const count = attribute(text, 'count')
        const x = attribute(text, 'x')
        const y = attribute(text, 'y')
        const gap = attribute(text, 'gap')
        for (let index = 0; index < count; index++) {
          const left = x + index * (VARIANT.width + gap)
          chunks.push(
            toolCall(`variant-${index + 1}`, 'eval', {
              code: `${script}; copy.x = ${left}; copy.y = ${y}; copy.name = 'Card — Variant ${index + 1}'; return copy.id`
            })
          )
        }
        chunks.push(TOOL_STEP)
      } else {
        chunks.push(
          { type: 'text-start', id: 'reply' },
          { type: 'text-delta', id: 'reply', delta: 'The variants are ready.' },
          { type: 'text-end', id: 'reply' },
          { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage: MOCK_USAGE }
        )
      }
      return {
        stream: simulateReadableStream({ initialDelayInMs: null, chunkDelayInMs: null, chunks })
      }
    }
  })
}

/** Sends one explore request through the real tool loop with `model` and waits for its end. */
async function explore(store: EditorStore, model: MockLanguageModelV4, modelText: string) {
  const transport = createToolLoopTransport({
    store,
    providerID: 'openai',
    model,
    effectiveModelID: 'test',
    maxOutputTokens: 100,
    thinkingLevel: () => 'default'
  })
  const text = appendCanvasNotes(store, {
    modelText,
    nodes: [],
    explore: { kind: 'variants', count: 3, axis: 'layout' }
  })
  const stream = await transport.sendMessages({
    trigger: 'submit-message',
    chatId: 'explore',
    messageId: undefined,
    abortSignal: undefined,
    messages: [{ id: 'user', role: 'user', parts: [{ type: 'text', text }] }]
  })
  const reader = stream.getReader()
  try {
    for (let next = await reader.read(); !next.done; next = await reader.read()) {
      expect(next.value.type).not.toBe('error')
    }
  } finally {
    reader.releaseLock()
  }
}

/** Runs `body` with a fresh editor and the tool settings the loop reads, restored after. */
async function withEditor(body: (store: EditorStore) => Promise<void>) {
  const previousPreferences = structuredClone(toRaw(appPreferences.value))
  const previousTools = aiToolOverrides.value
  const store = createEditorStore()
  // Viewport DOM plumbing is outside this contract.
  const factory = spyOn(figmaFactory, 'makeFigmaFromStore').mockImplementation(
    (editor) => new FigmaAPI(editor.graph)
  )
  try {
    aiToolOverrides.value = {}
    await body(store)
  } finally {
    appPreferences.value = previousPreferences
    aiToolOverrides.value = previousTools
    factory.mockRestore()
    store.dispose()
  }
}

/** The variants lie in one row top-aligned at `top`, right of `left`, overlapping nothing. */
function expectRow(variants: readonly SceneNode[], pageId: string, left: number, top: number) {
  expect(variants).toHaveLength(3)
  let right = left
  for (const variant of variants.toSorted((a, b) => a.x - b.x)) {
    expect(variant.type).toBe('FRAME')
    expect(variant.parentId).toBe(pageId)
    expect(variant.y).toBe(top)
    expect(variant.x).toBeGreaterThan(right)
    right = variant.x + variant.width
  }
}

test('Let it cook: the tool loop builds the variants side by side as new top-level frames', async () => {
  await withEditor(async (store) => {
    const pageId = store.state.currentPageId
    const original = store.graph.createNode('FRAME', pageId, {
      name: 'Card',
      x: 40,
      y: 80,
      ...VARIANT
    })
    store.select([original.id])
    const before = { ...original }

    const model = explorerModel()
    await explore(store, model, 'Explore this card')

    expect(model.doStreamCalls).toHaveLength(2)
    const variants = store.graph.getChildren(pageId).filter((frame) => frame.id !== original.id)
    // The design they vary is left as it was.
    expect(store.graph.getNode(original.id)).toMatchObject({
      x: before.x,
      y: before.y,
      width: before.width,
      height: before.height
    })
    expectRow(variants, pageId, original.x + original.width, original.y)
  })
})

test('Let it cook: copies of a nested layer go onto the page, and its parent keeps its layers', async () => {
  await withEditor(async (store) => {
    const pageId = store.state.currentPageId
    const screen = store.graph.createNode('FRAME', pageId, {
      name: 'Screen',
      x: 0,
      y: 0,
      width: 400,
      height: 800
    })
    store.graph.createNode('FRAME', screen.id, {
      name: 'Header',
      x: 0,
      y: 0,
      width: 400,
      height: 80
    })
    const card = store.graph.createNode('FRAME', screen.id, {
      name: 'Card',
      x: 40,
      y: 120,
      ...VARIANT
    })
    store.select([card.id])
    const screenChildren = store.graph.getChildren(screen.id).map((child) => child.id)

    const model = clonerModel()
    await explore(store, model, 'Explore this card')

    expect(model.doStreamCalls).toHaveLength(2)
    expect(store.graph.getChildren(screen.id).map((child) => child.id)).toEqual(screenChildren)
    expect(store.graph.getNode(card.id)).toMatchObject({ parentId: screen.id, x: 40, y: 120 })
    const variants = store.graph.getChildren(pageId).filter((frame) => frame.id !== screen.id)
    expectRow(variants, pageId, screen.x + screen.width, 120)
  })
})
