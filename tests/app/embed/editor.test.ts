import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'

import { nextTick } from 'vue'

import * as figModule from '@open-pencil/core/io/formats/fig'
import * as layoutModule from '@open-pencil/core/layout'
import { SceneGraph } from '@open-pencil/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'
import { createEmbedEditorHost } from '@/app/embed/editor'
import type { EmbedEditorHost } from '@/app/embed/host'
import {
  activeTab,
  closeTab,
  createTab,
  getActiveStore,
  getTabsSnapshot,
  openNewFileTab
} from '@/app/tabs'

const GLOBALS = ['window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame'] as const

/** The browser globals opening a document reaches for, with frames that run at once. */
function installBrowserGlobals(): void {
  const frame = (callback: FrameRequestCallback) => {
    callback(0)
    return 0
  }
  const values = {
    window: {
      innerWidth: 1024,
      innerHeight: 768,
      requestAnimationFrame: frame,
      cancelAnimationFrame: vi.fn(),
      openPencil: {},
      location: { href: 'http://localhost/' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    },
    document: { fonts: { add: vi.fn(), ready: Promise.resolve() } },
    requestAnimationFrame: frame,
    cancelAnimationFrame: vi.fn()
  }
  for (const name of GLOBALS) {
    Reflect.defineProperty(globalThis, name, {
      value: values[name],
      configurable: true,
      writable: true
    })
  }
}

/** Waits for `pending`, acknowledging each document that waits to be presented on the way. */
async function settle<T>(pending: Promise<T>): Promise<T> {
  // Held as an outcome, so a failure waits for the caller instead of going unhandled meanwhile.
  let outcome: { value: T } | { error: unknown } | null = null
  void pending.then(
    (value) => (outcome = { value }),
    (error: unknown) => (outcome = { error })
  )
  const waiting = () => outcome === null
  while (waiting()) {
    for (const tab of getTabsSnapshot()) {
      if (tab.store.state.preparation?.phase !== 'preparing-render') continue
      tab.store.preparationController.acknowledgePresentation(tab.store.state.sceneVersion)
    }
    await Bun.sleep(0)
  }
  return pending
}

const bytes = () => new Uint8Array([1, 2, 3])
const documentTabs = () => getTabsSnapshot().filter((tab) => tab.kind === 'document')
const isReadOnly = (store: EditorStore) => store.state.hostRestrictions.readOnly

describe('embed editor host', () => {
  let host: EmbedEditorHost

  beforeEach(() => {
    installBrowserGlobals()
    vi.spyOn(layoutModule, 'computeAllLayouts').mockReturnValue(undefined)
    vi.spyOn(figModule, 'readFigFile').mockImplementation(async () => new SceneGraph())
    createTab()
    host = createEmbedEditorHost()
  })

  afterEach(async () => {
    host.dispose()
    vi.restoreAllMocks()
    for (const tab of documentTabs()) await closeTab(tab.id, 'discard')
    for (const name of GLOBALS) Reflect.deleteProperty(globalThis, name)
  })

  test('holds every shown document read-only until the session is editable', () => {
    expect(isReadOnly(getActiveStore())).toBe(true)
    host.setEditable(true)
    expect(isReadOnly(getActiveStore())).toBe(false)
    host.setEditable(false)
    // A document a shortcut opens takes the same rule the moment it shows.
    const opened = createTab()
    expect(isReadOnly(opened.store)).toBe(true)
  })

  test('opens a load read-only throughout and closes the document shown before', async () => {
    const before = getActiveStore()
    const readOnlyWhileReading: boolean[] = []
    vi.spyOn(figModule, 'readFigFile').mockImplementation(async () => {
      readOnlyWhileReading.push(isReadOnly(getActiveStore()))
      return new SceneGraph()
    })

    // A document that is no longer empty gets a tab of its own, which the load then replaces.
    before.state.documentName = 'Earlier'
    await expect(settle(host.load('card.fig', bytes()))).resolves.toEqual({ name: 'card' })

    expect(readOnlyWhileReading).toEqual([true])
    const shown = getActiveStore()
    expect(shown).not.toBe(before)
    expect(documentTabs().map((tab) => tab.store)).toEqual([shown])
    expect(isReadOnly(shown)).toBe(true)
    expect(shown.hasUnsavedChanges()).toBe(false)
  })

  test('opens the first load into the read-only empty document it shows', async () => {
    const empty = getActiveStore()
    await expect(settle(host.load('first.fig', bytes()))).resolves.toEqual({ name: 'first' })
    expect(documentTabs().map((tab) => tab.store)).toEqual([empty])
    expect(isReadOnly(empty)).toBe(true)
  })

  test('shows a document getDocument saved again under the name it gives', async () => {
    await settle(host.load('card.fig', bytes()))
    const saved = await host.getDocument()
    expect(saved.name).toBe('card')
    await expect(settle(host.load(saved.name, saved.data))).resolves.toEqual({ name: 'card' })
  })

  test('writes pen text when asked for it, and the archive otherwise', async () => {
    await settle(host.load('card.fig', bytes()))
    const pen = await host.getDocument('pen')
    expect(JSON.parse(new TextDecoder().decode(pen.data))).toMatchObject({ version: '2.21' })
    expect(pen.name).toBe('card')
    const fig = await host.getDocument()
    expect(fig.data).not.toEqual(pen.data)
  })

  test('keeps the shown document and its editability when a load fails', async () => {
    host.setEditable(true)
    const before = getActiveStore()
    before.state.documentName = 'Kept'
    vi.spyOn(figModule, 'readFigFile').mockImplementation(async () => {
      throw new Error('not a .fig')
    })

    await expect(settle(host.load('broken.fig', bytes()))).rejects.toThrow('not a .fig')

    expect(getActiveStore()).toBe(before)
    expect(documentTabs()).toHaveLength(1)
    expect(isReadOnly(before)).toBe(false)
  })

  test('runs overlapping loads one after the other, leaving the last one shown', async () => {
    getActiveStore().state.documentName = 'Earlier'
    const first = Promise.withResolvers<SceneGraph>()
    vi.spyOn(figModule, 'readFigFile')
      .mockImplementationOnce(() => first.promise)
      .mockImplementation(async () => new SceneGraph())

    const loads = Promise.all([host.load('first.fig', bytes()), host.load('second.fig', bytes())])
    await Bun.sleep(0)
    first.resolve(new SceneGraph())

    await expect(settle(loads)).resolves.toEqual([{ name: 'first' }, { name: 'second' }])
    expect(activeTab.value?.kind).toBe('document')
    expect(getActiveStore().state.documentName).toBe('second')
    expect(documentTabs()).toHaveLength(1)
  })

  test('shows a document again when the last one closes or a New file tab opens', async () => {
    const [only] = documentTabs()
    for (const tab of documentTabs()) await closeTab(tab.id, 'discard')
    await nextTick()
    expect(activeTab.value?.kind).toBe('document')
    expect(activeTab.value?.id).not.toBe(only?.id)

    const shown = activeTab.value
    const picker = openNewFileTab()
    await nextTick()
    expect(activeTab.value).toBe(shown)
    expect(getTabsSnapshot()).not.toContain(picker)
  })
})
