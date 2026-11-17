import { mapValues, pick } from 'es-toolkit'
import * as v from 'valibot'

import type { Fill, NodeType, SceneNode } from '@pairdraw/scene-graph'
import { copyStroke } from '@pairdraw/scene-graph/copy'
import type { Color } from '@pairdraw/scene-graph/primitives'

import { getNodeEditCapability } from '#core/editor/capabilities'
import type { FigmaAPI } from '#core/figma-api'
import { editNode } from '#core/figma-api/accessor-utils'
import type { FigmaFontNameInput } from '#core/figma-api/fonts/names'
import { getStyledTextSegments } from '#core/figma-api/text/style'
import { collectNodeFontFaces } from '#core/text/requirements/collect'
import { defineTool, parseToolColor, toolFailure, toolNumber } from '#core/tools/schema'

import { textFonts } from './text'

const colorPairSchema = v.strictObject({
  from: v.pipe(v.string(), v.description('Color to find (hex); with alpha, only that opacity')),
  to: v.pipe(v.string(), v.description('Color to use instead (hex); with alpha, its opacity'))
})
const numberPairSchema = v.strictObject({
  from: toolNumber(v.pipe(v.number(), v.description('Value to find'))),
  to: toolNumber(v.pipe(v.number(), v.minValue(0), v.description('Value to use instead')))
})
const textPairSchema = v.strictObject({
  from: v.pipe(v.string(), v.nonEmpty(), v.description('Value to find (case-insensitive)')),
  to: v.pipe(v.string(), v.nonEmpty(), v.description('Value to use instead'))
})
const fontNameSchema = v.object({ family: v.string(), style: v.string() })

const pairs = <S extends v.GenericSchema>(schema: S, description: string) =>
  v.optional(v.pipe(v.array(schema), v.minLength(1), v.description(description)))

const replacementInputs = {
  fill_color: pairs(colorPairSchema, 'Solid fill colors of layers other than text'),
  text_color: pairs(colorPairSchema, 'Text colors, including colored ranges'),
  stroke_color: pairs(colorPairSchema, 'Solid stroke colors'),
  stroke_weight: pairs(numberPairSchema, 'Stroke weights of layers that have strokes'),
  corner_radius: pairs(
    numberPairSchema,
    'Corner radii: a layer’s radius, or each corner on its own where they are set separately'
  ),
  font_family: pairs(textPairSchema, 'Font families, keeping each range’s style'),
  font_style: pairs(textPairSchema, 'Font styles such as Regular or Bold, keeping the family'),
  font_size: pairs(numberPairSchema, 'Font sizes')
}

type ReplacementKind = keyof typeof replacementInputs
type ColorPair = v.InferOutput<typeof colorPairSchema>
type NumberPair = v.InferOutput<typeof numberPairSchema>
type TextPair = v.InferOutput<typeof textPairSchema>
type Replacements = {
  fill_color?: ColorPair[]
  text_color?: ColorPair[]
  stroke_color?: ColorPair[]
  stroke_weight?: NumberPair[]
  corner_radius?: NumberPair[]
  font_family?: TextPair[]
  font_style?: TextPair[]
  font_size?: NumberPair[]
}
type Scope = { ids?: string[]; within: 'page' | 'selection' }

const CORNERS = [
  'topLeftRadius',
  'topRightRadius',
  'bottomRightRadius',
  'bottomLeftRadius'
] as const
/** Layers that draw their corners rounded; a radius on any other is not shown. */
const ROUNDED_TYPES: ReadonlySet<NodeType> = new Set([
  'FRAME',
  'RECTANGLE',
  'ROUNDED_RECTANGLE',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE'
])

/** Channels as 0–255 integers, so a hex written by hand matches the colour it names. */
function channels(color: Color): string {
  return [color.r, color.g, color.b].map((value) => Math.round(value * 255)).join(',')
}

/** A colour as a tool reads it, so a bad value fails with the message other tools give. */
function colorOf(value: string): Color {
  const parsed = parseToolColor(value)
  if ('error' in parsed) throw new Error(parsed.error)
  return parsed
}

interface ColorSwap {
  match: (paint: Fill) => boolean
  apply: (paint: Fill) => Fill
}

/** The swap a colour pair makes; throws on a value that is not a colour. */
function colorSwap(pair: ColorPair): ColorSwap {
  const from = colorOf(pair.from)
  const to = colorOf(pair.to)
  const key = channels(from)
  const percent = (value: number) => Math.round(value * 100)
  return {
    match: (paint) =>
      paint.type === 'SOLID' &&
      channels(paint.color) === key &&
      (from.a >= 1 || percent(paint.opacity * paint.color.a) === percent(from.a)),
    // A colour's alpha is the paint's opacity, as Figma takes it; without one the paint keeps its own.
    apply: (paint) => ({
      ...paint,
      color: { ...to, a: 1 },
      opacity: to.a < 1 ? to.a : paint.opacity * paint.color.a
    })
  }
}

/** `paints` with every listed colour swapped, or null when none matched. */
function swapPaints<T extends Fill>(
  paints: readonly T[],
  swaps: readonly ColorSwap[],
  bound: (index: number) => boolean
): T[] | null {
  const next = paints.map((paint, index) => {
    if (bound(index)) return paint
    const swap = swaps.find((candidate) => candidate.match(paint))
    return swap ? { ...paint, ...swap.apply(paint) } : paint
  })
  return next.some((paint, index) => paint !== paints[index]) ? next : null
}

function swapNumber(value: number, swaps: readonly NumberPair[] | undefined): number | null {
  const swap = swaps?.find((pair) => pair.from === value)
  return swap && swap.to !== value ? swap.to : null
}

function swapText(value: string, swaps: readonly TextPair[] | undefined): string | null {
  const swap = swaps?.find((pair) => pair.from.toLowerCase() === value.toLowerCase())
  return swap && swap.to !== value ? swap.to : null
}

/** The layers a call searches: the given ones, the selection, or the page's, with descendants. */
function searchedNodes(figma: FigmaAPI, scope: Scope): SceneNode[] | string {
  const graph = figma.graph
  let roots: string[]
  if (scope.ids && scope.ids.length > 0) {
    const missing = scope.ids.find((id) => !graph.getNode(id))
    if (missing) return `Node "${missing}" not found`
    roots = scope.ids
  } else if (scope.within === 'selection') {
    roots = figma.currentPage.selection.map((node) => node.id)
    if (roots.length === 0) return 'Nothing is selected'
  } else {
    roots = graph.getNode(figma.currentPage.id)?.childIds ?? []
  }
  const nodes: SceneNode[] = []
  const seen = new Set<string>()
  const walk = (id: string) => {
    const node = seen.has(id) ? undefined : graph.getNode(id)
    if (!node) return
    seen.add(id)
    nodes.push(node)
    for (const childId of node.childIds) walk(childId)
  }
  for (const id of roots) walk(id)
  return nodes
}

interface TextEdit {
  start: number
  end: number
  fontName?: { family: string; style: string }
  fontSize?: number
  family: boolean
  style: boolean
}

/** The font and size changes one text layer takes, range by range. */
function textEdits(node: SceneNode, replacements: Replacements): TextEdit[] {
  if (node.type !== 'TEXT') return []
  const { font_family, font_style, font_size } = replacements
  if (!font_family && !font_style && !font_size) return []
  const edit = (start: number, end: number, font: unknown, size: unknown): TextEdit | null => {
    if (!v.is(fontNameSchema, font)) return null
    const family = swapText(font.family, font_family)
    const style = swapText(font.style, font_style)
    const fontSize = typeof size === 'number' ? swapNumber(size, font_size) : null
    if (!family && !style && fontSize === null) return null
    const textEdit: TextEdit = { start, end, family: family !== null, style: style !== null }
    if (family || style) {
      textEdit.fontName = { family: family ?? font.family, style: style ?? font.style }
    }
    if (fontSize !== null) textEdit.fontSize = fontSize
    return textEdit
  }
  if (node.text.length === 0) {
    // An empty text has no ranges to read; its own face is the first one it lists.
    const face = collectNodeFontFaces(node).at(0)
    const whole = face && edit(0, 0, face, node.fontSize)
    return whole ? [whole] : []
  }
  return getStyledTextSegments(node, ['fontName', 'fontSize']).flatMap(
    (segment) => edit(segment.start, segment.end, segment.fontName, segment.fontSize) ?? []
  )
}

const REPLACEMENT_KINDS = Object.keys(replacementInputs) as ReplacementKind[]

function colorSwaps(pairs: readonly ColorPair[] | undefined): ColorSwap[] {
  return (pairs ?? []).map(colorSwap)
}

export const replaceMatchingProperties = defineTool({
  name: 'replace_matching_properties',
  description:
    'Swap one value for another on every layer that uses it, across the current page (default), the selection, or the given layers with their descendants: fill, text, and stroke colors, stroke weights, corner radii, font families, font styles, and font sizes. Each property takes a list of { from, to } pairs; colors match by hex, ignoring opacity unless from has alpha, and colors bound to variables are left alone. Layers of read-only library components are not changed and come back in read_only. Returns how many values changed per property and the layers changed.',
  execution: { kind: 'sync', mutation: 'document' },
  input: v.strictObject({
    ids: v.optional(
      v.pipe(
        v.array(v.string()),
        v.description('Layers to search with their descendants (default: see within)')
      )
    ),
    within: v.optional(
      v.pipe(
        v.picklist(['page', 'selection']),
        v.description('Without ids: the current page (default) or the selection')
      ),
      'page'
    ),
    ...replacementInputs
  }),
  fonts: (figma, args) => {
    const nodes = searchedNodes(figma, args)
    if (typeof nodes === 'string') return []
    const fonts: FigmaFontNameInput[] = []
    for (const node of nodes) {
      const edits = textEdits(node, args)
      if (edits.length === 0) continue
      fonts.push(...textFonts(figma, node.id))
      for (const edit of edits) if (edit.fontName) fonts.push(edit.fontName)
    }
    return fonts
  },
  execute: (figma, args) => {
    const kinds = REPLACEMENT_KINDS.filter((kind) => args[kind] !== undefined)
    if (kinds.length === 0) return { error: 'Name at least one property to replace' }
    const nodes = searchedNodes(figma, args)
    if (typeof nodes === 'string') return { error: nodes }
    const counts = mapValues(replacementInputs, () => 0)
    const changed = new Set<string>()
    const readOnly: string[] = []
    try {
      const swaps = {
        fill: colorSwaps(args.fill_color),
        text: colorSwaps(args.text_color),
        stroke: colorSwaps(args.stroke_color)
      }
      for (const node of nodes) {
        const paint = paintAndGeometryChanges(node, args, swaps)
        const edits = textEdits(node, args)
        if (!paint && edits.length === 0) continue
        // A library's components change in that library, so their layers are reported instead.
        if (!getNodeEditCapability(figma.graph, node.id).editable) {
          readOnly.push(node.id)
          continue
        }
        if (paint) {
          // As the node setters write, so styles detach and instances keep the change.
          editNode(figma.graph, node.id, paint.changes, figma.groupFitOptions)
          for (const kind of REPLACEMENT_KINDS) counts[kind] += paint.counts[kind] ?? 0
        }
        if (edits.length > 0) changeText(figma, node, edits, counts)
        changed.add(node.id)
      }
    } catch (error) {
      return toolFailure(error)
    }
    return {
      replaced: pick(counts, kinds),
      changed: changed.size,
      ids: [...changed],
      ...(readOnly.length > 0 ? { read_only: readOnly } : {})
    }
  }
})

type Counts = Record<ReplacementKind, number>

/** What one layer's paints, stroke weight, and corners change to, with the values it changes. */
function paintAndGeometryChanges(
  node: SceneNode,
  replacements: Replacements,
  swaps: { fill: ColorSwap[]; text: ColorSwap[]; stroke: ColorSwap[] }
): { changes: Partial<SceneNode>; counts: Partial<Counts> } | null {
  const changes: Partial<SceneNode> = {}
  const counts: Partial<Counts> = {}
  const count = (kind: ReplacementKind, amount = 1) => {
    counts[kind] = (counts[kind] ?? 0) + amount
  }
  const isText = node.type === 'TEXT'
  const fillSwaps = isText ? swaps.text : swaps.fill
  const fillKind = isText ? 'text_color' : 'fill_color'
  const bound = (kind: 'fills' | 'strokes') => (index: number) =>
    !!node.boundVariables[`${kind}/${index}/color`]
  if (fillSwaps.length > 0) {
    const fills = swapPaints(node.fills, fillSwaps, bound('fills'))
    if (fills) {
      changes.fills = fills
      count(fillKind, fills.filter((paint, index) => paint !== node.fills[index]).length)
    }
    if (isText) {
      let runs = 0
      const styleRuns = node.styleRuns.map((run) => {
        const runFills = run.style.fills && swapPaints(run.style.fills, fillSwaps, () => false)
        if (!runFills) return run
        runs++
        return { ...run, style: { ...run.style, fills: runFills } }
      })
      if (runs > 0) {
        changes.styleRuns = styleRuns
        count('text_color', runs)
      }
    }
  }
  if (swaps.stroke.length > 0) {
    const strokes = swapPaints(node.strokes, swaps.stroke, bound('strokes'))
    if (strokes) {
      changes.strokes = strokes
      count('stroke_color', strokes.filter((paint, index) => paint !== node.strokes[index]).length)
    }
  }
  const weight =
    node.strokes.length > 0 ? swapNumber(node.strokeWeight, replacements.stroke_weight) : null
  if (weight !== null) {
    // Each stroke draws at its own weight, so they all take it, as the strokeWeight setter does.
    changes.strokeWeight = weight
    changes.strokes = (changes.strokes ?? node.strokes).map((stroke) => ({
      ...copyStroke(stroke),
      weight
    }))
    count('stroke_weight')
  }
  if (replacements.corner_radius && ROUNDED_TYPES.has(node.type)) {
    Object.assign(changes, cornerChanges(node, replacements.corner_radius, count))
  }
  return Object.keys(changes).length > 0 ? { changes, counts } : null
}

/**
 * The corner radii `swaps` give a layer. Corners set together draw `cornerRadius`, whatever the
 * corner fields hold, so only corners set one by one are matched each on its own.
 */
function cornerChanges(
  node: SceneNode,
  swaps: readonly NumberPair[],
  count: (kind: ReplacementKind) => void
): Partial<SceneNode> {
  if (!node.independentCorners) {
    const radius = swapNumber(node.cornerRadius, swaps)
    if (radius === null) return {}
    count('corner_radius')
    return {
      cornerRadius: radius,
      ...Object.fromEntries(CORNERS.map((corner) => [corner, radius])),
      independentCorners: false
    }
  }
  const changes: Partial<SceneNode> = {}
  for (const corner of CORNERS) {
    const radius = swapNumber(node[corner], swaps)
    if (radius === null) continue
    changes[corner] = radius
    count('corner_radius')
  }
  const radii = CORNERS.map((corner) => changes[corner] ?? node[corner])
  if (radii.every((radius, index) => radius === node[CORNERS[index]])) return {}
  const uniform = radii.every((radius) => radius === radii[0])
  changes.cornerRadius = uniform ? radii[0] : node.cornerRadius
  changes.independentCorners = !uniform
  return changes
}

function changeText(
  figma: FigmaAPI,
  node: SceneNode,
  edits: readonly TextEdit[],
  counts: Record<ReplacementKind, number>
): void {
  const text = figma.getNodeById(node.id)
  if (!text) return
  for (const edit of edits) {
    // A range over all of the text sets the text's own font, as set_font does, not a style run.
    const ranged = edit.start > 0 || edit.end < node.text.length
    if (edit.fontName) {
      if (ranged) text.setRangeFontName(edit.start, edit.end, edit.fontName)
      else text.fontName = edit.fontName
    }
    // The size comes after the font, so it lays the text out in the font it ends up in.
    if (edit.fontSize !== undefined) {
      if (ranged) text.setRangeFontSize(edit.start, edit.end, edit.fontSize)
      else text.fontSize = edit.fontSize
      counts.font_size++
    }
    if (edit.family) counts.font_family++
    if (edit.style) counts.font_style++
  }
}
