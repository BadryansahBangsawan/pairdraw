import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'

/** A solid colour the page uses, and how many paints use it. */
export interface DocumentColor {
  color: Color
  /** Fill and stroke paints with this exact RGBA, across the page's visible layers. */
  count: number
}

/** How many colours the picker lists; Figma's document colours stop at a screenful too. */
export const DOCUMENT_COLOR_LIMIT = 48

/** The RGBA as a map key; colours are kept exact, alpha included. */
function colorKey(color: Color): string {
  return `${color.r},${color.g},${color.b},${color.a}`
}

/**
 * The solid fills and strokes a page's visible layers use, most used first.
 *
 * One pass over the page tree. A hidden layer takes its whole subtree with it. Paints bound to a
 * variable or covered by a colour style are left to the variable/style sections instead. Gradient,
 * image, mesh, pattern, noise, video and custom paints are not listed: this list is for reusing a
 * solid colour, not for its stops.
 */
export function documentColors(graph: SceneGraph, pageId: string): DocumentColor[] {
  const colors = new Map<string, DocumentColor>()

  const count = (color: Color) => {
    const key = colorKey(color)
    const entry = colors.get(key)
    if (entry) entry.count++
    else colors.set(key, { color: { r: color.r, g: color.g, b: color.b, a: color.a }, count: 1 })
  }

  const isBound = (node: SceneNode, path: string) => Object.hasOwn(node.boundVariables, path)

  const walk = (node: SceneNode) => {
    if (!node.visible) return
    if (!node.fillStyleId) {
      node.fills.forEach((fill, index) => {
        if (fill.visible && fill.type === 'SOLID' && !isBound(node, `fills/${index}/color`))
          count(fill.color)
      })
    }
    if (!node.strokeStyleId) {
      node.strokes.forEach((stroke, index) => {
        if (stroke.visible && stroke.type === 'SOLID' && !isBound(node, `strokes/${index}/color`))
          count(stroke.color)
      })
    }
    for (const childId of node.childIds) {
      const child = graph.getNode(childId)
      if (child) walk(child)
    }
  }

  const page = graph.getNode(pageId)
  if (page) walk(page)

  return [...colors.values()]
    .sort((a, b) => b.count - a.count || colorKey(a.color).localeCompare(colorKey(b.color)))
    .slice(0, DOCUMENT_COLOR_LIMIT)
}
