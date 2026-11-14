import type { SceneGraph } from '@pairdraw/scene-graph'
import { libraryDefinitionsPage } from '@pairdraw/scene-graph/components'

import { withImports, type PenImports } from './imports'
import type { Build } from './nodes'
import type { PenDocument, PenNode, PenOverride } from './schema'

/** A component an imported document defines, with the outermost component holding it. */
interface Owner {
  alias: string
  path: string
  root: PenNode
  /** The themes of the layers around the root in its document, which it was drawn in. */
  theme: Record<string, string> | undefined
}

/** An imported component the document draws, as it went on the library page. */
export interface LibraryRoot {
  id: string
  alias: string
  path: string
}

/** The component IDs a layer and its overrides name: its `ref`s and the slots' suggestions. */
function namedComponents(node: PenOverride, found: string[]): void {
  if (typeof node.ref === 'string') found.push(node.ref)
  if (Array.isArray(node.slot)) found.push(...node.slot)
  for (const child of node.children ?? []) namedComponents(child, found)
  for (const override of Object.values(node.descendants ?? {})) namedComponents(override, found)
}

function mergeTheme(
  outer: Record<string, string> | undefined,
  inner: Record<string, string> | undefined
): Record<string, string> | undefined {
  return outer || inner ? { ...outer, ...inner } : undefined
}

/** Each reusable layer of the imported documents by ID, with the outermost component holding it. */
function componentOwners(imports: PenImports): Map<string, Owner> {
  const owners = new Map<string, Owner>()
  for (const [alias, { path, doc }] of imports) {
    const visit = (nodes: readonly PenNode[], root: PenNode | undefined, theme: Owner['theme']) => {
      for (const node of nodes) {
        const own = root ?? (node.reusable ? node : undefined)
        if (node.reusable && own) owners.set(node.id, { alias, path, root: own, theme })
        visit(node.children ?? [], own, own ? theme : mergeTheme(theme, node.theme))
      }
    }
    visit(doc.children, undefined, undefined)
  }
  return owners
}

/**
 * The imported components a document draws, through the components they draw in turn, each as the
 * outermost component holding it, in the order the document first names them. A library's other
 * components stay out of the document, which only ever shows instances of the ones it uses.
 */
function usedRoots(doc: PenDocument, imports: PenImports): Owner[] {
  const owners = componentOwners(imports)
  const pending: string[] = []
  for (const node of doc.children) namedComponents(node, pending)
  const roots = new Map<string, Owner>()
  // Each root's own names join the list as it is read.
  for (const id of pending) {
    const owner = owners.get(id)
    if (!owner || roots.has(owner.root.id)) continue
    roots.set(owner.root.id, owner)
    namedComponents(owner.root, pending)
  }
  return [...roots.values()]
}

/**
 * The document with the imported components it uses after its own layers, and the imported
 * variables and themes, so `penAssets` lists every icon and image it draws and no other of a
 * library's.
 */
export function withUsedImports(doc: PenDocument, imports: PenImports): PenDocument {
  if (imports.size === 0) return doc
  return {
    ...withImports(doc, imports),
    children: [...doc.children, ...usedRoots(doc, imports).map((owner) => owner.root)]
  }
}

/**
 * Draws the imported components the document uses on the hidden library page, in the themes they
 * sit in in their own documents, so its instances of them resolve. Nothing is drawn when the
 * document uses none.
 */
export function createLibraryRoots(
  doc: PenDocument,
  imports: PenImports,
  build: Build,
  create: (pen: PenNode, parentId: string, build: Build) => string
): LibraryRoot[] {
  const roots = usedRoots(doc, imports)
  if (roots.length === 0) return []
  const page = libraryDefinitionsPage(build.graph)
  return roots.map(({ alias, path, root, theme }) => {
    const leave = theme ? build.ctx.enterTheme(theme) : undefined
    try {
      return { id: create(root, page.id, build), alias, path }
    } finally {
      leave?.()
    }
  })
}

/** `value` with what `allowed` rejects replaced, starting with a letter or digit, at most `max` long. */
function libraryName(value: string, allowed: RegExp, max: number): string {
  const name = value.replace(allowed, '_')
  return (/^[a-zA-Z0-9]/.test(name) ? name : `x${name}`).slice(0, max)
}

/** The ID a library's assets name it by: `pen:<alias>`, in the characters library IDs take. */
function penLibraryId(alias: string): string {
  return libraryName(`pen:${alias}`, /[^a-zA-Z0-9._:-]/g, 128)
}

/** A component's key in its library: its ID in the imported document, without the alias. */
function penLibraryAssetKey(alias: string, id: string): string {
  const prefix = `${alias}:`
  const own = id.startsWith(prefix) ? id.slice(prefix.length) : id
  return libraryName(own, /[^a-zA-Z0-9._:/-]/g, 256)
}

/**
 * Marks the imported components as a library's definitions: read-only, locked, and each with its
 * library and key, so the editor treats them as it treats a component library's, and their
 * instances as library instances. The file they came from is their revision.
 */
export function markLibraryRoots(graph: SceneGraph, roots: readonly LibraryRoot[]): void {
  for (const { id, alias, path } of roots) {
    const root = graph.getNode(id)
    if (!root) continue
    const libraryId = penLibraryId(alias)
    const queue = [root]
    for (const node of queue) {
      if (node === root || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
        node.librarySource = {
          identity: { libraryId, assetKey: penLibraryAssetKey(alias, node.id), revisionId: path },
          sourceNodeId: null,
          readOnly: true
        }
      }
      queue.push(...graph.getChildren(node.id))
    }
    root.locked = true
  }
}
