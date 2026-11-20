import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { getAxisAlignedBoundsInParent } from '@pairdraw/scene-graph/coordinate'
import { findInstanceAncestor } from '@pairdraw/scene-graph/instances'
import type { Rect, Size } from '@pairdraw/scene-graph/primitives'
import { resolvedVariableModes } from '@pairdraw/scene-graph/variables'
import {
  VARIATION_LABEL_MAX_LENGTH,
  VARIATION_MAX_COUNT,
  VARIATION_MAX_LAYERS,
  copyVersion,
  readVariationSet,
  variationFingerprint,
  variationSetForOriginal,
  variationSetOf,
  versionOf,
  withVariationSet
} from '@pairdraw/scene-graph/variations'

import { getNodeEditCapability } from '#core/editor/capabilities'
import { findEmptySpace, rectsOverlap } from '#core/tools/read/space'

/** Room around the versions inside their section, and between them. */
export const VARIATION_SECTION_PADDING = 80
export const VARIATION_GAP = 80

export interface VariationRequest {
  /** How many versions to make, 1 to {@link VARIATION_MAX_COUNT}. */
  count: number
  /** What each version tries, named in its layer: `V2 · Calmer palette`. */
  labels?: readonly string[]
}

export interface CreatedVariations {
  sectionId: string
  originalId: string
  /** The versions this request made, in order. */
  versions: SceneNode[]
}

const SECTION_REFUSAL = 'A section cannot be varied; select a frame inside it'

const UNVARIED_TYPES: Partial<Record<SceneNode['type'], string>> = {
  CANVAS: 'A page cannot be varied; select a layer on it',
  SECTION: SECTION_REFUSAL,
  COMPONENT_SET: 'A component set cannot be varied; select one of its variants'
}

interface VariationSource {
  /** The layer the versions copy: the original, or one of its versions. */
  source: SceneNode
  original: SceneNode
  /** The set the versions join, or undefined when the request makes it. */
  section: SceneNode | undefined
}

/**
 * What a request on `node` copies: the version holding it, or the layer itself; or why it
 * cannot be varied.
 */
function variationSource(graph: SceneGraph, node: SceneNode): VariationSource | string {
  const view = variationSetOf(graph, node.id)
  if (view) {
    const version = versionOf(graph, view, node.id)
    if (!version) return SECTION_REFUSAL
    if (!view.original) return 'The layer these are variations of is gone'
    return { source: version, original: view.original, section: view.section }
  }
  const refusal = UNVARIED_TYPES[node.type]
  if (refusal) return refusal
  if (node.parentId && findInstanceAncestor(graph, node.parentId)) {
    return 'A layer inside an instance cannot be varied; vary the instance or its main component'
  }
  if (!getNodeEditCapability(graph, node.id).editable) {
    return `"${node.name}" belongs to a library and cannot be changed here`
  }
  return { source: node, original: node, section: variationSetForOriginal(graph, node.id)?.section }
}

/** Why `nodeId` cannot be varied, or null when it can. */
export function variationRefusal(graph: SceneGraph, nodeId: string): string | null {
  const node = graph.getNode(nodeId)
  if (!node) return `Node "${nodeId}" not found`
  const found = variationSource(graph, node)
  return typeof found === 'string' ? found : null
}

function checkRequest(graph: SceneGraph, source: SceneNode, request: VariationRequest) {
  const { count, labels = [] } = request
  if (!Number.isInteger(count) || count < 1 || count > VARIATION_MAX_COUNT) {
    throw new Error(`Ask for 1 to ${VARIATION_MAX_COUNT} versions, not ${count}`)
  }
  if (labels.length > count) throw new Error(`${labels.length} labels for ${count} versions`)
  const long = labels.find((label) => label.trim().length > VARIATION_LABEL_MAX_LENGTH)
  if (long !== undefined) {
    throw new Error(`Label "${long}" is longer than ${VARIATION_LABEL_MAX_LENGTH} characters`)
  }
  const layers = graph.countDescendants(source.id) + 1
  if (layers * count > VARIATION_MAX_LAYERS) {
    throw new Error(
      `${count} copies of ${layers} layers make ${layers * count} layers, more than the ` +
        `${VARIATION_MAX_LAYERS} one request may copy; ask for fewer versions or vary a smaller layer`
    )
  }
}

function rowSize(width: number, height: number, count: number) {
  return {
    width: VARIATION_SECTION_PADDING * 2 + count * width + (count - 1) * VARIATION_GAP,
    height: VARIATION_SECTION_PADDING * 2 + height
  }
}

/** The page's top-level layers but `sectionId`, as boxes a section must stay clear of. */
function pageObstacles(graph: SceneGraph, pageId: string, sectionId?: string): Rect[] {
  return graph
    .getChildren(pageId)
    .filter((node) => node.id !== sectionId)
    .map((node) => getAxisAlignedBoundsInParent([node], pageId, graph))
}

/** The free spot of `size` nearest the original's top-level layer, right of it or below it. */
function spaceBeside(
  graph: SceneGraph,
  pageId: string,
  original: SceneNode,
  size: Size,
  sectionId?: string
) {
  const topLevel = graph.closest(original.id, (node) => node.parentId === pageId) ?? original
  return findEmptySpace({
    obstacles: pageObstacles(graph, pageId, sectionId),
    ...size,
    anchor: getAxisAlignedBoundsInParent([topLevel], pageId, graph),
    gap: VARIATION_GAP,
    directions: ['right', 'below']
  })
}

/**
 * Gives the section `size`. It grows where it is while that covers no other layer on the page,
 * and otherwise moves to the free spot nearest the original, where a new set would go.
 */
function fitSection(graph: SceneGraph, section: SceneNode, original: SceneNode, size: Size) {
  const pageId = section.parentId
  if (!pageId) return
  const grown = { x: section.x, y: section.y, ...size }
  const covers = pageObstacles(graph, pageId, section.id).some((box) => rectsOverlap(grown, box, 0))
  const space = covers ? spaceBeside(graph, pageId, original, size, section.id) : grown
  graph.updateNode(section.id, { x: space.x, y: space.y, ...size })
}

/** A new marked section beside the original's top-level layer, sized for `count` copies. */
function createSection(graph: SceneGraph, original: SceneNode, source: SceneNode, count: number) {
  const pageId = graph.pageOf(original.id)
  if (!pageId) throw new Error(`"${original.name}" is on no page`)
  const size = rowSize(source.width, source.height, count)
  const space = spaceBeside(graph, pageId, original, size)
  const section = graph.createNode('SECTION', pageId, {
    name: `Variations · ${original.name}`,
    x: space.x,
    y: space.y,
    ...size,
    // The copies show in the modes the original shows in from its ancestors.
    variableModes: original.parentId ? resolvedVariableModes(graph, original.parentId) : {}
  })
  graph.updateNode(section.id, {
    pluginData: withVariationSet(section, {
      version: 1,
      originalId: original.id,
      originalFingerprint: variationFingerprint(graph, original.id)
    })
  })
  return section
}

function versionName(index: number, label: string | undefined): string {
  const text = label?.trim()
  return text ? `V${index} · ${text}` : `V${index}`
}

/**
 * Copies a layer `request.count` times into the section of variations beside it, made the first
 * time, in a row after the versions already there. On a version, it copies that version into
 * its own set. The original is not changed. The caller records the edit as one step.
 */
export function createVariations(
  graph: SceneGraph,
  nodeId: string,
  request: VariationRequest
): CreatedVariations {
  const node = graph.getNode(nodeId)
  if (!node) throw new Error(`Node "${nodeId}" not found`)
  const found = variationSource(graph, node)
  if (typeof found === 'string') throw new Error(found)
  const { source, original } = found
  checkRequest(graph, source, request)
  const section = found.section ?? createSection(graph, original, source, request.count)
  const set = found.section ? readVariationSet(found.section) : null
  if (set) {
    // The newest versions start from the original as it is now.
    const originalFingerprint = variationFingerprint(graph, original.id)
    graph.updateNode(section.id, {
      pluginData: withVariationSet(section, { ...set, originalFingerprint })
    })
  }

  const existing = graph.getChildren(section.id)
  const right = Math.max(
    VARIATION_SECTION_PADDING - VARIATION_GAP,
    ...existing.map((version) => version.x + version.width)
  )
  const versions: SceneNode[] = []
  for (let index = 0; index < request.count; index++) {
    const copy = copyVersion(graph, source.id, section.id, {
      name: versionName(existing.length + index + 1, request.labels?.[index]),
      x: right + VARIATION_GAP + index * (source.width + VARIATION_GAP),
      y: VARIATION_SECTION_PADDING,
      rotation: 0,
      visible: true,
      locked: false
    })
    if (!copy) continue
    versions.push(copy)
  }

  const last = versions.at(-1)
  if (last) {
    const bottom = Math.max(...graph.getChildren(section.id).map((v) => v.y + v.height))
    fitSection(graph, section, original, {
      width: Math.max(section.width, last.x + last.width + VARIATION_SECTION_PADDING),
      height: Math.max(section.height, bottom + VARIATION_SECTION_PADDING)
    })
  }
  return { sectionId: section.id, originalId: original.id, versions }
}
