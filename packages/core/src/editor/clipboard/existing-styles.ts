import { pick } from 'es-toolkit/object'

import type {
  SceneGraph,
  SceneNode,
  SharedStyleKind,
  StyleRun,
  Stroke
} from '@open-pencil/scene-graph'
import { copyFills } from '@open-pencil/scene-graph/copy'
import { newStrokeGeometry } from '@open-pencil/scene-graph/node-defaults'
import { SHARED_STYLE_FIELDS, sharedStyleRefKey } from '@open-pencil/scene-graph/shared-styles'

import { rangeSharedStylePatch } from '#core/figma-api/text/bindings'

const STYLE_KINDS: readonly SharedStyleKind[] = ['fill', 'stroke', 'text', 'effect', 'grid']

/** What a stroke draws along beside its paint, which a stroke style leaves to the layer. */
const STROKE_LINE_KEYS = ['weight', 'align', 'cap', 'join', 'dashPattern'] as const

/** A stroke style's paints drawn along the layer's own strokes, as the style picker applies it. */
function styledStrokes(target: SceneNode, style: SceneNode): Stroke[] {
  const fallback = newStrokeGeometry(target)
  return copyFills(style.fills).map((paint, index) => {
    const own = target.strokes.at(index)
    return { ...paint, ...(own ? structuredClone(pick(own, STROKE_LINE_KEYS)) : fallback) }
  })
}

/** The values a style gives a layer that uses it, as applying it from the style picker does. */
function styleValues(kind: SharedStyleKind, target: SceneNode, style: SceneNode) {
  if (kind === 'stroke') return { strokes: styledStrokes(target, style) }
  return structuredClone(pick(style, SHARED_STYLE_FIELDS[kind]))
}

function styledRun(
  graph: SceneGraph,
  run: StyleRun,
  styles: ReadonlyMap<string, SceneNode>
): StyleRun {
  const { fillStyleId, textStyleId } = run.style
  const fill = fillStyleId && styles.has(fillStyleId)
  const text = textStyleId && styles.has(textStyleId)
  if (!fill && !text) return run
  let style = run.style
  if (fill) style = { ...style, ...rangeSharedStylePatch(graph, 'fill', fillStyleId) }
  if (text) style = { ...style, ...rangeSharedStylePatch(graph, 'text', textStyleId) }
  return { ...run, style }
}

/**
 * Gives a pasted layer the values of this document's styles it now uses in place of the copied
 * ones, on the layer and on its characters, so it looks like the style it claims. `styles` holds
 * those styles by their id.
 */
export function applyExistingStyles(
  graph: SceneGraph,
  node: SceneNode,
  styles: ReadonlyMap<string, SceneNode>
): void {
  if (styles.size === 0) return
  for (const kind of STYLE_KINDS) {
    const id = node[sharedStyleRefKey(kind)]
    const style = id ? styles.get(id) : undefined
    if (style) Object.assign(node, styleValues(kind, node, style))
  }
  node.styleRuns = node.styleRuns.map((run) => styledRun(graph, run, styles))
}
