import type { Editor } from '@pairdraw/core'
import { AUTO_LAYOUT_HOVER_TICK_HIT_TOLERANCE } from '@pairdraw/core/constants'
import { hitAutoLayoutHandle, measureAutoLayoutHandles } from '@pairdraw/core/layout'
import type { SceneNode } from '@pairdraw/scene-graph'
import { isGeneratedFrame } from '@pairdraw/scene-graph/generated'
import type { Vector } from '@pairdraw/scene-graph/primitives'

type AutoLayoutHover = NonNullable<Editor['state']['autoLayoutHover']>

function visibleLayoutChildren(node: SceneNode, editor: Editor) {
  return node.childIds
    .map((id) => editor.graph.getNode(id))
    .filter(
      (child): child is SceneNode =>
        !!child && child.visible && child.layoutPositioning !== 'ABSOLUTE'
    )
}

function isNear(value: number, target: number, tolerance = AUTO_LAYOUT_HOVER_TICK_HIT_TOLERANCE) {
  return Math.abs(value - target) <= tolerance
}

function resolvePaddingHover(
  node: SceneNode,
  children: SceneNode[],
  localX: number,
  localY: number
): AutoLayoutHover | null {
  const layout = measureAutoLayoutHandles(node, children)
  const hit = hitAutoLayoutHandle(layout, localX, localY)
  if (hit?.kind !== 'padding' || !layout) return null
  const handle = layout.padding.find((padding) => padding.side === hit.side)
  if (!handle) return null
  const isVertical = hit.side === 'left' || hit.side === 'right'
  const tickX = handle.rect.x + handle.rect.width / 2
  const tickY = handle.rect.y + handle.rect.height / 2
  const atTick = isVertical
    ? isNear(localY, node.height / 2) && isNear(localX, tickX)
    : isNear(localX, node.width / 2) && isNear(localY, tickY)
  return { nodeId: node.id, kind: atTick ? 'padding-value' : 'padding', side: hit.side }
}

function resolveSpacingHover(
  node: SceneNode,
  children: SceneNode[],
  localX: number,
  localY: number
): AutoLayoutHover | null {
  const layout = measureAutoLayoutHandles(node, children)
  const hit = hitAutoLayoutHandle(layout, localX, localY)
  if (hit?.kind !== 'gap' || !layout) return null
  const handle = layout.gaps.find((gap) => gap.axis === hit.axis && gap.index === hit.index)
  if (!handle) return null
  const { x, y, width, height } = handle.rect
  const atTick = isNear(localX, x + width / 2) && isNear(localY, y + height / 2)
  return {
    nodeId: node.id,
    kind: atTick ? 'spacing-value' : 'spacing',
    axis: hit.axis,
    index: hit.index
  }
}

function resolveChildrenHover(
  node: SceneNode,
  children: SceneNode[],
  localX: number,
  localY: number
): AutoLayoutHover | null {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (
      localX >= child.x &&
      localX <= child.x + child.width &&
      localY >= child.y &&
      localY <= child.y + child.height
    ) {
      return { nodeId: node.id, kind: 'children', index: i }
    }
  }
  return null
}

export function resolveAutoLayoutHover(
  cx: number,
  cy: number,
  editor: Editor
): AutoLayoutHover | null {
  if (editor.state.selectedIds.size !== 1) return null
  const nodeId = [...editor.state.selectedIds][0]
  const node = editor.graph.getNode(nodeId)
  if (!node || (node.layoutMode !== 'HORIZONTAL' && node.layoutMode !== 'VERTICAL')) return null
  // A generated frame, such as a sticky note, lays itself out; its spacing is not the user's.
  if (isGeneratedFrame(node)) return null

  const abs = editor.graph.getAbsolutePosition(node.id)
  const localX = cx - abs.x
  const localY = cy - abs.y
  if (localX < 0 || localY < 0 || localX > node.width || localY > node.height) return null

  const children = visibleLayoutChildren(node, editor)
  return (
    resolvePaddingHover(node, children, localX, localY) ??
    resolveSpacingHover(node, children, localX, localY) ??
    resolveChildrenHover(node, children, localX, localY) ?? { nodeId: node.id, kind: 'frame' }
  )
}

/** An auto layout frame's value the canvas edits in place: a padding or the gap. */
export type AutoLayoutValueField =
  | 'paddingTop'
  | 'paddingRight'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'itemSpacing'
  | 'counterAxisSpacing'

const PADDING_FIELDS = {
  top: 'paddingTop',
  right: 'paddingRight',
  bottom: 'paddingBottom',
  left: 'paddingLeft'
} as const satisfies Record<NonNullable<AutoLayoutHover['side']>, AutoLayoutValueField>

/** The value a hover over a padding or a gap edits, as Figma opens it on a double-click. */
export function autoLayoutValueField(hover: AutoLayoutHover): AutoLayoutValueField | null {
  if ((hover.kind === 'padding' || hover.kind === 'padding-value') && hover.side)
    return PADDING_FIELDS[hover.side]
  if (hover.kind === 'spacing' || hover.kind === 'spacing-value')
    return hover.axis === 'counter' ? 'counterAxisSpacing' : 'itemSpacing'
  return null
}

/**
 * Where the editor for a value sits, in canvas coordinates: the middle of the padding, or of
 * the gap a double-click opened, as the hover draws its tick.
 */
export function autoLayoutValueAnchor(
  editor: Editor,
  nodeId: string,
  field: AutoLayoutValueField,
  gap = 0
): Vector | null {
  const node = editor.graph.getNode(nodeId)
  if (!node) return null
  const abs = editor.graph.getAbsolutePosition(node.id)
  const middle = { x: abs.x + node.width / 2, y: abs.y + node.height / 2 }
  if (field === 'paddingTop') return { x: middle.x, y: abs.y + node.paddingTop / 2 }
  if (field === 'paddingBottom')
    return { x: middle.x, y: abs.y + node.height - node.paddingBottom / 2 }
  if (field === 'paddingLeft') return { x: abs.x + node.paddingLeft / 2, y: middle.y }
  if (field === 'paddingRight')
    return { x: abs.x + node.width - node.paddingRight / 2, y: middle.y }
  const children = visibleLayoutChildren(node, editor)
  if (field === 'counterAxisSpacing') {
    const handle = measureAutoLayoutHandles(node, children)?.gaps.find(
      (candidate) => candidate.axis === 'counter' && candidate.index === gap
    )
    if (handle) {
      return {
        x: abs.x + handle.rect.x + handle.rect.width / 2,
        y: abs.y + handle.rect.y + handle.rect.height / 2
      }
    }
    return middle
  }
  const prev = children.at(gap)
  const next = children.at(gap + 1)
  if (!prev || !next) return middle
  // Across the flow, the middle of the content box, where the hover draws the gap's tick.
  if (node.layoutMode === 'HORIZONTAL') {
    const y = abs.y + (node.paddingTop + node.height - node.paddingBottom) / 2
    return { x: abs.x + (prev.x + prev.width + next.x) / 2, y }
  }
  const x = abs.x + (node.paddingLeft + node.width - node.paddingRight) / 2
  return { x, y: abs.y + (prev.y + prev.height + next.y) / 2 }
}
