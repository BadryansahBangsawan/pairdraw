import type { ShaderStageBackend, ShaderStageRenderer } from '@open-pencil/vue/canvas/surface'

/** What the stories' shader does: play, stay starting, fail, or find no WebGPU. */
export type StoryShaderState = 'ready' | 'starting' | 'failed' | 'unsupported'

/** Does nothing, for a renderer or loop with nothing to let go of. */
function idle(): undefined {
  return undefined
}

/** A frame that stands in for the shader's: a fixed gradient drawn once on a 2D canvas. */
function gradientRenderer(): ShaderStageRenderer<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 180
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#2b1055')
    gradient.addColorStop(1, '#7597de')
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  return { source: canvas, renderFrame: () => Promise.resolve(), dispose: idle }
}

/**
 * A Shader Mode backend that shows `state` the same in every browser, whether or not it has
 * WebGPU: a fixed frame when it plays, a start that never ends, a start that fails, or none.
 */
export function storyShaderBackend(state: StoryShaderState): ShaderStageBackend<HTMLCanvasElement> {
  return {
    supported: () => state !== 'unsupported',
    start: () => {
      if (state === 'ready') return Promise.resolve(gradientRenderer())
      if (state === 'failed') return Promise.resolve(null)
      // Still starting: the start never finishes.
      return new Promise(idle)
    },
    frames: (frame) => {
      let handle = 0
      const run = (timestamp: number) => {
        frame(timestamp)
        handle = requestAnimationFrame(run)
      }
      return {
        pause: () => cancelAnimationFrame(handle),
        resume: () => {
          handle = requestAnimationFrame(run)
        }
      }
    }
  }
}
