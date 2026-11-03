import { uniq } from 'es-toolkit/array'
import { upperFirst } from 'es-toolkit/string'

import {
  cssNameCodeSyntax,
  cssNameVariableName,
  cssTokenProperty,
  cssValueTokens,
  modeConditionKey,
  modeConditionName,
  readCustomProperties,
  tokenSlug,
  variableUnit,
  type CustomPropertyScope,
  type CustomPropertySheet
} from '@open-pencil/dom-css/export'
import {
  isLibraryCollection,
  type SceneGraph,
  type TokenUnit,
  type Variable,
  type VariableCollection
} from '@open-pencil/scene-graph'
import { tokenNumberInUnit } from '@open-pencil/scene-graph/variables'

import { tokenPath } from '#core/io/formats/design-tokens/paths'
import type {
  DesignTokenBundle,
  DesignTokenReadIssue,
  ReadCollection,
  ReadToken
} from '#core/io/formats/design-tokens/read'
import { OPENPENCIL_EXTENSION } from '#core/io/formats/design-tokens/types'
import { colorTokenValue, trimNumber } from '#core/io/formats/design-tokens/values'

import { knownTokens, type KnownTokens } from './known'
import { namesFont, readCSSTokenValue, type CSSTokenValue } from './values'

export interface CSSTokenReadOptions {
  /** The stylesheet's file name, for issues. */
  file?: string
  /**
   * What a numeric CSS expression such as `clamp(1rem, 4vw, 1.5rem)` comes to in `unit`, with
   * the custom properties in scope by name (`--space`). A browser computes it; without one, an
   * expression keeps the number its variable already has, and a new one is skipped.
   */
  resolveExpression?: (
    css: string,
    unit: TokenUnit,
    tokens: ReadonlyMap<string, string>
  ) => number | undefined
}

interface ModeDraft {
  name: string
  /** The scope's condition, or null for the base set. */
  key: string | null
  /** The condition the mode stores; undefined where its collection's attribute implies it. */
  condition: string | undefined
  values: Map<string, string>
}

interface Group {
  name: string
  existing: VariableCollection | undefined
  modeAttribute: string | undefined
  /** The default mode first, which holds the base set. */
  modes: ModeDraft[]
}

interface TokenFields {
  type: ReadToken['type']
  value: unknown
  unit?: TokenUnit
  expression?: string
  aliasData?: { targetVariableName: string; targetVariableSetName: string }
}

/** `data-theme` reads as the collection `Theme`. */
function attributeCollectionName(attribute: string): string {
  return upperFirst(attribute.replace(/^data-/i, '')) || attribute
}

/** `.dark` and `@media (prefers-color-scheme: dark)` are `dark`; other conditions as written. */
function conditionModeName(key: string): string {
  return modeConditionName(key) ?? key.replace(/^@[\w-]+\s+/, '')
}

function defaultAttribute(name: string): string {
  return `data-${tokenSlug(name) || 'mode'}`
}

class CSSTokenReader {
  readonly groups = new Map<string, Group>()
  readonly base = new Map<string, string>()
  readonly owners = new Map<string, Group>()
  readonly issues: DesignTokenReadIssue[] = []

  constructor(
    readonly graph: SceneGraph,
    readonly known: KnownTokens,
    readonly file: string,
    readonly options: CSSTokenReadOptions
  ) {}

  group(name: string): Group {
    const found = this.groups.get(name)
    if (found) return found
    const existing = [...this.graph.variableCollections.values()].find(
      (collection) => collection.name === name && !isLibraryCollection(collection)
    )
    const defaultName =
      existing?.modes.find((mode) => mode.modeId === existing.defaultModeId)?.name ?? 'Default'
    const group: Group = {
      name,
      existing,
      modeAttribute: existing?.modeAttribute,
      modes: [{ name: defaultName, key: null, condition: undefined, values: this.base }]
    }
    this.groups.set(name, group)
    return group
  }

  addMode(group: Group, name: string, key: string, condition: string | undefined): ModeDraft {
    const same = group.modes.find((mode) => mode.key === key)
    if (same) return same
    let unique = name
    for (let n = 2; group.modes.some((mode) => mode.name === unique); n++) unique = `${name} ${n}`
    const mode: ModeDraft = { name: unique, key, condition, values: new Map() }
    group.modes.push(mode)
    return mode
  }

  /** The collection and mode a scope's condition belongs to. */
  placeMode(scope: CustomPropertyScope, key: string): ModeDraft {
    const match = this.known.byCondition.get(key)
    if (match)
      return this.addMode(
        this.group(match.collection.name),
        match.mode.name,
        key,
        match.mode.condition
      )
    const { label, attribute } = scope
    const group = this.group(
      label?.collection ?? (attribute ? attributeCollectionName(attribute.name) : 'Theme')
    )
    const name = label?.mode ?? attribute?.value ?? conditionModeName(key)
    if (attribute && !group.existing && group.modeAttribute === undefined)
      group.modeAttribute = attribute.name
    const implied = `[${group.modeAttribute ?? defaultAttribute(group.name)}="${tokenSlug(name)}"]`
    return this.addMode(group, name, key, modeConditionKey(implied) === key ? undefined : key)
  }

  read(sheet: CustomPropertySheet) {
    for (const scope of sheet.scopes) {
      if (scope.condition !== null) continue
      for (const { name, value } of scope.declarations) this.base.set(name, value)
    }
    const names = [...this.base.keys()]
    for (const scope of sheet.scopes) {
      if (scope.condition === null) continue
      const mode = this.placeMode(scope, scope.condition)
      for (const { name, value } of scope.declarations) {
        mode.values.set(name, value)
        names.push(name)
      }
    }
    this.assignOwners(uniq(names))
    this.reportForeignOverrides()
  }

  /**
   * Each property's collection: the one whose variable it already is, else the first whose mode
   * changes it, else the only collection with modes, else `Tokens`. A library's variables are
   * the library's, so the import leaves them out.
   */
  assignOwners(names: string[]) {
    const unowned = new Set<string>()
    for (const name of names) {
      const known = this.known.byCSSName.get(name)
      if (known?.library) continue
      if (known) this.owners.set(name, this.group(known.collection.name))
      else unowned.add(name)
    }
    for (const group of this.groups.values())
      for (const mode of group.modes.slice(1))
        for (const name of mode.values.keys())
          if (unowned.has(name) && !this.owners.has(name)) this.owners.set(name, group)
    const rest = [...unowned].filter((name) => !this.owners.has(name))
    if (rest.length === 0) return
    const withModes = [...this.groups.values()].filter((group) => group.modes.length > 1)
    const fallback = withModes.length === 1 ? withModes[0] : this.group('Tokens')
    for (const name of rest) this.owners.set(name, fallback)
  }

  /** A mode that changes another collection's variable cannot say so: a variable varies by one. */
  reportForeignOverrides() {
    for (const group of this.groups.values()) {
      for (const mode of group.modes.slice(1)) {
        for (const [name, value] of mode.values) {
          const owner = this.owners.get(name)
          if (!owner || owner === group) continue
          if (value.replaceAll(/\s+/g, '') === this.base.get(name)?.replaceAll(/\s+/g, '')) continue
          this.issues.push({
            kind: 'foreign-css-override',
            file: this.file,
            rule: mode.key ?? ':root',
            property: `--${name}`,
            collection: owner.name
          })
        }
      }
    }
  }

  existingVariable(name: string, group: Group): Variable | undefined {
    const known = this.known.byCSSName.get(name)
    return known && !known.library && known.collection === group.existing
      ? known.variable
      : undefined
  }

  tokenName(name: string, group: Group): string {
    return this.existingVariable(name, group)?.name ?? cssNameVariableName(name)
  }

  /** An alias by collection and variable name, as Figma's alias data names one. */
  alias(target: string): TokenFields {
    const group = this.owners.get(target)
    const known = this.known.byCSSName.get(target)
    const targetName = group ? this.tokenName(target, group) : known?.variable.name
    const setName = group?.name ?? known?.collection.name
    if (!targetName || !setName) return { type: undefined, value: `{${target}}` }
    return {
      type: undefined,
      value: `{${tokenPath(targetName).join('.')}}`,
      aliasData: { targetVariableName: targetName, targetVariableSetName: setName }
    }
  }

  /** The unit an expression takes from a token it names, `calc(var(--space) * 2)` from `--space`. */
  referencedUnit(css: string, scope: ReadonlyMap<string, string>): TokenUnit | undefined {
    for (const token of cssValueTokens(css)) {
      const property = cssTokenProperty(token)
      const value = property && scope.get(property)
      if (!value) continue
      const read = readCSSTokenValue(value)
      if (read.kind === 'number') return read.unit
      if (read.kind === 'expression' && read.unit) return read.unit
    }
    return undefined
  }

  expression(
    value: Extract<CSSTokenValue, { kind: 'expression' }>,
    existing: Variable | undefined,
    group: Group,
    mode: ModeDraft,
    scope: ReadonlyMap<string, string>
  ): TokenFields | undefined {
    const unit =
      value.unit ??
      this.referencedUnit(value.css, scope) ??
      (existing ? variableUnit(existing) : 'none')
    let resolved = this.options.resolveExpression?.(value.css, unit, scope)
    if (resolved === undefined && existing) {
      const modeId = group.existing?.modes.find((candidate) => candidate.name === mode.name)?.modeId
      const current = modeId ? existing.valuesByMode[modeId] : undefined
      if (typeof current === 'number') resolved = current
    }
    if (resolved === undefined) return undefined
    return { ...numberToken(resolved, unit), unit, expression: value.css }
  }

  token(
    name: string,
    css: string,
    group: Group,
    mode: ModeDraft,
    scope: ReadonlyMap<string, string>
  ): ReadToken {
    const existing = this.existingVariable(name, group)
    const tokenName = this.tokenName(name, group)
    const value = readCSSTokenValue(css, { font: namesFont(name) })
    let fields: TokenFields
    if (value.kind === 'reference') fields = this.alias(value.name)
    else if (value.kind === 'color') fields = { type: 'color', value: colorTokenValue(value.color) }
    else if (value.kind === 'number')
      fields = { ...numberToken(value.value, value.unit), unit: value.unit }
    else if (value.kind === 'string') fields = { type: 'string', value: value.value }
    else if (value.kind === 'font') fields = { type: 'fontFamily', value: value.family }
    else if (value.kind === 'expression')
      fields = this.expression(value, existing, group, mode, scope) ?? {
        type: 'number',
        value: css
      }
    else fields = { type: undefined, value: css }
    const own = existing
      ? {
          unit: unitFor(existing, fields.unit),
          scopes: existing.scopes,
          codeSyntax: existing.codeSyntax,
          hiddenFromPublishing: existing.hiddenFromPublishing,
          expression: fields.expression
        }
      : {
          unit: fields.unit,
          codeSyntax: { WEB: cssNameCodeSyntax(name) },
          expression: fields.expression
        }
    return {
      path: tokenPath(tokenName),
      name: tokenName,
      type: fields.type,
      value: fields.value,
      description: undefined,
      extensions: {
        [OPENPENCIL_EXTENSION]: own,
        ...(fields.aliasData ? { 'com.figma.aliasData': fields.aliasData } : {})
      }
    }
  }

  collections(): ReadCollection[] {
    const collections: ReadCollection[] = []
    for (const group of this.groups.values()) {
      const owned = [...this.owners].flatMap(([name, owner]) => (owner === group ? [name] : []))
      if (owned.length === 0) continue
      const modes = group.modes.flatMap((mode, index) => {
        if (index > 0 && !owned.some((name) => mode.values.has(name))) return []
        const scope = new Map(
          [...this.base, ...mode.values].map(([name, value]) => [`--${name}`, value])
        )
        // A mode's block inherits every base value it leaves out, as it does on a page.
        const tokens = owned.flatMap((name) => {
          const css = mode.values.get(name) ?? this.base.get(name)
          return css === undefined ? [] : [this.token(name, css, group, mode, scope)]
        })
        return [{ name: mode.name, tokens, isDefault: index === 0, condition: mode.condition }]
      })
      const modeAttribute =
        group.modeAttribute === defaultAttribute(group.name) ? undefined : group.modeAttribute
      collections.push({
        name: group.name,
        modes,
        modeAttribute: group.existing ? undefined : modeAttribute
      })
    }
    return collections
  }
}

/** A number token in the type its unit is written as, which the token decoder reads back. */
function numberToken(stored: number, unit: TokenUnit): TokenFields {
  if (unit === 'px' || unit === 'rem')
    return {
      type: 'dimension',
      value: { value: trimNumber(tokenNumberInUnit(stored, unit)), unit }
    }
  if (unit === 'ms' || unit === 's')
    return { type: 'duration', value: { value: trimNumber(stored), unit } }
  return { type: 'number', value: trimNumber(stored) }
}

/** An updated variable keeps the unit it has unless the stylesheet writes another. */
function unitFor(existing: Variable, unit: TokenUnit | undefined): TokenUnit | undefined {
  if (existing.type !== 'FLOAT') return undefined
  return unit === undefined || unit === variableUnit(existing) ? existing.unit : unit
}

/**
 * The custom properties of a stylesheet as collections and modes, ready for `planTokenImport`:
 * the inverse of the token stylesheet. `:root` is each collection's default mode; a selector such
 * as `[data-theme="dark"]` or `.dark`, or a `:root` block in `@media`, `@supports`, or
 * `@container`, is a mode. Properties and conditions the document already writes map back to its
 * variables and modes, so a stylesheet exported from it imports onto the same collections.
 * Elsewhere a `Collection: Mode` comment, the attribute, or the condition names the mode.
 */
export function readCSSDesignTokens(
  graph: SceneGraph,
  css: string,
  options: CSSTokenReadOptions = {}
): DesignTokenBundle {
  const file = options.file ?? 'stylesheet.css'
  let sheet: CustomPropertySheet
  try {
    sheet = readCustomProperties(css)
  } catch {
    return { collections: [], composites: [], issues: [{ kind: 'invalid-file', file }] }
  }
  const reader = new CSSTokenReader(graph, knownTokens(graph), file, options)
  reader.read(sheet)
  const issues: DesignTokenReadIssue[] = [
    ...sheet.skipped.map((rule): DesignTokenReadIssue => ({ kind: 'unsupported-css', file, rule })),
    ...reader.issues
  ]
  return { collections: reader.collections(), composites: [], issues }
}
