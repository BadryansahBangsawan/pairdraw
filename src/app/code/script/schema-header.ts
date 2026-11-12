/**
 * The `@schema` header of a script: a leading block comment whose `@input` lines declare the
 * controls the panel shows. Parsing is pure, so a script's controls are known without running it,
 * and a malformed line is skipped rather than breaking every other input.
 */
import { BLACK } from '@open-pencil/scene-graph/constants'
import type { Color } from '@open-pencil/scene-graph/primitives'
import type { ScriptInputKind, ScriptInputValue } from '@open-pencil/scene-graph/script'

/** One declared input, as the panel builds a control from it. */
export interface ScriptInputDeclaration {
  name: string
  kind: ScriptInputKind
  /** The choices of an `enum` input, in declaration order. */
  options?: string[]
  /** The value a run uses until a person sets one; `enum` and `ref` inputs have none. */
  default?: ScriptInputValue
}

const KINDS = ['number', 'string', 'boolean', 'color', 'enum', 'ref'] as const

const BLOCK_COMMENT = /^\s*\/\*([\s\S]*?)\*\//u
const INPUT_LINE = /^\s*\*?\s*@input\s+([A-Za-z_$][\w$]*)\s+([^\s=]+)\s*(?:=\s*(.+?))?\s*$/u
const HEX_COLOR = /^#([0-9a-f]{6}|[0-9a-f]{8})$/iu

function parseColor(text: string): Color | undefined {
  if (!HEX_COLOR.test(text)) return undefined
  const digits = text.slice(1)
  const byte = (at: number) => Number.parseInt(digits.slice(at, at + 2), 16) / 255
  return {
    r: byte(0),
    g: byte(2),
    b: byte(4),
    a: digits.length === 8 ? byte(6) : 1
  }
}

/** A declared default, read as the input's kind; `undefined` when it does not fit. */
function parseDefault(
  kind: ScriptInputKind,
  text: string,
  options?: readonly string[]
): ScriptInputValue | undefined {
  if (kind === 'number') {
    const value = Number(text)
    return Number.isFinite(value) ? value : undefined
  }
  if (kind === 'string') {
    const quoted = /^(['"])([\s\S]*)\1$/u.exec(text)
    return quoted ? quoted[2] : text
  }
  if (kind === 'boolean') {
    if (text === 'true') return true
    if (text === 'false') return false
    return undefined
  }
  if (kind === 'color') return parseColor(text)
  // An enum's default is one of its choices; anything else falls back to the first.
  if (kind === 'enum') return options?.includes(text) ? text : undefined
  return undefined
}

/** The kind token of an `@input` line, with the choices of an `enum`. */
function parseKind(token: string): { kind: ScriptInputKind; options?: string[] } | undefined {
  const named = /^([a-z]+)(?:\(([^)]*)\))?$/u.exec(token)
  if (!named) return undefined
  const kind = named[1] as ScriptInputKind
  if (!(KINDS as readonly string[]).includes(kind)) return undefined
  if (kind !== 'enum') return { kind }
  const options = (named.at(2) ?? '')
    .split(',')
    .map((option) => option.trim())
    .filter((option) => option !== '')
  return options.length > 0 ? { kind, options } : undefined
}

/**
 * The inputs a script declares. Only the leading block comment is read, so a script that mentions
 * `@input` in a string or below its first statement declares nothing.
 */
export function parseScriptHeader(source: string): ScriptInputDeclaration[] {
  const comment = BLOCK_COMMENT.exec(source)
  if (!comment || !/^\s*\*\s*@schema\b/mu.test(comment[1])) return []
  const declarations: ScriptInputDeclaration[] = []
  const seen = new Set<string>()
  for (const line of comment[1].split('\n')) {
    const match = INPUT_LINE.exec(line)
    if (!match) continue
    const name = match[1]
    const kindToken = match[2]
    const defaultText = match.at(3)
    if (seen.has(name)) continue
    const parsedKind = parseKind(kindToken)
    if (!parsedKind) continue
    const declaration: ScriptInputDeclaration = { name, kind: parsedKind.kind }
    if (parsedKind.options) declaration.options = parsedKind.options
    if (defaultText !== undefined) {
      const value = parseDefault(parsedKind.kind, defaultText, parsedKind.options)
      if (value !== undefined) declaration.default = value
    }
    if (declaration.kind === 'enum' && declaration.default === undefined) {
      declaration.default = declaration.options?.[0]
    }
    seen.add(name)
    declarations.push(declaration)
  }
  return declarations
}

/** The kind of each declared input, as the run checks a bound variable against. */
export function declarationKinds(
  declarations: readonly ScriptInputDeclaration[]
): Map<string, ScriptInputKind> {
  return new Map(declarations.map((declaration) => [declaration.name, declaration.kind]))
}

/** The value a run uses for one input: the stored one, else the declared default, else zero. */
export function inputValue(
  declaration: ScriptInputDeclaration,
  stored: ScriptInputValue | undefined
): ScriptInputValue | undefined {
  if (stored !== undefined) return stored
  if (declaration.default !== undefined) return declaration.default
  if (declaration.kind === 'number') return 0
  if (declaration.kind === 'string') return ''
  if (declaration.kind === 'boolean') return false
  if (declaration.kind === 'color') return BLACK
  return undefined
}
