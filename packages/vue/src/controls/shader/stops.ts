/** One colour stop of a shader effect's gradient, as the `shaders` library takes it. */
export interface ShaderStop {
  color: string
  position: number
}

/** The least stops a gradient keeps: fewer stops are a colour, not a ramp. */
const MIN_STOPS = 2

function isStop(value: unknown): value is ShaderStop {
  return (
    typeof value === 'object' &&
    value !== null &&
    'color' in value &&
    typeof value.color === 'string' &&
    'position' in value &&
    typeof value.position === 'number' &&
    Number.isFinite(value.position)
  )
}

/** The stops a preset's gradient value holds, sorted along the ramp, positions within it. */
export function shaderStops(value: unknown): ShaderStop[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isStop)
    .map((stop) => ({ color: stop.color, position: Math.min(1, Math.max(0, stop.position)) }))
    .sort((a, b) => a.position - b.position)
}

/** `stops` with stop `index` at `position`, kept within the ramp. */
export function setStopPosition(
  stops: readonly ShaderStop[],
  index: number,
  position: number
): ShaderStop[] {
  const clamped = Math.min(1, Math.max(0, position))
  return stops.map((stop, at) => (at === index ? { ...stop, position: clamped } : stop))
}

/** `stops` with stop `index` painted `color`. */
export function setStopColor(
  stops: readonly ShaderStop[],
  index: number,
  color: string
): ShaderStop[] {
  return stops.map((stop, at) => (at === index ? { ...stop, color } : stop))
}

/**
 * `stops` with a stop in the widest gap between two, painted the colour on its left, so adding
 * one never flashes a colour the shader did not already show.
 */
export function addStop(stops: readonly ShaderStop[]): ShaderStop[] {
  if (stops.length === 0) {
    return [
      { color: '#000000', position: 0 },
      { color: '#ffffff', position: 1 }
    ]
  }
  const sorted = shaderStops(stops)
  let widest = 0
  let at = 0
  for (let index = 1; index < sorted.length; index++) {
    const gap = (sorted[index]?.position ?? 1) - (sorted[index - 1]?.position ?? 0)
    if (gap > widest) {
      widest = gap
      at = index
    }
  }
  const left = sorted.at(Math.max(0, at - 1))
  const right = sorted.at(Math.min(sorted.length - 1, at))
  const position = ((left?.position ?? 0) + (right?.position ?? 1)) / 2
  const added = { color: left?.color ?? '#000000', position }
  return [...sorted.slice(0, at), added, ...sorted.slice(at)]
}

/** `stops` without stop `index`; the last two stay, since a ramp needs two. */
export function removeStop(stops: readonly ShaderStop[], index: number): ShaderStop[] {
  if (stops.length <= MIN_STOPS) return [...stops]
  return stops.filter((_, at) => at !== index)
}
