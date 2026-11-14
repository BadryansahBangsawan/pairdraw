import * as v from 'valibot'

import { ALL_TOOLS, isToolExposed, toolChangesDocument, type ToolDef } from '@pairdraw/core/tools'

import { dim, fmtList, kv } from '#cli/format'

/** The tools the CLI lists and calls: the set MCP exposes, which the running app also accepts. */
export const CLI_TOOLS = ALL_TOOLS.filter((def) => isToolExposed(def, 'mcp'))

/** The tool called `name`; `hint` tells the user how to list the tools where they are. */
export function findCLITool(
  name: string,
  hint = 'Run `pairdraw tool list` to see tools.'
): ToolDef {
  const def = CLI_TOOLS.find((candidate) => candidate.name === name)
  if (!def) throw new Error(`Unknown tool "${name}". ${hint}`)
  return def
}

export function toolEffect(def: ToolDef): 'read' | 'write' {
  return toolChangesDocument(def) ? 'write' : 'read'
}

/** The first sentence of a tool's description. */
export function toolSummary(def: ToolDef): string {
  return def.description.split(/(?<=\.)\s/)[0] ?? def.description
}

/** A tool's name and whether it reads or writes the document. */
export function toolHeader(def: ToolDef): string {
  return `${def.name} ${dim(`[${toolEffect(def)}]`)}`
}

/** Every tool with the first sentence of its description, as `tool list` prints them. */
export function formatToolList(): string {
  return fmtList(
    CLI_TOOLS.map((def) => ({ header: toolHeader(def), details: { about: toolSummary(def) } })),
    { compact: true }
  )
}

const toolArgsSchema = v.record(v.string(), v.unknown())

/** Parses tool arguments written as a JSON object; an empty source means no arguments. */
export function parseToolArgsJSON(source: string | undefined): Record<string, unknown> {
  if (!source?.trim()) return {}
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), v.unknown()), source)
  // Valibot records accept arrays as index-keyed objects; tools never take them.
  const args = parsed.success && !Array.isArray(parsed.output) ? parsed.output : null
  const record = v.safeParse(toolArgsSchema, args)
  if (!record.success) throw new Error('Tool arguments must be a JSON object')
  return record.output
}

const toolErrorSchema = v.looseObject({ error: v.string() })

/** The message of a result a tool returns instead of throwing, such as `{ error: "…" }`. */
export function toolErrorMessage(result: unknown): string | null {
  const parsed = v.safeParse(toolErrorSchema, result)
  return parsed.success ? parsed.output.error : null
}

const binaryResultSchema = v.looseObject({ base64: v.string(), mimeType: v.string() })

/** A tool result for the terminal: JSON, or the size of the image or file it returns. */
export function formatToolResult(result: unknown): string {
  const binary = v.safeParse(binaryResultSchema, result)
  if (binary.success) {
    const bytes = Math.floor((binary.output.base64.length * 3) / 4)
    return kv(binary.output.mimeType, `${bytes} bytes; use pairdraw export to write files`)
  }
  return JSON.stringify(result, null, 2)
}
