/**
 * How long one pass of a shader's animation runs in Shader Mode, in seconds: the phase scrubber
 * spans it, and playing loops over it. Shaders have no length of their own, so this is a span
 * long enough to show a slow animation's motion.
 */
export const SHADER_LOOP_SECONDS = 10

/** The clock Shader Mode plays a shader by: where in its loop it is, and whether it runs. */
export interface ShaderClock {
  /** Seconds into the loop, from 0 to `duration`. */
  time: number
  playing: boolean
  duration: number
}

/** A clock at the start of its loop, paused or playing. */
export function createShaderClock(
  options: { playing?: boolean; duration?: number } = {}
): ShaderClock {
  const duration = options.duration ?? SHADER_LOOP_SECONDS
  return { time: 0, playing: options.playing ?? true, duration: duration > 0 ? duration : 1 }
}

/** `time` wrapped into the loop, so playing past its end starts it over. */
function wrap(time: number, duration: number): number {
  if (!Number.isFinite(time)) return 0
  const wrapped = time % duration
  return wrapped < 0 ? wrapped + duration : wrapped
}

/**
 * The clock after `seconds` of wall time: a playing clock moves on, looping at the end; a paused
 * one stays.
 */
export function advanceShaderClock(clock: ShaderClock, seconds: number): ShaderClock {
  if (!clock.playing || !(seconds > 0)) return clock
  return { ...clock, time: wrap(clock.time + seconds, clock.duration) }
}

/** The clock at `time` seconds into its loop, held inside the loop, playing or not as it was. */
export function seekShaderClock(clock: ShaderClock, time: number): ShaderClock {
  // A scrub may rest at the loop's very end; playing on from there starts the loop over.
  const held = Number.isFinite(time) ? Math.min(Math.max(time, 0), clock.duration) : 0
  return { ...clock, time: held }
}

/** The clock playing or paused where it is. */
export function playShaderClock(clock: ShaderClock, playing: boolean): ShaderClock {
  return clock.playing === playing ? clock : { ...clock, playing }
}
