import { pickBy } from 'es-toolkit'
import { uniq } from 'es-toolkit/array'

import type { SceneGraph } from '@pairdraw/scene-graph'
import { tryParseColor } from '@pairdraw/scene-graph/color'

import { REKA_ELEMENTS } from './behaviours'
import { elementBindings, elementProps, elementSchema } from './elements'
import { ENUM_PROPS } from './enums'
import { DESIGN_JSX_HELPERS, designJSXHelpers } from './helpers'
import * as React from './mini-react'
import { normalizeStyleProps } from './props-overrides'
import {
  renderRoots,
  renderTree,
  componentPropNames,
  componentReferenceWarnings,
  type RenderResult
} from './renderer'
import { elementPropWarnings, layerPropsSchema, svgLayerPropsSchema } from './schema'
import type { DesignJSXServices } from './services'
import { TEXT_CONTENT_NAMES } from './text-content'
import { transformDesignJSXExpression } from './transform'
import { isTreeNode, resolveToTree, type TreeNode } from './tree'
import type { RenderOptions as RenderJSXOptions } from './types'
import { isVariable } from './variables'

const SIZE_PROPS = new Set(['w', 'h'])
const PAINT_PROPS = new Set(['bg', 'fill', 'stroke'])

/** How a warning names a value it could not read. */
function propValueText(value: unknown): string {
  return typeof value === 'string' ? `"${value}"` : String(value)
}

function unreadableSize(value: unknown): boolean {
  return !isVariable(value) && typeof value !== 'number' && value !== 'hug' && value !== 'fill'
}

function unreadablePaint(value: unknown): boolean {
  return typeof value === 'string' && tryParseColor(value) === null
}

/** `const Switch = { Root: 'Switch.Root', … }`: each Reka namespace as element types. */
const REKA_ALIASES = Object.entries(REKA_ELEMENTS)
  .map(
    ([namespace, parts]) =>
      `const ${namespace} = ${JSON.stringify(
        Object.fromEntries(Object.keys(parts).map((part) => [part, `${namespace}.${part}`]))
      )}`
  )
  .join('\n')

/** `const solid = __helpers.solid`, …: every helper in the scope of the code. */
const HELPER_BINDINGS = DESIGN_JSX_HELPERS.map(
  ({ name }) => `const ${name} = __helpers.${name}`
).join('\n')

/** Where the scanner is: code (top level or `{…}`), JSX text, or an opening or closing tag. */
type ScanFrame = 'code' | 'text' | 'open' | 'close'

/** End (exclusive) of the string that opens at `start`; JSX attribute strings have no escapes. */
function stringEnd(source: string, start: number, escapes: boolean): number {
  const quote = source[start]
  let i = start + 1
  while (i < source.length && source[i] !== quote) i += escapes && source[i] === '\\' ? 2 : 1
  return Math.min(i + 1, source.length)
}

/** End of the string or JS comment at `i`, copied as written, or -1 when none starts there. */
function verbatimEnd(source: string, i: number, frame: ScanFrame): number {
  const char = source.charAt(i)
  if (frame === 'open' || frame === 'close') {
    return /["']/.test(char) ? stringEnd(source, i, false) : -1
  }
  if (frame !== 'code') return -1
  if (/["'`]/.test(char)) return stringEnd(source, i, true)
  if (source.startsWith('//', i)) {
    const end = source.indexOf('\n', i)
    return end === -1 ? source.length : end
  }
  if (source.startsWith('/*', i)) {
    const end = source.indexOf('*/', i + 2)
    return end === -1 ? source.length : end + 2
  }
  return -1
}

/** Whether the `<` just copied to `before` opens a tag rather than comparing, as in `a<b`. */
function startsTag(source: string, next: number, frame: ScanFrame, before: string): boolean {
  const following = source.charAt(next)
  if (frame === 'text') return /[A-Za-z_$/>]/.test(following)
  if (!/[A-Za-z_$>]/.test(following)) return false
  const previous = before.slice(0, -1).trimEnd()
  return !/[\w$)\].]$/.test(previous) || /(?:^|[^\w$])return$/.test(previous)
}

/** Enter or leave a frame after copying the character just before `next`. */
function updateFrames(stack: ScanFrame[], source: string, next: number, out: string): void {
  const char = source.charAt(next - 1)
  const frame = stack.at(-1) ?? 'code'
  const inTag = frame === 'open' || frame === 'close'
  if (char === '{') stack.push('code')
  else if (char === '}' && frame === 'code' && stack.length > 1) stack.pop()
  else if (char === '<' && !inTag && startsTag(source, next, frame, out)) {
    stack.push(source.charAt(next) === '/' ? 'close' : 'open')
  } else if (char === '>' && frame === 'open') {
    if (source.charAt(next - 2) === '/') stack.pop()
    else stack[stack.length - 1] = 'text'
  } else if (char === '>' && frame === 'close') {
    stack.pop()
    if (stack.at(-1) === 'text') stack.pop()
  }
}

/**
 * Remove `<!-- … -->` written in JSX text or between statements. Markup inside an attribute
 * string or a JS string literal is part of the value and stays.
 */
function stripHTMLComments(jsxString: string): string {
  const stack: ScanFrame[] = ['code']
  let out = ''
  let i = 0
  while (i < jsxString.length) {
    const frame = stack.at(-1) ?? 'code'
    if (frame !== 'open' && frame !== 'close' && jsxString.startsWith('<!--', i)) {
      const end = jsxString.indexOf('-->', i + 4)
      i = end === -1 ? jsxString.length : end + 3
      continue
    }
    const end = verbatimEnd(jsxString, i, frame)
    if (end !== -1) {
      out += jsxString.slice(i, end)
      i = end
      continue
    }
    out += jsxString.charAt(i)
    i++
    updateFrames(stack, jsxString, i, out)
  }
  return out
}

/** Why `value` cannot go into the layer field `key` names, or nothing when it can. */
function valueKindWarning(
  key: string,
  value: unknown,
  element: string,
  type: TreeNode['type']
): string | undefined {
  // An `<svg>`'s attributes are passed to its markup as written, so a value of the wrong kind is
  // the markup's to read: `fill="none"` and `strokeWidth="2"` are not layer fields.
  if (type === 'svg') return undefined
  if (SIZE_PROPS.has(key) && unreadableSize(value))
    return `Invalid ${key} ${propValueText(value)} on <${element}> is ignored; expected a number, "hug", or "fill".`
  if (PAINT_PROPS.has(key) && unreadablePaint(value))
    return `Invalid ${key} ${propValueText(value)} on <${element}> is ignored; expected a colour or a paint.`
  return undefined
}

function unsupportedPropWarnings(graph: SceneGraph, tree: TreeNode): string[] {
  const warnings: string[] = []
  collectUnsupportedPropWarnings(graph, tree, warnings)
  return warnings
}

function collectUnsupportedPropWarnings(
  graph: SceneGraph,
  tree: TreeNode,
  warnings: string[]
): void {
  const supported = elementProps(tree.type)
  // An instance sets its component's properties by name, such as `State="On"` or `Title="Hi"`.
  if (tree.type === 'instance') warnings.push(...componentReferenceWarnings(graph, tree.props))
  const properties = componentPropNames(graph, tree.props)
  const element = TEXT_CONTENT_NAMES[tree.type] ?? tree.type
  const schema = elementSchema(tree.type)
  if (schema) warnings.push(...elementPropWarnings(schema, tree.props, element))
  // The layer props an element takes are read by one schema, which its own schema may restate,
  // with the values its `style` gives where the props leave them unset, as rendering reads them.
  const layerSchema = tree.type === 'svg' ? svgLayerPropsSchema : layerPropsSchema
  const layerProps = pickBy(
    normalizeStyleProps(tree.props),
    (_, key) => supported.has(key) && !(schema && Object.hasOwn(schema.entries, key))
  )
  warnings.push(...elementPropWarnings(layerSchema, layerProps, element))
  for (const [key, value] of Object.entries(tree.props)) {
    if (!supported.has(key) && !properties.includes(key)) {
      warnings.push(`Unsupported prop "${key}" on <${element}> is ignored.`)
      continue
    }
    // The element's schema already reported a prop it validates, in its own words; warning
    // again here would name the same value twice, as a connector's stroke once was.
    if (schema && key in schema.entries) continue
    const kindWarning = valueKindWarning(key, value, element, tree.type)
    if (kindWarning) {
      warnings.push(kindWarning)
      continue
    }
    const values = ENUM_PROPS[key]
    if (values && typeof value === 'string' && values.parse(value) === undefined) {
      warnings.push(
        `Unknown ${key} "${value}" on <${element}> is ignored; expected ${values.names.join(', ')}.`
      )
    }
  }

  // SVG descendants are parsed as markup by renderSvgNode, not as Design JSX nodes.
  if (tree.type === 'svg') return

  for (const child of tree.children) {
    if (isTreeNode(child)) collectUnsupportedPropWarnings(graph, child, warnings)
  }
}

/**
 * Build a component function from a JSX string: one JSX expression, sibling elements, or
 * statements that end with `return` and the JSX. The statements run inside the component, so
 * they may shadow an element or helper name. Works in both Node/Bun and the browser.
 */
export function buildComponent(jsxString: string, warnings: string[] = []): React.ComponentType {
  const trimmed = stripHTMLComments(jsxString).trim()

  const aliases = `
    const __h = React.createElement
    const __fragment = ''
    ${elementBindings()}
    const svg = 'svg'
    ${REKA_ALIASES}
    ${HELPER_BINDINGS}
  `

  const body = transformDesignJSXExpression(trimmed)
  // eslint-disable-next-line typescript-eslint/no-implied-eval -- sucrase output must be evaluated at runtime
  return new Function('React', '__helpers', `${aliases}\nreturn function __render() {\n${body}\n}`)(
    React,
    designJSXHelpers(warnings)
  ) as React.ComponentType
}

/**
 * Render a JSX string into the scene graph.
 * Works in both Node/Bun and the browser.
 */
async function renderJSX<Artwork>(
  services: DesignJSXServices<Artwork>,
  graph: SceneGraph,
  jsxString: string,
  options?: RenderJSXOptions
): Promise<RenderResult[]> {
  const helperWarnings: string[] = []
  const Component = buildComponent(jsxString, helperWarnings)
  const element = React.createElement(Component, null)
  const tree = resolveToTree(element)

  if (!tree) {
    throw new Error('JSX must return a Figma element (Frame, Text, etc)')
  }

  const results = await renderRoots(services, graph, tree, options)
  // After rendering, so an instance's component set drawn in the same JSX names its variants.
  // A helper called in a loop reports each ignored option once.
  // Prop warnings come first, then the render's own, such as a connector end naming no layer.
  const warnings = uniq([
    ...unsupportedPropWarnings(graph, tree),
    ...helperWarnings,
    ...(results[0].warnings ?? [])
  ])
  if (warnings.length > 0) results[0].warnings = warnings
  return results
}

/**
 * A Design JSX renderer bound to an engine. Rendering needs `services` for icons, inline
 * SVG, and layout; Pairdraw's engine provides them through `@pairdraw/core/design-jsx`.
 */
export function createDesignJSXRenderer<Artwork>(services: DesignJSXServices<Artwork>) {
  return {
    /** Render a Design JSX string into the graph, one result per top-level element. */
    renderJSX: (graph: SceneGraph, jsxString: string, options?: RenderJSXOptions) =>
      renderJSX(services, graph, jsxString, options),
    /** Render a tree built with the element functions into the graph. */
    renderTree: (graph: SceneGraph, tree: TreeNode, options?: RenderJSXOptions) =>
      renderTree(services, graph, tree, options),
    /** Render every top-level element of a tree at once, one result per root. */
    renderRoots: (graph: SceneGraph, tree: TreeNode, options?: RenderJSXOptions) =>
      renderRoots(services, graph, tree, options)
  }
}

export type DesignJSXRenderer = ReturnType<typeof createDesignJSXRenderer>
