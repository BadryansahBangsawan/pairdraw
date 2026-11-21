import { compact } from 'es-toolkit/array'
import { isEmptyObject } from 'es-toolkit/predicate'

import type { SceneGraph, Variable, VariableValue } from '@pairdraw/scene-graph'
import { colorToHex8 } from '@pairdraw/scene-graph/color'
import type { TokenSource } from '@pairdraw/scene-graph/token-sources'

import {
  defaultTokenImportOptions,
  planTokenImport,
  type PlannedValue,
  type TokenImportPlan
} from '#core/io/formats/design-tokens/plan'
import { plannedValue } from '#core/io/formats/design-tokens/plan/changes'
import type { DesignTokenBundle } from '#core/io/formats/design-tokens/read'

/** What linked code held at the last sync, and the token each variable then was. */
export type TokenSyncBase = Pick<TokenSource, 'snapshot' | 'names'>

/**
 * How a token differs between linked code and the canvas, against what the code held at the last
 * sync: changed in code only, on the canvas only, on both, new in code, no longer in code, or
 * deleted on the canvas while the code still has it.
 */
export type TokenDriftKind = 'code' | 'canvas' | 'conflict' | 'added' | 'missing' | 'deleted'

export interface TokenDrift {
  kind: TokenDriftKind
  collection: string
  variable: string
  /** Null for a variable the code adds; a deleted variable keeps the id it had. */
  variableId: string | null
  /** Null where the whole variable is added, gone, or deleted. */
  mode: string | null
  modeId: string | null
  /** The value as the code writes it, for people to read. */
  code?: string
  /** The value the canvas holds, for people to read. */
  canvas?: string
}

/** Which side a person keeps for a token that changed on the canvas, on both, or left the code. */
export type TokenSyncChoice = 'code' | 'canvas'

export interface TokenSyncResolution {
  /**
   * The imports that bring the code in, one per file, to apply in order. Values that already
   * match are left alone, and nothing is deleted: a token gone from code keeps its variable.
   */
  plans: TokenImportPlan[]
  /** How many tokens the imports write: those changed or added only in code, and those chosen. */
  applied: number
  /** Drift nobody chose a side for, which the next sync reports again. */
  undecided: TokenDrift[]
}

export interface TokenSync {
  /** In the order of the code's files, collections, and tokens; tokens gone from code last. */
  drift: TokenDrift[]
  /**
   * Changes made only in code and tokens new in code always come in. A token changed or deleted
   * on the canvas, or changed on both sides, takes the code only where `choose` picks the code;
   * one gone from code stops being reported once a side is picked for it.
   */
  resolve(choose?: (drift: TokenDrift) => TokenSyncChoice | undefined): TokenSyncResolution
}

/** Drift a person decides: the canvas changed or deleted the token, or both sides changed it. */
export function driftNeedsChoice(drift: TokenDrift): boolean {
  return drift.kind === 'canvas' || drift.kind === 'conflict' || drift.kind === 'deleted'
}

/** Drift that needs nobody's choice: the code changed alone, or added the token. */
function followsCode(drift: TokenDrift): boolean {
  return drift.kind === 'code' || drift.kind === 'added'
}

function roundNumber(value: number): number {
  // `.fig` stores numbers as float32, so a saved 0.1 must still read as 0.1.
  return Math.round(value * 1e4) / 1e4
}

/**
 * A value as sync compares it: colors to 8-bit channels, numbers to four decimals, aliases by
 * target, and a CSS expression by its text, whatever number an engine computed for it.
 */
export function tokenValueSignature(value: VariableValue | undefined, expression?: string): string {
  if (expression) return `=${expression.replaceAll(/\s+/g, ' ').trim()}`
  if (value === undefined) return ''
  if (typeof value === 'number') return String(roundNumber(value))
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'boolean') return String(value)
  if ('aliasId' in value) return `@${value.aliasId}`
  if ('r' in value) return colorToHex8(value)
  return JSON.stringify(value)
}

function describeValue(
  graph: SceneGraph,
  value: VariableValue | undefined,
  expression?: string
): string {
  if (expression) return expression
  if (value === undefined) return ''
  if (typeof value === 'number') return String(roundNumber(value))
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return String(value)
  if ('aliasId' in value) return `{${graph.variables.get(value.aliasId)?.name ?? value.aliasId}}`
  if ('r' in value) return colorToHex8(value)
  return JSON.stringify(value)
}

/** The code's value for a planned mode, with an alias to a variable the import adds named. */
function codeValue(plan: TokenImportPlan, value: PlannedValue) {
  const resolved = plannedValue(plan, value)
  if (resolved !== undefined || value.kind !== 'alias' || value.target.kind !== 'planned')
    return { value: resolved }
  const { collection, variable } = value.target
  return { value: undefined, added: plan.collections[collection]?.variables[variable]?.name }
}

function codeSignature(plan: TokenImportPlan, value: PlannedValue, expression?: string) {
  const code = codeValue(plan, value)
  return code.added === undefined ? tokenValueSignature(code.value, expression) : `@+${code.added}`
}

function describeCode(
  graph: SceneGraph,
  plan: TokenImportPlan,
  value: PlannedValue,
  expression?: string
) {
  const code = codeValue(plan, value)
  return code.added === undefined ? describeValue(graph, code.value, expression) : `{${code.added}}`
}

function positionKey(collection: number, variable: number, mode?: number): string {
  return mode === undefined ? `${collection}:${variable}` : `${collection}:${variable}:${mode}`
}

/** How a sync names a token across syncs: its collection and its name there. */
function tokenKey(collection: string, variable: string): string {
  return `${collection}/${variable}`
}

function syncPlan(graph: SceneGraph, bundle: DesignTokenBundle): TokenImportPlan {
  const options = { ...defaultTokenImportOptions(graph, bundle), styles: false }
  return planTokenImport(graph, bundle, options)
}

function driftKind(base: string | undefined, code: string, canvas: string): TokenDriftKind {
  if (base === canvas) return 'code'
  if (base === code) return 'canvas'
  return 'conflict'
}

/** A variable and mode the code sets, with the code's value as sync compares it. */
interface Position {
  key: string
  variableId: string
  modeId: string
  collection: string
  variable: string
  mode: string
  code: string
  codeText: string
}

/** One file's plan, read once, and what in it never depends on the canvas's values. */
interface PreparedBundle {
  plan: TokenImportPlan
  positions: Position[]
  /** Variables and modes the code adds, by plan position for whole variables. */
  added: Array<{ drift: TokenDrift; at?: string }>
  inCode: Set<string>
  /** Token names the file declares, in any collection. */
  names: Set<string>
}

function prepareBundle(graph: SceneGraph, bundle: DesignTokenBundle): PreparedBundle {
  const plan = syncPlan(graph, bundle)
  const prepared: PreparedBundle = {
    plan,
    positions: [],
    added: [],
    inCode: new Set(),
    names: new Set()
  }
  plan.collections.forEach((collection, c) => {
    collection.variables.forEach((planned, v) => {
      prepared.names.add(planned.name)
      const variable = planned.existingId ? graph.variables.get(planned.existingId) : undefined
      if (!variable) {
        const at = planned.values.findIndex((value) => value !== undefined)
        const first = planned.values.at(at)
        prepared.added.push({
          at: positionKey(c, v),
          drift: {
            kind: 'added',
            collection: collection.name,
            variable: planned.name,
            variableId: null,
            mode: null,
            modeId: null,
            code: first && describeCode(graph, plan, first, planned.expressions[at])
          }
        })
        return
      }
      prepared.inCode.add(variable.id)
      planned.values.forEach((value, m) => {
        const target = collection.modes.at(m)?.target
        if (!value || !target) return
        const expression = planned.expressions[m]
        const entry = {
          collection: collection.name,
          variable: variable.name,
          variableId: variable.id,
          mode: collection.modes[m].name,
          code: describeCode(graph, plan, value, expression)
        }
        if (target.kind === 'new') {
          prepared.added.push({ drift: { ...entry, kind: 'added', modeId: null } })
          return
        }
        prepared.positions.push({
          key: positionKey(c, v, m),
          variableId: variable.id,
          modeId: target.modeId,
          collection: collection.name,
          variable: variable.name,
          mode: collection.modes[m].name,
          code: codeSignature(plan, value, expression),
          codeText: entry.code
        })
      })
    })
  })
  return prepared
}

/** The canvas side of a position as sync compares it, recomputed only when its value changed. */
interface CanvasCache {
  get(variable: Variable, modeId: string): { signature: string; text: string }
}

function canvasCache(graph: SceneGraph): CanvasCache {
  const seen = new Map<
    string,
    { value: unknown; css: string | undefined; signature: string; text: string }
  >()
  return {
    get(variable, modeId) {
      const value = variable.valuesByMode[modeId]
      const css = variable.expressions?.[modeId]?.css
      const key = `${variable.id}:${modeId}`
      const cached = seen.get(key)
      // Values are replaced, not edited in place, so the same value means nothing changed. A
      // value that is missing (undefined) is cached as such, so the entry must exist to match.
      if (cached && seen.has(key) && cached.value === value && cached.css === css) return cached
      const entry = {
        value,
        css,
        signature: tokenValueSignature(value, css),
        text: describeValue(graph, value, css)
      }
      seen.set(key, entry)
      return entry
    }
  }
}

/** The id a deleted variable had, where the last sync recorded the token under this name. */
function deletedIds(graph: SceneGraph, base: TokenSyncBase | undefined): Map<string, string> {
  const ids = new Map<string, string>()
  for (const [id, key] of Object.entries(base?.names ?? {}))
    if (!graph.variables.has(id)) ids.set(key, id)
  return ids
}

interface Classified {
  drift: TokenDrift[]
  /** Drift by plan position, for the import that follows. */
  decisions: Map<string, TokenDrift>
}

function classifyBundle(
  graph: SceneGraph,
  prepared: PreparedBundle,
  base: TokenSyncBase | undefined,
  canvas: CanvasCache
): Classified {
  const drift: TokenDrift[] = []
  const decisions = new Map<string, TokenDrift>()
  const deleted = deletedIds(graph, base)
  for (const { drift: entry, at } of prepared.added) {
    const id =
      entry.variableId === null
        ? deleted.get(tokenKey(entry.collection, entry.variable))
        : undefined
    const found: TokenDrift = id ? { ...entry, kind: 'deleted', variableId: id } : entry
    if (at) decisions.set(at, found)
    // Kept deleted at an earlier sync: it stays deleted, and is not reported again.
    if (id && isEmptyObject(base?.snapshot[id] ?? { kept: true })) continue
    drift.push(found)
  }
  for (const position of prepared.positions) {
    const variable = graph.variables.get(position.variableId)
    if (!variable) continue
    const current = canvas.get(variable, position.modeId)
    if (current.signature === position.code) continue
    const found: TokenDrift = {
      kind: driftKind(
        base?.snapshot[position.variableId]?.[position.modeId],
        position.code,
        current.signature
      ),
      collection: position.collection,
      variable: position.variable,
      variableId: position.variableId,
      mode: position.mode,
      modeId: position.modeId,
      code: position.codeText,
      canvas: current.text
    }
    drift.push(found)
    decisions.set(position.key, found)
  }
  return { drift, decisions }
}

/**
 * The import that brings one file in for the decisions made: values that match, or whose canvas
 * side is kept, are left alone, and a variable deleted on the canvas is not made again.
 */
function bundleImport(
  graph: SceneGraph,
  plan: TokenImportPlan,
  decisions: ReadonlyMap<string, TokenDrift>,
  useCode: (drift: TokenDrift) => boolean
): TokenImportPlan {
  const next = structuredClone(plan)
  const dropped = new Set<string>()
  next.collections.forEach((collection, c) => {
    collection.variables.forEach((planned, v) => {
      const variable = planned.existingId ? graph.variables.get(planned.existingId) : undefined
      if (!variable) {
        const decision = decisions.get(positionKey(c, v))
        if (decision?.kind === 'deleted' && !useCode(decision)) dropped.add(positionKey(c, v))
        return
      }
      collection.modes.forEach((mode, m) => {
        if (mode.target.kind !== 'existing') return
        const decision = decisions.get(positionKey(c, v, m))
        if (decision && (decision.kind === 'code' || useCode(decision))) return
        planned.values[m] = undefined
        // A value kept keeps its own expression, which the import writes back as it is.
        planned.expressions[m] = variable.expressions?.[mode.target.modeId]?.css
      })
    })
  })
  return dropped.size > 0 ? withoutVariables(next, dropped) : next
}

/** A plan without some of the variables it adds; aliases to them are left out too. */
function withoutVariables(plan: TokenImportPlan, dropped: ReadonlySet<string>): TokenImportPlan {
  const moved = new Map<string, number>()
  for (const [c, collection] of plan.collections.entries()) {
    let kept = 0
    for (const v of collection.variables.keys())
      if (!dropped.has(positionKey(c, v))) moved.set(positionKey(c, v), kept++)
  }
  for (const [c, collection] of plan.collections.entries()) {
    collection.variables = collection.variables.filter((_, v) => !dropped.has(positionKey(c, v)))
    for (const variable of collection.variables) {
      variable.values = variable.values.map((value) => {
        if (value?.kind !== 'alias' || value.target.kind !== 'planned') return value
        const index = moved.get(positionKey(value.target.collection, value.target.variable))
        return index === undefined
          ? undefined
          : { kind: 'alias', target: { ...value.target, variable: index } }
      })
    }
  }
  return plan
}

/**
 * Compares linked code, read into one token bundle per file, with the canvas, and plans bringing
 * it in. Collections and modes match by name and variables by name within them, as an import
 * does. Without a snapshot nobody knows which side changed, so every difference is a conflict.
 */
export function planTokenSync(
  graph: SceneGraph,
  bundles: readonly DesignTokenBundle[],
  base?: TokenSyncBase
): TokenSync {
  const prepared = bundles.map((bundle) => prepareBundle(graph, bundle))
  const canvas = canvasCache(graph)
  const classified = prepared.map((bundle) => classifyBundle(graph, bundle, base, canvas))
  const drift = [
    ...classified.flatMap((entry) => entry.drift),
    ...goneFromCode(graph, prepared, base)
  ]
  return {
    drift,
    resolve(choose = () => undefined) {
      const choices = new Map(drift.map((entry) => [entry, choose(entry)]))
      const useCode = (entry: TokenDrift) => choices.get(entry) === 'code'
      return {
        plans: prepared.map((bundle, index) =>
          bundleImport(graph, bundle.plan, classified[index].decisions, useCode)
        ),
        applied: drift.filter(
          (entry) => followsCode(entry) || (entry.kind !== 'missing' && useCode(entry))
        ).length,
        undecided: drift.filter((entry) => !followsCode(entry) && !choices.get(entry))
      }
    }
  }
}

/**
 * Variables the last sync took from the code that no file declares now. A token counts as in
 * code when any file declares its name, so light and dark values split across two stylesheets
 * do not make each other's variables look gone.
 */
function goneFromCode(
  graph: SceneGraph,
  prepared: readonly PreparedBundle[],
  base: TokenSyncBase | undefined
): TokenDrift[] {
  const drift: TokenDrift[] = []
  for (const variableId of Object.keys(base?.snapshot ?? {})) {
    const variable = graph.variables.get(variableId)
    if (!variable || prepared.some((bundle) => bundle.inCode.has(variableId))) continue
    if (prepared.some((bundle) => bundle.names.has(variable.name))) continue
    drift.push(missingDrift(graph, variable))
  }
  return drift
}

/**
 * Drift against the canvas as it is whenever asked, for a view that follows edits: the code is
 * read and planned once, and a value unchanged since the last call is not compared again.
 */
export function trackTokenDrift(
  graph: SceneGraph,
  bundles: readonly DesignTokenBundle[],
  base?: TokenSyncBase
): () => TokenDrift[] {
  const prepared = bundles.map((bundle) => prepareBundle(graph, bundle))
  const canvas = canvasCache(graph)
  return () => [
    ...prepared.flatMap((bundle) => classifyBundle(graph, bundle, base, canvas).drift),
    ...goneFromCode(graph, prepared, base)
  ]
}

function missingDrift(graph: SceneGraph, variable: Variable): TokenDrift {
  return {
    kind: 'missing',
    collection: graph.variableCollections.get(variable.collectionId)?.name ?? '',
    variable: variable.name,
    variableId: variable.id,
    mode: null,
    modeId: null
  }
}

type Snapshot = Record<string, Record<string, string>>
type Names = Record<string, string>

/** What the code's plans hold for the variables they match, mode by mode, files adding up. */
function codeSnapshot(plans: readonly TokenImportPlan[], snapshot: Snapshot, names: Names) {
  for (const plan of plans) {
    for (const collection of plan.collections) {
      for (const planned of collection.variables) {
        if (!planned.existingId) continue
        const modes = Object.hasOwn(snapshot, planned.existingId)
          ? snapshot[planned.existingId]
          : {}
        planned.values.forEach((value, m) => {
          const target = collection.modes.at(m)?.target
          if (!value || target?.kind !== 'existing') return
          modes[target.modeId] = codeSignature(plan, value, planned.expressions[m])
        })
        snapshot[planned.existingId] = modes
        names[planned.existingId] = tokenKey(collection.name, planned.name)
      }
    }
  }
}

/**
 * A variable deleted on the canvas that the code still has stays recorded: with its last values
 * while nobody decided, and with none once it was kept deleted, so it is not made again.
 */
function keepDeleted(
  graph: SceneGraph,
  plans: readonly TokenImportPlan[],
  previous: TokenSyncBase,
  waiting: ReadonlySet<string>,
  record: { snapshot: Snapshot; names: Names }
) {
  const declared = new Set(
    plans.flatMap((plan) =>
      plan.collections.flatMap((collection) =>
        collection.variables.map((planned) => tokenKey(collection.name, planned.name))
      )
    )
  )
  const current = new Set(Object.values(record.names))
  for (const [id, key] of Object.entries(previous.names ?? {})) {
    if (graph.variables.has(id) || current.has(key) || !declared.has(key)) continue
    record.names[id] = key
    record.snapshot[id] =
      waiting.has(id) && Object.hasOwn(previous.snapshot, id) ? { ...previous.snapshot[id] } : {}
  }
}

/** Drift left undecided keeps what the last sync recorded for it. */
function keepUndecided(
  previous: TokenSyncBase,
  undecided: readonly TokenDrift[],
  record: { snapshot: Snapshot; names: Names }
) {
  const before = previous.snapshot
  for (const { variableId, modeId } of undecided) {
    if (!variableId) continue
    const kept = Object.hasOwn(before, variableId) ? before[variableId] : undefined
    if (!modeId) {
      // Gone from code or deleted on the canvas: it stays recorded, and so stays reported.
      if (kept) record.snapshot[variableId] = { ...kept }
      const name = previous.names?.[variableId]
      if (name) record.names[variableId] = name
      continue
    }
    const modes = Object.hasOwn(record.snapshot, variableId) ? record.snapshot[variableId] : {}
    if (kept && Object.hasOwn(kept, modeId)) modes[modeId] = kept[modeId]
    else Reflect.deleteProperty(modes, modeId)
    record.snapshot[variableId] = modes
  }
}

/**
 * What the code holds now for the variables it matches, and the token each one is, to compare
 * later syncs against. Files that set different modes of one variable add up. Drift left
 * undecided keeps what `previous` had, so the next sync still sees both changes.
 */
export function tokenSnapshot(
  graph: SceneGraph,
  bundles: readonly DesignTokenBundle[],
  previous: TokenSyncBase = { snapshot: {} },
  undecided: readonly TokenDrift[] = []
): Required<TokenSyncBase> {
  const record = { snapshot: {} as Snapshot, names: {} as Names }
  const plans = bundles.map((bundle) => syncPlan(graph, bundle))
  codeSnapshot(plans, record.snapshot, record.names)
  const waiting = new Set(compact(undecided.map((entry) => entry.variableId)))
  keepDeleted(graph, plans, previous, waiting, record)
  keepUndecided(previous, undecided, record)
  return record
}
