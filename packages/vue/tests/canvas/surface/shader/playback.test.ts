import { describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'
import { effectScope, nextTick, reactive } from 'vue'

import { createEditor, type Editor } from '@pairdraw/core'
import type { SkiaRenderer } from '@pairdraw/core/canvas'
import {
  createShaderPaint,
  withShaderPaints,
  type ShaderEffectMotion,
  type ShaderPreset
} from '@pairdraw/scene-graph/shaders'

import { shaderPlaybackStats, useShaderPlayback } from '#vue/canvas/surface/shader/playback'

/**
 * The library's motion metadata: Aurora is driven by time, Paper draws one picture. The player
 * is a stub whose frames resolve at once.
 */
const MOTIONS: ReadonlyMap<string, ShaderEffectMotion> = new Map([
  ['Aurora', { animates: true, speed: true }],
  ['Paper', { animates: false, speed: false }]
])

const ANIMATED: ShaderPreset = { components: [{ type: 'Aurora' }] }
const STILL: ShaderPreset = { components: [{ type: 'Paper' }] }
const VIEWPORT = { width: 800, height: 600 }

/** A DOM for the players' canvases and the tab's visibility, which the test drives. */
const browser = new Window()
Object.assign(globalThis, { window: browser, document: browser.document })
Object.defineProperty(globalThis.navigator, 'gpu', { value: {}, configurable: true })

/** Animation frames the test runs by hand, counting how often the loop is asked to run. */
function frameLoop() {
  let tick: ((timestamp: number) => void) | undefined
  const calls = { resumed: 0, paused: 0 }
  return {
    calls,
    /** The scheduler handed to the playback, in place of the browser's frames. */
    frames: (draw: (timestamp: number) => void) => {
      tick = draw
      return {
        resume: () => {
          calls.resumed += 1
        },
        pause: () => {
          calls.paused += 1
        }
      }
    },
    /** Draws one display frame, which a playing shader answers with a frame of its own. */
    draw(now = performance.now()) {
      tick?.(now)
    }
  }
}

/** Lets the metadata promise and the frame's own promises settle. */
async function settle() {
  await nextTick()
  for (let turn = 0; turn < 30; turn++) await Promise.resolve()
  await nextTick()
}

/** A canvas that keeps the frame it was handed, so a player counts as drawn. */
const renderer: Pick<SkiaRenderer, 'setLiveImage'> = {
  setLiveImage: () => true
}

function tabVisibility(initial: DocumentVisibilityState) {
  let state = initial
  Object.defineProperty(globalThis.document, 'visibilityState', {
    configurable: true,
    get: () => state
  })
  return {
    set(next: DocumentVisibilityState) {
      state = next
      globalThis.document.dispatchEvent(new browser.Event('visibilitychange'))
    }
  }
}

interface HarnessOptions {
  presets?: ShaderPreset[]
  animations?: () => boolean
  warn?: (message: string) => void
}

/**
 * A preview on one page, with a shader layer per preset in view, and a view the test pans.
 */
async function preview(options: HarnessOptions = {}) {
  const editor: Editor = createEditor({ getViewportSize: () => VIEWPORT })
  const pageId = editor.graph.getPages()[0].id
  for (const preset of options.presets ?? [ANIMATED]) {
    const { paint, shader } = createShaderPaint(preset)
    const node = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Shader',
      x: 0,
      y: 0,
      width: 120,
      height: 80,
      fills: [paint]
    })
    editor.graph.updateNode(node.id, {
      pluginData: withShaderPaints(node, [paint], [shader])
    })
  }
  editor.state.panX = 0
  editor.state.panY = 0
  editor.state.zoom = 1
  editor.state.canvasView = { id: 'play', revision: 0 }
  editor.state.sceneVersion += 1
  /** The pane's own view, which a front end keeps reactive so the canvas follows it. */
  const view = reactive(editor.state)

  const loop = frameLoop()
  const scope = effectScope()
  scope.run(() =>
    useShaderPlayback({
      editor,
      getRenderer: () => renderer,
      getView: () => view,
      getViewport: () => VIEWPORT,
      markDirty: () => undefined,
      getAnimations: options.animations,
      warn: options.warn,
      frames: loop.frames,
      loadMotionMap: async () => new Map(MOTIONS),
      createPlayer: async () => ({
        renderFrame: async () => undefined,
        dispose: () => undefined
      })
    })
  )
  await settle()
  const stats = () => {
    const value = shaderPlaybackStats(editor)
    if (!value) throw new Error('The canvas reports no playback')
    return value
  }
  return {
    loop,
    stats,
    editor,
    state: view,
    /** Draws `count` display frames, so a playing shader would add as many. */
    async draw(count = 1) {
      for (let index = 0; index < count; index++) {
        loop.draw()
        await settle()
      }
    },
    /** Leaves every shader behind, as scrolling the view does. */
    async panAway() {
      view.panX = -20_000
      view.sceneVersion += 1
      await settle()
    },
    stop: () => scope.stop()
  }
}

describe('shader playback cost', () => {
  test('a preset that never changes keeps its still frame and asks for no frames', async () => {
    const view = await preview({ presets: [STILL] })
    expect(view.stats().players).toBe(0)
    expect(view.loop.calls.resumed).toBe(0)
    await view.draw(3)
    expect(view.stats().frames).toBe(0)
    view.stop()
  })

  test('a shader on screen draws, and leaving it behind stops the frame loop', async () => {
    const view = await preview()
    expect(view.stats().players).toBe(1)
    expect(view.stats().running).toBe(true)
    await view.draw(2)
    const drawn = view.stats().frames
    expect(drawn).toBeGreaterThan(0)

    const pausedBefore = view.loop.calls.paused
    await view.panAway()
    expect(view.stats().visible).toBe(0)
    expect(view.stats().running).toBe(false)
    expect(view.loop.calls.paused).toBeGreaterThan(pausedBefore)

    await view.draw(3)
    expect(view.stats().frames).toBe(drawn)
    view.stop()
  })

  test('a hidden tab stops its players and draws nothing', async () => {
    const tab = tabVisibility('visible')
    const view = await preview()
    await view.draw(1)
    expect(view.stats().players).toBe(1)
    const drawn = view.stats().frames

    tab.set('hidden')
    await settle()
    expect(view.stats().players).toBe(0)
    await view.draw(3)
    expect(view.stats().frames).toBe(drawn)

    tab.set('visible')
    await settle()
    expect(view.stats().players).toBe(1)
    view.stop()
    tabVisibility('visible')
  })

  test('motion turned off plays nothing', async () => {
    const view = await preview({ animations: () => false })
    expect(view.stats().players).toBe(0)
    await view.draw(2)
    expect(view.stats().frames).toBe(0)
    view.stop()
  })

  test('a page plays sixteen shaders at most and says so once', async () => {
    const warnings: string[] = []
    const presets = Array.from({ length: 17 }, (_, index) => ({
      components: [{ type: 'Aurora', props: { seed: index } }]
    }))
    const view = await preview({ presets, warn: (message) => warnings.push(message) })
    expect(view.stats().players).toBe(16)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('16')

    view.state.sceneVersion += 1
    await settle()
    expect(view.stats().players).toBe(16)
    expect(warnings).toHaveLength(1)
    view.stop()
  })
})
