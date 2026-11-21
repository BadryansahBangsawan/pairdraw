/* eslint-disable max-lines -- SceneGraph is the facade over the domain modules */
import { omitBy, pick } from 'es-toolkit/object'
import { isEmptyObject, isUndefined } from 'es-toolkit/predicate'

import { removeStaleBindings } from './bindings'
import { BufferedSceneEmitter } from './buffered-events'
import { assertPageLayout, finiteGeometry, pageLayoutOverrides } from './canvas-layout'
import {
  getAbsolutePosition,
  getNodeLocalMatrix,
  getParentWorldMatrix,
  isTranslationOnly,
  localTransformFromWorld
} from './coordinate'
import { cloneNodeProps, type NodeCloneMode } from './copy'
import { normalizeEffects } from './effects'
import { shareEmptyNodeValues } from './empty-values'
import { bindNodeEvents } from './events'
import { TRANSFORM_FIELDS } from './fields/geometry'
import { LAYOUT_AFFECTING_KEYS } from './fields/layout'
import { withGeneratedFrameSize } from './generated'
import * as HitTest from './hit-test'
import { generateId } from './ids'
import * as Instances from './instances'
import { LayoutWrites } from './layout/writes'
import Matrix from './matrix'
import { CONTAINER_TYPES, createDefaultNode } from './node-defaults'
import { updateNodePreview, type NodePreviewObserver } from './preview'
import type { Color, Rect, Vector } from './primitives'
/* eslint-disable max-lines -- SceneGraph is the facade over the domain modules */
import { slotPropertyId } from './slots/frames'
import { markSourceFieldsEdited } from './source-metadata'
import { strokeLineChanges } from './strokes'
import { invalidateTextCaches } from './text/picture'
import type {
  DocumentColorSpace,
  DocumentKind,
  EnabledLibraryBinding,
  NodeChangeObserver,
  NodeType,
  SceneGraphEventHandlers,
  SceneNode,
  Variable,
  VariableCollection,
  VariableType,
  VariableValue,
  VariableLiteral
} from './types'
import * as Variables from './variables'
import type { VariableModeFallback } from './variables'
import { normalizeVectorNetwork } from './vector-network'

/** Scopes that graph methods check while a caller's callback runs; scopes nest. */
type GraphScope =
  | 'preview'
  | 'sourceMetadata'
  | 'importedState'
  | 'layout'
  | 'derivedLayout'
  | 'componentDerived'

export class SceneGraph {
  nodes = new Map<string, SceneNode>()
  images = new Map<string, Uint8Array>()
  variables = new Map<string, Variable>()
  variableCollections = new Map<string, VariableCollection>()
  activeMode = new Map<string, string>()
  rootId: string
  figKiwiVersion: number | null = null
  /** Deflated kiwi schema bytes from the original .fig file, preserved for roundtrip fidelity. */
  figSchemaDeflated: Uint8Array | null = null
  documentColorSpace: DocumentColorSpace = 'srgb'
  documentKind: DocumentKind = 'design'
  enabledLibraries = new Map<string, EnabledLibraryBinding>()
  readonly emitter = new BufferedSceneEmitter()
  private absPosCache = new Map<string, Vector>()
  private readonly scopeDepths: Record<GraphScope, number> = {
    preview: 0,
    sourceMetadata: 0,
    importedState: 0,
    layout: 0,
    derivedLayout: 0,
    componentDerived: 0
  }
  private previewObservers: NodePreviewObserver[] = []
  /** Edited-field marks added since the last undo step, which that step takes back when undone. */
  private pendingSourceMarks: Array<[string, string]> = []
  private readonly observeSourceMark = (id: string, field: string) => {
    this.pendingSourceMarks.push([id, field])
  }
  private readonly changeObservers = new Set<NodeChangeObserver>()
  /** How many waits outside the edit each recorder is paused for. */
  private readonly outsideWaits = new Map<NodeChangeObserver, number>()
  private importedIdGenerator: (() => string) | undefined
  private layoutWrites: LayoutWrites | null = null
  positionPreviewVersion = 0
  instanceIndex = new Map<string, Set<string>>()
  /** Every connector in the graph, so routing need not scan every layer. */
  connectorIds = new Set<string>()

  constructor(private readonly idGenerator: () => string = generateId) {
    const root = createDefaultNode(this.idGenerator, 'FRAME', {
      name: 'Document',
      width: 0,
      height: 0
    })
    this.rootId = root.id
    this.nodes.set(root.id, root)

    this.addPage('Page 1')
  }
  addPage(name: string): SceneNode {
    return this.createNode('CANVAS', this.rootId, { name, width: 0, height: 0 })
  }

  getPages(includeInternal = false): SceneNode[] {
    return this.getChildren(this.rootId).filter(
      (n) => n.type === 'CANVAS' && (includeInternal || !n.internalOnly)
    )
  }
  getAllNodes(): Iterable<SceneNode> {
    return this.nodes.values()
  }
  getNode(id: string): SceneNode | undefined {
    return this.nodes.get(id)
  }
  onNodeEvents(handlers: SceneGraphEventHandlers): () => void {
    return bindNodeEvents(this.emitter, handlers)
  }

  /**
   * Tells `observer` about each node an edit adds and, before it changes, each node it is about
   * to change, so a recorder can keep the node as it was. Unlike node events these are never
   * buffered. Graph methods report the nodes they change; code that writes into a node directly
   * reports it with `willChangeNode` first.
   */
  observeNodeChanges(observer: NodeChangeObserver): () => void {
    this.changeObservers.add(observer)
    return () => this.changeObservers.delete(observer)
  }

  /**
  /**
   * Runs `write`, a change someone else makes, such as a page the reader worker loaded or a
   * collaborator's arriving, outside every edit in progress: the recorders open now do not see
   * it, so none records it as its own. A recorder opened while the write runs is not paused.
   */
  runOutsideEdits<T>(write: () => T): T {
    const paused = [...this.changeObservers]
    for (const observer of paused) this.changeObservers.delete(observer)
    try {
      return write()
    } finally {
      for (const observer of paused) this.changeObservers.add(observer)
    }
  }

  /**
   * Waits for `promise`, such as a font or an image download an edit needs, outside the edit in
   * progress: what changes meanwhile, such as the user's or a collaborator's edit, is not recorded
   * as the waiting edit's. Only for code that writes nothing itself until the wait ends.
   */
  async waitOutsideEdit<T>(promise: Promise<T>): Promise<T> {
    // A wait pauses the recorders open when it starts, and only those: a recorder opened by a
    // later edit carries its own waits.
    const waiting = [...this.changeObservers]
    for (const observer of waiting) {
      const waits = this.outsideWaits.get(observer) ?? 0
      if (waits === 0) observer.pause?.()
      this.outsideWaits.set(observer, waits + 1)
    }
    try {
      return await promise
    } finally {
      for (const observer of waiting) {
        const waits = (this.outsideWaits.get(observer) ?? 1) - 1
        if (waits > 0) {
          this.outsideWaits.set(observer, waits)
          continue
        }
        this.outsideWaits.delete(observer)
        if (this.changeObservers.has(observer)) observer.resume?.()
      }
    }
  }

  /** Tells `observeNodeChanges` observers that `node` is about to change. */
  willChangeNode(node: SceneNode | undefined): void {
    if (!node) return
    for (const observer of this.changeObservers) observer.before(node)
  }

  countDescendants(nodeId: string): number {
    const node = this.nodes.get(nodeId)
    if (!node) return 0
    let count = 0
    const stack = [...node.childIds]
    while (stack.length > 0) {
      const id = stack.pop()
      if (id === undefined) break
      count++
      const child = this.nodes.get(id)
      if (child) {
        for (const childId of child.childIds) {
          stack.push(childId)
        }
      }
    }
    return count
  }
  addVariable(variable: Variable): void {
    Variables.addVariable(this, variable)
  }
  removeVariable(id: string): void {
    Variables.removeVariable(this, id)
  }
  addCollection(collection: VariableCollection): void {
    Variables.addCollection(this, collection)
  }
  createVariable(
    name: string,
    type: VariableType,
    collectionId: string,
    value?: VariableValue
  ): Variable {
    return Variables.createVariable(
      this,
      () => this.generateEntityId(),
      name,
      type,
      collectionId,
      value
    )
  }

  createCollection(name: string): VariableCollection {
    // The collection and its default mode are both created before either is registered.
    const issued = new Set<string>()
    return Variables.createCollection(this, () => this.generateEntityId(issued), name)
  }

  createMode(collectionId: string, name: string, sourceModeId?: string): string | undefined {
    return Variables.createMode(
      this,
      () => this.generateEntityId(),
      collectionId,
      name,
      sourceModeId
    )
  }

  /**
   * Mints IDs from this graph's generator for variables, collections, and modes built outside
   * it, such as a paste's: none is in use, and none repeats one this minter gave.
   */
  entityIdMinter(): () => string {
    const issued = new Set<string>()
    return () => this.generateEntityId(issued)
  }

  removeCollection(id: string): void {
    Variables.removeCollection(this, id)
  }

  getActiveModeId(collectionId: string): string {
    return Variables.getActiveModeId(this, collectionId)
  }

  getNodeVariableModeId(nodeId: string, collectionId: string): string {
    return Variables.getNodeVariableModeId(this, nodeId, collectionId)
  }

  setActiveMode(collectionId: string, modeId: string): void {
    Variables.setActiveMode(this, collectionId, modeId)
  }

  addMode(collectionId: string, modeId: string, name: string, sourceMode?: string): void {
    Variables.addMode(this, collectionId, modeId, name, sourceMode)
  }

  removeMode(collectionId: string, modeId: string): void {
    Variables.removeMode(this, collectionId, modeId)
  }

  renameMode(collectionId: string, modeId: string, name: string): void {
    Variables.renameMode(this, collectionId, modeId, name)
  }

  setDefaultMode(collectionId: string, modeId: string): void {
    Variables.setDefaultMode(this, collectionId, modeId)
  }

  resolveVariable(
    variableId: string,
    modeId?: string,
    visited?: Set<string>
  ): VariableLiteral | undefined {
    return Variables.resolveVariable(this, variableId, modeId, visited)
  }

  resolveColorVariable(variableId: string): Color | undefined {
    return Variables.resolveColorVariable(this, variableId)
  }

  resolveNumberVariable(variableId: string): number | undefined {
    return Variables.resolveNumberVariable(this, variableId)
  }

  resolveColorVariableForNode(
    nodeId: string,
    variableId: string,
    fallback?: VariableModeFallback
  ): Color | undefined {
    return Variables.resolveColorVariableForNode(this, nodeId, variableId, fallback)
  }

  resolveNumberVariableForNode(
    nodeId: string,
    variableId: string,
    fallback?: VariableModeFallback
  ): number | undefined {
    return Variables.resolveNumberVariableForNode(this, nodeId, variableId, fallback)
  }

  resolveVariableForNode(
    nodeId: string,
    variableId: string,
    fallback?: VariableModeFallback
  ): VariableLiteral | undefined {
    return Variables.resolveVariableForNode(this, nodeId, variableId, fallback)
  }

  resolveStringVariableForNode(
    nodeId: string,
    variableId: string,
    fallback?: VariableModeFallback
  ): string | undefined {
    return Variables.resolveStringVariableForNode(this, nodeId, variableId, fallback)
  }

  getVariablesForCollection(collectionId: string): Variable[] {
    return Variables.getVariablesForCollection(this, collectionId)
  }

  getVariablesByType(type: VariableType): Variable[] {
    return Variables.getVariablesByType(this, type)
  }

  bindVariable(nodeId: string, field: string, variableId: string): void {
    Variables.bindVariable(this, nodeId, field, variableId)
  }

  unbindVariable(nodeId: string, field: string): void {
    Variables.unbindVariable(this, nodeId, field)
  }

  getChildren(id: string): SceneNode[] {
    const node = this.nodes.get(id)
    if (!node) return []
    return node.childIds
      .map((cid) => this.nodes.get(cid))
      .filter((n): n is SceneNode => n !== undefined)
  }

  isContainer(id: string): boolean {
    const node = this.nodes.get(id)
    return node ? CONTAINER_TYPES.has(node.type) : false
  }

  isDescendant(childId: string, ancestorId: string): boolean {
    return this.closest(childId, (node) => node.id === ancestorId) !== undefined
  }

  /**
   * The node itself or its nearest ancestor that matches. The walk visits at most as many nodes
   * as the graph holds, so a parent cycle in bad data cannot hang it.
   */
  closest(id: string, match: (node: SceneNode) => boolean): SceneNode | undefined {
    let current = this.nodes.get(id)
    for (let steps = 0; current && steps < this.nodes.size; steps++) {
      if (match(current)) return current
      current = current.parentId ? this.nodes.get(current.parentId) : undefined
    }
    return undefined
  }

  /**
   * The page a node is on: the node itself for a page, its nearest page ancestor otherwise, and
   * null for the document root or a node on no page.
   */
  pageOf(id: string): string | null {
    return this.closest(id, (node) => node.type === 'CANVAS')?.id ?? null
  }

  clearAbsPosCache(): void {
    this.absPosCache.clear()
  }

  getAbsolutePosition(id: string): Vector {
    const cached = this.absPosCache.get(id)
    if (cached) return cached

    const node = this.getNode(id)
    if (!node) return { x: 0, y: 0 }

    const result = getAbsolutePosition(node, this)
    this.absPosCache.set(id, result)
    return result
  }

  getAbsoluteBounds(id: string): Rect {
    const pos = this.getAbsolutePosition(id)
    const node = this.nodes.get(id)
    return {
      x: pos.x,
      y: pos.y,
      width: node?.width ?? 0,
      height: node?.height ?? 0
    }
  }
  /**
   * An ID no entity uses; `issued` also excludes IDs handed out earlier in the same creation.
   * A generator that returns more taken IDs than the graph holds must be repeating itself, so
   * it counts as exhausted then; a fixed cap would reject a sequence walking past a large import.
   */
  private generateEntityId(issued?: Set<string>): string {
    let limit = Infinity
    for (let attempt = 0; attempt < limit; attempt++) {
      const id = (this.importedIdGenerator ?? this.idGenerator)()
      if (this.isEntityIdTaken(id) || issued?.has(id)) {
        if (limit === Infinity) limit = this.entityIdCount() + (issued?.size ?? 0) + 1
        continue
      }
      issued?.add(id)
      return id
    }
    throw new Error('The ID generator only returned IDs that are in use')
  }
  private entityIdCount(): number {
    let count = this.nodes.size + this.variables.size + this.variableCollections.size
    for (const collection of this.variableCollections.values()) count += collection.modes.length
    return count
  }
  /** Whether a node, variable, collection, or mode has this id. */
  isEntityIdTaken(id: string): boolean {
    if (this.nodes.has(id) || this.variables.has(id) || this.variableCollections.has(id))
      return true
    // Callers replace collection maps and edit `modes` in place (history snapshots, transfer,
    // undo), so an index of mode IDs would go stale; walk them without allocating instead.
    for (const collection of this.variableCollections.values()) {
      for (const mode of collection.modes) if (mode.modeId === id) return true
    }
    return false
  }
  private indexInstance(componentId: string, instanceId: string): void {
    let set = this.instanceIndex.get(componentId)
    if (!set) {
      set = new Set()
      this.instanceIndex.set(componentId, set)
    }
    set.add(instanceId)
  }
  private unindexInstance(componentId: string, instanceId: string): void {
    this.instanceIndex.get(componentId)?.delete(instanceId)
  }
  /**
   * The index lists instances by component, so a change of either, such as undoing a detach that
   * turns a frame back into an instance, moves the layer in it.
   */
  private reindexInstance(node: SceneNode, changes: Partial<SceneNode>): void {
    const indexedBefore = node.type === 'INSTANCE' ? node.componentId : null
    const componentAfter =
      'componentId' in changes ? (changes.componentId ?? null) : node.componentId
    const indexedAfter = (changes.type ?? node.type) === 'INSTANCE' ? componentAfter : null
    if (indexedBefore === indexedAfter) return
    if (indexedBefore) this.unindexInstance(indexedBefore, node.id)
    if (indexedAfter) this.indexInstance(indexedAfter, node.id)
  }
  private registerNode(node: SceneNode, parentId: string | null): SceneNode {
    node.parentId = parentId
    this.nodes.set(node.id, node)
    if (node.type === 'CONNECTOR') this.connectorIds.add(node.id)
    for (const observer of this.changeObservers) observer.created(node)
    if (node.type === 'INSTANCE' && node.componentId) this.indexInstance(node.componentId, node.id)
    this.emitter.emit('node:created', node)
    return node
  }
  /** Publish synchronous graph events only after the supplied mutation succeeds. */
  withBufferedEvents<T>(action: () => T): T {
    return this.emitter.batch(action)
  }

  createNode(type: NodeType, parentId: string, overrides: Partial<SceneNode> = {}): SceneNode {
    const parent = this.nodes.get(parentId)
    if (!parent) throw new Error(`Parent "${parentId}" does not exist`)
    const node = createDefaultNode(
      () => this.generateEntityId(),
      type,
      pageLayoutOverrides(type, overrides)
    )
    Object.assign(node, strokeLineChanges(node, overrides))
    this.willChangeNode(parent)
    parent.childIds.push(node.id)
    return this.registerNode(node, parentId)
  }
  createNodeWithId(
    id: string,
    type: NodeType,
    parentId: string | null,
    overrides: Partial<SceneNode> = {}
  ): SceneNode {
    // A caller restoring or importing a layer must know it brings a new one: replacing a layer
    // that already has the ID would drop it, and its children, from the document.
    if (this.nodes.has(id)) throw new Error(`Node "${id}" already exists`)
    if (parentId === id) throw new Error(`Node "${id}" cannot be its own parent`)
    const parent = parentId === null ? undefined : this.nodes.get(parentId)
    if (parentId !== null && !parent) throw new Error(`Parent "${parentId}" does not exist`)
    const node = createDefaultNode(() => id, type, pageLayoutOverrides(type, overrides))
    // `overrides` may be another node's snapshot, ID included.
    node.id = id
    if (parent && !parent.childIds.includes(id)) {
      this.willChangeNode(parent)
      parent.childIds.push(id)
    }
    return this.registerNode(node, parentId)
  }

  private withScope<T>(scope: GraphScope, fn: () => T): T {
    this.scopeDepths[scope]++
    try {
      return fn()
    } finally {
      this.scopeDepths[scope]--
    }
  }

  runPreviewUpdates(fn: () => void, beforeUpdate?: NodePreviewObserver): void {
    if (beforeUpdate) this.previewObservers.push(beforeUpdate)
    try {
      this.withScope('preview', fn)
    } finally {
      if (beforeUpdate) this.previewObservers.pop()
    }
  }
  preserveSourceMetadataDuring<T>(fn: () => T): T {
    return this.withScope('sourceMetadata', fn)
  }
  get isPreservingSourceMetadata(): boolean {
    return this.scopeDepths.sourceMetadata > 0
  }

  /** The edited-field marks added since the last call, which that undo step takes back. */
  takeSourceMarks(): Array<[string, string]> {
    const marks = this.pendingSourceMarks
    this.pendingSourceMarks = []
    return marks
  }

  /** Marks fields as edited again, for redo of a step that marked them. */
  addSourceMarks(id: string, fields: readonly string[]): void {
    const node = this.nodes.get(id)
    if (node) markSourceFieldsEdited(node, [...fields])
  }

  /** Takes back the marks a step added, for undo of that step. */
  removeSourceMarks(id: string, fields: readonly string[]): void {
    const node = this.nodes.get(id)
    if (!node) return
    const removed = new Set(fields)
    const kept = node.source.editedFields.filter((field) => !removed.has(field))
    if (kept.length !== node.source.editedFields.length) node.source.editedFields = kept
  }

  applyImportedStateDuring<T>(fn: () => T, idGenerator?: () => string): T {
    const previousGenerator = this.importedIdGenerator
    this.importedIdGenerator = idGenerator ?? previousGenerator
    try {
      return this.withScope('importedState', () => this.preserveSourceMetadataDuring(fn))
    } finally {
      this.importedIdGenerator = previousGenerator
    }
  }

  get isApplyingImportedState(): boolean {
    return this.scopeDepths.importedState > 0
  }

  /**
   * Lays out what the document already holds: a page as it loads, or again once its fonts
   * arrive. What this writes derives from the document; an edit's own layout is not this.
   */
  applyDerivedLayoutDuring(fn: () => void): void {
    this.withScope('derivedLayout', fn)
  }

  /**
   * Runs `fn` as values a copy takes from its component, such as the bound paints of a layer an
   * instance copies, refreshed for it. Source metadata is preserved, and a save leaves them to the
   * component rather than writing them as edits of the copy.
   */
  applyComponentDerivedDuring(fn: () => void): void {
    this.withScope('componentDerived', () => this.preserveSourceMetadataDuring(fn))
  }

  get isApplyingComponentDerived(): boolean {
    return this.scopeDepths.componentDerived > 0
  }

  get isApplyingDerivedLayout(): boolean {
    return this.scopeDepths.derivedLayout > 0
  }

  /**
   * Runs `fn` as layout. Its updates are published once the outermost layout ends, still as
   * layout, and without values a pass changed and a later pass put back (`LayoutWrites`). Outside
   * derived layout, the positions and sizes it publishes count as edited, so formats save them.
   */
  withLayoutMutations(fn: () => void): void {
    const outermost = this.scopeDepths.layout === 0
    this.scopeDepths.layout++
    if (outermost) this.layoutWrites = new LayoutWrites()
    try {
      fn()
    } finally {
      try {
        if (outermost) this.publishLayoutUpdates()
      } finally {
        this.scopeDepths.layout--
      }
    }
  }

  private publishLayoutUpdates(): void {
    const writes = this.layoutWrites
    this.layoutWrites = null
    if (!writes) return
    for (const [node, changes, edited] of writes.updates((nodeId) => this.nodes.get(nodeId))) {
      markSourceFieldsEdited(node, edited, this.observeSourceMark)
      this.emitter.emit('node:updated', node.id, changes)
    }
  }
  get isApplyingLayout(): boolean {
    return this.scopeDepths.layout > 0
  }
  updateNodePositionPreview(id: string, x: number, y: number): void {
    this.updateNodePreview(id, { x, y })
  }
  updateNodePreview(id: string, changes: Partial<SceneNode>): void {
    const node = this.nodes.get(id)
    if (node) {
      assertPageLayout(node, changes)
      changes = this.impliedChanges(node, finiteGeometry(changes))
    }
    const appliedChanges = updateNodePreview(this, id, changes, (node, applied) => {
      for (const observe of this.previewObservers) observe(node, applied)
    })
    if (appliedChanges) this.emitter.emit('node:previewUpdated', id, appliedChanges)
  }

  /**
   * Writes fields as given. Edits detach the shared styles whose fields they change before
   * they get here (`styleDetachmentChanges`); resolving bindings or loading a file does not.
   */
  updateNode(id: string, changes: Partial<SceneNode>): void {
    if (this.scopeDepths.preview > 0) {
      this.updateNodePreview(id, changes)
      return
    }

    const node = this.nodes.get(id)
    if (!node) return
    const given = finiteGeometry(omitBy(changes, isUndefined))
    assertPageLayout(node, given)
    this.applyNodeChanges(node, this.impliedChanges(node, given))
  }

  /**
   * `changes` with what they also set: a size from outside layout on a generated frame, and
   * strokes and the layer's line fields kept in agreement (`strokeLineChanges`).
   */
  private impliedChanges(node: SceneNode, changes: Partial<SceneNode>): Partial<SceneNode> {
    const sized = this.isApplyingLayout ? changes : withGeneratedFrameSize(node, changes)
    const lines = strokeLineChanges(node, sized)
    return isEmptyObject(lines) ? sized : { ...sized, ...lines }
  }

  /** Replay captured properties without dropping explicit undefined values or absent keys. */
  restoreNodeProperties(
    id: string,
    changes: Partial<SceneNode>,
    absent: readonly (keyof SceneNode)[]
  ): void {
    const node = this.nodes.get(id)
    if (node) this.applyNodeChanges(node, changes, absent)
  }

  private applyNodeChanges(
    node: SceneNode,
    changes: Partial<SceneNode>,
    absent: readonly (keyof SceneNode)[] = []
  ): void {
    const { id } = node
    this.willChangeNode(node)
    // Include removed keys in cache invalidation and update notifications.
    if (absent.length) {
      changes = { ...changes }
      for (const key of absent) Reflect.set(changes, key, undefined)
    }

    // Only clear absPosCache when layout-affecting properties change.
    // Fills, strokes, effects, plugin data changes do NOT affect absolute position.
    const affectsLayout = Object.keys(changes).some((k) => LAYOUT_AFFECTING_KEYS.has(k))
    if (affectsLayout) this.absPosCache.clear()
    this.reindexInstance(node, changes)
    if (node.type === 'TEXT') invalidateTextCaches(node, changes)
    if (this.scopeDepths.sourceMetadata === 0 && !this.isApplyingLayout) {
      markSourceFieldsEdited(node, Object.keys(changes), this.observeSourceMark)
    }
    if (changes.vectorNetwork) {
      changes = { ...changes, vectorNetwork: normalizeVectorNetwork(changes.vectorNetwork) }
    }
    if (changes.effects) {
      changes = { ...changes, effects: normalizeEffects(changes.effects) }
    }
    this.layoutWrites?.record(
      node,
      changes,
      this.scopeDepths.sourceMetadata === 0 && !this.isApplyingDerivedLayout
    )
    Object.assign(node, changes)
    shareEmptyNodeValues(node, Object.keys(changes))
    if (changes.fills) removeStaleBindings(node, 'fills', changes)
    if (changes.strokes) removeStaleBindings(node, 'strokes', changes)
    // A bound paint written keeps what it was given until its variable's color changes.
    if ((changes.fills || changes.strokes) && !this.isApplyingImportedState)
      Variables.recordWrittenBoundPaints(this, node, changes)
    for (const key of absent) Reflect.deleteProperty(node, key)
    this.publishNodeUpdate(id, changes)
  }

  /** Marks fields an edit changed, unless metadata is being restored or layout is writing them. */
  private markEdited(node: SceneNode, keys: string[]): void {
    if (this.scopeDepths.sourceMetadata === 0 && !this.isApplyingLayout) {
      markSourceFieldsEdited(node, keys, this.observeSourceMark)
    }
  }

  /** Publishes an update now, or leaves it to the running layout, which publishes once it ends. */
  private publishNodeUpdate(id: string, changes: Partial<SceneNode>): void {
    if (!this.layoutWrites) this.emitter.emit('node:updated', id, changes)
  }

  /** Whether moving `node` under `parentId` would put an instance inside the component it draws. */
  private movesIntoInstanceOutsideSlot(parentId: string): boolean {
    let current = this.nodes.get(parentId)
    while (current) {
      if (slotPropertyId(current)) return false
      if (current.type === 'INSTANCE') return true
      current = current.parentId ? this.nodes.get(current.parentId) : undefined
    }
    return false
  }

  private movesInstanceIntoItsComponent(node: SceneNode, parentId: string): boolean {
    const stack = [node]
    while (stack.length > 0) {
      const current = stack.pop()
      if (!current) continue
      const componentId = current.componentId
      if (componentId && this.closest(parentId, (candidate) => candidate.id === componentId))
        return true
      for (const childId of current.childIds) {
        const child = this.nodes.get(childId)
        if (child) stack.push(child)
      }
    }
    return false
  }

  reparentNode(nodeId: string, newParentId: string): void {
    const node = this.nodes.get(nodeId)
    if (!node || nodeId === this.rootId) return
    // A page is never a layer: it holds the document's layers and cannot move inside one.
    if (node.type === 'CANVAS') return
    if (this.isDescendant(newParentId, nodeId)) return

    const oldParent = node.parentId ? this.nodes.get(node.parentId) : undefined
    const newParent = this.nodes.get(newParentId)
    if (!newParent) return
    if (node.parentId === newParentId) return

    // An instance inside the component it draws would sync itself forever, so Figma keeps it
    // out: the move is refused, as a move into the layer's own subtree is.
    if (this.movesInstanceIntoItsComponent(node, newParentId)) return
    // An instance's contents are its component's copies; only a slot takes the document's own
    // layers, so a layer moved anywhere else inside one would have nothing to correspond to.
    if (this.movesIntoInstanceOutsideSlot(newParentId)) return

    const oldParentId = node.parentId
    this.willChangeNode(node)
    this.willChangeNode(oldParent)
    this.willChangeNode(newParent)
    this.absPosCache.clear()

    const oldParentWorld = getParentWorldMatrix(oldParent, this)
    const newParentWorld = getParentWorldMatrix(newParent, this)

    if (oldParent) {
      oldParent.childIds = oldParent.childIds.filter((cid) => cid !== nodeId)
    }

    node.parentId = newParentId
    newParent.childIds.push(nodeId)

    const before = pick(node, TRANSFORM_FIELDS)
    if (isTranslationOnly(oldParentWorld) && isTranslationOnly(newParentWorld)) {
      node.x += oldParentWorld[2] - newParentWorld[2]
      node.y += oldParentWorld[5] - newParentWorld[5]
    } else {
      const world = Matrix.multiply(oldParentWorld, getNodeLocalMatrix(node))
      const local = localTransformFromWorld(node, world, newParentWorld)
      if (local) Object.assign(node, local)
    }
    // The node keeps its place on the canvas by new coordinates, which a save must write.
    this.markEdited(
      node,
      TRANSFORM_FIELDS.filter((key) => node[key] !== before[key])
    )

    this.emitter.emit('node:reparented', nodeId, oldParentId, newParentId)
    // Bound paints show their variables in the modes the layer now sits in.
    Variables.refreshMovedBoundPaints(this, nodeId, oldParentId)
  }

  /**
   * Moves a node to `index` among `parentId`'s children, from wherever it was, without changing
   * its own coordinates. An index past the end appends; a move into the node itself or one of
   * its descendants is ignored.
   */
  insertChildAt(childId: string, parentId: string, index: number): void {
    const node = this.nodes.get(childId)
    const newParent = this.nodes.get(parentId)
    if (!node || !newParent || this.isDescendant(parentId, childId)) return
    const previousParentId = node.parentId
    const oldParent = previousParentId ? this.nodes.get(previousParentId) : undefined
    this.willChangeNode(node)
    this.willChangeNode(oldParent)
    this.willChangeNode(newParent)
    if (oldParent) {
      oldParent.childIds = oldParent.childIds.filter((id) => id !== childId)
    }
    newParent.childIds = newParent.childIds.filter((id) => id !== childId)
    const at = Math.min(index, newParent.childIds.length)
    newParent.childIds.splice(at, 0, childId)
    node.parentId = parentId
    this.absPosCache.clear()
    this.emitter.emit('node:reordered', childId, parentId, at, previousParentId)
    if (previousParentId !== parentId)
      Variables.refreshMovedBoundPaints(this, childId, previousParentId)
  }

  deleteNode(id: string): void {
    const node = this.nodes.get(id)
    if (!node || id === this.rootId) return
    this.willChangeNode(node)

    if (node.parentId) {
      const parent = this.nodes.get(node.parentId)
      this.willChangeNode(parent)
      if (parent) {
        parent.childIds = parent.childIds.filter((cid) => cid !== id)
      }
    }

    for (const childId of Array.from(node.childIds)) {
      this.deleteNode(childId)
    }

    if (node.type === 'INSTANCE' && node.componentId) this.unindexInstance(node.componentId, id)
    // An override names a layer of its instance: one left naming a deleted layer would be written
    // as a claim for nothing, and reopening would restore a layer the document no longer has.
    for (let owner = node.parentId ? this.nodes.get(node.parentId) : undefined; owner;) {
      if (owner.type === 'INSTANCE') owner.instanceOverrides.descendants.delete(id)
      owner = owner.parentId ? this.nodes.get(owner.parentId) : undefined
    }
    this.connectorIds.delete(id)
    this.nodes.delete(id)
    this.emitter.emit('node:deleted', id, node.parentId)
  }

  hitTest(px: number, py: number, scopeId?: string): SceneNode | null {
    return HitTest.hitTest(this, px, py, scopeId)
  }

  /** `pad`, in canvas units, grows each shape's box, as Figma takes clicks just outside one. */
  hitTestDeep(px: number, py: number, scopeId?: string, pad = 0): SceneNode | null {
    return HitTest.hitTestDeep(this, px, py, scopeId, pad)
  }

  /**
   * The layer a press selects at the point; `locked` hits locked layers too, as a right-click does.
   */
  hitTestSelectable(
    px: number,
    py: number,
    scopeId: string,
    selectedIds: ReadonlySet<string>,
    pad = 0,
    locked = false
  ): SceneNode | null {
    return HitTest.hitTestSelectable(this, px, py, scopeId, selectedIds, pad, locked)
  }

  hitTestOpenContainer(px: number, py: number, scopeId: string): SceneNode | null {
    return HitTest.hitTestOpenContainer(this, px, py, scopeId)
  }

  isOpenContainer(nodeId: string): boolean {
    return HitTest.isOpenContainer(this, nodeId)
  }

  isPointInNode(nodeId: string, px: number, py: number): boolean {
    return HitTest.isPointInNode(this, nodeId, px, py)
  }

  hitTestDropTarget(
    px: number,
    py: number,
    excludeIds: ReadonlySet<string>,
    scopeId?: string,
    options?: HitTest.DropTargetOptions
  ): SceneNode | null {
    return HitTest.hitTestDropTarget(this, px, py, excludeIds, scopeId, options)
  }

  cloneTree(
    sourceId: string,
    parentId: string,
    overrides: Partial<SceneNode> = {}
  ): SceneNode | null {
    const copies = new Map<string, string>()
    const clone = this.cloneSubtree(sourceId, parentId, overrides, copies)
    // A copied instance records the overrides of its own layers, which are the cloned ones.
    Instances.retargetCopiedOverrides(this, copies)
    // A copy placed in other modes than its source shows its bound paints there, as a move does.
    if (clone) Variables.refreshMovedBoundPaints(this, clone.id, this.nodes.get(sourceId)?.parentId)
    return clone
  }

  private cloneSubtree(
    sourceId: string,
    parentId: string,
    overrides: Partial<SceneNode>,
    copies: Map<string, string>
  ): SceneNode | null {
    const src = this.nodes.get(sourceId)
    if (!src) return null

    const props = cloneNodeProps(src, null)
    // Null out Figma source identifiers so the clone is treated as local.
    if (props.source) props.source = { ...props.source, id: null, orderKey: null }
    // A copy is a new design nobody has reviewed: Figma's duplicate and clone() drop the status.
    props.status = null
    const clone = this.createNode(src.type, parentId, { ...props, ...overrides })
    Variables.copyAppliedBoundPaints(src, clone)
    copies.set(src.id, clone.id)
    if (src.status) markSourceFieldsEdited(clone, ['status'])

    for (const childId of src.childIds) {
      this.cloneSubtree(childId, clone.id, {}, copies)
    }

    return clone
  }

  createInstance(
    componentId: string,
    parentId: string,
    overrides: Partial<SceneNode> = {}
  ): SceneNode | null {
    return Instances.createInstance(this, componentId, parentId, overrides)
  }

  populateInstanceChildren(
    instanceId: string,
    componentId: string,
    mode: NodeCloneMode = 'deep'
  ): void {
    Instances.populateInstanceChildren(this, instanceId, componentId, mode)
  }

  swapInstanceComponent(
    instanceId: string,
    componentId: string,
    options?: Instances.SwapInstanceOptions
  ): void {
    Instances.swapInstanceComponent(this, instanceId, componentId, options)
  }

  syncInstances(componentId: string): void {
    Instances.syncInstances(this, componentId)
  }

  syncInstancesTogether(componentIds: Iterable<string>): void {
    Instances.syncInstancesTogether(this, componentIds)
  }

  syncInstance(instanceId: string): void {
    Instances.syncInstance(this, instanceId)
  }

  detachInstance(instanceId: string): void {
    Instances.detachInstance(this, instanceId)
  }

  getMainComponent(instanceId: string): SceneNode | undefined {
    return Instances.getMainComponent(this, instanceId)
  }

  getInstances(componentId: string): SceneNode[] {
    return Instances.getInstances(this, componentId)
  }

  /**
   * The descendants of a layer in depth-first order with their depths. Each layer with children is
   * walked once, so a cycle or repeated links in bad data cannot hang it or repeat its subtree.
   */
  flattenTree(parentId?: string, depth = 0): Array<{ node: SceneNode; depth: number }> {
    const id = parentId ?? this.rootId
    const parent = this.nodes.get(id)
    if (!parent) return []
    const result: Array<{ node: SceneNode; depth: number }> = []
    const pending = [{ node: parent, depth, index: 0 }]
    const walked = new Set([parent])
    while (pending.length > 0) {
      const frame = pending.at(-1)
      if (!frame) break
      if (frame.index >= frame.node.childIds.length) {
        pending.pop()
        continue
      }
      const child = this.nodes.get(frame.node.childIds[frame.index++])
      if (!child) continue
      const container = child.childIds.length > 0
      if (container && walked.has(child)) continue
      result.push({ node: child, depth: frame.depth })
      if (container) {
        walked.add(child)
        pending.push({ node: child, depth: frame.depth + 1, index: 0 })
      }
    }
    return result
  }
}
