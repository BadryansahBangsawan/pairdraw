import {
  parse,
  toPlainObject,
  // eslint-disable-next-line pairdraw/no-mixed-case-acronym-identifiers -- Upstream export spelling.
  type CssNodePlain as CSSNodePlain,
  type SelectorPlain
} from 'css-tree'

import { featureConditionCSS, parseFeatureCondition } from './conditions'
import { tokenSlug } from './names'

/** One custom property a stylesheet declares: `--brand: #ff5b2e`. */
export interface CustomPropertyDeclaration {
  /** The property without its leading `--`. */
  name: string
  /** The value as written, trimmed, without `!important`. */
  value: string
  /** Where the trimmed value sits in the source, so a write-back replaces only it. */
  start: number
  end: number
}

/**
 * A block of custom properties and the scope it applies in. The base set is `:root`, `html`,
 * `:host`, or Tailwind's `@theme`; every other scope is a mode's condition, as the token
 * stylesheet writes it: a selector such as `[data-theme="dark"]` or `.dark`, or an at-rule
 * prelude such as `@media (prefers-color-scheme: dark)` around a `:root` block.
 */
export interface CustomPropertyScope {
  /** Null for the base set. */
  condition: string | null
  /** The attribute and value a lone `[name="value"]` selector switches on. */
  attribute?: { name: string; value: string }
  /**
   * `Collection: Mode` from a comment just above a mode's block, as the token stylesheet writes
   * it. A comment is a label only where its mode is the one the condition names, such as `Dark`
   * above `.dark`, or where the condition names none, such as `@media (min-width: 40rem)`.
   */
  label?: { collection: string; mode: string }
  declarations: CustomPropertyDeclaration[]
  /** The offset of the block's closing brace, where new declarations go. */
  insertAt: number
  /** The indentation of the block's declarations. */
  indent: string
}

export interface CustomPropertySheet {
  scopes: CustomPropertyScope[]
  /** Selectors and at-rules that declare custom properties but name no mode, as written. */
  skipped: string[]
}

interface Comment {
  text: string
  start: number
  end: number
}

interface Reader {
  css: string
  comments: Comment[]
  sheet: CustomPropertySheet
}

/** Labels are one line, `Collection: Mode`, as `buildTokenStylesheet` writes above each mode. */
const LABEL = /^ ([^:\n]+?): ([^\n]+?) $/

const ROOT_PSEUDO_CLASSES = new Set(['root', 'host'])
const CONDITION_AT_RULES = new Set(['media', 'supports', 'container'])

function textOf(reader: Reader, node: CSSNodePlain): string {
  const { loc } = node
  return loc ? reader.css.slice(loc.start.offset, loc.end.offset) : ''
}

/** `:root`, `html`, or `:host`, alone. */
function isRootSimple(node: CSSNodePlain | undefined): boolean {
  if (node?.type === 'TypeSelector') return node.name.toLowerCase() === 'html'
  return (
    node?.type === 'PseudoClassSelector' &&
    ROOT_PSEUDO_CLASSES.has(node.name.toLowerCase()) &&
    !node.children
  )
}

function isRootSelector(selector: SelectorPlain): boolean {
  return selector.children.length === 1 && isRootSimple(selector.children[0])
}

/**
 * A selector with the root it is written on taken off, `:root.dark` as `.dark`, or undefined for
 * one with a combinator, which scopes part of a page rather than switching a mode.
 */
function modeSelector(reader: Reader, selector: SelectorPlain): string | undefined {
  if (selector.children.some((node) => node.type === 'Combinator')) return undefined
  const parts = isRootSimple(selector.children[0]) ? selector.children.slice(1) : selector.children
  const first = parts.at(0)
  const last = parts.at(-1)
  if (!first?.loc || !last?.loc) return undefined
  return reader.css.slice(first.loc.start.offset, last.loc.end.offset)
}

function attributeOf(selector: SelectorPlain): CustomPropertyScope['attribute'] {
  const parts = isRootSimple(selector.children[0]) ? selector.children.slice(1) : selector.children
  const only = parts.at(0)
  if (parts.length !== 1 || only?.type !== 'AttributeSelector' || only.matcher !== '=') {
    return undefined
  }
  const value = only.value?.type === 'String' ? only.value.value : only.value?.name
  return value === undefined ? undefined : { name: only.name.name, value }
}

/**
 * The mode a condition names by itself: the value of `[data-theme="dark"]`, the class of `.dark`,
 * or the scheme of `@media (prefers-color-scheme: dark)`. Undefined for other conditions.
 */
export function modeConditionName(
  condition: string,
  attribute?: CustomPropertyScope['attribute']
): string | undefined {
  if (attribute) return attribute.value
  const className = /^\.(-?[_a-z][\w-]*)$/i.exec(condition)?.[1]
  if (className) return className
  const feature = parseFeatureCondition(condition)
  if (feature?.feature === 'prefers-color-scheme' && feature.value.type === 'keyword')
    return feature.value.name
  return undefined
}

/**
 * The comment just above a mode's block as its label. An ordinary comment such as
 * `/* TODO: fix later *\/` above `.dark` is none: its mode is not the one `.dark` names.
 */
function labelBefore(
  reader: Reader,
  start: number,
  scope: Pick<CustomPropertyScope, 'condition' | 'attribute'>
): CustomPropertyScope['label'] {
  if (scope.condition === null) return undefined
  const comment = reader.comments.findLast((candidate) => candidate.end <= start)
  if (!comment || reader.css.slice(comment.end, start).trim() !== '') return undefined
  const match = LABEL.exec(comment.text)
  if (!match) return undefined
  const [, collection, mode] = match
  const named = modeConditionName(scope.condition, scope.attribute)
  const fits =
    named === undefined ||
    tokenSlug(named) === tokenSlug(mode) ||
    scope.attribute?.name === `data-${tokenSlug(collection)}`
  return fits ? { collection, mode } : undefined
}

/** The whitespace a line starts with. */
function indentAt(css: string, offset: number): string {
  const lineStart = css.lastIndexOf('\n', offset - 1) + 1
  return /^[ \t]*/.exec(css.slice(lineStart))?.[0] ?? ''
}

function declarationsOf(reader: Reader, block: CSSNodePlain[]): CustomPropertyDeclaration[] {
  const declarations: CustomPropertyDeclaration[] = []
  for (const node of block) {
    if (node.type !== 'Declaration' || !node.property.startsWith('--')) continue
    const { loc } = node.value
    // Tailwind's `--color-*: initial` resets a namespace; it declares no property.
    if (!loc || node.property.length <= 2 || node.property.includes('*')) continue
    const raw = reader.css.slice(loc.start.offset, loc.end.offset)
    const value = raw.trim()
    if (!value) continue
    const start = loc.start.offset + (raw.length - raw.trimStart().length)
    declarations.push({ name: node.property.slice(2), value, start, end: start + value.length })
  }
  return declarations
}

function declaresCustomProperties(nodes: readonly CSSNodePlain[]): boolean {
  return nodes.some((node) => {
    if (node.type === 'Declaration') return node.property.startsWith('--')
    if (node.type === 'Rule') return declaresCustomProperties(node.block.children)
    if (node.type === 'Atrule') return declaresCustomProperties(node.block?.children ?? [])
    return false
  })
}

/**
 * A block's contents read as declarations. css-tree reads the block of an at-rule it does not
 * know, such as Tailwind's `@theme`, as rules, which turns declarations before a nested
 * `@keyframes` into one rule with a raw prelude.
 */
function declarationList(reader: Reader, block: CSSNodePlain): CSSNodePlain[] {
  if (block.type !== 'Block' || !block.loc) return []
  const start = block.loc.start.offset + 1
  const list = toPlainObject(
    parse(reader.css.slice(start, block.loc.end.offset - 1), {
      context: 'declarationList',
      positions: true,
      offset: start
    })
  )
  return list.type === 'DeclarationList' ? list.children : []
}

function addScope(
  reader: Reader,
  block: CSSNodePlain,
  scope: Pick<CustomPropertyScope, 'condition' | 'attribute'>,
  labelAt: number,
  children: CSSNodePlain[] = block.type === 'Block' ? block.children : []
) {
  if (block.type !== 'Block' || !block.loc) return
  const declarations = declarationsOf(reader, children)
  const first = declarations.at(0)
  if (!first) return
  reader.sheet.scopes.push({
    condition: scope.condition,
    ...(scope.attribute ? { attribute: scope.attribute } : {}),
    label: labelBefore(reader, labelAt, scope),
    declarations,
    insertAt: block.loc.end.offset - 1,
    indent: indentAt(reader.css, first.start)
  })
}

/** A rule at the top of the sheet or of a `@layer`: the base set, or a mode by its selector. */
function readRule(reader: Reader, rule: Extract<CSSNodePlain, { type: 'Rule' }>) {
  if (!declaresCustomProperties(rule.block.children)) return
  const start = rule.loc?.start.offset ?? 0
  if (rule.prelude.type !== 'SelectorList') {
    reader.sheet.skipped.push(textOf(reader, rule.prelude))
    return
  }
  const selectors = rule.prelude.children.filter((node) => node.type === 'Selector')
  if (selectors.some(isRootSelector)) {
    addScope(reader, rule.block, { condition: null }, start)
    return
  }
  const conditions = selectors.map((selector) => modeSelector(reader, selector))
  if (conditions.length === 0 || conditions.some((condition) => condition === undefined)) {
    reader.sheet.skipped.push(textOf(reader, rule.prelude))
    return
  }
  const attribute = selectors.length === 1 ? attributeOf(selectors[0]) : undefined
  const condition = attribute
    ? `[${attribute.name}="${attribute.value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"]`
    : conditions.join(', ')
  addScope(reader, rule.block, { condition, attribute }, start)
}

/** `@media (prefers-color-scheme: dark)` written the way the token stylesheet writes it. */
function atRuleCondition(reader: Reader, rule: Extract<CSSNodePlain, { type: 'Atrule' }>) {
  const prelude = rule.prelude ? textOf(reader, rule.prelude).replaceAll(/\s+/g, ' ').trim() : ''
  const written = `@${rule.name.toLowerCase()} ${prelude}`
  const feature = parseFeatureCondition(written)
  return feature ? featureConditionCSS(feature) : written
}

function readAtRule(reader: Reader, rule: Extract<CSSNodePlain, { type: 'Atrule' }>) {
  const name = rule.name.toLowerCase()
  const children = rule.block?.children ?? []
  const start = rule.loc?.start.offset ?? 0
  if (name === 'layer') {
    readNodes(reader, children)
    return
  }
  if (!rule.block) return
  if (!CONDITION_AT_RULES.has(name)) {
    const declared = declarationList(reader, rule.block)
    if (!declaresCustomProperties(declared)) return
    if (name === 'theme') addScope(reader, rule.block, { condition: null }, start, declared)
    else reader.sheet.skipped.push(textOf(reader, rule).split('{')[0].trim())
    return
  }
  if (!declaresCustomProperties(children)) return
  const condition = atRuleCondition(reader, rule)
  for (const child of children) {
    if (child.type === 'Rule' && child.prelude.type === 'SelectorList') {
      const selectors = child.prelude.children.filter((node) => node.type === 'Selector')
      if (selectors.length > 0 && selectors.every(isRootSelector)) {
        // A comment above the at-rule labels it, as the stylesheet writes one above each mode.
        addScope(reader, child.block, { condition }, start)
        continue
      }
    }
    if (declaresCustomProperties([child]))
      reader.sheet.skipped.push(`${condition} ${textOf(reader, child).split('{')[0].trim()}`)
  }
}

function readNodes(reader: Reader, nodes: readonly CSSNodePlain[]) {
  for (const node of nodes) {
    if (node.type === 'Rule') readRule(reader, node)
    else if (node.type === 'Atrule') readAtRule(reader, node)
  }
}

/**
 * The custom properties a stylesheet declares, by the scope they apply in: the inverse of
 * `buildTokenStylesheet`. It reads the base set, selector modes, and `:root` blocks inside
 * `@media`, `@supports`, and `@container`, also inside `@layer`; a scope it cannot read as a mode,
 * such as `.card .title` or a selector inside a media query, is listed in `skipped`.
 */
export function readCustomProperties(css: string): CustomPropertySheet {
  const comments: Comment[] = []
  const reader: Reader = { css, comments, sheet: { scopes: [], skipped: [] } }
  // Plain objects from a full parse: with `list: false`, css-tree leaves rule preludes raw.
  const sheet = toPlainObject(
    parse(css, {
      positions: true,
      onComment: (text, loc) =>
        comments.push({ text, start: loc.start.offset, end: loc.end.offset })
    })
  )
  if (sheet.type === 'StyleSheet') readNodes(reader, sheet.children)
  return reader.sheet
}

/**
 * A mode's condition in the form `readCustomProperties` gives it, so conditions written
 * differently compare equal: `:root[data-theme=dark]` and `[data-theme="dark"]`, or
 * `@media (prefers-color-scheme:dark)` and `@media (prefers-color-scheme: dark)`.
 */
export function modeConditionKey(condition: string): string {
  const trimmed = condition.trim()
  const probe = trimmed.startsWith('@')
    ? `${trimmed} { :root { --probe: 0 } }`
    : `${trimmed} { --probe: 0 }`
  try {
    return readCustomProperties(probe).scopes[0]?.condition ?? trimmed
  } catch {
    return trimmed
  }
}
