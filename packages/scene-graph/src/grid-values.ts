import type { GridTrack, SceneNode } from './types'

/**
 * A gap or track a canvas can lay out. Figma holds gaps at zero or more and every track at a
 * finite, usable size: a fixed or auto track that is negative or not a number becomes auto, and a
 * fractional track needs a positive weight.
 */
function safeTrack(track: GridTrack): GridTrack {
  const value = track.value
  const finite = Number.isFinite(value)
  switch (track.sizing) {
    case 'FR':
      return finite && value > 0 ? track : { sizing: 'FR', value: 1 }
    case 'FIXED':
      return finite && value >= 0 ? track : { sizing: 'AUTO', value: 0 }
    case 'AUTO':
      return finite && value === 0 ? track : { sizing: 'AUTO', value: 0 }
    default:
      return { sizing: 'AUTO', value: 0 }
  }
}

function safeGap(gap: number): number {
  return Number.isFinite(gap) && gap >= 0 ? gap : 0
}

/**
 * `changes` with grid gaps and tracks held to values the canvas can lay out. Only fields that
 * needed holding move, so a write that already fits changes nothing.
 */
export function gridLayoutChanges(changes: Partial<SceneNode>): Partial<SceneNode> {
  const fixed: Partial<SceneNode> = {}
  const { gridRowGap, gridColumnGap, gridTemplateRows, gridTemplateColumns } = changes
  if (gridRowGap !== undefined && safeGap(gridRowGap) !== gridRowGap) fixed.gridRowGap = 0
  if (gridColumnGap !== undefined && safeGap(gridColumnGap) !== gridColumnGap) {
    fixed.gridColumnGap = 0
  }
  const rows = gridTemplateRows?.map(safeTrack)
  if (rows?.some((track, index) => track !== gridTemplateRows?.[index])) {
    fixed.gridTemplateRows = rows
  }
  const columns = gridTemplateColumns?.map(safeTrack)
  if (columns?.some((track, index) => track !== gridTemplateColumns?.[index])) {
    fixed.gridTemplateColumns = columns
  }
  return Object.keys(fixed).length === 0 ? changes : { ...changes, ...fixed }
}
