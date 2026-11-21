import { uniq } from 'es-toolkit/array'
import { computed, onScopeDispose, ref, type ComputedRef } from 'vue'

import type { Editor } from '@pairdraw/core'
import { fontManager } from '@pairdraw/core/text'
import type { FontFeature, SceneNode } from '@pairdraw/scene-graph'

import { MIXED, type MixedValue } from '#vue/controls/node-props/use'

/** One OpenType feature the selected text's font has, as the panel's switch list offers it. */
export interface TypographyFeature {
  tag: string
}

/** The features a font has, in a stable order: the common controls first, then the font's own. */
const COMMON_ORDER = [
  'LIGA',
  'CALT',
  'DLIG',
  'HLIG',
  'KERN',
  'LNUM',
  'ONUM',
  'PNUM',
  'TNUM',
  'FRAC',
  'AFRC',
  'ORDN',
  'ZERO',
  'SMCP',
  'PCAP',
  'C2SC',
  'C2PC',
  'UNIC',
  'TITL',
  'CASE',
  'SINF',
  'SUBS',
  'SUPS'
]

function featureOrder(tag: string): number {
  const common = COMMON_ORDER.indexOf(tag)
  if (common !== -1) return common
  // Stylistic sets and character variants follow, numbered; anything else sorts after them.
  const set = /^SS(\d{2})$/.exec(tag)
  if (set) return COMMON_ORDER.length + Number(set[1])
  const variant = /^CV(\d{2})$/.exec(tag)
  if (variant) return COMMON_ORDER.length + 100 + Number(variant[1])
  return COMMON_ORDER.length + 200
}

/**
 * The OpenType features of the selected text layers' font, as Figma's type settings offer them:
 * only the features the font actually has, and actions that toggle them. Layers in different
 * families share the features every one of their fonts has.
 */
export function createTypographyFeatures(editor: Editor, nodes: ComputedRef<SceneNode[]>) {
  // Bumped when a family's faces arrive, so the list follows a font that loads after selection.
  const arrived = ref(0)
  const families = computed(() => uniq(nodes.value.map((node) => node.fontFamily)))
  function request(current: readonly string[]) {
    for (const family of current) {
      if (fontManager.loadedFamilyFaces(family) !== undefined) continue
      void fontManager.familyFaces(family).then(() => arrived.value++)
    }
  }
  request(families.value)
  onScopeDispose(
    fontManager.onFamilyFacesReset(() => {
      arrived.value++
      request(families.value)
    })
  )

  const available = computed<TypographyFeature[]>(() => {
    void arrived.value
    const first = families.value.at(0)
    if (first === undefined || nodes.value.length === 0) return []
    let shared: string[] | null = null
    for (const family of families.value) {
      const tags = fontManager.familyFeatures(family)
      // A family whose font is not loaded yet offers nothing; the list returns when it arrives.
      if (tags === undefined || tags === null) return []
      shared = shared === null ? tags : shared.filter((tag) => tags.includes(tag))
    }
    return (shared ?? [])
      .map((tag) => ({ tag }))
      .sort((a, b) => featureOrder(a.tag) - featureOrder(b.tag) || a.tag.localeCompare(b.tag))
  })

  /** Whether a feature is on for every selected text, MIXED when they differ; unset reads on. */
  function state(tag: string): MixedValue<boolean> {
    const values = nodes.value.map(
      (node) => node.fontFeatures.find((feature) => feature.tag === tag)?.enabled ?? true
    )
    const first = values.at(0)
    return values.every((value) => value === first) ? (first ?? true) : MIXED
  }

  /** Toggles one feature on every selected text, keeping its other features and its ranges'. */
  function set(tag: string, enabled: boolean) {
    const targets = nodes.value
    if (targets.length === 0) return
    editor.undo.runBatch(`Change ${tag} feature`, () => {
      for (const target of targets) {
        const node = editor.graph.getNode(target.id) ?? target
        // The toggled tag keeps its place in the list, so a range whose features now equal the
        // text's own keeps its run instead of being stripped as redundant.
        const merge = (features: FontFeature[]): FontFeature[] =>
          features.some((feature) => feature.tag === tag)
            ? features.map((feature) => (feature.tag === tag ? { tag, enabled } : feature))
            : [...features, { tag, enabled }]
        // A range with its own features keeps them, with the toggled tag replaced, as an axis
        // edit keeps the other axes a range sets. layerChanges strips the changed style from
        // the runs it recomputes, so the merged runs go on after it, not through it.
        const styleRuns = node.styleRuns.map((run) =>
          run.style.fontFeatures
            ? { ...run, style: { ...run.style, fontFeatures: merge(run.style.fontFeatures) } }
            : run
        )
        const changes = editor.layerChanges(target.id, { fontFeatures: merge(node.fontFeatures) })
        editor.updateNodeWithUndo(target.id, { ...changes, styleRuns }, `Change ${tag} feature`)
      }
    })
  }

  return { available, state, set }
}
