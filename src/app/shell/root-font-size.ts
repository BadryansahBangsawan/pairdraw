import { IS_BROWSER } from '@pairdraw/core/constants'

const DEFAULT_ROOT_FONT_SIZE = 16

/**
 * What 1rem is, in CSS pixels, as the layout resolves it. Interface sizes are in rem; this reads
 * the root font size for the geometry script has to compute in pixels. Read once per call from
 * the computed style, so a root size change is picked up without a probe element or an observer.
 */
export function remToPx(rem: number): number {
  if (!IS_BROWSER || !('document' in globalThis)) return rem * DEFAULT_ROOT_FONT_SIZE
  const size = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  return rem * (Number.isFinite(size) && size > 0 ? size : DEFAULT_ROOT_FONT_SIZE)
}
