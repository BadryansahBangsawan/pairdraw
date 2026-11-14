import * as v from 'valibot'

import { parseToolArgsJSON } from '#cli/session/tools'

/** One line typed into `pairdraw shell`. */
export type ShellCommand =
  | { kind: 'empty' }
  | { kind: 'help'; topic?: string }
  | { kind: 'tools' }
  | { kind: 'save'; path?: string }
  | { kind: 'preview'; path?: string }
  | { kind: 'exit' }
  | { kind: 'call'; name: string; args: Record<string, unknown> }

/** Session commands; every other name is a tool. Tool names are snake_case and never clash. */
export const SHELL_BUILTINS = ['help', 'tools', 'save', 'preview', 'exit', 'quit'] as const

const LINE_PATTERN = /^\.?([A-Za-z_]\w*)\s*([\s\S]*)$/

const jsonStringSchema = v.pipe(v.string(), v.parseJson(), v.string())

/** The argument written inside `name(…)`, or after the name and a space. */
function argumentSource(rest: string): string {
  const trimmed = rest.trim()
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) return trimmed.slice(1, -1).trim()
  return trimmed
}

/** A single string argument: a JSON string such as `"out.fig"`, or a bare word. */
function stringArgument(source: string): string | undefined {
  if (!source) return undefined
  const quoted = v.safeParse(jsonStringSchema, source)
  if (quoted.success) return quoted.output
  if (/^["'(]/.test(source) || /\s/.test(source)) {
    throw new Error(`Expected one path or name in double quotes, got ${source}`)
  }
  return source
}

/**
 * Reads one shell line. A tool runs as `name`, `name {"json": "args"}`, or `name({"json": "args"})`;
 * `save("path.fig")`, `preview("path.png")`, `help("tool")`, `tools()`, and `exit()` drive the
 * session. A trailing semicolon and a leading `.` (as in `.exit`) are accepted.
 */
export function parseShellLine(line: string): ShellCommand {
  const text = line.trim().replace(/;$/, '').trim()
  if (!text || text.startsWith('#') || text.startsWith('//')) return { kind: 'empty' }
  const match = LINE_PATTERN.exec(text)
  if (!match) throw new Error(`Cannot read "${text}". Type help for the syntax.`)
  const [, name = '', rest = ''] = match
  const source = argumentSource(rest)
  switch (name) {
    case 'help':
      return { kind: 'help', topic: stringArgument(source) }
    case 'tools':
      return { kind: 'tools' }
    case 'save':
      return { kind: 'save', path: stringArgument(source) }
    case 'preview':
      return { kind: 'preview', path: stringArgument(source) }
    case 'exit':
    case 'quit':
      return { kind: 'exit' }
    default:
      return { kind: 'call', name, args: parseToolArgsJSON(source) }
  }
}
