import * as v from 'valibot'

import type { LayoutAlign } from '@pairdraw/scene-graph'

import type { FigmaNodeProxy } from '#core/figma-api'
import { textFonts } from '#core/tools/modify/text'
import {
  overflowDirectionInput,
  scrollBehaviorInput,
  scrollRefusal
} from '#core/tools/modify/update'
import { defineTool, nodeNotFound, toolNumber } from '#core/tools/schema'

const nonNegative = () => toolNumber(v.pipe(v.number(), v.minValue(0)))

/** The primary-axis alignments, from the type the graph stores, so the list cannot drift. */
const layoutAligns = [
  'MIN',
  'CENTER',
  'MAX',
  'SPACE_BETWEEN',
  'SPACE_AROUND'
] as const satisfies readonly LayoutAlign[]

/** Every prop an operation may set; anything else rejects the whole batch. */
const batchPropsSchema = v.strictObject({
  spacing: v.optional(nonNegative()),
  padding: v.optional(nonNegative()),
  padding_horizontal: v.optional(nonNegative()),
  padding_vertical: v.optional(nonNegative()),
  align: v.optional(v.picklist(layoutAligns)),
  counter_align: v.optional(v.picklist(['MIN', 'CENTER', 'MAX', 'STRETCH'])),
  sizing_horizontal: v.optional(v.picklist(['FIXED', 'HUG', 'FILL'])),
  sizing_vertical: v.optional(v.picklist(['FIXED', 'HUG', 'FILL'])),
  grow: v.optional(nonNegative()),
  name: v.optional(v.string()),
  visible: v.optional(v.boolean()),
  corner_radius: v.optional(nonNegative()),
  opacity: v.optional(toolNumber(v.pipe(v.number(), v.minValue(0), v.maxValue(1)))),
  auto_resize: v.optional(v.picklist(['NONE', 'WIDTH_AND_HEIGHT', 'HEIGHT', 'TRUNCATE'])),
  direction: v.optional(v.picklist(['HORIZONTAL', 'VERTICAL'])),
  overflow_direction: v.optional(overflowDirectionInput()),
  scroll_behavior: v.optional(scrollBehaviorInput())
})
type BatchProps = v.InferOutput<typeof batchPropsSchema>

const batchOpsSchema = v.array(v.strictObject({ id: v.string(), props: batchPropsSchema }))
type BatchOp = v.InferOutput<typeof batchOpsSchema>[number]

/** The operations a call names, or every problem with them. */
function parseOperations(operations: BatchOp[] | string): BatchOp[] | { error: string } {
  const result =
    typeof operations === 'string'
      ? v.safeParse(v.pipe(v.string(), v.parseJson(), batchOpsSchema), operations)
      : v.safeParse(batchOpsSchema, operations)
  if (result.success) return result.output
  return { error: `Invalid operations:\n${v.summarize(result.issues)}` }
}

/** The props a frame's auto layout holds; a page holds no layout, so it takes none of them. */
const LAYOUT_PROPS = [
  'spacing',
  'padding',
  'padding_horizontal',
  'padding_vertical',
  'align',
  'counter_align',
  'sizing_horizontal',
  'sizing_vertical',
  'grow',
  'direction'
] as const satisfies readonly (keyof BatchProps)[]

function applyBatchProps(node: FigmaNodeProxy, props: BatchProps): void {
  if (props.spacing !== undefined) node.itemSpacing = props.spacing
  if (props.padding !== undefined) {
    node.paddingTop = props.padding
    node.paddingRight = props.padding
    node.paddingBottom = props.padding
    node.paddingLeft = props.padding
  }
  if (props.padding_horizontal !== undefined) {
    node.paddingLeft = props.padding_horizontal
    node.paddingRight = props.padding_horizontal
  }
  if (props.padding_vertical !== undefined) {
    node.paddingTop = props.padding_vertical
    node.paddingBottom = props.padding_vertical
  }
  if (props.align !== undefined) node.primaryAxisAlignItems = props.align
  if (props.counter_align !== undefined) node.counterAxisAlignItems = props.counter_align
  if (props.sizing_horizontal !== undefined) node.layoutSizingHorizontal = props.sizing_horizontal
  if (props.sizing_vertical !== undefined) node.layoutSizingVertical = props.sizing_vertical
  if (props.grow !== undefined) node.layoutGrow = props.grow
  if (props.name !== undefined) node.name = props.name
  if (props.visible !== undefined) node.visible = props.visible
  if (props.corner_radius !== undefined) node.cornerRadius = props.corner_radius
  if (props.opacity !== undefined) node.opacity = props.opacity
  if (props.auto_resize !== undefined) node.textAutoResize = props.auto_resize
  if (props.direction !== undefined) node.layoutMode = props.direction
  if (props.overflow_direction !== undefined) node.overflowDirection = props.overflow_direction
  if (props.scroll_behavior !== undefined) node.scrollBehavior = props.scroll_behavior
}

export const batchUpdate = defineTool({
  name: 'batch_update',

  description:
    'Execute multiple modifications in one call, all or nothing: if any operation names a missing node or an invalid prop, nothing changes. ' +
    `Each operation is {id, props} where props can include: ${Object.keys(batchPropsSchema.entries).join(', ')}. ` +
    'Runs all updates with one layout recompute.',
  // A document edit, not an atomic property transaction: the runner rolls a thrown batch back
  // whole at the cost of the layers it touched, and documents past the atomic path's node limit
  // still batch-edit. The validate-then-apply above keeps the call all-or-nothing either way.
  execution: { kind: 'sync', mutation: 'document' },
  input: v.strictObject({
    operations: v.pipe(
      v.union([batchOpsSchema, v.string()]),
      v.description(
        'Array of {"id","props"}, or the same array as a JSON string: [{"id":"0:5","props":{"spacing":8}},{"id":"0:6","props":{"sizing_horizontal":"FILL","grow":1}}]'
      )
    )
  }),
  // Text that resizes itself lays out again, so its fonts load first.
  fonts: (figma, { operations }) => {
    const ops = parseOperations(operations)
    if (!Array.isArray(ops)) return []
    return ops.flatMap((op) => (op.props.auto_resize === undefined ? [] : textFonts(figma, op.id)))
  },
  execute(figma, { operations }) {
    const ops = parseOperations(operations)
    if (!Array.isArray(ops)) return ops

    // Find every layer before writing, so a missing one leaves the document untouched.
    const targets: Array<{ node: FigmaNodeProxy; props: BatchProps }> = []
    for (const op of ops) {
      const node = figma.getNodeById(op.id)
      if (!node) return nodeNotFound(op.id)
      // Refused before anything is written, so the batch stays all or nothing.
      if (
        figma.graph.getNode(op.id)?.type === 'CANVAS' &&
        LAYOUT_PROPS.some((key) => op.props[key] !== undefined)
      )
        return {
          error: `A page cannot hold auto layout. Set it on a frame inside the page (${op.id}).`
        }
      const refusal = op.props.overflow_direction === undefined ? null : scrollRefusal(node)
      if (refusal) return { error: refusal }
      targets.push({ node, props: op.props })
    }

    const results: Array<{ id: string; updated: string[] }> = []
    for (const { node, props } of targets) {
      applyBatchProps(node, props)
      const updated = Object.keys(props)
      if (updated.length > 0) results.push({ id: node.id, updated })
    }

    const out: Record<string, unknown> = { updated: results.length }
    if (results.length > 0) out.results = results
    return out
  }
})
