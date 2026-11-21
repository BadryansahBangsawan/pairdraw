import type { Size } from '@pairdraw/scene-graph/primitives'

/** Bytes a recorded video may reach, as much as an MCP file transfer carries. */
export const MAX_VIDEO_BYTES = 64 * 1024 * 1024
/** The longest edge a recorded video may have. */
export const MAX_VIDEO_EDGE = 3840

/**
 * The pixel size of a video of a `width`×`height` frame at `scale`, its long edge fitted into
 * `maxEdge` without upscaling past `scale`. `even` rounds both sides up to even numbers, which
 * H.264 and VP9 need for their half-resolution color planes.
 */
export function videoSize(
  width: number,
  height: number,
  options: { scale: number; maxEdge: number; even: boolean }
): Size {
  const maxEdge = Math.min(options.maxEdge, MAX_VIDEO_EDGE)
  const scale = Math.min(options.scale, maxEdge / Math.max(width, height, 1))
  const side = (value: number) => {
    const pixels = Math.max(1, Math.round(value * scale))
    return options.even ? pixels + (pixels % 2) : pixels
  }
  return { width: side(width), height: side(height) }
}
