import { afterEach, describe, expect, test } from 'bun:test'

import { toUint8Array } from 'js-base64'

import { createEditor, type Editor } from '@open-pencil/core'
import { readBrowserNode } from '@open-pencil/scene-graph/browser-node'
import { colorToFill } from '@open-pencil/scene-graph/color'

import { createBrowserNodeFromPage, refreshBrowserNodeFromPage } from '@/app/browser/node/apply'
import {
  browserNodeSession,
  createBrowserNode,
  refreshBrowserNode
} from '@/app/browser/node/command'
import type {
  BrowserNodeOutcome,
  BrowserNodeRefreshActions,
  BrowserNodeSession
} from '@/app/browser/node/session'
import { markClosed, markNavigating, setDevice } from '@/app/browser/state'
import { BROWSER_DESKTOP_ONLY, BROWSER_WINDOW_CLOSED, browserToolCall } from '@/app/browser/tools'
import { browserURLPolicy } from '@/app/browser/url'
import { IS_TAURI } from '@/constants'

const PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)
const WIDE = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADElEQVR4nGP8zwACAAYIAQFazwZIAAAAAElFTkSuQmCC'
)
const WHEN = '2026-11-13T00:00:00.000Z'
const LATER = '2026-11-13T01:00:00.000Z'
const PAGE = 'https://example.com/docs'

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

function address(input: string): string {
  const policy = browserURLPolicy(input)
  if (!policy.ok) throw new Error(input)
  return policy.url
}

/** Resolves the load in the same turn the refresh asks the window to move. */
function loadWhenMoved(order?: string[]): BrowserNodeRefreshActions['waitForLoad'] {
  return () => {
    order?.push('arm')
    let resolveDone: (url: string) => void = () => undefined
    const done = new Promise<string>((resolve) => {
      resolveDone = resolve
    })
    return {
      armed: Promise.resolve(),
      begin() {
        order?.push('begin')
        resolveDone(address(PAGE))
      },
      done,
      cancel() {
        order?.push('cancel')
      }
    }
  }
}

/** A refresh that is already on the stored page must not arm a load wait. */
function loadNotArmed(): BrowserNodeRefreshActions['waitForLoad'] {
  return () => {
    throw new Error('refresh waited for a load without moving the page')
  }
}

function idOf(result: BrowserNodeOutcome): string {
  if (!result.ok) throw new Error(result.error)
  return result.id
}

function childCount(graph: Editor): number {
  return graph.graph.getNode(graph.state.currentPageId)?.childIds.length ?? 0
}

describe('creating a browser snapshot', () => {
  test('the open page becomes one layer, and one undo removes it', async () => {
    const graph = editor()
    const shots: string[] = []
    const result = await createBrowserNodeFromPage(
      graph,
      session(),
      {
        screenshot: () => {
          shots.push('shot')
          return Promise.resolve(PNG)
        }
      },
      WHEN
    )
    const id = idOf(result)
    const node = graph.graph.getNode(id)
    const url = address(PAGE)
    expect(shots).toEqual(['shot'])
    expect(readBrowserNode(node ?? { pluginData: [] })).toEqual({
      url,
      width: 1,
      height: 1,
      preset: 'iphone-14',
      refreshedAt: WHEN
    })
    expect(node?.name).toBe('example.com')
    expect(node?.fills[0]).toMatchObject({ type: 'IMAGE', imageScaleMode: 'FILL' })
    const hash = node?.fills[0]?.imageHash
    expect(hash ? graph.graph.images.get(hash) : undefined).toEqual(PNG)
    expect(graph.state.selectedIds.has(id)).toBe(true)

    graph.undoAction()
    expect(graph.graph.getNode(id)).toBeUndefined()
    graph.redoAction()
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })?.url).toBe(url)
  })

  test('a closed window, the browser build, and a refused address create nothing', async () => {
    const refused = ['', 'file:///etc/passwd', 'about:blank', 'https://']
    const cases: BrowserNodeSession[] = [
      session({ desktop: false }),
      session({ open: false }),
      ...refused.map((url) => session({ url }))
    ]
    for (const [index, one] of cases.entries()) {
      const graph = editor()
      const before = childCount(graph)
      let shots = 0
      const result = await createBrowserNodeFromPage(
        graph,
        one,
        {
          screenshot: () => {
            shots += 1
            return Promise.resolve(PNG)
          }
        },
        WHEN
      )
      expect(shots).toBe(0)
      expect(childCount(graph)).toBe(before)
      if (index === 0) expect(result).toEqual({ ok: false, error: BROWSER_DESKTOP_ONLY })
      else if (index === 1) expect(result).toEqual({ ok: false, error: BROWSER_WINDOW_CLOSED })
      else {
        const tool = browserToolCall('browser_load_page', { url: one.url ?? '' }, true, true)
        expect(tool.ok).toBe(false)
        if (!tool.ok) expect(result).toEqual({ ok: false, error: tool.error })
      }
    }
  })

  test('a picture the window does not return is not a layer', async () => {
    const graph = editor()
    const empty = await createBrowserNodeFromPage(
      graph,
      session(),
      { screenshot: () => Promise.resolve(new Uint8Array()) },
      WHEN
    )
    const failed = await createBrowserNodeFromPage(
      graph,
      session(),
      { screenshot: () => Promise.reject(new Error('The page returned no picture')) },
      WHEN
    )
    expect(empty).toEqual({ ok: false, error: 'The page returned no picture' })
    expect(failed).toEqual({ ok: false, error: 'The page returned no picture' })
    expect(childCount(graph)).toBe(0)
  })

  test('the desktop preset stores the picture size', async () => {
    const graph = editor()
    const id = idOf(
      await createBrowserNodeFromPage(
        graph,
        session({ preset: 'desktop' }),
        { screenshot: () => Promise.resolve(WIDE) },
        WHEN
      )
    )
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })).toMatchObject({
      preset: 'desktop',
      width: 2,
      height: 1
    })
  })
})

describe('refreshing a browser snapshot', () => {
  async function snapshot(graph: Editor) {
    return idOf(
      await createBrowserNodeFromPage(
        graph,
        session(),
        { screenshot: () => Promise.resolve(PNG) },
        WHEN
      )
    )
  }

  test('a new picture and time are one undo step, and the address stays', async () => {
    const graph = editor()
    const id = await snapshot(graph)
    const node = graph.graph.getNode(id)
    if (!node) throw new Error('missing')
    graph.graph.updateNode(id, {
      pluginData: [...node.pluginData, { pluginId: 'notes', key: 'keep', value: 'yes' }]
    })
    let moved = 0
    const result = await refreshBrowserNodeFromPage(
      graph,
      id,
      session({ preset: 'pixel-7' }),
      {
        screenshot: () => Promise.resolve(WIDE),
        navigate: () => {
          moved += 1
          return Promise.resolve()
        },
        waitForLoad: loadNotArmed()
      },
      LATER
    )
    expect(result).toEqual({ ok: true, id })
    expect(moved).toBe(0)
    const refreshed = readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })
    expect(refreshed).toEqual({
      url: address(PAGE),
      width: 2,
      height: 1,
      preset: 'pixel-7',
      refreshedAt: LATER
    })
    expect(graph.graph.getNode(id)?.pluginData).toContainEqual({
      pluginId: 'notes',
      key: 'keep',
      value: 'yes'
    })

    graph.undoAction()
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })).toMatchObject({
      width: 1,
      height: 1,
      preset: 'iphone-14',
      refreshedAt: WHEN
    })
    graph.redoAction()
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })?.refreshedAt).toBe(LATER)
  })

  test('a refresh replaces the snapshot picture and keeps the other fills', async () => {
    const graph = editor()
    const id = await snapshot(graph)
    const node = graph.graph.getNode(id)
    if (!node) throw new Error('missing')
    const picture = node.fills[0]
    if (!picture) throw new Error('missing picture')
    const solid = colorToFill('#336699')
    const laterImage = { ...picture }
    graph.graph.updateNode(id, { fills: [solid, picture, laterImage] })

    const result = await refreshBrowserNodeFromPage(
      graph,
      id,
      session({ preset: 'pixel-7' }),
      {
        screenshot: () => Promise.resolve(WIDE),
        navigate: () => Promise.resolve(),
        waitForLoad: loadNotArmed()
      },
      LATER
    )
    expect(result).toEqual({ ok: true, id })
    const fills = graph.graph.getNode(id)?.fills ?? []
    expect(fills[0]).toEqual(solid)
    expect(fills[1]?.imageHash).not.toBe(picture.imageHash)
    expect(fills[1]?.imageHash ? graph.graph.images.get(fills[1].imageHash) : undefined).toEqual(
      WIDE
    )
    expect(fills[2]).toEqual(laterImage)
    expect(fills).toHaveLength(3)

    graph.undoAction()
    expect(graph.graph.getNode(id)?.fills).toEqual([solid, picture, laterImage])
  })

  test('a refresh appends a picture when the snapshot fill was removed', async () => {
    const graph = editor()
    const id = await snapshot(graph)
    const solid = colorToFill('#336699')
    graph.graph.updateNode(id, { fills: [solid] })
    const result = await refreshBrowserNodeFromPage(
      graph,
      id,
      session(),
      {
        screenshot: () => Promise.resolve(WIDE),
        navigate: () => Promise.resolve(),
        waitForLoad: loadNotArmed()
      },
      LATER
    )
    expect(result).toEqual({ ok: true, id })
    const fills = graph.graph.getNode(id)?.fills ?? []
    expect(fills[0]).toEqual(solid)
    expect(fills[1]?.type).toBe('IMAGE')
    expect(fills[1]?.imageHash ? graph.graph.images.get(fills[1].imageHash) : undefined).toEqual(
      WIDE
    )
    expect(fills).toHaveLength(2)
  })

  test('a different open page is loaded first, and a failed load keeps the layer', async () => {
    const graph = editor()
    const id = await snapshot(graph)
    const order: string[] = []
    await refreshBrowserNodeFromPage(
      graph,
      id,
      session({ url: 'https://other.example/' }),
      {
        navigate: (url) => {
          order.push(url)
          return Promise.resolve()
        },
        screenshot: () => {
          order.push('shot')
          return Promise.resolve(WIDE)
        },
        waitForLoad: loadWhenMoved(order)
      },
      LATER
    )
    expect(order).toEqual(['arm', address(PAGE), 'begin', 'shot'])

    const kept = await refreshBrowserNodeFromPage(
      graph,
      id,
      session({ url: 'https://other.example/' }),
      {
        navigate: () => Promise.reject(new Error('The browser window is not open.')),
        screenshot: () => {
          order.push('late')
          return Promise.resolve(PNG)
        },
        waitForLoad: loadWhenMoved(order)
      },
      WHEN
    )
    expect(kept).toEqual({ ok: false, error: 'The browser window is not open.' })
    expect(order).not.toContain('late')
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })).toMatchObject({
      width: 2,
      refreshedAt: LATER
    })
  })

  test('a refresh pictures the page only after that page has loaded', async () => {
    const graph = editor()
    const id = await snapshot(graph)
    const before = structuredClone(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] }))
    const order: string[] = []
    let release: (url: string) => void = () => undefined
    const pending = refreshBrowserNodeFromPage(
      graph,
      id,
      session({ url: 'https://other.example/' }),
      {
        waitForLoad: () => {
          order.push('arm')
          return {
            armed: Promise.resolve(),
            begin: () => {
              order.push('begin')
            },
            done: new Promise<string>((resolve) => {
              release = resolve
            }),
            cancel: () => {
              order.push('cancel')
            }
          }
        },
        navigate: (url) => {
          order.push(url)
          return Promise.resolve()
        },
        screenshot: () => {
          order.push('shot')
          return Promise.resolve(WIDE)
        }
      },
      LATER
    )
    for (let step = 0; step < 8; step += 1) await Promise.resolve()
    expect(order[0]).toBe('arm')
    expect(order).not.toContain('shot')
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })).toEqual(before)

    release(address(PAGE))
    expect(await pending).toEqual({ ok: true, id })
    expect(order.indexOf('arm')).toBeLessThan(order.indexOf(address(PAGE)))
    expect(order.indexOf(address(PAGE))).toBeLessThan(order.indexOf('begin'))
    expect(order.indexOf('begin')).toBeLessThan(order.indexOf('shot'))
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })).toMatchObject({
      width: 2,
      refreshedAt: LATER
    })
  })

  test('a page that does not finish loading leaves the snapshot unchanged', async () => {
    const graph = editor()
    const id = await snapshot(graph)
    const before = structuredClone(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] }))
    const missed = Promise.reject(new Error('The page did not finish loading.'))
    missed.catch(() => undefined)
    let shots = 0
    let cancelled = false
    const result = await refreshBrowserNodeFromPage(
      graph,
      id,
      session({ url: 'https://other.example/' }),
      {
        waitForLoad: () => ({
          armed: Promise.resolve(),
          begin: () => undefined,
          done: missed,
          cancel: () => {
            cancelled = true
          }
        }),
        navigate: () => Promise.resolve(),
        screenshot: () => {
          shots += 1
          return Promise.resolve(WIDE)
        }
      },
      LATER
    )
    expect(result.ok).toBe(false)
    expect(shots).toBe(0)
    expect(cancelled).toBe(true)
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })).toEqual(before)
    graph.undoAction()
    expect(graph.graph.getNode(id)).toBeUndefined()
  })

  test('a closed window and the browser build leave the layer alone', async () => {
    const graph = editor()
    const id = await snapshot(graph)
    const before = structuredClone(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] }))
    for (const one of [session({ open: false }), session({ desktop: false, open: true })]) {
      let calls = 0
      const result = await refreshBrowserNodeFromPage(
        graph,
        id,
        one,
        {
          navigate: () => {
            calls += 1
            return Promise.resolve()
          },
          screenshot: () => {
            calls += 1
            return Promise.resolve(WIDE)
          },
          waitForLoad: loadNotArmed()
        },
        LATER
      )
      expect(calls).toBe(0)
      expect(result.ok).toBe(false)
      expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })).toEqual(before)
    }
  })

  test('a plain layer and a missing layer are not refreshed', async () => {
    const graph = editor()
    const plain = graph.graph.createNode('RECTANGLE', graph.state.currentPageId, {
      width: 10,
      height: 10
    }).id
    let calls = 0
    const actions = {
      navigate: () => {
        calls += 1
        return Promise.resolve()
      },
      screenshot: () => {
        calls += 1
        return Promise.resolve(PNG)
      },
      waitForLoad: loadNotArmed()
    }
    expect(await refreshBrowserNodeFromPage(graph, plain, session(), actions, LATER)).toEqual({
      ok: false,
      error: 'That layer is not a browser snapshot.'
    })
    expect(await refreshBrowserNodeFromPage(graph, 'missing', session(), actions, LATER)).toEqual({
      ok: false,
      error: 'That layer is not on the canvas.'
    })
    expect(calls).toBe(0)
  })
})

describe('the desktop command', () => {
  test('this build is not the desktop app, so it does not take a picture', async () => {
    expect(IS_TAURI).toBe(false)
    markNavigating(PAGE)
    setDevice('ipad-air')
    expect(browserNodeSession()).toEqual({
      desktop: false,
      open: true,
      url: PAGE,
      preset: 'ipad-air'
    })
    const graph = editor()
    const created = await createBrowserNode(graph)
    expect(created).toEqual({ ok: false, error: BROWSER_DESKTOP_ONLY })
    expect(childCount(graph)).toBe(0)
    const id = idOf(
      await createBrowserNodeFromPage(
        graph,
        session(),
        { screenshot: () => Promise.resolve(PNG) },
        WHEN
      )
    )
    const before = readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })
    expect(await refreshBrowserNode(graph, id)).toEqual({ ok: false, error: BROWSER_DESKTOP_ONLY })
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })).toEqual(before)
  })
})
