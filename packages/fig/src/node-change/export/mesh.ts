import type { Fill, SceneNode, Stroke } from '@pairdraw/scene-graph'
import { isMeshFill } from '@pairdraw/scene-graph/gradient'
import {
  PAIRDRAW_PLUGIN_DATA,
  withPluginData,
  type StoredMeshFill
} from '@pairdraw/scene-graph/plugin-data'

function meshEntries(paints: readonly (Fill | Stroke)[], kind: StoredMeshFill['kind']) {
  return paints.flatMap((paint, index): StoredMeshFill[] => {
    if (paint.type !== 'MESH' || !isMeshFill(paint)) return []
    const { meshColumns, meshRows, meshPoints } = paint
    if (meshColumns === undefined || meshRows === undefined || !meshPoints) return []
    return [
      {
        kind,
        index,
        columns: meshColumns,
        rows: meshRows,
        points: meshPoints.map((point) => ({
          position: { ...point.position },
          color: { ...point.color }
        }))
      }
    ]
  })
}

/**
 * Writes a mesh paint as Figma can read it: the record carries a solid fallback in the paint's
 * own color, and the grid rides beside it in plugin data. The node is a per-record copy, so
 * replacing its paints never touches the live document.
 */
export function applyMeshFillsPluginData(node: SceneNode): void {
  const entries = [...meshEntries(node.fills, 'fill'), ...meshEntries(node.strokes, 'stroke')]
  if (entries.length === 0) return
  node.pluginData = withPluginData(node.pluginData, PAIRDRAW_PLUGIN_DATA.meshFills, entries)
  const fallback = (paint: Fill | Stroke): Fill | Stroke =>
    paint.type === 'MESH' && isMeshFill(paint)
      ? {
          ...paint,
          type: 'SOLID',
          meshColumns: undefined,
          meshRows: undefined,
          meshPoints: undefined
        }
      : paint
  node.fills = node.fills.map(fallback)
  node.strokes = node.strokes.map(fallback) as SceneNode['strokes']
}
