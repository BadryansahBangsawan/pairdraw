import {
  readCustomProperties,
  tokenStylesheet,
  type CustomPropertyScope,
  type TokenStylesheetIssue
} from '@open-pencil/dom-css/export'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { knownTokens } from './known'
import { namesFont, readCSSTokenValue, rewriteCSSTokenValue, sameCSSTokenValue } from './values'

/** A stylesheet with the document's variables written into it. */
export interface TokenStylesheetSync {
  css: string
  /** Declarations whose value changed. */
  updated: number
  /** Declarations added for variables the stylesheet did not have. */
  added: number
  /** Variables the token stylesheet could not write, as it reports them. */
  issues: TokenStylesheetIssue[]
}

interface Edit {
  start: number
  end: number
  text: string
}

/** Each scope's wanted values, by condition (`''` for the base set) and property. */
type Wanted = Map<string, { scope: CustomPropertyScope; values: Map<string, string> }>

function scopeKey(scope: Pick<CustomPropertyScope, 'condition'>): string {
  return scope.condition ?? ''
}

function wantedScopes(css: string): Wanted {
  const wanted: Wanted = new Map()
  for (const scope of readCustomProperties(css).scopes) {
    const key = scopeKey(scope)
    const entry = wanted.get(key) ?? { scope, values: new Map<string, string>() }
    for (const { name, value } of scope.declarations) entry.values.set(name, value)
    wanted.set(key, entry)
  }
  return wanted
}

function declarationLines(values: ReadonlyArray<[string, string]>, indent: string): string {
  return values.map(([name, value]) => `${indent}--${name}: ${value};\n`).join('')
}

/** A new block for a scope the stylesheet has none of, as the token stylesheet writes one. */
function newBlock(scope: CustomPropertyScope, values: ReadonlyArray<[string, string]>): string {
  const label = scope.label ? `/* ${scope.label.collection}: ${scope.label.mode} */\n` : ''
  if (scope.condition === null) return `:root {\n${declarationLines(values, '  ')}}\n`
  if (!scope.condition.startsWith('@'))
    return `${label}${scope.condition} {\n${declarationLines(values, '  ')}}\n`
  return `${label}${scope.condition} {\n  :root {\n${declarationLines(values, '    ')}  }\n}\n`
}

/** Declarations added at the end of an existing block, after its last one. */
function appendToBlock(
  css: string,
  scope: CustomPropertyScope,
  values: ReadonlyArray<[string, string]>
): Edit[] {
  const edits: Edit[] = []
  const last = scope.declarations.at(-1)
  if (last && !css.slice(last.end, scope.insertAt).includes(';'))
    edits.push({ start: last.end, end: last.end, text: ';' })
  const lineStart = css.lastIndexOf('\n', scope.insertAt - 1) + 1
  if (css.slice(lineStart, scope.insertAt).trim() === '') {
    edits.push({ start: lineStart, end: lineStart, text: declarationLines(values, scope.indent) })
  } else {
    const inline = values.map(([name, value]) => ` --${name}: ${value};`).join('')
    edits.push({ start: scope.insertAt, end: scope.insertAt, text: `${inline} ` })
  }
  return edits
}

function applyEdits(css: string, edits: Edit[]): string {
  const ordered = edits
    .map((edit, order) => ({ ...edit, order }))
    .sort((a, b) => a.start - b.start || a.order - b.order)
  let out = ''
  let at = 0
  for (const edit of ordered) {
    if (edit.start < at) continue
    out += css.slice(at, edit.start) + edit.text
    at = edit.end
  }
  return out + css.slice(at)
}

/**
 * Writes the document's variables into a stylesheet in place, as the token stylesheet would write
 * them, and leaves everything else as it is: comments, formatting, other rules, and properties the
 * document has no variable for. A value that means the same, however it is written, stays; a
 * changed color keeps its notation and a length in `rem` stays in `rem`. Variables the
 * stylesheet lacks are added to the block of their scope, or in a new block at the end. Nothing
 * is removed.
 */
export function patchTokenStylesheet(
  graph: SceneGraph,
  source: string,
  generated: string
): Omit<TokenStylesheetSync, 'issues'> {
  const wanted = wantedScopes(generated)
  const base = wanted.get('')?.values ?? new Map<string, string>()
  const known = knownTokens(graph)

  /**
   * What a scope should declare for a property. A mode writes only what differs from its default,
   * so a property its own collection's mode leaves out takes the default value there.
   */
  function expected(key: string, name: string): string | undefined {
    if (key === '') return base.get(name)
    const scoped = wanted.get(key)?.values.get(name)
    if (scoped !== undefined) return scoped
    const variable = known.byCSSName.get(name)
    const mode = known.byCondition.get(key)
    return variable && mode && variable.collection === mode.collection ? base.get(name) : undefined
  }

  const edits: Edit[] = []
  const present = new Map<string, Set<string>>()
  const lastScope = new Map<string, CustomPropertyScope>()
  let updated = 0
  const target = readCustomProperties(source)
  for (const scope of target.scopes) {
    const key = scopeKey(scope)
    lastScope.set(key, scope)
    const names = present.get(key) ?? new Set<string>()
    present.set(key, names)
    for (const declaration of scope.declarations) {
      names.add(declaration.name)
      const want = expected(key, declaration.name)
      if (want === undefined) continue
      const font = namesFont(declaration.name)
      const previous = readCSSTokenValue(declaration.value, { font })
      const next = readCSSTokenValue(want, { font })
      if (sameCSSTokenValue(previous, next)) continue
      edits.push({
        start: declaration.start,
        end: declaration.end,
        text: rewriteCSSTokenValue(previous, next, want)
      })
      updated++
    }
  }

  // The base set as this push leaves it, which every mode's block inherits.
  const inherited = new Map<string, string>()
  for (const scope of target.scopes)
    if (scope.condition === null)
      for (const { name, value } of scope.declarations) inherited.set(name, value)
  for (const [name, value] of base) inherited.set(name, value)

  /** A mode's block need not declare what it already inherits from the base set. */
  function inherits(key: string, name: string, value: string): boolean {
    const from = key === '' ? undefined : inherited.get(name)
    if (from === undefined) return false
    const font = namesFont(name)
    return sameCSSTokenValue(readCSSTokenValue(from, { font }), readCSSTokenValue(value, { font }))
  }

  let added = 0
  const blocks: string[] = []
  for (const [key, { scope, values }] of wanted) {
    const missing = [...values].filter(
      ([name, value]) => !present.get(key)?.has(name) && !inherits(key, name, value)
    )
    if (missing.length === 0) continue
    added += missing.length
    const existing = lastScope.get(key)
    if (existing) edits.push(...appendToBlock(source, existing, missing))
    else blocks.push(newBlock(scope, missing))
  }

  let css = applyEdits(source, edits)
  if (blocks.length > 0) {
    let separator = '\n\n'
    if (css.length === 0) separator = ''
    else if (css.endsWith('\n')) separator = '\n'
    css = `${css}${separator}${blocks.join('\n')}`
  }
  return { css, updated, added }
}

/**
 * The stylesheet with the document's variables written in, through `patchTokenStylesheet`, and
 * what the token stylesheet could not write.
 */
export async function syncTokenStylesheet(
  graph: SceneGraph,
  source: string
): Promise<TokenStylesheetSync> {
  const generated = await tokenStylesheet(graph, { format: 'css' })
  return { ...patchTokenStylesheet(graph, source, generated.css), issues: generated.issues }
}
