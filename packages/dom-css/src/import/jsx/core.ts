import type { DesignDocument, DesignNode, DesignStyleDeclaration } from '#dom-css/types'

export const Fragment = Symbol.for('pairdraw.dom-css.fragment')

type JSXComponent = (props: JSXElementProps) => JSXChild
export type JSXTag = string | JSXComponent | typeof Fragment
export type JSXStyleValue = string | number | null | undefined
export type JSXStyleObject = Record<string, JSXStyleValue>
export type JSXStyleInput = string | JSXStyleObject
export type JSXChild = DesignNode | JSXChild[] | string | number | boolean | null | undefined

export interface JSXElementProps {
  children?: JSXChild
  class?: string
  className?: string
  style?: JSXStyleInput
  key?: string | number
  [name: string]: unknown
}

function cssPropertyName(name: string) {
  if (name.startsWith('--')) return name
  return name.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)
}

function styleObjectToDeclaration(style: JSXStyleObject): DesignStyleDeclaration | undefined {
  const entries = Object.entries(style)
    .filter(
      (entry): entry is [string, string | number] => entry[1] !== null && entry[1] !== undefined
    )
    .map(([property, value]) => [cssPropertyName(property), String(value)] as const)
    .filter(([, value]) => value.length > 0)

  if (entries.length === 0) return undefined
  return Object.fromEntries(entries)
}

/** Declarations split at `;` outside quotes and parentheses, so `url(data:…;base64,…)` stays whole. */
function splitDeclarations(style: string): string[] {
  const declarations: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0
  for (let index = 0; index < style.length; index++) {
    const character = style[index]
    if (quote) {
      if (character === '\\') index++
      else if (character === quote) quote = null
    } else if (character === '"' || character === "'") quote = character
    else if (character === '(') depth++
    else if (character === ')') depth = Math.max(0, depth - 1)
    else if (character === ';' && depth === 0) {
      declarations.push(style.slice(start, index))
      start = index + 1
    }
  }
  declarations.push(style.slice(start))
  return declarations
}

function styleStringToDeclaration(style: string): DesignStyleDeclaration | undefined {
  const entries = splitDeclarations(style)
    .map((declaration) => {
      const colon = declaration.indexOf(':')
      if (colon === -1) return ['', ''] as const
      const property = declaration.slice(0, colon).trim()
      return [property.toLowerCase(), declaration.slice(colon + 1).trim()] as const
    })
    .filter(([property, value]) => property.length > 0 && value.length > 0)

  if (entries.length === 0) return undefined
  return Object.fromEntries(entries)
}

function styleToDeclaration(style: JSXStyleInput | undefined): DesignStyleDeclaration | undefined {
  if (typeof style === 'string') return styleStringToDeclaration(style)
  if (style) return styleObjectToDeclaration(style)
  return undefined
}

function attributeValue(value: unknown): string | undefined {
  if (value === null || value === undefined || value === false) return undefined
  if (value === true) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  return undefined
}

function propsToAttrs(props: JSXElementProps): Record<string, string> {
  const attrs: Record<string, string> = {}
  const classValue = props.class ?? props.className
  if (classValue) attrs.class = classValue

  for (const [name, value] of Object.entries(props)) {
    if (name === 'children' || name === 'class' || name === 'className' || name === 'style') {
      continue
    }
    if (name === 'key' || name.startsWith('on')) continue
    const attr = attributeValue(value)
    if (attr !== undefined) attrs[name] = attr
  }

  return attrs
}

function normalizeChild(child: JSXChild, nodes: DesignNode[]): void {
  if (child === null || child === undefined || typeof child === 'boolean') return
  if (Array.isArray(child)) {
    for (const item of child) normalizeChild(item, nodes)
    return
  }
  if (typeof child === 'string' || typeof child === 'number') {
    nodes.push({ type: 'text', text: String(child) })
    return
  }
  nodes.push(child)
}

function normalizeJSXChildren(children: JSXChild): DesignNode[] {
  const nodes: DesignNode[] = []
  normalizeChild(children, nodes)
  return nodes
}

export function jsx(tag: JSXTag, props: JSXElementProps = {}): DesignNode | DesignNode[] {
  if (tag === Fragment) return normalizeJSXChildren(props.children)
  if (typeof tag === 'function') return normalizeJSXChildren(tag(props))

  return {
    type: 'element',
    tagName: tag,
    attrs: propsToAttrs(props),
    inlineStyle: styleToDeclaration(props.style),
    children: normalizeJSXChildren(props.children)
  }
}

export const jsxs = jsx

export function jsxToDesignDocumentCore(input: JSXChild): DesignDocument {
  return {
    type: 'document',
    children: normalizeJSXChildren(input)
  }
}

export namespace JSX {
  export type Element = DesignNode | DesignNode[]
  export interface ElementChildrenAttribute {
    children: unknown
  }
  export interface IntrinsicElements {
    [tagName: string]: JSXElementProps
  }
}
