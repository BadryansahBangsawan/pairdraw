import type {
  CSSGroupingRuleLike,
  CSSStyleDeclarationLike,
  CSSStyleRuleLike
} from '#dom-css/cssom/types'
import type {
  DesignDocument,
  DesignElement,
  DesignNode,
  DesignStyleDeclaration
} from '#dom-css/types'
import { parse } from '@acemir/cssom'

import { tryParseColor } from '@pairdraw/scene-graph/color'
import { parseCSSNumber, splitCSSValue } from '@pairdraw/scene-graph/css'

interface HeadlessCSSRule {
  selector: string
  specificity: number
  order: number
  /** Declared values with `var()` unresolved, so each element resolves them in its own scope. */
  declarations: DesignStyleDeclaration
}

interface ParsedHeadlessCSS {
  rules: HeadlessCSSRule[]
  customProperties: DesignStyleDeclaration
}

interface AncestorContext {
  element: DesignElement
  parent: AncestorContext | null
}

const INHERITED_PROPERTIES = new Set([
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height'
])

/** Declared values as written, before custom properties and shorthands are resolved. */
function declarationsOf(style: CSSStyleDeclarationLike): DesignStyleDeclaration {
  const result: DesignStyleDeclaration = {}
  for (const property of Array.from({ length: style.length }, (_, index) => style[index])) {
    const value = style.getPropertyValue(property).trim()
    if (property && value) result[property] = value
  }
  return result
}

function resolveDeclarations(
  declarations: DesignStyleDeclaration,
  customProperties: DesignStyleDeclaration
): DesignStyleDeclaration {
  const resolved: DesignStyleDeclaration = {}
  for (const [property, value] of Object.entries(declarations)) {
    const resolvedValue = resolveCSSValue(value, customProperties)
    if (resolvedValue) resolved[property] = resolvedValue
  }
  return expandStyleShorthands(resolved)
}

/** Adds the custom properties a declaration block sets, resolved against those already in scope. */
function declareCustomProperties(
  scope: DesignStyleDeclaration,
  declarations: DesignStyleDeclaration
): void {
  for (const [name, value] of Object.entries(declarations)) {
    if (!name.startsWith('--')) continue
    const resolved = resolveCSSValue(value, scope)
    if (resolved) scope[name] = resolved
  }
}

function isStyleRule(rule: unknown): rule is CSSStyleRuleLike {
  return (
    typeof rule === 'object' &&
    rule !== null &&
    'selectorText' in rule &&
    'style' in rule &&
    typeof rule.selectorText === 'string'
  )
}

function isGroupingRule(rule: unknown): rule is CSSGroupingRuleLike {
  return (
    typeof rule === 'object' && rule !== null && 'cssRules' in rule && Array.isArray(rule.cssRules)
  )
}

function collectStyleRules(rules: unknown[]): CSSStyleRuleLike[] {
  return rules.flatMap((rule) => {
    if (isStyleRule(rule)) return [rule]
    if (isGroupingRule(rule)) return collectStyleRules(rule.cssRules)
    return []
  })
}

function parseRules(cssText: string): ParsedHeadlessCSS {
  let order = 0
  const sheet = parse(cssText)
  const styleRules = collectStyleRules(sheet.cssRules)
  const customProperties = collectCustomProperties(styleRules)
  const rules = styleRules.flatMap((rule) => {
    const declarations = declarationsOf(rule.style)
    return rule.selectorText
      .split(',')
      .map((selector) => selector.trim())
      .filter((selector) => selector.length > 0)
      .map((selector) => ({
        selector,
        specificity: selectorSpecificity(selector),
        order: order++,
        declarations
      }))
  })
  return { rules, customProperties }
}

function collectCustomProperties(rules: CSSStyleRuleLike[]): DesignStyleDeclaration {
  const customProperties: DesignStyleDeclaration = {}
  for (const rule of rules) {
    if (!rule.selectorText.split(',').some((selector) => selector.trim() === ':root')) continue
    declareCustomProperties(customProperties, declarationsOf(rule.style))
  }
  return customProperties
}

function resolveCSSValue(value: string, customProperties: DesignStyleDeclaration): string {
  return resolveSimpleCalc(resolveVariables(value, customProperties))
}

const CUSTOM_PROPERTY_NAME = /^--[\w-]+$/

/** `var()` references as their values; a fallback can hold parentheses and other `var()`s. */
function resolveVariables(value: string, customProperties: DesignStyleDeclaration): string {
  let result = ''
  let index = 0
  for (;;) {
    const start = value.indexOf('var(', index)
    const end = start === -1 ? -1 : closingParenthesis(value, start + 3)
    if (end === -1) return result + value.slice(index)
    const inner = value.slice(start + 4, end)
    const comma = inner.indexOf(',')
    const name = (comma === -1 ? inner : inner.slice(0, comma)).trim()
    const declared: string | undefined = Object.hasOwn(customProperties, name)
      ? customProperties[name]
      : undefined
    const fallback = comma === -1 ? '' : inner.slice(comma + 1).trim()
    result += value.slice(index, start)
    result += CUSTOM_PROPERTY_NAME.test(name)
      ? (declared ?? resolveVariables(fallback, customProperties))
      : value.slice(start, end + 1)
    index = end + 1
  }
}

/** The index of the `)` closing the `(` at `open`, or -1 when it is never closed. */
function closingParenthesis(value: string, open: number): number {
  let depth = 0
  for (let index = open; index < value.length; index++) {
    if (value[index] === '(') depth++
    else if (value[index] === ')' && --depth === 0) return index
  }
  return -1
}

/** `calc()` of a product, with the length on either side, as pixels. */
function resolveSimpleCalc(value: string): string {
  const calc = /^calc\(\s*([-\d.]+)(rem|px)?\s*\*\s*([-\d.]+)(rem|px)?\s*\)$/.exec(value)
  if (!calc?.[1] || !calc[3] || (calc[2] && calc[4])) return value

  const left = Number.parseFloat(calc[1])
  const right = Number.parseFloat(calc[3])
  // An unmatched group is undefined at run time, though the match array types it as a string.
  const unit = calc[2] || calc[4] || 'px'
  if (!Number.isFinite(left) || !Number.isFinite(right)) return value
  return `${unit === 'rem' ? left * right * 16 : left * right}px`
}

const BORDER_STYLES = new Set([
  'none',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset'
])

/**
 * Shorthands as the longhands they set, in declaration order, so a later declaration wins over
 * an earlier one whether it is a shorthand, a logical side, or a single side, as in CSS.
 */
function expandStyleShorthands(style: DesignStyleDeclaration): DesignStyleDeclaration {
  const result: DesignStyleDeclaration = {}
  for (const [property, value] of Object.entries(style)) {
    result[property] = value
    Object.assign(result, longhandsOf(property, value))
  }
  return result
}

function longhandsOf(property: string, value: string): DesignStyleDeclaration {
  if (property === 'margin' || property === 'padding') return boxSides(property, value)
  const logical = /^(margin|padding)-(inline|block)$/u.exec(property)
  if (logical) return logicalSides(property, value, logical[2] === 'inline')
  if (property === 'border') return borderLonghands(value)
  if (property === 'background') {
    const color = splitCSSValue(value).find(isColor)
    return color ? { 'background-color': color } : {}
  }
  return {}
}

function boxSides(property: string, value: string): DesignStyleDeclaration {
  const [top, right = top, bottom = top, left = right] = splitCSSValue(value)
  if (!top || !right || !bottom || !left) return {}
  return {
    [`${property}-top`]: top,
    [`${property}-right`]: right,
    [`${property}-bottom`]: bottom,
    [`${property}-left`]: left
  }
}

/** `padding-inline` and `padding-block` as the sides they set in left-to-right, horizontal text. */
function logicalSides(property: string, value: string, inline: boolean): DesignStyleDeclaration {
  const box = property.slice(0, property.lastIndexOf('-'))
  const [first, second = first] = splitCSSValue(value)
  if (!first || !second) return {}
  const [start, end] = inline ? ['left', 'right'] : ['top', 'bottom']
  return { [`${box}-${start}`]: first, [`${box}-${end}`]: second }
}

function borderLonghands(value: string): DesignStyleDeclaration {
  const parts = splitCSSValue(value)
  const longhands: DesignStyleDeclaration = {}
  const color = parts.find(isColor)
  const width = parts.find((part) => parseCSSNumber(part) !== null)
  const style = parts.find((part) => BORDER_STYLES.has(part.toLowerCase()))
  if (color) longhands['border-color'] = color
  if (width) longhands['border-width'] = width
  if (style) longhands['border-style'] = style.toLowerCase()
  return longhands
}

/** Any CSS color, including `transparent`, which a shorthand may set on purpose. */
function isColor(value: string): boolean {
  return tryParseColor(value) !== null
}

function classList(element: DesignElement): Set<string> {
  const className = 'class' in element.attrs ? element.attrs.class : ''
  return new Set(className.split(/\s+/).filter((name) => name.length > 0))
}

function elementId(element: DesignElement): string | undefined {
  return 'id' in element.attrs ? element.attrs.id : undefined
}

function selectorSpecificity(selector: string): number {
  const idCount = selector.match(/#[\w-]+/g)?.length ?? 0
  const classCount = selector.match(/\.[\w-]+/g)?.length ?? 0
  // A tag counts once per compound; the universal selector, alone or as in `*.card`, counts zero.
  const tagCount = selector.split(/[\s>]+/).filter((part) => /^[a-z]/iu.test(part)).length
  return idCount * 100 + classCount * 10 + tagCount
}

function matchesSimpleSelector(element: DesignElement, selector: string): boolean {
  if (selector.includes(':') || selector.includes('[')) return false

  const idMatch = selector.match(/#([\w-]+)/)
  if (idMatch?.[1] && elementId(element) !== idMatch[1]) return false

  const classes = selector.match(/\.[\w-]+/g) ?? []
  const elementClasses = classList(element)
  if (!classes.every((name) => elementClasses.has(name.slice(1)))) return false

  const tag = selector.replace(/#[\w-]+/g, '').replace(/\.[\w-]+/g, '')
  // The universal selector, as Tailwind's preflight uses for `box-sizing`, matches any element.
  return tag.length === 0 || tag === '*' || element.tagName.toLowerCase() === tag.toLowerCase()
}

interface SelectorStep {
  compound: string
  /** How this compound relates to the one after it: `>` for a parent, ` ` for any ancestor. */
  combinator: '>' | ' '
}

/** A complex selector as its compounds, rightmost last; `null` when a combinator lacks a side. */
function selectorSteps(selector: string): SelectorStep[] | null {
  const tokens = selector
    .replaceAll('>', ' > ')
    .split(/\s+/)
    .filter((token) => token.length > 0)
  const steps: SelectorStep[] = []
  let pending: '>' | null = null
  for (const token of tokens) {
    if (token === '>') {
      if (pending || steps.length === 0) return null
      pending = '>'
      continue
    }
    const previous = steps.at(-1)
    if (previous) previous.combinator = pending ?? ' '
    steps.push({ compound: token, combinator: ' ' })
    pending = null
  }
  return pending ? null : steps
}

function matchesSelector(
  element: DesignElement,
  selector: string,
  parent: AncestorContext | null
): boolean {
  const steps = selectorSteps(selector)
  return steps !== null && matchesSteps(element, steps, steps.length - 1, parent)
}

/** Whether the element matches the compound at `index` and some ancestors match those before. */
function matchesSteps(
  element: DesignElement,
  steps: SelectorStep[],
  index: number,
  parent: AncestorContext | null
): boolean {
  const step = steps.at(index)
  if (!step || !matchesSimpleSelector(element, step.compound)) return false
  if (index === 0) return true
  const previous = steps.at(index - 1)
  if (!previous) return false
  if (previous.combinator === '>') {
    return parent !== null && matchesSteps(parent.element, steps, index - 1, parent.parent)
  }
  for (let ancestor = parent; ancestor; ancestor = ancestor.parent) {
    if (matchesSteps(ancestor.element, steps, index - 1, ancestor.parent)) return true
  }
  return false
}

function applyComputedStyles(
  node: DesignNode,
  rules: HeadlessCSSRule[],
  parent: AncestorContext | null,
  inheritedStyle: DesignStyleDeclaration,
  inheritedCustomProperties: DesignStyleDeclaration
): DesignNode {
  if (node.type === 'text') return node

  const computedStyle: DesignStyleDeclaration = pickInheritedStyle(inheritedStyle)
  const matchingRules = rules
    .filter((rule) => matchesSelector(node, rule.selector, parent))
    .sort((left, right) => left.specificity - right.specificity || left.order - right.order)

  // Custom properties cascade and inherit like any property, so `var()` resolves per element.
  const customProperties = { ...inheritedCustomProperties }
  for (const rule of matchingRules) declareCustomProperties(customProperties, rule.declarations)
  declareCustomProperties(customProperties, node.inlineStyle ?? {})

  for (const rule of matchingRules) {
    Object.assign(computedStyle, resolveDeclarations(rule.declarations, customProperties))
  }
  Object.assign(computedStyle, resolveDeclarations(node.inlineStyle ?? {}, customProperties))

  const context = { element: node, parent }
  return {
    ...node,
    computedStyle: Object.keys(computedStyle).length > 0 ? computedStyle : undefined,
    children: node.children.map((child) =>
      applyComputedStyles(child, rules, context, computedStyle, customProperties)
    )
  }
}

function pickInheritedStyle(style: DesignStyleDeclaration): DesignStyleDeclaration {
  const inherited: DesignStyleDeclaration = {}
  for (const property of INHERITED_PROPERTIES) {
    const value = style[property]
    if (value) inherited[property] = value
  }
  return inherited
}

export function computeHeadlessStyles(document: DesignDocument, cssText = ''): DesignDocument {
  const stylesheetText = [document.stylesheets?.map((sheet) => sheet.cssText).join('\n'), cssText]
    .filter((text): text is string => !!text)
    .join('\n')
  const { rules, customProperties } = parseRules(stylesheetText)
  // A fragment has no document element, so `:root` reaches its elements through inheritance only.
  const rootStyle: DesignStyleDeclaration = {}
  for (const rule of rules.filter(({ selector }) => selector === ':root')) {
    Object.assign(rootStyle, resolveDeclarations(rule.declarations, customProperties))
  }

  return {
    ...document,
    children: document.children.map((child) =>
      applyComputedStyles(child, rules, null, rootStyle, customProperties)
    )
  }
}
