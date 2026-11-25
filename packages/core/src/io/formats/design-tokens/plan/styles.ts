import { isEqual, isPlainObject } from 'es-toolkit/predicate'
import * as v from 'valibot'

import type {
  DocumentColorSpace,
  Effect,
  SceneGraph,
  SceneNode,
  TextLength
} from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'
import { getSharedStyles } from '@pairdraw/scene-graph/shared-styles'
import { percentLength, pixelLength, textLengthSchema } from '@pairdraw/scene-graph/text'

import { tryParseFigmaEffects } from '#core/figma-api/effects'
import {
  decodeColor,
  decodeDimension,
  decodeFontFamily,
  decodeFontWeight,
  referencePath
} from '#core/io/formats/design-tokens/decode'
import type { DesignTokenBundle, ReadToken } from '#core/io/formats/design-tokens/read'
import { isShadow, shadowTokenValue, typographyValue } from '#core/io/formats/design-tokens/styles'
import { PAIRDRAW_EXTENSION } from '#core/io/formats/design-tokens/types'

import type { AliasTarget, ImportSkip, ResolvedReference } from './'

/** A text or effect style the import makes or updates. */
export interface PlannedStyle {
  kind: 'TEXT' | 'EFFECT'
  name: string
  /** The style updated, or null for one the import makes. */
  existingNodeId: string | null
  fields: Partial<SceneNode>
  /** Text style fields bound to variables. */
  bindings: Partial<Record<TextBindingField, AliasTarget>>
}

type TextBindingField = 'fontFamily' | 'fontSize' | 'letterSpacing' | 'lineHeight'
const TEXT_BINDING_FIELDS: readonly TextBindingField[] = [
  'fontFamily',
  'fontSize',
  'letterSpacing',
  'lineHeight'
]

/** The collection and variable a bound style field points at, as Pairdraw records them. */
const bindingTargetSchema = v.object({
  targetVariableSetName: v.string(),
  targetVariableName: v.string()
})
type BindingTarget = v.InferOutput<typeof bindingTargetSchema>

/** Recorded targets by field; one that does not read is left out, not the whole extension. */
const aliasDataSchema = v.pipe(
  v.record(v.string(), v.unknown()),
  v.transform((entries): Record<string, BindingTarget> =>
    Object.fromEntries(
      Object.entries(entries).flatMap(([field, entry]) => {
        const target = v.safeParse(bindingTargetSchema, entry)
        return target.success ? [[field, target.output]] : []
      })
    )
  )
)

const ownTextSchema = v.object({
  text: v.object({
    fontFamily: v.string(),
    fontWeight: v.number(),
    italic: v.boolean(),
    fontSize: v.number(),
    lineHeight: v.nullable(textLengthSchema),
    letterSpacing: textLengthSchema,
    textDecoration: v.picklist(['NONE', 'UNDERLINE', 'STRIKETHROUGH']),
    textCase: v.picklist(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE'])
  }),
  bindings: v.optional(v.record(v.string(), v.string())),
  aliasData: v.optional(v.fallback(aliasDataSchema, {}))
})
const ownEffectsSchema = v.object({ effects: v.array(v.unknown()) })

/** The composite types that become styles. */
const STYLE_KINDS: Partial<Record<string, PlannedStyle['kind']>> = {
  typography: 'TEXT',
  shadow: 'EFFECT'
}

type Resolve = (path: readonly string[]) => ResolvedReference | undefined
/** The variable a reference names; the collection and name a file records find it among same paths. */
type Alias = (path: readonly string[], target?: BindingTarget) => AliasTarget | undefined

/** A field's value: its own, or what the token it references holds, decoded the same way. */
function fieldValue<T>(
  raw: unknown,
  resolve: Resolve,
  decode: (value: unknown) => T | null
): T | null {
  const path = referencePath(raw)
  if (!path) return decode(raw)
  const resolved = resolve(path)
  if (!resolved) return null
  return decode(resolved.kind === 'token' ? resolved.token.value : resolved.value)
}

const pixels = (value: unknown) =>
  typeof value === 'number' ? value : (decodeDimension(value)?.value ?? null)

/**
 * Pairdraw's own fields for a style token, while its `$value` still says what they would write.
 * Other tools keep extensions they do not read, so a `$value` edited there no longer matches, and
 * the edit wins over the exact fields.
 */
function ownText(token: ReadToken) {
  const own = v.safeParse(ownTextSchema, token.extensions[PAIRDRAW_EXTENSION])
  if (!own.success) return null
  const { text, bindings = {} } = own.output
  return { ...own.output, current: isEqual(token.value, typographyValue(text, bindings)) }
}

/** A typography token as text style fields, preferring the exact fields Pairdraw wrote. */
function textFields(token: ReadToken, resolve: Resolve): Partial<SceneNode> | null {
  const own = ownText(token)
  if (own?.current) return { ...own.text }
  const fields = decodedTextFields(token, resolve)
  // Italic, decoration, and case have no place in `$value`, so the extension's still apply.
  return fields && own ? { ...own.text, ...fields } : fields
}

/** A token's line height: a multiple of the font size follows it as a percent, pixels stay. */
function tokenLineHeight(multiplier: number | null, pixels: number | null): TextLength | null {
  if (multiplier !== null) return percentLength(multiplier * 100)
  return pixels === null ? null : pixelLength(pixels)
}

function decodedTextFields(token: ReadToken, resolve: Resolve): Partial<SceneNode> | null {
  if (!isPlainObject(token.value)) return null
  const value = token.value
  const fontFamily = fieldValue(value.fontFamily, resolve, decodeFontFamily)
  const fontSize = fieldValue(value.fontSize, resolve, pixels)
  if (fontFamily === null || fontSize === null) return null
  const multiplier = fieldValue(value.lineHeight, resolve, (raw) =>
    typeof raw === 'number' ? raw : null
  )
  const lineHeightPx = multiplier === null ? fieldValue(value.lineHeight, resolve, pixels) : null
  return {
    fontFamily,
    fontSize,
    fontWeight: fieldValue(value.fontWeight, resolve, decodeFontWeight) ?? 400,
    // A unitless line height is a multiple of the font size, which follows the size as a percent.
    lineHeight: tokenLineHeight(multiplier, lineHeightPx),
    letterSpacing: pixelLength(fieldValue(value.letterSpacing, resolve, pixels) ?? 0)
  }
}

/** Text style fields bound to variables: Pairdraw's recorded bindings, or the token's references. */
function textBindings(token: ReadToken, alias: Alias): PlannedStyle['bindings'] {
  const own = ownText(token)
  let references: Record<string, unknown> = {}
  if (own?.current) references = own.bindings ?? {}
  else if (isPlainObject(token.value)) references = token.value
  const bindings: PlannedStyle['bindings'] = {}
  for (const field of TEXT_BINDING_FIELDS) {
    const reference = references[field]
    const path = referencePath(reference)
    const target = path && alias(path, recordedTarget(own, field, reference))
    if (target) bindings[field] = target
  }
  return bindings
}

/**
 * The variable Pairdraw recorded for a bound field, while the field still holds the reference
 * it wrote; another tool's edit to the reference goes by its path.
 */
function recordedTarget(
  own: { bindings?: Record<string, string>; aliasData?: Record<string, BindingTarget> } | null,
  field: string,
  reference: unknown
): BindingTarget | undefined {
  if (!own || reference === undefined || own.bindings?.[field] !== reference) return undefined
  return own.aliasData?.[field]
}

/** One shadow of a shadow token, or the shadows a referenced shadow token holds. */
function shadowEffects(
  raw: unknown,
  resolve: Resolve,
  profile: DocumentColorSpace,
  depth = 0
): Effect[] | null {
  const path = referencePath(raw)
  if (path) {
    const resolved = depth < 16 ? resolve(path) : undefined
    return resolved?.kind === 'token'
      ? shadowList(resolved.token.value, resolve, profile, depth + 1)
      : null
  }
  if (!isPlainObject(raw)) return null
  const color = fieldValue<Color>(raw.color, resolve, (value) =>
    isPlainObject(value) && typeof value.r === 'number'
      ? (value as Color)
      : decodeColor(value, profile)
  )
  const length = (key: string) => fieldValue(raw[key], resolve, pixels) ?? 0
  if (!color) return null
  return [
    {
      type: raw.inset === true ? 'INNER_SHADOW' : 'DROP_SHADOW',
      color,
      offset: { x: length('offsetX'), y: length('offsetY') },
      radius: length('blur'),
      spread: length('spread'),
      visible: true,
      blendMode: 'NORMAL'
    }
  ]
}

function shadowList(
  value: unknown,
  resolve: Resolve,
  profile: DocumentColorSpace,
  depth = 0
): Effect[] | null {
  const entries = Array.isArray(value) ? value : [value]
  const effects: Effect[] = []
  for (const entry of entries) {
    const shadows = shadowEffects(entry, resolve, profile, depth)
    if (!shadows) return null
    effects.push(...shadows)
  }
  return effects.length > 0 ? effects : null
}

/**
 * Shadows edited in another tool, in place of the visible shadows Pairdraw wrote. Effects
 * `$value` cannot hold, such as blurs and hidden shadows, keep their places; extra shadows go last.
 */
function replaceShadows(exact: readonly Effect[], shadows: readonly Effect[]): Effect[] {
  const queue = [...shadows]
  const effects = exact.flatMap((effect) => {
    if (!isShadow(effect) || !effect.visible) return [effect]
    const next = queue.shift()
    return next ? [next] : []
  })
  return [...effects, ...queue]
}

/** A shadow token as effects, preferring the exact effects Pairdraw wrote. */
function effectFields(
  token: ReadToken,
  resolve: Resolve,
  profile: DocumentColorSpace
): Partial<SceneNode> | null {
  const own = v.safeParse(ownEffectsSchema, token.extensions[PAIRDRAW_EXTENSION])
  // Extension effects that do not read fall back to the token's own shadows.
  const exact = own.success ? tryParseFigmaEffects(own.output.effects) : null
  if (exact && isEqual(token.value, shadowTokenValue(exact, profile))) return { effects: exact }
  const shadows = shadowList(token.value, resolve, profile)
  if (!shadows) return null
  return { effects: exact ? replaceShadows(exact, shadows) : shadows }
}

/** Typography tokens as text styles and shadow tokens as effect styles, matched by name. */
export function planStyles(
  graph: SceneGraph,
  bundle: DesignTokenBundle,
  resolve: Resolve,
  alias: Alias
): { styles: PlannedStyle[]; skipped: ImportSkip[] } {
  const textStyles = getSharedStyles(graph, 'text')
  const effectStyles = getSharedStyles(graph, 'effect')
  const styles: PlannedStyle[] = []
  const skipped: ImportSkip[] = []
  for (const token of bundle.composites) {
    const kind = STYLE_KINDS[token.type ?? '']
    if (!kind) {
      skipped.push({ name: token.name, collection: undefined, reason: 'unsupported-type' })
      continue
    }
    const fields =
      kind === 'TEXT'
        ? textFields(token, resolve)
        : effectFields(token, resolve, graph.documentColorSpace)
    if (!fields) {
      skipped.push({ name: token.name, collection: undefined, reason: 'invalid-value' })
      continue
    }
    const existing = (kind === 'TEXT' ? textStyles : effectStyles).find(
      (style) => style.name === token.name
    )
    styles.push({
      kind,
      name: token.name,
      existingNodeId: existing?.nodeId ?? null,
      fields,
      bindings: kind === 'TEXT' ? textBindings(token, alias) : {}
    })
  }
  return { styles, skipped }
}
