import type { SceneNode } from '@pairdraw/scene-graph'
import { faceStyleKey } from '@pairdraw/scene-graph/font-style'
import { lineStepPixels } from '@pairdraw/scene-graph/text'

import { measureTextWithFont } from '#core/text/font/glyphs'

export type TextMeasurer = (
  node: SceneNode,
  maxWidth?: number
) => { width: number; height: number } | null

let globalTextMeasurer: TextMeasurer | null = null

const GLYPH_WIDTH_FACTOR = 0.6

export function estimateTextSize(
  node: SceneNode,
  maxWidth?: number
): { width: number; height: number } {
  const fontSize = node.fontSize || 14
  const family = node.fontFamily || 'Inter'
  const style = faceStyleKey({ ...node, fontWeight: node.fontWeight || 400 })
  const text = node.text || ''

  const ownLineH = lineStepPixels(node.lineHeight, fontSize) ?? 0
  const explicitLineH = ownLineH > 0 ? ownLineH : undefined
  const measured = measureTextWithFont(text, fontSize, family, style, maxWidth, explicitLineH)
  if (measured) return measured

  const charWidth = fontSize * GLYPH_WIDTH_FACTOR
  const singleLineWidth = Math.ceil(text.length * charWidth)
  const lineH = explicitLineH ?? Math.ceil(fontSize * 1.4)

  if (maxWidth && maxWidth > 0 && singleLineWidth > maxWidth) {
    const lines = Math.ceil(singleLineWidth / maxWidth)
    return { width: maxWidth, height: Math.ceil(lines * lineH) }
  }
  return { width: singleLineWidth, height: lineH }
}

/**
 * The width auto-width text wraps at: its max width, raised to its min width as auto layout does.
 * Undefined when it has no max width, and its box takes its longest line.
 */
export function autoWidthWrapWidth(
  node: Pick<SceneNode, 'minWidth' | 'maxWidth'>
): number | undefined {
  if (node.maxWidth == null) return undefined
  return Math.max(node.maxWidth, node.minWidth ?? 0)
}

export function getTextMeasurer(): TextMeasurer | null {
  return globalTextMeasurer
}

export function setTextMeasurer(measurer: TextMeasurer | null): void {
  globalTextMeasurer = measurer
}

/** The size of `node`'s text: measured when a measurer is installed and can, estimated otherwise. */
export function measureTextForLayout(
  node: SceneNode,
  maxWidth?: number
): { width: number; height: number } {
  return measuredTextSize(node, maxWidth) ?? { width: node.width, height: node.height }
}

/** The size `measureTextForLayout` measures or estimates; null while the text's fonts are not prepared. */
function measuredTextSize(
  node: SceneNode,
  maxWidth?: number
): { width: number; height: number } | null {
  if (!globalTextMeasurer) return estimateTextSize(node, maxWidth)
  const measured = globalTextMeasurer(node, maxWidth)
  if (measured) return measured
  // Empty text measures nothing but its line, which needs no fonts beyond the default.
  if (node.type !== 'TEXT' || !node.text) return estimateTextSize(node, maxWidth)
  return null
}

/**
 * Auto-width text's box when it wraps at `wrapWidth`, a max width or the width layout gives it.
 * Text that reaches the wrap width takes all of it, as Figma sizes it, rather than its longest
 * line; shorter text keeps its own width.
 */
export function measureAutoWidthText(
  node: SceneNode,
  wrapWidth: number | undefined
): { width: number; height: number } {
  const measured = measureTextForLayout(node, wrapWidth)
  if (wrapWidth === undefined) return measured
  // Its one-line width, without the max width the paragraph would otherwise wrap it at; while
  // its fonts are not prepared that is unknown, and the text keeps the size it has.
  const natural = measuredTextSize({ ...node, maxWidth: null })
  return natural && natural.width > wrapWidth
    ? { width: wrapWidth, height: measured.height }
    : measured
}

const installedMeasurers: TextMeasurer[] = []

/**
 * Makes `measurer` the layout text measurer until the returned function uninstalls it. Then
 * the most recent measurer still installed takes over, so closing one editor neither leaves
 * layout measuring with its destroyed renderer nor keeps that editor alive.
 */
export function installTextMeasurer(measurer: TextMeasurer): () => void {
  installedMeasurers.push(measurer)
  globalTextMeasurer = measurer
  return () => {
    const index = installedMeasurers.lastIndexOf(measurer)
    if (index !== -1) installedMeasurers.splice(index, 1)
    if (globalTextMeasurer === measurer) globalTextMeasurer = installedMeasurers.at(-1) ?? null
  }
}

/**
 * Run `fn` with `measurer` as the layout text measurer. The measurer is shared, so `fn` must
 * be synchronous: an override held across an await would leak into other layouts.
 */
export function withTextMeasurer<T>(measurer: TextMeasurer, fn: () => T): T {
  const previous = globalTextMeasurer
  globalTextMeasurer = measurer
  try {
    return fn()
  } finally {
    globalTextMeasurer = previous
  }
}
