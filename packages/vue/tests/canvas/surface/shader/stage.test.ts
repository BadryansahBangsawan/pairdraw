import { describe, expect, test } from 'bun:test'

import { effectScope, nextTick, shallowRef } from 'vue'

import type { Size } from '@open-pencil/scene-graph/primitives'
import type { ShaderPreset } from '@open-pencil/scene-graph/shaders'

import {
  advanceShaderClock,
  createShaderClock,
  playShaderClock,
  seekShaderClock
} from '#vue/canvas/surface/shader/clock'
import {
  createShaderStage,
  fitShaderPreview,
  type ShaderStageBackend,
  type ShaderStageRenderer,
  type ShaderStageTarget
} from '#vue/canvas/surface/shader/stage'

describe('Shader Mode clock', () => {
  test('starts at the beginning of its loop, playing unless told otherwise', () => {
    expect(createShaderClock({ duration: 4 })).toEqual({ time: 0, playing: true, duration: 4 })
    expect(createShaderClock({ playing: false, duration: 4 }).playing).toBe(false)
  })

  test('a playing clock moves on and loops at the end', () => {
    let clock = createShaderClock({ duration: 4 })
    clock = advanceShaderClock(clock, 1.5)
    expect(clock.time).toBeCloseTo(1.5)
    clock = advanceShaderClock(clock, 3)
    expect(clock.time).toBeCloseTo(0.5)
  })

  test('a paused clock stays where it is', () => {
    const paused = playShaderClock(seekShaderClock(createShaderClock({ duration: 4 }), 2), false)
    expect(advanceShaderClock(paused, 1)).toBe(paused)
    expect(advanceShaderClock(playShaderClock(paused, true), 1).time).toBeCloseTo(3)
  })

  test('ignores time that does not move forward', () => {
    const clock = seekShaderClock(createShaderClock({ duration: 4 }), 1)
    expect(advanceShaderClock(clock, 0)).toBe(clock)
    expect(advanceShaderClock(clock, -1)).toBe(clock)
    expect(advanceShaderClock(clock, Number.NaN)).toBe(clock)
  })

  test('a scrub lands inside the loop and keeps the clock playing or paused', () => {
    const playing = createShaderClock({ duration: 4 })
    expect(seekShaderClock(playing, 2.5)).toEqual({ time: 2.5, playing: true, duration: 4 })
    expect(seekShaderClock(playing, -1).time).toBe(0)
    expect(seekShaderClock(playing, 9).time).toBe(4)
    expect(seekShaderClock(playing, Number.NaN).time).toBe(0)
    const paused = playShaderClock(playing, false)
    expect(seekShaderClock(paused, 1).playing).toBe(false)
  })

  test('playing on from the loop’s end starts it over', () => {
    const atEnd = seekShaderClock(createShaderClock({ duration: 4 }), 4)
    expect(advanceShaderClock(atEnd, 0.5).time).toBeCloseTo(0.5)
  })
})

describe('Shader Mode preview size', () => {
  test('keeps the layer’s proportions as large as the area holds', () => {
    expect(fitShaderPreview({ width: 400, height: 200 }, { width: 800, height: 800 })).toEqual({
      width: 800,
      height: 400
    })
    expect(fitShaderPreview({ width: 100, height: 300 }, { width: 800, height: 600 })).toEqual({
      width: 200,
      height: 600
    })
  })

  test('never collapses below a pixel, even for an empty layer or area', () => {
    expect(fitShaderPreview({ width: 0, height: 0 }, { width: 300, height: 100 })).toEqual({
      width: 100,
      height: 100
    })
    expect(fitShaderPreview({ width: 400, height: 200 }, { width: 0, height: 0 })).toEqual({
      width: 1,
      height: 1
    })
  })
})

/** A stand-in for a GPU surface, named so a test can tell which renderer drew. */
interface FakeSource {
  name: string
}

interface FakeRenderer extends ShaderStageRenderer<FakeSource> {
  /** The `deltaSeconds` of every frame it drew. */
  steps: number[]
  disposed: boolean
}

/** A start the test finishes: with a renderer, or with null for a shader that fails. */
interface PendingStart {
  preset: ShaderPreset
  finish: (renderer: FakeRenderer | null) => void
}

function fakeRenderer(name: string): FakeRenderer {
  const renderer: FakeRenderer = {
    source: { name },
    steps: [],
    disposed: false,
    renderFrame: ({ deltaSeconds }) => {
      renderer.steps.push(deltaSeconds)
      return Promise.resolve()
    },
    dispose: () => {
      renderer.disposed = true
    }
  }
  return renderer
}

/** A backend whose starts and display frames the test drives by hand. */
function fakeBackend(supported = true) {
  const starts: PendingStart[] = []
  let frame: ((timestamp: number) => void) | null = null
  let running = false
  let now = 1000
  const backend: ShaderStageBackend<FakeSource> = {
    supported: () => supported,
    start: (preset) =>
      new Promise((resolve) => {
        starts.push({ preset, finish: resolve })
      }),
    frames: (callback) => {
      frame = callback
      return {
        pause: () => {
          running = false
        },
        resume: () => {
          running = true
        }
      }
    }
  }
  return {
    backend,
    starts,
    /** Runs one display frame `ms` after the last, if the loop runs. */
    tick(ms = 16) {
      now += ms
      if (running) frame?.(now)
    }
  }
}

/** A target canvas that records which source it last showed. */
function fakeTarget() {
  const shown: string[] = []
  const target: ShaderStageTarget<FakeSource> = {
    width: 0,
    height: 0,
    getContext: () => ({
      clearRect: () => undefined,
      drawImage: (image) => {
        shown.push(image.name)
      }
    })
  }
  return { target, shown }
}

/** Lets every queued watcher, start, and frame run. */
async function settle() {
  await nextTick()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

function preset(type: string): ShaderPreset {
  return { components: [{ type }] }
}

const SIZE: Size = { width: 200, height: 100 }

function mountStage(options: { supported?: boolean; autoplay?: boolean } = {}) {
  const driver = fakeBackend(options.supported)
  const { target, shown } = fakeTarget()
  const current = shallowRef<ShaderPreset | null>(preset('Aurora'))
  const scope = effectScope()
  const stage = scope.run(() =>
    createShaderStage({
      preset: () => current.value,
      size: () => SIZE,
      target: shallowRef(target),
      autoplay: options.autoplay ?? false,
      getPixelRatio: () => 1,
      backend: driver.backend
    })
  )
  if (!stage) throw new Error('The stage did not start')
  return { ...driver, stage, current, shown, stop: () => scope.stop() }
}

describe('Shader Mode stage', () => {
  test('keeps showing the old shader until the new one is ready, then hands over in time', async () => {
    const view = mountStage()
    const first = fakeRenderer('first')
    view.starts[0]?.finish(first)
    await settle()
    expect(view.stage.status.value).toBe('ready')
    view.tick()
    await settle()
    expect(view.shown.at(-1)).toBe('first')

    view.stage.seek(1.5)
    view.current.value = preset('Plasma')
    await settle()
    expect(view.starts).toHaveLength(2)
    view.tick()
    await settle()
    // The new one is still starting, so the old one draws on at the new time.
    expect(view.shown.at(-1)).toBe('first')
    expect(first.disposed).toBe(false)

    const second = fakeRenderer('second')
    view.starts[1]?.finish(second)
    await settle()
    expect(first.disposed).toBe(true)
    view.tick()
    await settle()
    expect(view.shown.at(-1)).toBe('second')
    // Its first frame lands at the clock's time rather than at the start of the loop.
    expect(second.steps[0]).toBeCloseTo(1.5)
    view.stop()
    expect(second.disposed).toBe(true)
  })

  test('steps the renderer back when the clock is scrubbed back', async () => {
    const view = mountStage()
    const renderer = fakeRenderer('only')
    view.starts[0]?.finish(renderer)
    await settle()
    view.stage.seek(3)
    view.tick()
    await settle()
    view.stage.seek(1)
    view.tick()
    await settle()
    expect(renderer.steps.at(0)).toBeCloseTo(3)
    expect(renderer.steps.at(-1)).toBeCloseTo(-2)
    view.stop()
  })

  test('says a shader failed rather than showing the one before it', async () => {
    const view = mountStage()
    const first = fakeRenderer('first')
    view.starts[0]?.finish(first)
    await settle()

    view.current.value = preset('Broken')
    await settle()
    view.starts[1]?.finish(null)
    await settle()
    expect(view.stage.status.value).toBe('failed')
    expect(first.disposed).toBe(true)

    view.current.value = preset('Plasma')
    await settle()
    expect(view.stage.status.value).toBe('starting')
    view.starts[2]?.finish(fakeRenderer('third'))
    await settle()
    expect(view.stage.status.value).toBe('ready')

    // Going back to the failed shader shows the failure again, without trying it a second time,
    // instead of the working one.
    view.current.value = preset('Broken')
    await settle()
    expect(view.stage.status.value).toBe('failed')
    expect(view.starts).toHaveLength(3)
    view.stop()
  })

  test('lets go of a renderer that finishes starting after the stage closed', async () => {
    const view = mountStage()
    view.stop()
    const late = fakeRenderer('late')
    view.starts[0]?.finish(late)
    await settle()
    expect(late.disposed).toBe(true)
  })

  test('starts nothing and says so where shaders cannot play', async () => {
    const view = mountStage({ supported: false })
    await settle()
    expect(view.stage.status.value).toBe('unsupported')
    expect(view.starts).toHaveLength(0)
    view.current.value = preset('Plasma')
    await settle()
    expect(view.stage.status.value).toBe('unsupported')
    view.stop()
  })

  test('a playing clock moves with the display frames; a paused one holds', async () => {
    const view = mountStage({ autoplay: true })
    view.tick(100)
    view.tick(100)
    expect(view.stage.clock.value.time).toBeCloseTo(0.1)
    view.stage.pause()
    view.tick(100)
    expect(view.stage.clock.value.time).toBeCloseTo(0.1)
    view.stop()
  })
})
