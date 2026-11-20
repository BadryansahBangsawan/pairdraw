import type { SceneGraph, Variable, VariableValue } from '@pairdraw/scene-graph'
import { colorToHex8 } from '@pairdraw/scene-graph/color'

import {
  defaultTokenImportOptions,
  planTokenImport,
  type PlannedValue,
  type TokenImportPlan
} from '#core/io/formats/design-tokens/plan'
import { plannedValue } from '#core/io/formats/design-tokens/plan/changes'
import type { DesignTokenBundle } from '#core/io/formats/design-tokens/read'

/** What linked code held at the last sync: a value signature by variable id and mode id. */
export type TokenSnapshot = Readonly<Record<string, Readonly<Record<string, string>>>>

/**
 * How a token differs between linked code and the canvas, against what the code held at the last
 * sync: changed in code only, on the canvas only, on both, new in code, or no longer in code.
 */
export type TokenDriftKind = 'code' | 'canvas' | 'conflict' | 'added' | 'missing'

export interface TokenDrift {
  kind: TokenDriftKind
  collection: string
  variable: string
  /** Null for a variable the code adds. */
  variableId: string | null
  /** Null where the whole variable is added or gone. */
  mode: string | null
  modeId: string | null
  /** The value as the code writes it, for people to read. */
  code?: string
  /** The value the canvas holds, for people to read. */
  canvas?: string
}

export interface TokenSync {
  /** In the order of the code's files, collections, and tokens; tokens gone from code last. */
  drift: TokenDrift[]
  /**
   * The imports that bring the code in, one per file, to apply in order: changes made only in
   * code and tokens new in code always, a value changed on the canvas or on both sides only where
   * `useCode` picks the code. Values that already match are left alone, and nothing is deleted.
   */
  importPlans(useCode?: (drift: TokenDrift) => boolean): TokenImportPlan[]
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

function positionKey(collection: number, variable: number, mode: number): string {
  return `${collection}:${variable}:${mode}`
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

interface BundleSync {
  drift: TokenDrift[]
  inCode: Set<string>
  importPlan(useCode: (drift: TokenDrift) => boolean): TokenImportPlan
}

function planBundleSync(
  graph: SceneGraph,
  bundle: DesignTokenBundle,
  snapshot: TokenSnapshot | undefined
): BundleSync {
  const plan = syncPlan(graph, bundle)
  const drift: TokenDrift[] = []
  const decisions = new Map<string, TokenDrift>()
  const inCode = new Set<string>()

  plan.collections.forEach((collection, c) => {
    collection.variables.forEach((planned, v) => {
      const variable = planned.existingId ? graph.variables.get(planned.existingId) : undefined
      if (!variable) {
        const at = planned.values.findIndex((value) => value !== undefined)
        const first = planned.values[at]
        drift.push({
          kind: 'added',
          collection: collection.name,
          variable: planned.name,
          variableId: null,
          mode: null,
          modeId: null,
          code: first && describeCode(graph, plan, first, planned.expressions[at])
        })
        return
      }
      inCode.add(variable.id)
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
          drift.push({ ...entry, kind: 'added', modeId: null })
          return
        }
        const { modeId } = target
        const code = codeSignature(plan, value, expression)
        const canvasExpression = variable.expressions?.[modeId]?.css
        const current = variable.valuesByMode[modeId]
        const canvas = tokenValueSignature(current, canvasExpression)
        if (code === canvas) return
        const found: TokenDrift = {
          ...entry,
          kind: driftKind(snapshot?.[variable.id]?.[modeId], code, canvas),
          modeId,
          canvas: describeValue(graph, current, canvasExpression)
        }
        drift.push(found)
        decisions.set(positionKey(c, v, m), found)
      })
    })
  })

  return {
    drift,
    inCode,
    importPlan(useCode) {
      const next = structuredClone(plan)
      next.collections.forEach((collection, c) => {
        collection.variables.forEach((planned, v) => {
          const variable = planned.existingId ? graph.variables.get(planned.existingId) : undefined
          if (!variable) return
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
      return next
    }
  }
}

/**
 * Compares linked code, read into one token bundle per file, with the canvas, and plans bringing
 * it in. Collections and modes match by name and variables by name within them, as an import
 * does. Without a snapshot nobody knows which side changed, so every difference is a conflict.
 */
export function planTokenSync(
  graph: SceneGraph,
  bundles: readonly DesignTokenBundle[],
  snapshot?: TokenSnapshot
): TokenSync {
  const syncs = bundles.map((bundle) => planBundleSync(graph, bundle, snapshot))
  const drift = syncs.flatMap((sync) => sync.drift)
  for (const variableId of Object.keys(snapshot ?? {})) {
    const variable = graph.variables.get(variableId)
    if (variable && !syncs.some((sync) => sync.inCode.has(variableId)))
      drift.push(missingDrift(graph, variable))
  }
  return {
    drift,
    importPlans: (useCode = () => false) => syncs.map((sync) => sync.importPlan(useCode))
  }
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

/** What the code holds now for the variables it matches, to compare later syncs against. */
export function tokenSnapshot(
  graph: SceneGraph,
  bundles: readonly DesignTokenBundle[]
): TokenSnapshot {
  const snapshot: Record<string, Record<string, string>> = {}
  for (const plan of bundles.map((bundle) => syncPlan(graph, bundle))) {
    for (const collection of plan.collections) {
      for (const planned of collection.variables) {
        if (!planned.existingId) continue
        const modes: Record<string, string> = {}
        planned.values.forEach((value, m) => {
          const target = collection.modes.at(m)?.target
          if (!value || target?.kind !== 'existing') return
          modes[target.modeId] = codeSignature(plan, value, planned.expressions[m])
        })
        snapshot[planned.existingId] = modes
      }
    }
  }
  return snapshot
}
