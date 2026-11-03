import { countBy, uniq } from 'es-toolkit/array'

import { collectGraphFontKeys } from '@open-pencil/core/text'
import type { SceneGraph } from '@open-pencil/scene-graph'
import { colorToHex, colorToHex8 } from '@open-pencil/scene-graph/color'

import { MAX_STYLE_KIT_COLORS, MAX_STYLE_KIT_FONTS, MAX_STYLE_KIT_NAME } from './limits'
import type { StyleKit, StyleKitColor } from './types'

/** Colours a kit takes from a document's fills when it has no colour variables. */
const MAX_FILL_COLORS = 12

/** The document's colour variables, in their default modes, named as the document names them. */
function variableColors(graph: SceneGraph): StyleKitColor[] {
  const colors: StyleKitColor[] = []
  for (const variable of graph.getVariablesByType('COLOR')) {
    const color = graph.resolveColorVariable(variable.id)
    if (!color) continue
    colors.push({ name: variable.name.slice(0, MAX_STYLE_KIT_NAME), hex: colorToHex8(color) })
    if (colors.length === MAX_STYLE_KIT_COLORS) break
  }
  return colors
}

/** The solid fills the document uses most, for a document without colour variables. */
function fillColors(graph: SceneGraph): StyleKitColor[] {
  const hexes: string[] = []
  for (const node of graph.nodes.values()) {
    if (!node.visible) continue
    for (const fill of node.fills) {
      if (fill.type === 'SOLID' && fill.visible && fill.opacity > 0) {
        hexes.push(colorToHex(fill.color))
      }
    }
  }
  const counts = countBy(hexes, (hex) => hex)
  return Object.entries(counts)
    .toSorted(([, left], [, right]) => right - left)
    .slice(0, MAX_FILL_COLORS)
    .map(([hex]) => ({ name: '', hex }))
}

/**
 * A style kit from the document's own colours and type, as a starting point the user edits: its
 * colour variables (or most used fills) and the font families its text uses.
 */
export function styleKitFromDocument(graph: SceneGraph, name: string): StyleKit {
  const variables = variableColors(graph)
  const pages = graph.getPages().map((page) => page.id)
  const fonts = uniq(collectGraphFontKeys(graph, pages).map(([family]) => family)).slice(
    0,
    MAX_STYLE_KIT_FONTS
  )
  return {
    name: name.slice(0, MAX_STYLE_KIT_NAME),
    colors: variables.length > 0 ? variables : fillColors(graph),
    fonts: fonts.map((family) => family.slice(0, MAX_STYLE_KIT_NAME)),
    notes: ''
  }
}
