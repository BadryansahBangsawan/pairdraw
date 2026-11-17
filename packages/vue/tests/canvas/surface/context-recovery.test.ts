import { describe, expect, test } from 'bun:test'

import type { CanvasKit } from 'canvaskit-wasm'
import { effectScope, nextTick, shallowRef } from 'vue'

import { useCanvasKitLoader } from '#vue/canvas/surface/kit-loader'
import { useCanvasSurfaceLifecycle } from '#vue/canvas/surface/lifecycle'

/**
 * Vue package tests resolve `#vue` and not `#tests`, so the shared stand-in helper cannot be
 * imported here. The widening stays in this one function.
 */
function asDouble<T>(double: object): T {
  return double as T
}

/**
 * The loader only passes this to `setCanvasKit`, which these tests ignore. CanvasKit cannot be
 * built in a unit test.
 */
function canvasKit(): CanvasKit {
  return asDouble<CanvasKit>({})
}

function canvas(): HTMLCanvasElement {
  const listeners = new Map<string, Set<(event: Event) => void>>()
  return asDouble<HTMLCanvasElement>({
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (typeof listener !== 'function') return
      const set = listeners.get(type) ?? new Set()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (typeof listener !== 'function') return
      listeners.get(type)?.delete(listener)
    },
    dispatchEvent(event: Event) {
      const set = listeners.get(event.type)
      if (!set) return true
      for (const listener of set) listener(event)
      return !event.defaultPrevented
    }
  })
}

function installAnimationFrame(): () => void {
  const previous = globalThis.requestAnimationFrame
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
    callback(0)
    return 0
  }
  return () => {
    globalThis.requestAnimationFrame = previous
  }
}

async function flush() {
  await nextTick()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('canvas kit loader', () => {
  test('starts a canvas when it arrives, and starts the element that replaces it', async () => {
    const restore = installAnimationFrame()
    const scope = effectScope()
    const canvasRef = shallowRef<HTMLCanvasElement | null>(null)
    const started: HTMLCanvasElement[] = []
    let loads = 0
    scope.run(() => {
      useCanvasKitLoader({
        canvasRef,
        lifecycle: { destroyed: false },
        setCanvasKit: () => undefined,
        createSurface: (element) => {
          started.push(element)
          return true
        },
        loadFonts: () => Promise.resolve(),
        renderNow: () => undefined,
        loadCanvasKit: () => {
          loads += 1
          return Promise.resolve(canvasKit())
        }
      })
    })

    const first = canvas()
    const second = canvas()
    canvasRef.value = first
    await flush()
    expect(started).toEqual([first])

    canvasRef.value = first
    await flush()
    expect(started).toEqual([first])

    canvasRef.value = second
    await flush()
    expect(started).toEqual([first, second])
    expect(loads).toBe(2)

    scope.stop()
    restore()
  })

  test('a start still in flight does not make a surface for a canvas that was replaced', async () => {
    const restore = installAnimationFrame()
    const scope = effectScope()
    const canvasRef = shallowRef<HTMLCanvasElement | null>(null)
    const started: HTMLCanvasElement[] = []
    const pending: Array<(kit: CanvasKit) => void> = []
    scope.run(() => {
      useCanvasKitLoader({
        canvasRef,
        lifecycle: { destroyed: false },
        setCanvasKit: () => undefined,
        createSurface: (element) => {
          started.push(element)
          return true
        },
        loadFonts: () => Promise.resolve(),
        renderNow: () => undefined,
        loadCanvasKit: () =>
          new Promise((resolve) => {
            pending.push(resolve)
          })
      })
    })

    const first = canvas()
    const second = canvas()
    canvasRef.value = first
    await nextTick()
    canvasRef.value = second
    await nextTick()
    expect(pending).toHaveLength(2)

    const resolveFirst = pending[0]
    const resolveSecond = pending[1]
    if (!resolveFirst || !resolveSecond) throw new Error('Expected both canvases to start')
    resolveFirst(canvasKit())
    await flush()
    expect(started).toEqual([])

    resolveSecond(canvasKit())
    await flush()
    expect(started).toEqual([second])

    scope.stop()
    restore()
  })
})

/** A CanvasKit load that never finishes, so recovery is not waiting on the real module. */
function pendingCanvasKit(): Promise<CanvasKit> {
  return new Promise<CanvasKit>((resolve) => {
    void resolve
  })
}

function recordingSurface() {
  const created: Array<{ canvas: HTMLCanvasElement; reloadFonts: boolean }> = []
  const surface = asDouble<Parameters<typeof useCanvasSurfaceLifecycle>[0]['surface']>({
    createSurface(canvas: HTMLCanvasElement, options?: { reloadFonts?: boolean }) {
      created.push({ canvas, reloadFonts: options?.reloadFonts === true })
      return true
    },
    resizeCanvas() {
      return undefined
    },
    renderNow() {
      return undefined
    },
    destroy() {
      return undefined
    },
    markDirty() {
      return undefined
    },
    getRenderer() {
      return null
    },
    getPresentation() {
      return null
    }
  })
  return { created, surface }
}

describe('canvas context recovery', () => {
  test('a context the browser gives back rebuilds that canvas and reloads its fonts', async () => {
    const scope = effectScope()
    const canvasRef = shallowRef<HTMLCanvasElement | null>(null)
    const { created, surface } = recordingSurface()
    let lost = 0
    const element = canvas()
    scope.run(() => {
      useCanvasSurfaceLifecycle({
        canvasRef,
        surface,
        lifecycle: { destroyed: false },
        setCanvasKit() {
          return undefined
        },
        getCanvasKitValue: () => null,
        onContextLost() {
          lost += 1
        },
        loadCanvasKit: pendingCanvasKit
      })
    })

    canvasRef.value = element
    await nextTick()
    const loss = new Event('webglcontextlost', { cancelable: true })
    element.dispatchEvent(loss)
    expect(loss.defaultPrevented).toBe(true)
    expect(lost).toBe(1)
    expect(created).toEqual([])

    element.dispatchEvent(new Event('webglcontextrestored'))
    expect(created).toEqual([{ canvas: element, reloadFonts: true }])
    scope.stop()
  })

  test('a context given back to a canvas the host already replaced is ignored', async () => {
    const scope = effectScope()
    const canvasRef = shallowRef<HTMLCanvasElement | null>(null)
    const { created, surface } = recordingSurface()
    const first = canvas()
    const second = canvas()
    scope.run(() => {
      useCanvasSurfaceLifecycle({
        canvasRef,
        surface,
        lifecycle: { destroyed: false },
        setCanvasKit() {
          return undefined
        },
        getCanvasKitValue: () => null,
        loadCanvasKit: pendingCanvasKit
      })
    })

    canvasRef.value = first
    await nextTick()
    canvasRef.value = second
    await nextTick()

    first.dispatchEvent(new Event('webglcontextrestored'))
    expect(created).toEqual([])

    second.dispatchEvent(new Event('webglcontextrestored'))
    expect(created).toEqual([{ canvas: second, reloadFonts: true }])
    scope.stop()
  })
})
