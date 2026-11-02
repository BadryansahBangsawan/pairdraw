import * as v from 'valibot'

import type { SceneGraph } from '@open-pencil/scene-graph'
import { getAxisAlignedBoundsInParent } from '@open-pencil/scene-graph/coordinate'
import { applyGraphTransfer, prepareGraphTransfer } from '@open-pencil/scene-graph/transfer'

import { flushPendingLayout } from '#core/figma-api'
import { sceneGraphFromStyledHTML } from '#core/io/formats/html/layers'
import { findPageId } from '#core/io/subgraph'
import { layoutAuthoredNodes } from '#core/layout'
import { getHTMLToolHost } from '#core/tools/html-host'
import { spaceBesideContent } from '#core/tools/read/space'
import { defineTool, toolFailure, toolNumber } from '#core/tools/schema'

export const importHTML = defineTool({
  name: 'import_html',
  description:
    'Import HTML and CSS as editable layers in the open document, styled as a browser styles them: flex and grid become auto layout, and text, fills, borders, radii, shadows, and images carry over. <style> blocks in the HTML apply; css adds a stylesheet; tailwind compiles the Tailwind classes the markup uses. Without x and y the layers go to the right of what the parent already holds. Returns the ids of the top-level layers.',
  execution: { kind: 'async', mutation: 'document' },
  input: v.strictObject({
    html: v.pipe(
      v.string(),
      v.nonEmpty(),
      v.description('HTML markup: a fragment or a whole document with <style> blocks')
    ),
    css: v.optional(v.pipe(v.string(), v.description('Extra CSS applied after the HTML’s own'))),
    tailwind: v.optional(
      v.pipe(v.boolean(), v.description('Compile the Tailwind utility classes the markup uses')),
      false
    ),
    parent_id: v.optional(v.pipe(v.string(), v.description('Parent node ID (default: the page)'))),
    x: v.optional(toolNumber(v.pipe(v.number(), v.description('X of the imported content')))),
    y: v.optional(toolNumber(v.pipe(v.number(), v.description('Y of the imported content'))))
  }),
  execute: async (figma, args) => {
    const graph = figma.graph
    const host = getHTMLToolHost(graph)
    if (!host) {
      return { error: 'import_html needs a CSS runtime, which this environment does not provide' }
    }
    const parentId = args.parent_id ?? figma.currentPage.id
    const parent = graph.getNode(parentId)
    if (!parent || (parent.type !== 'CANVAS' && !findPageId(graph, parentId))) {
      return { error: `Parent "${parentId}" not found` }
    }
    let source: SceneGraph
    try {
      const styled = await host.style(args.html, {
        cssText: args.css,
        tailwind: args.tailwind
      })
      source = sceneGraphFromStyledHTML(styled)
    } catch (error) {
      return toolFailure(error)
    }
    const page = source.getPages().at(0)
    const roots = page ? page.childIds.flatMap((id) => source.getNode(id) ?? []) : []
    if (!page || roots.length === 0) return { error: 'The HTML has no content to import' }
    const bounds = getAxisAlignedBoundsInParent(roots, page.id, source)
    let topLeft = { x: args.x ?? 0, y: args.y ?? 0 }
    if (args.x === undefined || args.y === undefined) {
      // What an earlier edit changed may not be laid out yet, and the free space depends on it.
      flushPendingLayout(graph)
      const beside = spaceBesideContent(graph, parentId, bounds)
      topLeft = { x: args.x ?? beside.x, y: args.y ?? beside.y }
    }
    const plan = prepareGraphTransfer({
      source,
      rootIds: roots.map((root) => root.id),
      dependencyPageIds: [],
      target: graph,
      parentId
    })
    const rootIds = new Set(plan.rootIds)
    for (const node of plan.nodes) {
      if (!rootIds.has(node.id)) continue
      node.props.x = (node.props.x ?? 0) - bounds.x + topLeft.x
      node.props.y = (node.props.y ?? 0) - bounds.y + topLeft.y
    }
    applyGraphTransfer(graph, plan)
    layoutAuthoredNodes(graph, plan.rootIds)
    const layers = plan.rootIds.flatMap((id) => {
      const node = graph.getNode(id)
      return node ? [{ id: node.id, name: node.name, type: node.type }] : []
    })
    return {
      ids: layers.map((layer) => layer.id),
      layers,
      x: topLeft.x,
      y: topLeft.y,
      width: bounds.width,
      height: bounds.height
    }
  }
})
