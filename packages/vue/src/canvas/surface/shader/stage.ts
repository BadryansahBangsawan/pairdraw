import { useRafFn, watchDebounced } from '@vueuse/core'
import type { createRendererFromJSON } from 'shaders/core'
import { onScopeDispose, readonly, ref, shallowRef, watch, type Ref } from 'vue'

import type { Size } from '@pairdraw/scene-graph/primitives'
import type { ShaderPreset } from '@pairdraw/scene-graph/shaders'

import {
  advanceShaderClock,
  createShaderClock,
  playShaderClock,
  seekShaderClock,
  type ShaderClock
} from '#vue/canvas/surface/shader/clock'
import { canDrawShaders } from '#vue/canvas/surface/shader/rasterizer'

/** The longest side the preview draws at, in CSS pixels, however large the screen is. */
const MAX_STAGE_EDGE = 2048
/**
 * The most wall time one frame may move the clock by, in seconds, so a tab that was hidden or a
 * frame that stalled resumes where it was rather than leaping ahead.
 */
const MAX_FRAME_SECONDS = 0.25
/** How long the preview's size settles before the shader is drawn at it again, in milliseconds. */
const RESIZE_SETTLE_MS = 150

/**
 * What the stage shows: nothing yet while the shader starts, its frames once it plays, or its
 * still where it cannot play, because the browser has no WebGPU or the shader failed to start.
 */
export type ShaderStageStatus = 'starting' | 'ready' | 'failed' | 'unsupported'

/** One shader drawing at one preset and size, on a surface of type `Source`. */
export interface ShaderStageRenderer<Source> {
  /** What its frames are drawn on, which the stage copies to the screen. */
  source: Source
  renderFrame: (options: { deltaSeconds: number; waitForGpu: boolean }) => Promise<void>
  dispose: () => void
}

/** The 2D context the stage copies frames with. */
interface ShaderStageContext<Source> {
  clearRect(x: number, y: number, width: number, height: number): void
  drawImage(image: Source, dx: number, dy: number, dw: number, dh: number): void
}

/** The canvas on screen that shows the frames. */
export interface ShaderStageTarget<Source> extends Size {
  getContext(contextId: '2d'): ShaderStageContext<Source> | null
}

/** What the stage draws with: in the browser, the `shaders` library on WebGPU and the display's frames. */
export interface ShaderStageBackend<Source> {
  /** Whether shaders can play here at all. */
  supported: () => boolean
  /** A renderer for `preset` drawing at `size`, or null when it cannot start. */
  start: (preset: ShaderPreset, size: Size) => Promise<ShaderStageRenderer<Source> | null>
  /** Calls `frame` once per display frame while resumed. */
  frames: (frame: (timestamp: number) => void) => { pause: () => void; resume: () => void }
}

/** A shader drawing for the stage, with where in time its last frame was. */
interface StagePlayer<Source> {
  key: string
  renderer: ShaderStageRenderer<Source>
  /** The clock time its last frame was drawn at, in seconds. */
  rendered: number
  /** Whether it has drawn a frame yet; its first frame only prepares the effects' pipelines. */
  drawn: boolean
}

interface StageRequest {
  key: string
  preset: ShaderPreset
  size: Size
}

/**
 * The largest box with `layer`'s proportions that fits in `area`, in whole CSS pixels and at
 * least one pixel a side, as the stage frames a layer's shader.
 */
export function fitShaderPreview(layer: Size, area: Size): Size {
  const width = Math.max(layer.width, 1)
  const height = Math.max(layer.height, 1)
  const scale = Math.min(area.width / width, area.height / height)
  const fitted = Number.isFinite(scale) && scale > 0 ? scale : 0
  return {
    width: Math.max(1, Math.floor(width * fitted)),
    height: Math.max(1, Math.floor(height * fitted))
  }
}

/** The size a preview of `size` CSS pixels draws its shader at. */
function drawSize(size: Size): Size {
  const fit = Math.min(1, MAX_STAGE_EDGE / Math.max(size.width, size.height, 1))
  return {
    width: Math.max(1, Math.round(size.width * fit)),
    height: Math.max(1, Math.round(size.height * fit))
  }
}

/** Starts `preset` on a detached WebGPU canvas, as the `shaders` library's preset renderer. */
async function startBrowserRenderer(
  preset: ShaderPreset,
  size: Size
): Promise<ShaderStageRenderer<HTMLCanvasElement> | null> {
  const canvas = document.createElement('canvas')
  // A detached canvas: the renderer sizes its buffer from these CSS pixels at the display's ratio.
  canvas.width = size.width
  canvas.height = size.height
  let renderer: ReturnType<typeof createRendererFromJSON> | null = null
  try {
    const { createRendererFromJSON } = await import('shaders/core')
    renderer = createRendererFromJSON(structuredClone(preset))
    await renderer.initialize(canvas)
    // Without a usable GPU the renderer draws nothing and says so only here.
    if (renderer.getFailureReason() !== null) throw new Error(String(renderer.getFailureReason()))
    const started = renderer
    return {
      source: canvas,
      renderFrame: (options) => started.renderFrame(options),
      dispose: () => started.dispose()
    }
  } catch (error) {
    console.warn('Could not play a shader in Shader Mode', error)
    renderer?.dispose()
    return null
  }
}

/** The browser's backend: WebGPU through the `shaders` library, on the display's frames. */
const browserShaderStageBackend: ShaderStageBackend<HTMLCanvasElement> = {
  supported: canDrawShaders,
  start: startBrowserRenderer,
  frames: (frame) => useRafFn(({ timestamp }) => frame(timestamp), { immediate: false })
}

/** Options both the browser's stage and a test's share. */
interface ShaderStageOptions<Source> {
  /** The preset to play, or null while there is none. */
  preset: () => ShaderPreset | null
  /** The preview's size on screen, in CSS pixels, or null until it is laid out. */
  size: () => Size | null
  target: Ref<ShaderStageTarget<Source> | null>
  /** Whether the clock starts running; a person who asks for reduced motion starts it paused. */
  autoplay?: boolean
  /** The device pixels per CSS pixel the preview draws at; the display's ratio by default. */
  getPixelRatio?: () => number
}

/**
 * The stage's player on any backend: {@link useShaderStage} runs it on the browser's, and a test
 * on its own. Call it inside an effect scope, which it stops with.
 */
export function createShaderStage<Source>(
  options: ShaderStageOptions<Source> & { backend: ShaderStageBackend<Source> }
) {
  const { backend } = options
  const pixelRatio = options.getPixelRatio ?? (() => window.devicePixelRatio || 1)
  const supported = backend.supported()
  const clock = shallowRef<ShaderClock>(createShaderClock({ playing: options.autoplay ?? true }))
  const status = ref<ShaderStageStatus>(supported ? 'starting' : 'unsupported')

  let player: StagePlayer<Source> | null = null
  let wanted: StageRequest | null = null
  /** The request that failed to start, which is not tried again until the preset or size changes. */
  let failedKey: string | null = null
  let starting = false
  let drawing = false
  let disposed = false
  /** Whether the target was cleared, as by a resize, and needs the frame again though time stood. */
  let stale = true
  /** Renderers to let go of once the frame being drawn is done with them. */
  const retired: ShaderStageRenderer<Source>[] = []
  let last = 0
  /** Whether the backend is asked for display frames, which it is only while something draws. */
  let running = false

  function release() {
    for (const old of retired.splice(0)) old.dispose()
  }

  function retire(old: StagePlayer<Source> | null) {
    if (!old) return
    retired.push(old.renderer)
    if (!drawing) release()
  }

  /**
   * The shader asked for cannot play: an older one still showing would pass for it, so it goes,
   * and the stage shows the paint's still and says why.
   */
  function fail() {
    retire(player)
    player = null
    status.value = 'failed'
  }

  /**
   * Asks for display frames. A paused stage with nothing stale draws no frames, so it asks for
   * none: the browser then skips the shader's whole frame path until something changes.
   */
  function wake() {
    if (!supported || isDisposed() || running) return
    running = true
    // The first frame after a rest starts from where the clock is, not from the gap.
    last = 0
    loop.resume()
  }

  /** Stops asking for display frames, which a playing clock or a stale frame starts again. */
  function rest() {
    if (!running) return
    running = false
    loop.pause()
  }

  /** Rests the loop when nothing will change the frame: the clock is paused and nothing is stale. */
  function settleLoop() {
    if (!clock.value.playing && !stale && !drawing && !starting) rest()
  }

  /** Read through calls: a start in flight may be overtaken, or the stage closed, meanwhile. */
  const isDisposed = () => disposed
  const latest = () => wanted

  /** The request still to start: the newest one, unless it already shows or failed. */
  function pending(): StageRequest | null {
    const next = latest()
    if (isDisposed() || !next || next.key === player?.key || next.key === failedKey) return null
    return next
  }

  /** Starts the latest request once any start in flight is done, so the newest setting wins. */
  async function reconcile() {
    if (starting || !supported) return
    starting = true
    try {
      for (let request = pending(); request; request = pending()) {
        const next = await backend.start(request.preset, request.size)
        if (isDisposed()) {
          if (next) retired.push(next)
          break
        }
        if (!next) {
          // A newer request may still start; this one is not tried again.
          failedKey = request.key
          if (latest() === request) fail()
          continue
        }
        // It draws its first frame at the clock's time, so the animation goes on from there.
        const previous = player
        player = { key: request.key, renderer: next, rendered: 0, drawn: false }
        stale = true
        retire(previous)
        status.value = 'ready'
        wake()
      }
    } finally {
      starting = false
      if (isDisposed()) release()
    }
  }

  function request(preset: ShaderPreset | null, size: Size | null) {
    if (!preset) {
      wanted = null
      return
    }
    // Nothing is drawn before the preview has a size to draw at.
    if (!size || !supported) return
    const drawn = drawSize(size)
    const key = JSON.stringify([preset, drawn.width, drawn.height])
    wanted = { key, preset, size: drawn }
    if (key === failedKey) {
      // Back to a shader that failed: whatever shows now is another one.
      if (player) fail()
      return
    }
    if (!player) status.value = 'starting'
    wake()
    void reconcile()
  }

  /** Sizes the on-screen canvas to the preview's device pixels; a new size clears it. */
  function sizeTarget(canvas: ShaderStageTarget<Source>) {
    const size = options.size()
    if (!size) return
    const { width, height } = size
    const ratio = pixelRatio()
    const deviceWidth = Math.max(1, Math.round(width * ratio))
    const deviceHeight = Math.max(1, Math.round(height * ratio))
    if (canvas.width === deviceWidth && canvas.height === deviceHeight) return
    canvas.width = deviceWidth
    canvas.height = deviceHeight
    stale = true
    wake()
  }

  /**
   * Draws the shader at the clock's time and copies the frame to the target in the same task,
   * since a WebGPU canvas keeps its frame only until that task ends.
   */
  async function draw(active: StagePlayer<Source>, target: ShaderStageTarget<Source>) {
    const time = clock.value.time
    const { renderer } = active
    // The renderer's clocks only ever add the step they are given; a step back is negative.
    await renderer.renderFrame({ deltaSeconds: time - active.rendered, waitForGpu: false })
    if (!active.drawn) {
      active.drawn = true
      await renderer.renderFrame({ deltaSeconds: 0, waitForGpu: false })
    }
    active.rendered = time
    if (player !== active) return
    const context = target.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, target.width, target.height)
    context.drawImage(renderer.source, 0, 0, target.width, target.height)
    stale = false
  }

  const loop = backend.frames((timestamp) => {
    const seconds = last === 0 ? 0 : Math.min((timestamp - last) / 1000, MAX_FRAME_SECONDS)
    last = timestamp
    if (clock.value.playing) clock.value = advanceShaderClock(clock.value, seconds)
    const target = options.target.value
    const active = player
    if (drawing || !target || !active) {
      settleLoop()
      return
    }
    sizeTarget(target)
    if (!stale && active.rendered === clock.value.time) {
      settleLoop()
      return
    }
    drawing = true
    void draw(active, target)
      .catch((error: unknown) => console.warn('Could not draw a shader frame', error))
      .finally(() => {
        drawing = false
        release()
        settleLoop()
      })
  })

  function play() {
    clock.value = playShaderClock(clock.value, true)
    wake()
  }

  function pause() {
    clock.value = playShaderClock(clock.value, false)
    settleLoop()
  }

  function toggle() {
    clock.value = playShaderClock(clock.value, !clock.value.playing)
  }

  /** Shows the shader `time` seconds into its loop, playing on from there if it was playing. */
  function seek(time: number) {
    clock.value = seekShaderClock(clock.value, time)
    wake()
  }

  function restart() {
    seek(0)
  }

  const sizeKey = () => {
    const size = options.size()
    return size ? `${size.width}x${size.height}` : ''
  }
  // A preset changes at once, and so does the first size; a later size waits for a resize to
  // settle.
  watch(
    () => JSON.stringify(options.preset()),
    () => request(options.preset(), options.size()),
    { immediate: true }
  )
  watch(sizeKey, () => {
    if (!player && !starting) request(options.preset(), options.size())
  })
  watchDebounced(sizeKey, () => request(options.preset(), options.size()), {
    debounce: RESIZE_SETTLE_MS
  })
  watch(options.target, (canvas) => {
    if (!canvas) return
    stale = true
    wake()
  })

  if (supported) wake()

  onScopeDispose(() => {
    disposed = true
    loop.pause()
    retire(player)
    player = null
    if (!starting) release()
  })

  return {
    clock: readonly(clock),
    status: readonly(status),
    play,
    pause,
    toggle,
    seek,
    restart
  }
}

/**
 * Plays one shader large, in Shader Mode, on a clock the person controls: it plays, pauses, and
 * jumps to any time in its loop, and its frames are drawn into `target`, a 2D canvas on screen.
 * A preset or size change starts a new renderer beside the one showing, which keeps drawing
 * until the new one is ready and then hands over at the same time in the loop, so tuning a
 * setting neither flashes nor restarts the animation. A shader that fails to start is not
 * covered by the one before it: the status says so. Without WebGPU the status says so too and
 * nothing draws.
 */
export function useShaderStage(
  options: ShaderStageOptions<HTMLCanvasElement> & {
    /** What plays the shader: WebGPU through the `shaders` library unless a story hands its own. */
    backend?: ShaderStageBackend<HTMLCanvasElement>
  }
) {
  return createShaderStage({ ...options, backend: options.backend ?? browserShaderStageBackend })
}
