import { uniqBy } from 'es-toolkit/array'

import type { CharacterStyleOverride, SceneGraph, SceneNode } from '@pairdraw/scene-graph'

import { fontManager, type FontManager } from './font/manager'
import { faceForStyle, textFaceName } from './font/names'
import { textFontFace } from './requirements/collect'

/** A face the document draws text in, named as its text names it. */
export interface DocumentFont {
  family: string
  style: string
  /** True when the host has no face for it, so the text shows a substitute. */
  missing: boolean
  /** How many text layers draw at least one character in it. */
  layerCount: number
}

/** A face by family and the style name its text gives it. */
export interface FontFaceReference {
  family: string
  style: string
}

export interface FontReplacement {
  from: FontFaceReference
  to: FontFaceReference
}

export interface FontReplacementCounts {
  /** Text layers whose own face or one run changed. */
  layers: number
  /** Character runs that changed face. */
  runs: number
  /** Text styles that changed face. */
  styles: number
}

interface FaceUse {
  family: string
  style: string
  loadStyle: string
  layerIds: Set<string>
}

function faceKey(family: string, style: string): string {
  return `${family}\0${style.toLocaleLowerCase()}`
}

/** The face a node's characters draw in, its own fields overridden by `style`. */
function faceOf(node: SceneNode, style: CharacterStyleOverride): FaceUse {
  const face = textFontFace(node, style)
  return {
    family: face.family,
    style: textFaceName(node, style),
    loadStyle: face.style,
    layerIds: new Set()
  }
}

/** Every face the document draws text in, missing ones first, counted per text layer. */
export function listDocumentFonts(
  graph: SceneGraph,
  manager: Pick<FontManager, 'loadedFontSource'> = fontManager
): DocumentFont[] {
  const uses = new Map<string, FaceUse>()
  const add = (node: SceneNode, style: CharacterStyleOverride) => {
    const face = faceOf(node, style)
    const key = faceKey(face.family, face.style)
    const use = uses.get(key) ?? face
    if (node.type === 'TEXT' && node.sharedStyleType !== 'TEXT') use.layerIds.add(node.id)
    uses.set(key, use)
  }
  for (const node of graph.getAllNodes()) {
    if (node.sharedStyleType === 'TEXT') add(node, {})
    if (node.type !== 'TEXT') continue
    add(node, {})
    for (const run of node.styleRuns) add(node, run.style)
  }
  return uniqBy([...uses.values()], (use) => faceKey(use.family, use.style))
    .map((use) => ({
      family: use.family,
      style: use.style,
      missing: manager.loadedFontSource(use.family, use.loadStyle) === null,
      layerCount: use.layerIds.size
    }))
    .sort(
      (left, right) =>
        Number(right.missing) - Number(left.missing) ||
        left.family.localeCompare(right.family) ||
        left.style.localeCompare(right.style)
    )
}

/** The fields that draw characters in `face`, as its own font names its face. */
function faceFields(
  face: FontFaceReference
): Pick<SceneNode, 'fontFamily' | 'fontWeight' | 'italic' | 'fontStyle'> {
  const resolved = faceForStyle(face.family, face.style)
  return {
    fontFamily: face.family,
    fontWeight: resolved.weight,
    italic: resolved.italic,
    fontStyle: resolved.style
  }
}

/** A text's runs with every matching face swapped, and how many changed. */
function replacedRuns(
  node: SceneNode,
  targets: Map<string, FontFaceReference>
): { runs: SceneNode['styleRuns']; changed: number } {
  let changed = 0
  const runs = node.styleRuns.map((run) => {
    const face = faceOf(node, run.style)
    const to = targets.get(faceKey(face.family, face.style))
    if (!to) return run
    changed += 1
    return { ...run, style: { ...run.style, ...faceFields(to) } }
  })
  return { runs, changed }
}

/**
 * Replaces every use of the given faces, layer by layer, run by run, and in text styles, so the
 * document draws the same characters in the new faces. Other faces keep their runs untouched.
 * Layers that use a replaced text style change with it; their reference stays. OpenType features
 * and variation settings are kept as written; a target face that lacks them draws without them.
 */
export function replaceDocumentFonts(
  graph: SceneGraph,
  replacements: readonly FontReplacement[]
): FontReplacementCounts {
  const targets = new Map<string, FontFaceReference>()
  for (const { from, to } of replacements) {
    const key = faceKey(from.family, from.style)
    if (targets.has(key)) throw new Error(`Font "${from.family} ${from.style}" is replaced twice`)
    targets.set(key, to)
  }

  const layerIds = new Set<string>()
  let runs = 0
  let styles = 0
  for (const node of graph.getAllNodes()) {
    if (node.sharedStyleType === 'TEXT') {
      const face = faceOf(node, {})
      const to = targets.get(faceKey(face.family, face.style))
      if (to) {
        graph.updateNode(node.id, faceFields(to))
        styles += 1
      }
      if (node.internalOnly) continue
    }
    if (node.type !== 'TEXT') continue

    const ownFace = faceOf(node, {})
    const ownTarget = targets.get(faceKey(ownFace.family, ownFace.style))
    if (ownTarget) {
      graph.updateNode(node.id, faceFields(ownTarget))
      layerIds.add(node.id)
    }

    const next = replacedRuns(node, targets)
    if (next.changed > 0) {
      runs += next.changed
      layerIds.add(node.id)
      graph.updateNode(node.id, { styleRuns: next.runs })
    }
  }
  return { layers: layerIds.size, runs, styles }
}
