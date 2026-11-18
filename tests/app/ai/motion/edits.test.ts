import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test'

import { toRaw } from 'vue'

import { createDocumentGraph, type DocumentChange } from '@pairdraw/core'
import type { SceneNode } from '@pairdraw/scene-graph'
import { aiMessages } from '@pairdraw/vue/i18n'

import { animateAIEdits } from '@/app/ai/chat/preferences'
import {
  AI_EDIT_IDLE_MS,
  AI_EDIT_REPLY_SETTLE_MS,
  showAIEdit,
  stopAIEditMotion,
  type AIEditMotionStore
} from '@/app/ai/motion'
import { appPreferences } from '@/app/settings/preferences/store'
import { toast } from '@/app/shell/ui'

const savedPreferences = structuredClone(toRaw(appPreferences.value))

function editor() {
  const graph = createDocumentGraph('design')
  const pageId = graph.getPages()[0].id
  const calls = {
    enter: [] as string[][],
    active: [] as string[][],
    done: [] as string[][],
    flash: [] as string[][],
    selected: [] as string[][],
    zoomed: 0
  }
  const store: AIEditMotionStore = {
    graph,
    state: { currentPageId: pageId },
    aiEnter: (ids) => calls.enter.push(ids),
    aiMarkActive: (ids) => calls.active.push(ids),
    aiMarkDone: (ids) => calls.done.push(ids),
    aiFlashDone: (ids) => calls.flash.push(ids),
    select: (ids) => calls.selected.push(ids),
    zoomToSelection: () => {
      calls.zoomed++
    }
  }
  return { graph, pageId, store, calls }
}

function change(created: SceneNode[], updated: string[] = []): DocumentChange {
  return {
    pageId: '',
    pageIds: [],
    created,
    deleted: [],
    updated: updated.map((id) => ({ id, fields: null, source: null, fig: null })),
    children: { before: [], after: [] },
    variables: [],
    collections: []
  }
}

function summaries() {
  return toast.toasts.value.filter((entry) => entry.action !== undefined)
}

beforeEach(() => {
  jest.useFakeTimers()
  animateAIEdits.value = true
  for (const entry of toast.toasts.value) toast.remove(entry.id)
})

afterEach(() => {
  jest.useRealTimers()
  appPreferences.value = structuredClone(savedPreferences)
  for (const entry of toast.toasts.value) toast.remove(entry.id)
})

describe('an AI edit on the canvas', () => {
  test('traces in the layers it added, parents first, and shimmers over their frame', () => {
    const { graph, pageId, store, calls } = editor()
    const card = graph.createNode('FRAME', pageId, { name: 'Card' })
    const title = graph.createNode('TEXT', card.id, { name: 'Title' })

    showAIEdit(store, change([card, title]))

    expect(calls.enter).toEqual([[card.id, title.id]])
    expect(calls.active).toEqual([[card.id]])
    expect(calls.flash).toEqual([])
  })

  test('flashes layers it changed and works in their top-level frame', () => {
    const { graph, pageId, store, calls } = editor()
    const card = graph.createNode('FRAME', pageId, { name: 'Card' })
    const title = graph.createNode('TEXT', card.id, { name: 'Title' })

    showAIEdit(store, change([], [title.id]))

    expect(calls.enter).toEqual([])
    expect(calls.flash).toEqual([[title.id]])
    expect(calls.active).toEqual([[card.id]])
  })

  test('leaves out hidden layers and layers on other pages', () => {
    const { graph, pageId, store, calls } = editor()
    const hidden = graph.createNode('RECTANGLE', pageId, { name: 'Hidden', visible: false })
    const otherPage = graph.addPage('Other')
    const elsewhere = graph.createNode('RECTANGLE', otherPage.id, { name: 'Elsewhere' })

    showAIEdit(store, change([hidden, elsewhere]))

    expect(calls.enter).toEqual([])
    expect(calls.active).toEqual([])
  })

  test('ends a run of edits after a pause with a flash and one notice that shows its layers', () => {
    const { graph, pageId, store, calls } = editor()
    const card = graph.createNode('FRAME', pageId, { name: 'Card' })
    const badge = graph.createNode('RECTANGLE', pageId, { name: 'Badge' })

    showAIEdit(store, change([card]))
    jest.advanceTimersByTime(AI_EDIT_IDLE_MS - 1)
    showAIEdit(store, change([], [badge.id]))
    // The second edit keeps the run going, and only its new frame starts shimmering.
    expect(calls.active).toEqual([[card.id], [badge.id]])
    expect(calls.done).toEqual([])

    jest.advanceTimersByTime(AI_EDIT_IDLE_MS)
    expect(calls.done).toEqual([[card.id, badge.id]])
    const [summary] = summaries()
    expect(summaries()).toHaveLength(1)
    expect(summary?.message).toBe(aiMessages.get().editSummary({ added: 1, changed: 1 }))
    summary?.action?.run()
    expect(calls.selected).toEqual([[card.id, badge.id]])
    expect(calls.zoomed).toBe(1)
  })

  test('keeps a reply’s run going while the reply still works between calls', () => {
    const { graph, pageId, store, calls } = editor()
    const card = graph.createNode('FRAME', pageId, { name: 'Card' })
    const reply = { run: { active: true } }

    showAIEdit(store, change([card]), reply)
    jest.advanceTimersByTime(AI_EDIT_IDLE_MS * 4)
    expect(calls.done).toEqual([])

    reply.run.active = false
    jest.advanceTimersByTime(AI_EDIT_REPLY_SETTLE_MS)
    expect(calls.done).toEqual([[card.id]])
  })

  test('names the document holding the layers and shows it before selecting them', () => {
    const { graph, pageId, store, calls } = editor()
    const card = graph.createNode('FRAME', pageId, { name: 'Card' })
    const shown: string[] = []
    const document = {
      name: () => 'Company profile',
      show: () => {
        shown.push('shown')
      }
    }

    showAIEdit(store, change([card]), null, document)
    jest.advanceTimersByTime(AI_EDIT_IDLE_MS)

    const [summary] = summaries()
    const messages = aiMessages.get()
    expect(summary?.message).toBe(
      `${messages.editSummaryAdded({ added: 1 })} · ${messages.editSummaryIn({
        document: 'Company profile'
      })}`
    )
    summary?.action?.run()
    expect(shown).toEqual(['shown'])
    expect(calls.selected).toEqual([[card.id]])
    expect(calls.zoomed).toBe(1)
  })

  test('folds a run that follows soon after into the last notice', () => {
    const { graph, pageId, store } = editor()
    const card = graph.createNode('FRAME', pageId, { name: 'Card' })
    const badge = graph.createNode('RECTANGLE', pageId, { name: 'Badge' })

    showAIEdit(store, change([card]))
    jest.advanceTimersByTime(AI_EDIT_IDLE_MS)
    showAIEdit(store, change([badge]))
    jest.advanceTimersByTime(AI_EDIT_IDLE_MS)

    expect(summaries()).toHaveLength(1)
    expect(summaries()[0]?.message).toBe(aiMessages.get().editSummaryAdded({ added: 2 }))
  })

  test('draws nothing when AI edits do not animate', () => {
    animateAIEdits.value = false
    const { graph, pageId, store, calls } = editor()
    const card = graph.createNode('FRAME', pageId, { name: 'Card' })
    const badge = graph.createNode('RECTANGLE', pageId, { name: 'Badge' })

    showAIEdit(store, change([card], [badge.id]))
    jest.advanceTimersByTime(AI_EDIT_IDLE_MS * 2)

    expect(calls).toEqual({ enter: [], active: [], done: [], flash: [], selected: [], zoomed: 0 })
    expect(summaries()).toHaveLength(0)
  })

  test('stops without a flash or notice when its editor closes', () => {
    const { graph, pageId, store, calls } = editor()
    const card = graph.createNode('FRAME', pageId, { name: 'Card' })

    showAIEdit(store, change([card]))
    stopAIEditMotion(store)
    jest.advanceTimersByTime(AI_EDIT_IDLE_MS * 2)

    expect(calls.done).toEqual([])
    expect(summaries()).toHaveLength(0)
  })
})
