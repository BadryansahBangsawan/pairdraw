import dedent from 'dedent'

import type { SceneGraph } from '@pairdraw/scene-graph'

import type { ExploreNote, ReferencedNode } from '@/app/ai/chat/context'
import { referenceLink } from '@/app/ai/chat/references/link'
import { variantColumns, variantPlacement, type VariantPlacement } from '@/app/ai/explore/placement'
import type { ExploreAxis, ExploreRequest } from '@/app/ai/explore/request'

const AXIS_INSTRUCTIONS: Record<ExploreAxis, string> = {
  layout:
    'Explore layout: change the structure from one variant to the next (arrangement, hierarchy, grid, density, what leads) and keep one visual style across them (colors, type, imagery).',
  style:
    'Explore style: change the look from one variant to the next (colors, typography, imagery, shapes, effects) and keep one layout across them.'
}

const SINGLE_INSTRUCTIONS = dedent`
  Don't iterate: make one design for this message in a single pass.
  - Make no variants or alternatives.
  - Once it is built, do not review and rework it: skip exporting it to check it and skip second attempts. Fix only an error a tool reports. This overrides the usual visual check.
  - Then summarize the result in two or three lines.
`

function placementLine(placement: VariantPlacement, count: number): string {
  const columns = variantColumns(placement, count)
  const where = `Put variant 1 at x=${placement.x}, y=${placement.y}, and each next one ${placement.gap} px right of the previous one's right edge, all top-aligned at y=${placement.y}`
  return columns ? `${where} (left edges at x=${columns.join(', ')}).` : `${where}.`
}

/**
 * How a variant starts from `base`. A copy lands in the original's parent, so a base inside
 * another layer, or on another page, has its copy moved onto the page first: left in the parent,
 * it would reflow that parent's layers and read the row's x/y as relative to it. The chat's
 * default tools copy through `eval`; agents with `clone_node` get the same steps by tool.
 */
function startLine(graph: SceneGraph, pageId: string, base: ReferencedNode | null): string {
  if (!base) return '- Design each variant from the message, as a complete design of its own.'
  const link = referenceLink({ kind: 'node', id: base.id, label: base.name })
  const copy = `const copy = figma.getNodeById(${JSON.stringify(base.id)}).clone()`
  if (graph.getNode(base.id)?.parentId === pageId) {
    return `- Start each variant from ${link}: copy it (in \`eval\`, \`${copy}\`, or with \`clone_node\`), set the copy's x and y, and change the copy. Leave the original as it is.`
  }
  return `- Start each variant from ${link}. It is not a top-level layer of this page and a copy lands beside the original, so move each copy onto this page before placing it: in \`eval\`, \`${copy}; figma.currentPage.appendChild(copy)\`, or \`clone_node\` then \`reparent_node\` with parent_id "${pageId}". Then set the copy's x and y and change it there. Leave the original and the layers around it as they are.`
}

function variantInstructions(
  request: Extract<ExploreRequest, { kind: 'variants' }>,
  placement: VariantPlacement,
  start: string
): string {
  return dedent`
    Let it cook: make ${request.count} distinct variants of what this message asks for.
    - ${AXIS_INSTRUCTIONS[request.axis]}
    ${start}
    - Make each variant its own new top-level frame on the current page, named with a suffix " — Variant N" (N from 1 to ${request.count}), in one row side by side. ${placementLine(placement, request.count)}
    - Do not move, change, or delete layers that were already on the page.
    - Build the variants one after another. Take each in a clearly different direction from the ones before it rather than refining them.
    - When all ${request.count} are done, select them and summarize each in one line.
  `
}

/**
 * Variants of a layer that can be varied are versions in its set of variations, which the tool
 * places beside it and the person keeps one of with Use this.
 */
function versionInstructions(
  request: Extract<ExploreRequest, { kind: 'variants' }>,
  base: ReferencedNode
): string {
  const link = referenceLink({ kind: 'node', id: base.id, label: base.name })
  return dedent`
    Let it cook: make ${request.count} distinct versions of ${link} for what this message asks.
    - ${AXIS_INSTRUCTIONS[request.axis]}
    - Call \`create_variations\` once with id "${base.id}", count ${request.count}, and one short label per version naming the idea it tries (in \`eval\`, \`pairdraw.createVariations(...)\`). It copies the layer into a Variations section beside it; leave the original as it is.
    - Change the versions one after another, each in a clearly different direction from the ones before it, by editing the layers inside each version with \`batch_update\`, \`set_*\`, or \`render\` with parent_id or replace_id inside it. Keep each version's own root layer: one whose root becomes another kind of layer cannot replace the original.
    - Do not pick a version or discard them: the user compares them and keeps one with Use this.
    - When all ${request.count} are done, check them together with \`export_image\` of the set, then summarize each in one line.
  `
}

/**
 * The note that tells the model how to explore a request. Variants start from `base`, the first
 * layer the message names or the selection: versions in its set of variations when `canVary`
 * says it can be varied, else copies in a row right of everything on the page.
 */
export function exploreNote(
  graph: SceneGraph,
  pageId: string,
  request: ExploreRequest,
  base: ReferencedNode | null,
  canVary: (nodeId: string) => boolean = () => false
): ExploreNote {
  if (request.kind === 'single') {
    return { attributes: { mode: 'single' }, instructions: SINGLE_INSTRUCTIONS }
  }
  if (base && canVary(base.id)) {
    return {
      attributes: { mode: 'variants', count: request.count, axis: request.axis, base: base.id },
      instructions: versionInstructions(request, base)
    }
  }
  const placement = variantPlacement(graph, pageId, base?.id)
  return {
    attributes: {
      mode: 'variants',
      count: request.count,
      axis: request.axis,
      x: placement.x,
      y: placement.y,
      gap: placement.gap
    },
    instructions: variantInstructions(request, placement, startLine(graph, pageId, base))
  }
}
