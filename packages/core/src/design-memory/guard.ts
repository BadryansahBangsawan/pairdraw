import { isEqual } from 'es-toolkit'

import type { SceneGraph, SceneNode, Variable } from '@pairdraw/scene-graph'
import {
  cachedDesignMemory,
  DESIGN_MEMORY_GROUPS,
  type DesignMemory
} from '@pairdraw/scene-graph/design-memory'

import type { FieldChanges } from '#core/editor/history/diff'
import type { DocumentChange } from '#core/editor/history/document-change'
import type { ToolDef } from '#core/tools/schema'

import { checkDesignEdit, type DesignEdit, type DesignViolation } from './check'
import { currentDesignRules } from './document'
import { describeDesignWarnings, DesignMemoryRefusalError, MEMORY_CHANGE_REFUSED } from './refusal'

/**
 * Checks one agent call's edit against the document's design memory, at the moment the edit is
 * recorded, so a refused edit is put back before anyone sees it.
 */
export interface DesignGuard {
  /** For an edit recorded as a document change. */
  verifyChange: (change: DocumentChange) => Error | null
  /** For an atomic tool's property transaction. */
  verifyFields: (
    nodes: readonly FieldChanges<SceneNode>[],
    variables?: readonly FieldChanges<Variable>[]
  ) => Error | null
  /**
   * The call's result with what the memory warned about, and any refusal the edit could not be
   * put back for, as `design_memory`; the result itself when there was none.
   */
  annotate: (result: unknown) => unknown
  /** What the memory warned about, or null when nothing; `annotate` attaches the same. */
  report: () => DesignMemoryWarnings | null
}

/** The warnings a call that went through carries. */
export interface DesignMemoryWarnings {
  warnings: string
  violations: DesignViolation[]
}

/** How a call answers to the memory: an agent's is refused, a person's only warned. */
export type DesignMemoryMode = 'refuse' | 'warn'

/**
 * The changes an agent may make to the memory itself: append decisions of its own and pin or
 * unpin examples. What the memory allows, how it is enforced, and the person's decisions stay.
 */
function permittedMemoryChange(before: DesignMemory | null, after: DesignMemory | null): boolean {
  if (before === after) return true
  if (!before || !after) return false
  if (!DESIGN_MEMORY_GROUPS.every((group) => isEqual(before[group], after[group]))) return false
  const kept = before.decisions.every((decision, index) =>
    isEqual(decision, after.decisions[index])
  )
  const added = after.decisions.slice(before.decisions.length)
  return kept && added.every((decision) => decision.author === 'agent')
}

/** What a guard knows about the call it watches. */
export interface DesignGuardOptions {
  /** The tool's `content`: `imported` only warns, `copied` vouches for its source layers. */
  content?: ToolDef['content']
  /** The call's arguments, which name the layers a copying call reads. */
  args?: Record<string, unknown>
  /** `warn` for a call a person made, such as a CLI command, which is never undone. */
  mode?: DesignMemoryMode
}

/** The layers a copying call names: its `id`, `ids`, or `component_id`. */
function copiedSources(args: Record<string, unknown> = {}): string[] {
  return [args.id, args.component_id, ...(Array.isArray(args.ids) ? args.ids : [])].filter(
    (id): id is string => typeof id === 'string'
  )
}

/**
 * A guard for one call, made just before it runs: it keeps the memory and its rules as they are
 * then, so nothing the call does, to the memory or to the variables and styles, changes what it
 * is judged by. A person's call (`mode: 'warn'`) is never undone and may change the memory.
 */
export function createDesignGuard(
  graph: SceneGraph,
  options: DesignGuardOptions = {}
): DesignGuard {
  const person = options.mode === 'warn'
  const before = cachedDesignMemory(graph)
  const rules = before ? currentDesignRules(graph, before) : null
  const checkOptions = {
    warnOnly: options.content === 'imported' || person,
    rules: rules ?? undefined,
    copiedFrom:
      options.content === 'copied' || options.content === 'merged'
        ? copiedSources(options.args)
        : undefined,
    merged: options.content === 'merged'
  }
  const warnings: DesignViolation[] = []
  let refused: DesignViolation[] = []

  const verify = (edit: DesignEdit): Error | null => {
    if (!person && !permittedMemoryChange(before, cachedDesignMemory(graph)))
      return new DesignMemoryRefusalError([], rules ?? undefined, MEMORY_CHANGE_REFUSED)
    if (!before) return null
    const findings = checkDesignEdit(graph, edit, checkOptions)
    if (!findings) return null
    warnings.push(...findings.warnings)
    refused = findings.refused
    return refused.length > 0 ? new DesignMemoryRefusalError(refused, rules ?? undefined) : null
  }

  /**
   * What the memory warned about. A call that returned normally kept its changes, so a refusal
   * recorded on the way could not put it back, as when someone else wrote to the document.
   */
  const report = (): DesignMemoryWarnings | null => {
    const kept = refused
    if (warnings.length === 0 && kept.length === 0) return null
    const violations = [
      ...kept.map((violation) => ({ ...violation, severity: 'warn' as const })),
      ...warnings
    ]
    const note = kept.length
      ? 'The edit broke the design memory but could not be undone because the document changed meanwhile; fix these values.\n'
      : ''
    return { warnings: note + describeDesignWarnings(violations, rules ?? undefined), violations }
  }

  return {
    verifyChange: (change) =>
      verify({
        created: change.created,
        updated: change.updated.flatMap((update) => (update.fields ? [update.fields] : [])),
        deleted: change.deleted,
        variables: change.variables.flatMap(({ id, before: previous, after }) =>
          after ? [{ id, before: previous }] : []
        )
      }),
    verifyFields: (nodes, variables = []) =>
      verify({
        created: [],
        updated: nodes,
        variables: variables.map(({ id, before: previous }) => ({ id, before: previous }))
      }),
    report,
    annotate: (result) => {
      const design_memory = report()
      if (!design_memory) return result
      if (result && typeof result === 'object' && !Array.isArray(result))
        return { ...result, design_memory }
      return { result, design_memory }
    }
  }
}
