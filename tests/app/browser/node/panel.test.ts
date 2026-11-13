import { afterEach, describe, expect, test } from 'bun:test'

import { toUint8Array } from 'js-base64'

import { createEditor, type Editor } from '@open-pencil/core'
import { readBrowserNode } from '@open-pencil/scene-graph/browser-node'

import { createBrowserNodeFromPage } from '@/app/browser/node/apply'
import {
  browserNodeRefreshedTime,
  openBrowserNodePage,
  saveBrowserNodeAddress,
  saveBrowserNodePreset
} from '@/app/browser/node/panel'
import type { BrowserNodeOutcome, BrowserNodeSession } from '@/app/browser/node/session'
import { browserState, markClosed, markNavigating, setDevice } from '@/app/browser/state'
import { IS_TAURI } from '@/constants'

const PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)
const WHEN = '2026-11-13T00:00:00.000Z'
const PAGE = 'https://example.com/docs'
const OTHER = 'https://example.com/other'

const editors: Editor[] = []

afterEach(() => {
  markClosed()
  setDevice('desktop')
  for (const editor of editors.splice(0)) editor.dispose()
})

function editor(): Editor {
  const created = createEditor()
  editors.push(created)
  return created
}

function session(overrides: Partial<BrowserNodeSession> = {}): BrowserNodeSession {
  return { desktop: true, open: true, url: PAGE, preset: 'iphone-14', ...overrides }
}

async function snapshot(graph: Editor = editor()): Promise<{ graph: Editor; id: string }> {
  const result = await createBrowserNodeFromPage(
    graph,
    session(),
    { screenshot: () => Promise.resolve(PNG), capturedAddress: () => PAGE },
    WHEN
  )
  return { graph, id: idOf(result) }
}

function idOf(result: BrowserNodeOutcome): string {
  if (!result.ok) throw new Error(result.error)
  return result.id
}

function storedURL(graph: Editor, id: string): string | undefined {
  const node = graph.graph.getNode(id)
  return node ? readBrowserNode(node)?.url : undefined
}

describe('editing a browser snapshot from the panel', () => {
  test('a valid address is one undo step, and the same address adds none', async () => {
    const { graph, id } = await snapshot()
    const saved = saveBrowserNodeAddress(graph, id, OTHER)
    expect(saved).toEqual({ ok: true })
    expect(storedURL(graph, id)).toBe(OTHER)
    expect(saveBrowserNodeAddress(graph, id, OTHER)).toEqual({ ok: true })
    graph.undoAction()
    expect(storedURL(graph, id)).toBe(PAGE)
    graph.redoAction()
    expect(storedURL(graph, id)).toBe(OTHER)
  })

  test('a file address is refused and the layer stays', async () => {
    const { graph, id } = await snapshot()
    const input = 'file:///etc/passwd'
    const saved = saveBrowserNodeAddress(graph, id, input)
    expect(saved).toEqual({ ok: false, error: 'scheme-refused' })
    expect(storedURL(graph, id)).toBe(PAGE)
    graph.undoAction()
    expect(graph.graph.getNode(id)).toBeUndefined()
  })

  test('an address the snapshot cannot store is not written', async () => {
    const { graph, id } = await snapshot()
    const saved = saveBrowserNodeAddress(graph, id, `https://example.com/${'a'.repeat(2000)}`)
    expect(saved).toEqual({ ok: false, error: 'invalid-address' })
    expect(storedURL(graph, id)).toBe(PAGE)
  })

  test('a device preset is stored, and the closed desktop check does not resize the window', async () => {
    const { graph, id } = await snapshot()
    markNavigating(PAGE)
    const sizes: Array<[number, number]> = []
    const saved = saveBrowserNodePreset(graph, id, 'pixel-7', (width, height) => {
      sizes.push([width, height])
      return Promise.resolve()
    })
    expect(saved).toEqual({ ok: true })
    const node = graph.graph.getNode(id)
    expect(node ? readBrowserNode(node)?.preset : undefined).toBe('pixel-7')
    expect(browserState.device).toBe('pixel-7')
    expect(IS_TAURI).toBe(false)
    expect(sizes).toEqual([])
    saveBrowserNodePreset(graph, id, 'pixel-7', () => Promise.resolve())
    graph.undoAction()
    const restored = graph.graph.getNode(id)
    expect(restored ? readBrowserNode(restored)?.preset : undefined).toBe('iphone-14')
  })

  test('opening the page is refused outside the desktop app', async () => {
    const opened: string[] = []
    const result = await openBrowserNodePage(PAGE, (url) => {
      opened.push(url)
      return Promise.resolve()
    })
    expect(IS_TAURI).toBe(false)
    expect(result).toEqual({ ok: false, error: 'desktop-only' })
    expect(opened).toEqual([])
  })

  test('the refreshed time is a 24-hour reading of the stored instant', () => {
    const shown = browserNodeRefreshedTime(WHEN)
    expect(shown.includes('2026')).toBe(true)
    expect(shown.includes('AM')).toBe(false)
    expect(shown.includes('PM')).toBe(false)
    expect(browserNodeRefreshedTime('not-a-date')).toBe('not-a-date')
  })
})
