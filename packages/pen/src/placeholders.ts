import type { SceneNode } from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'

import { unresolvedRef } from './plugin-data'
import type { PenNode } from './schema'

/**
 * Layers pen.dev draws that this reader cannot: a `script` node's generated layers, a `browser`
 * node's live page, and a `ref` to a component that could not be found, such as one from a library
 * the host could not read. Each reads as a frame in its box, filled and outlined with a dashed line
 * where pen.dev gives it neither, and labelled with what it stands for when it has no layers.
 */
const EMBED_TYPES: ReadonlySet<string> = new Set(['script', 'browser'])

const PLACEHOLDER_FILL: Color = { r: 0.96, g: 0.96, b: 0.96, a: 1 }
const PLACEHOLDER_OUTLINE: Color = { r: 0.62, g: 0.62, b: 0.62, a: 1 }
const PLACEHOLDER_DASH = [4, 4]
/** Room around the label, inside the outline. */
const PLACEHOLDER_INSET = 8
const LABEL_SIZE = 12
const LABEL_COLOR = '#737373'

/** Whether a layer reads as a placeholder. */
export function isPlaceholder(pen: PenNode): boolean {
  return EMBED_TYPES.has(pen.type) || unresolvedRef(pen) !== undefined
}

/**
 * Fills and outlines a placeholder where pen.dev gives it no paint of its own, insets an auto
 * layout's content, and clips a script or browser frame to its box, as pen.dev shows them.
 */
export function applyPlaceholderLook(node: SceneNode, pen: PenNode): void {
  if (pen.fill === undefined) {
    node.fills = [{ type: 'SOLID', color: { ...PLACEHOLDER_FILL }, opacity: 1, visible: true }]
  }
  if (node.strokes.length === 0) {
    node.strokes = [
      {
        type: 'SOLID',
        color: { ...PLACEHOLDER_OUTLINE },
        opacity: 1,
        visible: true,
        weight: 1,
        align: 'INSIDE',
        dashPattern: [...PLACEHOLDER_DASH]
      }
    ]
  }
  if (pen.padding === undefined && node.layoutMode !== 'NONE') {
    node.paddingTop = PLACEHOLDER_INSET
    node.paddingRight = PLACEHOLDER_INSET
    node.paddingBottom = PLACEHOLDER_INSET
    node.paddingLeft = PLACEHOLDER_INSET
  }
  if (EMBED_TYPES.has(pen.type) && pen.clip === undefined) node.clipsContent = true
}

/** What a placeholder stands for: its file, its page, or the component it names. */
function labelText(pen: PenNode): string {
  const missing = unresolvedRef(pen)
  if (missing !== undefined) return missing || (pen.name ?? 'ref')
  if (pen.type === 'script' && pen.scriptUri) return pen.scriptUri
  if (pen.type === 'browser' && pen.url) return pen.url
  return pen.name ?? pen.type
}

/**
 * The label a placeholder without layers of its own shows, as a text layer; none for one with
 * layers, such as a script node pen.dev saved with what it generated. The label says it was
 * generated, so a writer can leave it out.
 */
export function placeholderLabel(pen: PenNode, nodeId: string): PenNode | undefined {
  if (!isPlaceholder(pen) || (pen.children?.length ?? 0) > 0) return undefined
  const text = labelText(pen)
  return {
    id: `${nodeId}#label`,
    type: 'text',
    name: text,
    content: text,
    fontSize: LABEL_SIZE,
    fill: LABEL_COLOR,
    x: PLACEHOLDER_INSET,
    y: PLACEHOLDER_INSET,
    generated: 'placeholder'
  }
}
