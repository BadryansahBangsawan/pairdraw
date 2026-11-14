import { isEqual } from 'es-toolkit/predicate'

import type { HyperlinkTarget, SceneNode, StyleRun } from '@pairdraw/scene-graph'

import { styleRunsWithPatch } from '#core/text/character-style'

/**
 * Schemes the editor links text to and opens: web pages and mail. Anything else, such as
 * `javascript:`, `data:`, or `file:`, is refused, as the desktop opener refuses it
 * (`desktop/src/system/opener.rs`).
 */
const LINK_SCHEMES = new Set(['http:', 'https:', 'mailto:'])

/** A scheme at the start of what was typed, as opposed to a host followed by its port. */
const SCHEME_PREFIX = /^([a-z][a-z\d+.-]*):(?!\d)/i

/** An address typed without `mailto:`, such as `hello@example.com`. */
const BARE_EMAIL = /^[^\s@/:]+@[^\s@/:]+\.[^\s@/:]+$/

/**
 * The URL a typed link stands for, or null when it is not one the editor links to: an address
 * typed without its scheme becomes `https:` (or `mailto:` for an email address), and only
 * `http:`, `https:`, and `mailto:` URLs with somewhere to go are taken. What was typed is kept
 * as typed otherwise, as Figma keeps it.
 */
export function normalizeLinkURL(input: string): string | null {
  const typed = input.trim()
  if (!typed || /\s/.test(typed)) return null
  let candidate = typed
  if (typed.startsWith('//')) candidate = `https:${typed}`
  else if (!SCHEME_PREFIX.test(typed)) {
    candidate = BARE_EMAIL.test(typed) ? `mailto:${typed}` : `https://${typed}`
  }
  return isOpenableLinkURL(candidate) ? candidate : null
}

/** Whether a link's URL is one the editor opens: a web page with a host, or a mail address. */
export function isOpenableLinkURL(url: string): boolean {
  let parsed: URL
  try {
    // `URL.canParse` is newer than the browser baseline.
    parsed = new URL(url)
  } catch {
    return false
  }
  if (!LINK_SCHEMES.has(parsed.protocol)) return false
  if (parsed.protocol === 'mailto:') return parsed.pathname.length > 0
  return parsed.hostname.length > 0
}

/** A stretch of characters, `text[start, end)`, that links to one target. */
export interface HyperlinkSpan {
  start: number
  end: number
  link: HyperlinkTarget
}

/** Every stretch of the text that links somewhere, in order; neighbours with one target join. */
export function hyperlinkSpans(node: Pick<SceneNode, 'text' | 'styleRuns'>): HyperlinkSpan[] {
  const spans: HyperlinkSpan[] = []
  const length = node.text.length
  for (const run of node.styleRuns) {
    const link = run.style.hyperlink
    const start = Math.min(run.start, length)
    const end = Math.min(run.start + run.length, length)
    if (!link || end <= start) continue
    const previous = spans.at(-1)
    if (previous?.end === start && isEqual(previous.link, link)) previous.end = end
    else spans.push({ start, end, link })
  }
  return spans
}

/**
 * The link stretch a caret at `index` stands in: the one around it, or the one that ends at it,
 * so a caret just after a link still edits that link, as in Figma.
 */
export function hyperlinkSpanAt(
  node: Pick<SceneNode, 'text' | 'styleRuns'>,
  index: number
): HyperlinkSpan | null {
  const spans = hyperlinkSpans(node)
  return (
    spans.find((span) => span.start <= index && index < span.end) ??
    spans.find((span) => span.end === index) ??
    null
  )
}

/**
 * The link `text[start, end)` has: its target when every character links to the same place,
 * `null` when none links anywhere, and `'mixed'` otherwise.
 */
export function hyperlinkInRange(
  node: Pick<SceneNode, 'text' | 'styleRuns'>,
  start: number,
  end: number
): HyperlinkTarget | null | 'mixed' {
  if (end <= start) return null
  const covering = hyperlinkSpans(node).filter((span) => span.start < end && span.end > start)
  if (covering.length === 0) return null
  const [first] = covering
  const whole = covering.length === 1 && first.start <= start && first.end >= end
  return whole ? first.link : 'mixed'
}

export interface HyperlinkRunOptions {
  /**
   * Underline characters that did not link anywhere before, as Figma does when a link is added;
   * characters that already linked keep their decoration.
   */
  underline?: boolean
}

/**
 * The style runs of `node` with `text[start, end)` linking to `link`, or linking nowhere when
 * `link` is null. Other styles of the characters stay as they are.
 */
export function styleRunsWithHyperlink(
  node: SceneNode,
  start: number,
  end: number,
  link: HyperlinkTarget | null,
  options: HyperlinkRunOptions = {}
): StyleRun[] {
  const from = Math.max(0, Math.min(start, node.text.length))
  const to = Math.max(from, Math.min(end, node.text.length))
  let runs = styleRunsWithPatch(node, from, to, { hyperlink: link })
  if (!link || !options.underline) return runs
  // Unlinked characters before the change gain the underline; the rest keep theirs.
  const unlinked = unlinkedStretches(node, from, to)
  for (const [left, right] of unlinked) {
    runs = styleRunsWithPatch({ ...node, styleRuns: runs }, left, right, {
      textDecoration: 'UNDERLINE'
    })
  }
  return runs
}

/** The stretches of `text[start, end)` that link nowhere. */
function unlinkedStretches(
  node: Pick<SceneNode, 'text' | 'styleRuns'>,
  start: number,
  end: number
): [number, number][] {
  const stretches: [number, number][] = []
  let cursor = start
  for (const span of hyperlinkSpans(node)) {
    if (span.end <= cursor || span.start >= end) continue
    if (span.start > cursor) stretches.push([cursor, span.start])
    cursor = Math.max(cursor, span.end)
  }
  if (cursor < end) stretches.push([cursor, end])
  return stretches
}
