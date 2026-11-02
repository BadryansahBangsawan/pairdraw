import { countBy, isEqual, uniq, uniqBy } from 'es-toolkit'

import { reapplyInstanceComponentProperties } from '@open-pencil/core'
import {
  findLibraryDefinition,
  isLibraryRevisionNotFoundError,
  type ComponentLibraryManifest,
  type ComponentLibraryRevision,
  type LibraryInstanceUpdate
} from '@open-pencil/core/library'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import type { EditorStore } from '@/app/editor/session'

/** An enabled library no catalog can read, whose components the document keeps as copies. */
export interface MissingLibrary {
  libraryId: string
  /** Distinct components and component sets the document copied from it. */
  assetCount: number
  instanceCount: number
}

/**
 * A revision, or `null` when no catalog has it. Any other failure, such as a corrupt or tampered
 * revision or an unreachable catalog, still throws, so it is reported instead of shown as missing.
 */
export async function unlessMissing<T>(read: Promise<T>): Promise<T | null> {
  try {
    return await read
  } catch (error) {
    if (isLibraryRevisionNotFoundError(error)) return null
    throw error
  }
}

/** How a missing library's assets map onto the library chosen in its place. */
export interface LibraryRelinkPlan {
  fromLibraryId: string
  toLibraryId: string
  /** Asset key in the missing library to the asset key it becomes. */
  assetKeys: Map<string, string>
  /** Names of the assets the chosen library has nothing for; they stay as they are. */
  unmatched: string[]
}

/** The components and component sets a library's revisions put in the document. */
function definitionRoots(graph: SceneGraph, libraryId: string): SceneNode[] {
  return [...graph.getAllNodes()].filter((node) => {
    if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') return false
    if (node.librarySource?.identity.libraryId !== libraryId) return false
    const parent = node.parentId ? graph.getNode(node.parentId) : undefined
    return !(parent?.type === 'COMPONENT_SET' && parent.librarySource)
  })
}

function rootComponents(graph: SceneGraph, root: SceneNode): SceneNode[] {
  if (root.type === 'COMPONENT') return [root]
  return graph.getChildren(root.id).filter((child) => child.type === 'COMPONENT')
}

/**
 * The enabled libraries outside `availableLibraryIds`, the ones a catalog could read. Their
 * components keep rendering, because the document holds copies, but they get no updates until
 * they are relinked.
 */
export function findMissingLibraries(
  graph: SceneGraph,
  availableLibraryIds: ReadonlySet<string>
): MissingLibrary[] {
  const missing: MissingLibrary[] = []
  for (const binding of graph.enabledLibraries.values()) {
    if (!binding.enabled || availableLibraryIds.has(binding.libraryId)) continue
    const roots = definitionRoots(graph, binding.libraryId)
    const instanceCount = roots
      .flatMap((root) => rootComponents(graph, root))
      .reduce((total, component) => total + graph.getInstances(component.id).length, 0)
    const assetCount = uniqBy(roots, (root) => root.librarySource?.identity.assetKey).length
    missing.push({ libraryId: binding.libraryId, assetCount, instanceCount })
  }
  return missing
}

function nameKey(type: string, name: string): string {
  return `${type}\u0000${name}`
}

/**
 * Matches each asset of a missing library to the chosen library's latest manifest: by asset key
 * first, the identity a library keeps across revisions and catalogs, then by a name and type the
 * chosen library uses for exactly one asset.
 */
export function planLibraryRelink(
  graph: SceneGraph,
  fromLibraryId: string,
  target: ComponentLibraryManifest
): LibraryRelinkPlan {
  const byKey = new Map(target.assets.map((asset) => [asset.key, asset]))
  const nameCounts = countBy(target.assets, (asset) => nameKey(asset.type, asset.name))
  const assetKeys = new Map<string, string>()
  const unmatched: string[] = []
  for (const root of definitionRoots(graph, fromLibraryId)) {
    const identity = root.librarySource?.identity
    if (!identity || assetKeys.has(identity.assetKey)) continue
    const name = nameKey(root.type, root.name)
    const match =
      byKey.get(identity.assetKey) ??
      (nameCounts[name] === 1
        ? target.assets.find((asset) => nameKey(asset.type, asset.name) === name)
        : undefined)
    if (match) assetKeys.set(identity.assetKey, match.key)
    else if (!unmatched.includes(root.name)) unmatched.push(root.name)
  }
  return { fromLibraryId, toLibraryId: target.libraryId, assetKeys, unmatched }
}

function sameProperties(left: SceneNode, right: SceneNode): boolean {
  return isEqual(left.componentPropertyValues, right.componentPropertyValues)
}

/**
 * Moves every instance of a missing library's matched assets onto the chosen library's copies,
 * which `revisionId` names and the document must already hold. An instance keeps its variant when
 * the chosen library has it, and otherwise takes the variant with its name, then the first one.
 */
export function planRelinkedInstances(
  graph: SceneGraph,
  plan: LibraryRelinkPlan,
  revisionId: string
): LibraryInstanceUpdate[] {
  const updates: LibraryInstanceUpdate[] = []
  for (const root of definitionRoots(graph, plan.fromLibraryId)) {
    const assetKey = root.librarySource?.identity.assetKey
    const targetKey = assetKey ? plan.assetKeys.get(assetKey) : undefined
    if (!targetKey) continue
    const targetRoot = findLibraryDefinition(graph, plan.toLibraryId, targetKey, revisionId)
    if (!targetRoot) continue
    const targets = rootComponents(graph, targetRoot)
    const first = [...targets].sort((left, right) => left.y - right.y || left.x - right.x).at(0)
    if (!first) continue
    for (const previous of rootComponents(graph, root)) {
      const exact = targets.find((candidate) => sameProperties(previous, candidate))
      const target = exact ?? targets.find((candidate) => candidate.name === previous.name) ?? first
      for (const instance of graph.getInstances(previous.id)) {
        updates.push({
          instanceId: instance.id,
          previousComponentId: previous.id,
          componentId: target.id,
          fallback: !exact
        })
      }
    }
  }
  return updates
}

/** What relinking a missing library changed. */
export interface LibraryRelinkResult {
  relinkedInstanceCount: number
  /** Names of the missing library's assets the chosen library has nothing for. */
  unmatched: string[]
}

type RelinkOptions = {
  editor: EditorStore
  fromLibraryId: string
  /** The chosen library's revision to relink to. */
  revision: ComponentLibraryRevision
  /** Copies these assets of `revision` into the document and returns the roots it created. */
  materialize: (assetKeys: string[]) => string[]
}

/**
 * Points a missing library's assets at another library, as one undoable step: each instance
 * moves to the chosen revision's copy of its asset, matched by asset key and then by name, and
 * the document follows the chosen library instead. Assets without a match keep the copies the
 * document already has.
 */
export function relinkMissingLibrary({
  editor,
  fromLibraryId,
  revision,
  materialize
}: RelinkOptions): LibraryRelinkResult {
  const { manifest } = revision
  const toLibraryId = manifest.libraryId
  const plan = planLibraryRelink(editor.graph, fromLibraryId, manifest)
  const previousFrom = editor.graph.enabledLibraries.get(fromLibraryId)
  const previousTo = editor.graph.enabledLibraries.get(toLibraryId)
  let applied: LibraryInstanceUpdate[] = []
  let createdRootIds: string[] = []
  const swap = (toPrevious: boolean) => {
    for (const update of applied) {
      const componentId = toPrevious ? update.previousComponentId : update.componentId
      editor.graph.swapInstanceComponent(update.instanceId, componentId)
      reapplyInstanceComponentProperties(editor, update.instanceId)
    }
  }
  const apply = () => {
    createdRootIds = materialize(uniq([...plan.assetKeys.values()]))
    applied = planRelinkedInstances(editor.graph, plan, manifest.revisionId)
    swap(false)
    editor.updateEnabledLibraries((bindings) => {
      bindings.delete(fromLibraryId)
      bindings.set(toLibraryId, {
        libraryId: toLibraryId,
        revisionId: manifest.revisionId,
        enabled: true
      })
    })
    editor.requestRender()
  }
  const restore = () => {
    swap(true)
    for (const rootId of createdRootIds) {
      if (editor.graph.getNode(rootId)) editor.graph.deleteNode(rootId)
    }
    editor.updateEnabledLibraries((bindings) => {
      if (previousFrom) bindings.set(fromLibraryId, previousFrom)
      if (previousTo) bindings.set(toLibraryId, previousTo)
      else bindings.delete(toLibraryId)
    })
    editor.requestRender()
  }
  apply()
  editor.pushUndoEntry({ label: 'Relink library', forward: apply, inverse: restore })
  return { relinkedInstanceCount: applied.length, unmatched: plan.unmatched }
}
