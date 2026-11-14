import { afterEach, describe, expect, test } from 'bun:test'

import { toUint8Array } from 'js-base64'

import { createEditor, type Editor } from '@pairdraw/core'
import { readBrowserNode } from '@pairdraw/scene-graph/browser-node'
import { colorToFill } from '@pairdraw/scene-graph/color'

import { createBrowserNodeFromPage, refreshBrowserNodeFromPage } from '@/app/browser/node/apply'
import {
  browserNodeSession,
  createBrowserNode,
  refreshBrowserNode
} from '@/app/browser/node/command'
import { browserNodeFailureEnglish, browserNodeFailureHeading } from '@/app/browser/node/failure'
import type {
  BrowserNodeOutcome,
  BrowserNodeRefreshActions,
  BrowserNodeSession
} from '@/app/browser/node/session'
import { markClosed, markNavigating, setDevice } from '@/app/browser/state'
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
const LANDED = 'https://example.com/landed'

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
        },
        capturedAddress: () => PAGE
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
          },
          capturedAddress: () => one.url
        },
        WHEN
      )
      expect(shots).toBe(0)
      expect(childCount(graph)).toBe(before)
      if (index === 0) expect(result).toEqual({ ok: false, error: 'desktop-only' })
      else if (index === 1) expect(result).toEqual({ ok: false, error: 'window-closed' })
      else {
        const codes = ['empty-address', 'scheme-refused', 'scheme-refused', 'invalid-address']
        expect(result).toEqual({ ok: false, error: codes[index - 2] })
      }
    }
  })

  test('a picture the window does not return is not a layer', async () => {
    const graph = editor()
    const empty = await createBrowserNodeFromPage(
      graph,
      session(),
      { screenshot: () => Promise.resolve(new Uint8Array()), capturedAddress: () => PAGE },
      WHEN
    )
    const failed = await createBrowserNodeFromPage(
      graph,
      session(),
      {
        screenshot: () => Promise.reject(new Error('The page returned no picture')),
        capturedAddress: () => PAGE
      },
      WHEN
    )
    expect(empty).toEqual({ ok: false, error: 'no-picture' })
    expect(failed).toEqual({ ok: false, error: 'no-picture' })
    expect(childCount(graph)).toBe(0)
  })

  test('the desktop preset stores the picture size', async () => {
    const graph = editor()
    const id = idOf(
      await createBrowserNodeFromPage(
        graph,
        session({ preset: 'desktop' }),
        { screenshot: () => Promise.resolve(WIDE), capturedAddress: () => PAGE },
        WHEN
      )
    )
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })).toMatchObject({
      preset: 'desktop',
      width: 2,
      height: 1
    })
  })

  test('the stored address is the page captured with the picture', async () => {
    const graph = editor()
    let seen = PAGE
    const id = idOf(
      await createBrowserNodeFromPage(
        graph,
        session(),
        {
          screenshot: () => {
            seen = LANDED
            return Promise.resolve(PNG)
          },
          capturedAddress: () => seen
        },
        WHEN
      )
    )
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })?.url).toBe(
      address(LANDED)
    )
  })

  test('a picture whose address is refused does not become a layer', async () => {
    const graph = editor()
    let shots = 0
    const result = await createBrowserNodeFromPage(
      graph,
      session(),
      {
        screenshot: () => {
          shots += 1
          return Promise.resolve(PNG)
        },
        capturedAddress: () => 'file:///etc/passwd'
      },
      WHEN
    )
    expect(shots).toBe(1)
    expect(result.ok).toBe(false)
    expect(childCount(graph)).toBe(0)
  })
})

describe('refreshing a browser snapshot', () => {
  async function snapshot(graph: Editor) {
    return idOf(
      await createBrowserNodeFromPage(
        graph,
        session(),
        { screenshot: () => Promise.resolve(PNG), capturedAddress: () => PAGE },
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
        capturedAddress: () => PAGE,
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
        capturedAddress: () => PAGE,
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
        capturedAddress: () => PAGE,
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

  test('a refresh stores the address the load finished on', async () => {
    const graph = editor()
    const id = await snapshot(graph)
    const result = await refreshBrowserNodeFromPage(
      graph,
      id,
      session({ url: 'https://other.example/' }),
      {
        navigate: () => Promise.resolve(),
        screenshot: () => Promise.resolve(WIDE),
        waitForLoad: () => ({
          armed: Promise.resolve(),
          begin: () => undefined,
          done: Promise.resolve(LANDED),
          cancel: () => undefined
        }),
        capturedAddress: () => LANDED
      },
      LATER
    )
    expect(result).toEqual({ ok: true, id })
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })).toMatchObject({
      url: address(LANDED),
      width: 2,
      refreshedAt: LATER
    })
  })

  test('a refresh does not store an address the picture did not capture', async () => {
    const graph = editor()
    const id = await snapshot(graph)
    const before = structuredClone(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] }))
    const result = await refreshBrowserNodeFromPage(
      graph,
      id,
      session({ url: 'https://other.example/' }),
      {
        navigate: () => Promise.resolve(),
        screenshot: () => Promise.resolve(WIDE),
        waitForLoad: () => ({
          armed: Promise.resolve(),
          begin: () => undefined,
          done: Promise.resolve(LANDED),
          cancel: () => undefined
        }),
        capturedAddress: () => 'https://example.com/elsewhere'
      },
      LATER
    )
    expect(result.ok).toBe(false)
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })).toEqual(before)
    graph.undoAction()
    expect(graph.graph.getNode(id)).toBeUndefined()
  })

  test('a failed picture after a move leaves the layer and adds no undo step', async () => {
    const graph = editor()
    const id = await snapshot(graph)
    const before = structuredClone(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] }))
    let moved = 0
    const result = await refreshBrowserNodeFromPage(
      graph,
      id,
      session({ url: 'https://other.example/' }),
      {
        navigate: () => {
          moved += 1
          return Promise.resolve()
        },
        waitForLoad: () => ({
          armed: Promise.resolve(),
          begin: () => undefined,
          done: Promise.resolve(PAGE),
          cancel: () => undefined
        }),
        screenshot: () => Promise.reject(new Error('The page returned no picture')),
        capturedAddress: () => PAGE
      },
      LATER
    )
    expect(moved).toBe(1)
    expect(result).toEqual({ ok: false, error: 'no-picture' })
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })).toEqual(before)
    graph.undoAction()
    expect(graph.graph.getNode(id)).toBeUndefined()
  })

  test('a refresh on the open page stores the address captured with the picture', async () => {
    const graph = editor()
    const id = await snapshot(graph)
    let seen = PAGE
    const result = await refreshBrowserNodeFromPage(
      graph,
      id,
      session(),
      {
        navigate: () => Promise.reject(new Error('already on the page')),
        waitForLoad: loadNotArmed(),
        screenshot: () => {
          seen = LANDED
          return Promise.resolve(WIDE)
        },
        capturedAddress: () => seen
      },
      LATER
    )
    expect(result).toEqual({ ok: true, id })
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })?.url).toBe(
      address(LANDED)
    )
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
        capturedAddress: () => PAGE,
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
        capturedAddress: () => PAGE,
        waitForLoad: loadWhenMoved(order)
      },
      WHEN
    )
    expect(kept).toEqual({ ok: false, error: 'window-closed' })
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
        },
        capturedAddress: () => address(PAGE)
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
        },
        capturedAddress: () => PAGE
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
          capturedAddress: () => PAGE,
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
      capturedAddress: () => PAGE,
      waitForLoad: loadNotArmed()
    }
    expect(await refreshBrowserNodeFromPage(graph, plain, session(), actions, LATER)).toEqual({
      ok: false,
      error: 'not-snapshot'
    })
    expect(await refreshBrowserNodeFromPage(graph, 'missing', session(), actions, LATER)).toEqual({
      ok: false,
      error: 'missing-layer'
    })
    expect(calls).toBe(0)
  })

  test('a refusal the panel shows is a message code', async () => {
    const graph = editor()
    const result = await createBrowserNodeFromPage(
      graph,
      session({ desktop: false }),
      { screenshot: () => Promise.resolve(PNG), capturedAddress: () => PAGE },
      WHEN
    )
    expect(result).toEqual({ ok: false, error: 'desktop-only' })
    expect(childCount(graph)).toBe(0)
  })

  test('a failure code becomes the catalog sentence, and an unknown code does not', () => {
    const copy = {
      ...browserNodeFailureEnglish,
      desktopOnly: 'Desktop sentence.',
      snapshotFailed: 'Could not update.'
    }
    expect(browserNodeFailureHeading('desktop-only', copy)).toBe('Desktop sentence.')
    expect(browserNodeFailureHeading('not-a-code', copy)).toBe('Could not update.')
    expect(browserNodeFailureHeading('desktop-only', copy)).not.toBe('desktop-only')
    expect(browserNodeFailureHeading('window-closed', browserNodeFailureEnglish)).toBe(
      'The browser window is not open.'
    )
    expect(browserNodeFailureHeading('no-picture', browserNodeFailureEnglish)).toBe(
      'The page returned no picture'
    )
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
    expect(created).toEqual({ ok: false, error: 'desktop-only' })
    expect(childCount(graph)).toBe(0)
    const id = idOf(
      await createBrowserNodeFromPage(
        graph,
        session(),
        { screenshot: () => Promise.resolve(PNG), capturedAddress: () => PAGE },
        WHEN
      )
    )
    const before = readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })
    expect(await refreshBrowserNode(graph, id)).toEqual({ ok: false, error: 'desktop-only' })
    expect(readBrowserNode(graph.graph.getNode(id) ?? { pluginData: [] })).toEqual(before)
  })
})
