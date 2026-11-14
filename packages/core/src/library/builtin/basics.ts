import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'

import type { ComponentLibraryRevision, LibraryCatalog } from '#core/library/types'

/** The built-in original design system libraries ship with: id, name, and description. */
export const BUILTIN_LIBRARY_ID = 'pairdraw-basics'

/** Fixed publication time, so a launch does not reshuffle newest-first library lists. */
export const BUILTIN_LIBRARY_PUBLISHED_AT = '2026-11-04T00:00:00.000Z'

const INK: SceneNode['fills'] = [
  { type: 'SOLID', color: { r: 0.09, g: 0.11, b: 0.16, a: 1 }, opacity: 1, visible: true }
]

const PAPER: SceneNode['fills'] = [
  { type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }
]

const ACCENT: SceneNode['fills'] = [
  { type: 'SOLID', color: { r: 0.16, g: 0.35, b: 1, a: 1 }, opacity: 1, visible: true }
]

const ACCENT_TEXT: SceneNode['fills'] = [
  { type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }
]

const MUTED_TEXT: SceneNode['fills'] = [
  { type: 'SOLID', color: { r: 0.42, g: 0.45, b: 0.52, a: 1 }, opacity: 1, visible: true }
]

const OUTLINE: SceneNode['strokes'] = [
  {
    type: 'SOLID',
    color: { r: 0.82, g: 0.84, b: 0.89, a: 1 },
    opacity: 1,
    visible: true,
    weight: 1,
    align: 'INSIDE'
  }
]

function label(
  graph: SceneGraph,
  parentId: string,
  name: string,
  text: string,
  size: number,
  fills: SceneNode['fills']
): SceneNode {
  return graph.createNode('TEXT', parentId, { name, text, fontSize: size, fills })
}

/**
 * An original basic component set drawn from primitives: a button, an input, a badge, a card,
 * and an avatar. Nothing is copied from another design system; the shapes, colors, and metrics
 * below are this library's own. Returns the component ids as publishable asset roots.
 */
export function buildBasicsLibrary(graph: SceneGraph, pageId: string): string[] {
  const key = (name: string) => `${BUILTIN_LIBRARY_ID}/${name.toLowerCase()}`
  const button = graph.createNode('COMPONENT', pageId, {
    name: 'Button',
    componentKey: key('Button'),
    layoutMode: 'HORIZONTAL',
    primaryAxisAlign: 'CENTER',
    counterAxisAlign: 'CENTER',
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 10,
    paddingBottom: 10,
    cornerRadius: 8,
    fills: ACCENT
  })
  label(graph, button.id, 'Label', 'Button', 14, ACCENT_TEXT)

  const input = graph.createNode('COMPONENT', pageId, {
    name: 'Input',
    componentKey: key('Input'),
    layoutMode: 'HORIZONTAL',
    primaryAxisAlign: 'MIN',
    counterAxisAlign: 'CENTER',
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 10,
    paddingBottom: 10,
    cornerRadius: 8,
    fills: PAPER,
    strokes: OUTLINE
  })
  label(graph, input.id, 'Placeholder', 'Type here', 14, MUTED_TEXT)

  const badge = graph.createNode('COMPONENT', pageId, {
    name: 'Badge',
    componentKey: key('Badge'),
    layoutMode: 'HORIZONTAL',
    primaryAxisAlign: 'CENTER',
    counterAxisAlign: 'CENTER',
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 4,
    paddingBottom: 4,
    cornerRadius: 999,
    fills: INK
  })
  label(graph, badge.id, 'Label', 'New', 12, ACCENT_TEXT)

  const card = graph.createNode('COMPONENT', pageId, {
    name: 'Card',
    componentKey: key('Card'),
    layoutMode: 'VERTICAL',
    primaryAxisAlign: 'MIN',
    counterAxisAlign: 'MIN',
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 16,
    paddingBottom: 16,
    itemSpacing: 8,
    cornerRadius: 12,
    fills: PAPER,
    strokes: OUTLINE
  })
  label(graph, card.id, 'Title', 'Card title', 16, INK)
  label(graph, card.id, 'Body', 'A short supporting line.', 14, MUTED_TEXT)

  const avatar = graph.createNode('COMPONENT', pageId, {
    name: 'Avatar',
    componentKey: key('Avatar'),
    layoutMode: 'HORIZONTAL',
    primaryAxisAlign: 'CENTER',
    counterAxisAlign: 'CENTER',
    cornerRadius: 999,
    fills: ACCENT
  })
  label(graph, avatar.id, 'Initials', 'PD', 14, ACCENT_TEXT)

  return [button.id, input.id, badge.id, card.id, avatar.id]
}

/** Builds the basics set on a fresh page and publishes it to `catalog`. */
export async function publishBasicsLibrary(
  catalog: LibraryCatalog,
  publishedAt: string = BUILTIN_LIBRARY_PUBLISHED_AT
): Promise<ComponentLibraryRevision> {
  const graph = new SceneGraph()
  const assetNodeIds = buildBasicsLibrary(graph, graph.getPages()[0].id)
  return catalog.publishRevision({
    libraryId: BUILTIN_LIBRARY_ID,
    name: 'Pairdraw Basics',
    description: 'An original basic set: button, input, badge, card, and avatar.',
    graph,
    assetNodeIds,
    publishedAt
  })
}
