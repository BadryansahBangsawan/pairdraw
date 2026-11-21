/**
 * Tool definition schema.
 *
 * Native Valibot inputs and execution capabilities are owned by each tool.
 * Adapters consume these contracts rather than maintaining transport-specific schemas.
 */

import * as v from 'valibot'

import type { SceneNode } from '@pairdraw/scene-graph'
import { tryParseColor } from '@pairdraw/scene-graph/color'
import type { Color } from '@pairdraw/scene-graph/primitives'

import type { FigmaAPI, FigmaNodeProxy } from '#core/figma-api'
import type { FigmaFontNameInput } from '#core/figma-api/fonts/names'

export type ToolCapability =
  | 'document:read'
  | 'document:write'
  | 'filesystem:read'
  | 'filesystem:write'
  | 'network:access'
  | 'code:execute'
  | 'settings:read'
  | 'settings:write'

export type ToolExecution =
  | { kind: 'sync'; mutation: 'none' | 'view' | 'properties' | 'document' }
  | {
      kind: 'async'
      mutation: 'none' | 'view' | 'document'
      /**
       * The call can run for a long time even when it only reads, such as recording a video, so
       * bridges give it the deadline they give an edit.
       */
      long?: boolean
    }

export type ToolInterface = 'mcp' | 'ai' | 'webmcp'
export type ToolExposure = Partial<Record<ToolInterface, boolean>>

interface ToolMetadata {
  name: string
  description: string
  execution: ToolExecution
  /** Interface inclusion defaults to true; execution support and user permissions remain separate. */
  exposure: ToolExposure
  capabilities: readonly ToolCapability[]
  availability: 'default' | 'eval'
  /**
   * What a call's values come from, for the document's design memory:
   * - `imported`: outside content, such as a web page, an SVG, a photo or a library component,
   *   whose colors and type are its own, so the memory warns about them rather than refusing;
   * - `copied`: the layers the call names, which it copies or converts with their values, such
   *   as a clone, a group or a boolean, so values those layers already had are not new.
   */
  content?: 'imported' | 'copied'
}

export interface ToolDef extends ToolMetadata {
  input: v.StrictObjectSchema<v.ObjectEntries, undefined>
  /** Derived from execution metadata, never declared independently by a tool. */
  readonly mutates: boolean
  /**
   * Loads the fonts the call's text edits need, as a Figma plugin loads them before it edits
   * text; rejects when one cannot load. Every executor awaits it before `execute`, so a
   * synchronous tool still edits in one step.
   */
  loadFonts: (figma: FigmaAPI, args: Record<string, unknown>) => Promise<void>
  /** `signal` aborts a caller's cancelled request, which a long export checks while it runs. */
  execute: (figma: FigmaAPI, args: Record<string, unknown>, signal?: AbortSignal) => unknown
  /**
   * The synchronous answer of a read whose `execute` may load a page first, or `undefined`
   * when answering would load. Hosts that cannot wait refuse on `undefined` before any load.
   */
  executeSync?: (figma: FigmaAPI, args: Record<string, unknown>) => unknown
}

type ToolDefinitionMetadata = Omit<ToolMetadata, 'exposure' | 'capabilities' | 'availability'> &
  Partial<Pick<ToolMetadata, 'exposure' | 'capabilities' | 'availability'>>

export function defineTool<P extends v.ObjectEntries, R>(
  def: ToolDefinitionMetadata & {
    input: v.StrictObjectSchema<P, undefined>
    execution: ToolExecution & (R extends PromiseLike<unknown> ? { kind: 'async' } : unknown)
    /** The fonts a call's text edits need loaded first; text edits refuse unloaded fonts. */
    fonts?: (
      figma: FigmaAPI,
      args: v.InferOutput<v.StrictObjectSchema<P, undefined>>
    ) => FigmaFontNameInput[]
    execute: (
      figma: FigmaAPI,
      args: v.InferOutput<v.StrictObjectSchema<P, undefined>>,
      signal?: AbortSignal
    ) => R
    executeSync?: (
      figma: FigmaAPI,
      args: v.InferOutput<v.StrictObjectSchema<P, undefined>>
    ) => unknown
  }
): ToolDef {
  const { fonts } = def
  return {
    ...def,
    exposure: def.exposure ?? {},
    capabilities: def.capabilities ?? [
      toolChangesDocument(def) ? 'document:write' : 'document:read'
    ],
    availability: def.availability ?? 'default',
    get mutates() {
      return def.execution.mutation !== 'none'
    },
    async loadFonts(figma, args) {
      if (!fonts) return
      // Wrong arguments are for `execute` to report.
      const parsed = v.safeParse(def.input, args)
      if (!parsed.success) return
      for (const font of fonts(figma, parsed.output)) await figma.loadFontAsync(font)
    },
    execute: (figma, args, signal) =>
      def.execute(figma, parseToolArgs(def.name, def.input, args), signal),
    executeSync: def.executeSync
      ? (figma, args) => def.executeSync?.(figma, parseToolArgs(def.name, def.input, args))
      : undefined
  }
}

/**
 * Every tool run goes through here, so a wrong call from AI chat, the CLI, WebMCP, and MCP names
 * the tool and lists each problem with its argument. An unknown or missing argument names the
 * arguments the tool takes, and a picklist names the values it accepts, read from the schema, so
 * the caller does not have to guess. Inputs are strict objects, so a misspelled or mis-nested
 * argument fails here instead of being dropped.
 */
export function parseToolArgs<S extends v.GenericSchema>(
  name: string,
  schema: S,
  args: unknown
): v.InferOutput<S> {
  const result = v.safeParse(schema, args)
  if (result.success) return result.output
  throw new Error(formatToolArgumentError(name, schema, result.issues))
}

/** One refusal for every surface: the tool, then each problem with where it is. */
function formatToolArgumentError(
  name: string,
  schema: v.GenericSchema,
  issues: readonly v.BaseIssue<unknown>[]
): string {
  const problems = issues
    .flatMap((issue) => branchIssues(schema, issue))
    .map(({ keys, issue }) => {
      const place = keys.length > 0 ? `\n  → at ${placeOf(keys)}` : ''
      return `× ${formatToolArgIssue(schema, keys, issue)}${place}`
    })
  return `Invalid arguments for ${name}:\n${problems.join('\n')}`
}

/** The parts of a Valibot schema this module reads to name what a call should have sent. */
type SchemaParts = {
  readonly entries?: v.ObjectEntries
  readonly item?: v.GenericSchema
  readonly wrapped?: v.GenericSchema
  readonly options?: readonly unknown[]
}

function schemaParts(schema: unknown): SchemaParts {
  return typeof schema === 'object' && schema !== null ? schema : {}
}

/** The schema a wrapper such as `optional` or `pipe` holds, down to the one with the rules. */
function unwrappedSchema(schema: v.GenericSchema): v.GenericSchema {
  let current = schema
  for (;;) {
    const wrapped = schemaParts(current).wrapped
    if (!wrapped) return current
    current = wrapped
  }
}

type ArgumentKey = string | number

function issueKeys(issue: v.BaseIssue<unknown>): ArgumentKey[] {
  const keys: ArgumentKey[] = []
  for (const item of issue.path ?? []) {
    if (!('key' in item)) continue
    if (typeof item.key === 'string' || typeof item.key === 'number') keys.push(item.key)
  }
  return keys
}

/** `operations[0].props`: an index reads as part of its array, a name follows a dot. */
function placeOf(keys: readonly ArgumentKey[]): string {
  return keys.reduce<string>((place, key) => {
    if (typeof key === 'number') return `${place}[${key}]`
    return place ? `${place}.${key}` : key
  }, '')
}

/**
 * `v.union` reports one issue for every branch, which reads as "Expected Object but received
 * Object". Re-check the value against each branch and keep the one that got furthest: the branch
 * whose own problems name the field the caller has to fix.
 */
function branchIssues(
  schema: v.GenericSchema,
  issue: v.BaseIssue<unknown>
): { keys: ArgumentKey[]; issue: v.BaseIssue<unknown> }[] {
  const keys = issueKeys(issue)
  if (issue.type !== 'union') return [{ keys, issue }]
  const union = schemaAtPath(schema, keys)
  const options = union ? schemaParts(union).options : undefined
  if (!options || options.length === 0) return [{ keys, issue }]
  let best: readonly v.BaseIssue<unknown>[] | null = null
  for (const option of options) {
    const parsed = v.safeParse(option as v.GenericSchema, issue.input)
    if (parsed.success) continue
    if (!best || parsed.issues.length < best.length) best = parsed.issues
  }
  if (!best || best.length === 0) return [{ keys, issue }]
  return best.map((nested) => ({ keys: [...keys, ...issueKeys(nested)], issue: nested }))
}

function schemaAtPath(root: v.GenericSchema, keys: readonly ArgumentKey[]): v.GenericSchema | null {
  let current = unwrappedSchema(root)
  for (const key of keys) {
    const parts = schemaParts(current)
    const name = String(key)
    const next = parts.entries && name in parts.entries ? parts.entries[name] : parts.item
    if (!next) return null
    current = unwrappedSchema(next)
  }
  return current
}

function formatToolArgIssue(
  schema: v.GenericSchema,
  keys: readonly ArgumentKey[],
  issue: v.BaseIssue<unknown>
): string {
  const key = keys.at(-1)
  if (key !== undefined && (issue.type === 'object' || issue.type === 'strict_object')) {
    if (issue.expected === 'never') {
      const parent = schemaAtPath(schema, keys.slice(0, -1))
      const accepted = parent ? Object.keys(schemaParts(parent).entries ?? {}) : []
      return accepted.length > 0
        ? `Unknown argument "${key}". Accepted: ${accepted.join(', ')}`
        : `Unknown argument "${key}"`
    }
    if (issue.received === 'undefined') return `Missing required argument "${key}"`
  }
  if (issue.type === 'picklist' && key !== undefined) {
    const resolved = schemaAtPath(schema, keys)
    const options = resolved ? schemaParts(resolved).options : undefined
    if (options && options.length > 0) {
      const accepted = options.map((option) => JSON.stringify(option)).join(', ')
      return `Invalid value ${issue.received} for argument "${key}". Accepted: ${accepted}`
    }
  }
  return issue.message
}

export function toolChangesDocument(def: Pick<ToolDef, 'execution'>): boolean {
  return def.execution.mutation === 'properties' || def.execution.mutation === 'document'
}

export function isToolExposed(def: Pick<ToolDef, 'exposure'>, target: ToolInterface): boolean {
  return def.exposure[target] !== false
}

export function isAtomicTool(def: ToolDef): boolean {
  return def.execution.kind === 'sync' && def.execution.mutation === 'properties'
}

export class NodeNotFoundError extends Error {
  constructor(id: string) {
    super(`Node not found: ${id}`)
    this.name = 'NodeNotFoundError'
  }
}

export function requireNode(figma: FigmaAPI, id: string): ReturnType<FigmaAPI['getNodeById']> {
  const node = figma.getNodeById(id)
  if (!node) throw new NodeNotFoundError(id)
  return node
}

export function requireNodes(figma: FigmaAPI, ids: ReadonlyArray<string>): FigmaNodeProxy[] | null {
  const nodes: FigmaNodeProxy[] = []
  for (const id of ids) {
    const node = figma.getNodeById(id)
    if (!node) return null
    nodes.push(node)
  }
  return nodes
}

/** A tool's answer when the operation it wraps throws: the error's message for the caller. */
export function toolFailure(error: unknown): { error: string } {
  return { error: error instanceof Error ? error.message : String(error) }
}

export function nodeNotFound(id: string): { error: string } {
  return { error: `Node "${id}" not found` }
}

export function getRawNodeOrError(
  figma: FigmaAPI,
  id: string
): { node: SceneNode } | { error: string } {
  const node = figma.graph.getNode(id)
  return node ? { node } : nodeNotFound(id)
}

export function nodeToResult(node: FigmaNodeProxy, maxDepth?: number): Record<string, unknown> {
  return node.toJSON(maxDepth)
}

export function nodeSummary(node: FigmaNodeProxy): { id: string; name: string; type: string } {
  return { id: node.id, name: node.name, type: node.type }
}

/**
 * A tool colour, refusing text that would otherwise land as black: `set_fill { color: "#GGG" }`
 * used to paint black and report success. Read through `tryParseColor`, since a published schema
 * cannot express what the parser accepts.
 */
export function parseToolColor(value: string): Color | { error: string } {
  return (
    tryParseColor(value) ?? {
      error: `"${value}" is not a color; use a hex value, a color name, or a color function`
    }
  )
}

/**
 * A colour the caller may leave out. Missing stays missing; text that is not a colour is the
 * same refusal `parseToolColor` gives, so each tool does not repeat that check.
 */
export function parseOptionalToolColor(
  value: string | undefined
): { color: Color | undefined } | { error: string } {
  if (value === undefined) return { color: undefined }
  const parsed = parseToolColor(value)
  if ('error' in parsed) return parsed
  return { color: parsed }
}

export const nodeIdInputSchema = v.pipe(v.string(), v.description('Node ID'))
export const nodeInputSchema = v.strictObject({ id: nodeIdInputSchema })
export const nodeComparisonInputSchema = v.strictObject({
  from: v.pipe(v.string(), v.description('Source node ID')),
  to: v.pipe(v.string(), v.description('Target node ID'))
})

export function nodeTraversalInput(depthDescription: string) {
  return v.strictObject({
    id: nodeIdInputSchema,
    depth: v.optional(toolNumber(v.pipe(v.number(), v.description(depthDescription))))
  })
}
export const positionInputs = {
  x: toolNumber(v.pipe(v.number(), v.description('X position in the parent, or on the page'))),
  y: toolNumber(v.pipe(v.number(), v.description('Y position in the parent, or on the page')))
}

/** Reuse a native number schema for both numeric and numeric-string agent inputs. */
export function toolNumber(schema: v.GenericSchema<number, number> = v.number()) {
  // JSON Schema numbers are finite. Express that with representable bounds as well as at runtime.
  const finite = v.pipe(schema, v.minValue(-Number.MAX_VALUE), v.maxValue(Number.MAX_VALUE))
  return v.union([
    finite,
    v.pipe(
      v.string(),
      v.regex(/\S/, 'Expected a nonblank numeric string'),
      v.description(v.getDescription(schema) ?? 'Numeric value'),
      v.transform(Number),
      finite
    )
  ])
}
