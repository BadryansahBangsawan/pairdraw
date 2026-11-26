import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { ref } from 'vue'

import type { EditorStore } from '@/app/editor/active-store'
import { createCanvasMenuActions } from '@/app/editor/canvas/menu/actions'
import { copyLayersAsPNG } from '@/app/editor/clipboard/png'
import { toast } from '@/app/shell/ui'

// Recorded in the Linux QA run: with nothing drawable selected, Copy as SVG did nothing at all
// while Export said "Could not export: Nothing to export". A copy that writes nothing has to say so.

beforeEach(() => {
  toast.toasts.value = []
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'ClipboardItem')
})

function shown(): string[] {
  return toast.toasts.value.map((entry) => entry.message)
}

const NOTHING = 'Could not copy: Nothing to copy'

function actions(store: Partial<EditorStore>, ids: string[] = ['node']) {
  return createCanvasMenuActions(store as EditorStore, ref(new Set(ids)))
}

describe('copy as … with nothing to copy', () => {
  test('a copy-as text format reports it instead of writing nothing', async () => {
    await actions({}).clipboardWrite(null, 'SVG')

    expect(shown()).toEqual([NOTHING])
  })

  test('Copy as HTML reports it rather than the raw English render error', async () => {
    const store: Partial<EditorStore> = { copySelectionAsHTML: () => Promise.resolve(null) }

    await actions(store).copyAsHTML()

    expect(shown()).toEqual([NOTHING])
  })

  test('Copy as PNG reports it when the layers render nothing', async () => {
    Reflect.set(globalThis, 'ClipboardItem', class ClipboardItemStub { readonly kind = 'stub' })
    const store: Partial<EditorStore> = { renderExportImage: () => Promise.resolve(null) }

    await copyLayersAsPNG(store as EditorStore, ['node'])

    expect(shown()).toEqual([NOTHING])
  })
})
