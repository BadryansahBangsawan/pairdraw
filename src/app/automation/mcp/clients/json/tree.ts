/**
 * A JSON with comments parser that keeps where every value sits in the text, so an edit can
 * change one member and leave the rest of a person's config, comments and layout included,
 * exactly as it was. It accepts what MCP clients accept: `//` and `/* *\/` comments, trailing
 * commas, and a byte order mark.
 */

type JSONScalar = string | number | boolean | null

export interface JSONMember {
  key: string
  /** Offset of the key's opening quote. */
  keyStart: number
  value: JSONNode
}

export type JSONNode =
  | { kind: 'object'; start: number; end: number; members: JSONMember[] }
  | { kind: 'array'; start: number; end: number; items: JSONNode[] }
  | { kind: 'scalar'; start: number; end: number; value: JSONScalar }

export type JSONObjectNode = Extract<JSONNode, { kind: 'object' }>

/** Deeper documents are refused rather than risk the stack. */
const MAX_DEPTH = 256
const NUMBER_PATTERN = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y
const ESCAPES: Record<string, string> = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t'
}

class JSONSyntaxError extends Error {
  override name = 'JSONSyntaxError'
}

function fail(): never {
  throw new JSONSyntaxError('Not JSON with comments')
}

class Parser {
  position = 0

  constructor(readonly text: string) {
    if (text.startsWith('﻿')) this.position = 1
  }

  /** Skips whitespace and comments. */
  skip(): void {
    const { text } = this
    while (this.position < text.length) {
      const char = text[this.position]
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
        this.position++
      } else if (text.startsWith('//', this.position)) {
        const end = text.indexOf('\n', this.position)
        this.position = end === -1 ? text.length : end
      } else if (text.startsWith('/*', this.position)) {
        const end = text.indexOf('*/', this.position + 2)
        if (end === -1) fail()
        this.position = end + 2
      } else {
        return
      }
    }
  }

  value(depth: number): JSONNode {
    if (depth > MAX_DEPTH) fail()
    this.skip()
    const char = this.text[this.position]
    if (char === '{') return this.object(depth)
    if (char === '[') return this.array(depth)
    const start = this.position
    if (char === '"') {
      const value = this.string()
      return { kind: 'scalar', start, end: this.position, value }
    }
    for (const [word, value] of [
      ['true', true],
      ['false', false],
      ['null', null]
    ] as const) {
      if (this.text.startsWith(word, start)) {
        this.position += word.length
        return { kind: 'scalar', start, end: this.position, value }
      }
    }
    NUMBER_PATTERN.lastIndex = start
    const number = NUMBER_PATTERN.exec(this.text)
    if (!number) fail()
    this.position = NUMBER_PATTERN.lastIndex
    return { kind: 'scalar', start, end: this.position, value: Number(number[0]) }
  }

  string(): string {
    const { text } = this
    let result = ''
    this.position++
    while (this.position < text.length) {
      const char = text[this.position]
      if (char === '"') {
        this.position++
        return result
      }
      if (char === '\n' || char === '\r') fail()
      if (char !== '\\') {
        result += char
        this.position++
        continue
      }
      const escape = text[this.position + 1]
      if (escape === 'u') {
        const hex = text.slice(this.position + 2, this.position + 6)
        if (!/^[\da-fA-F]{4}$/.test(hex)) fail()
        result += String.fromCharCode(Number.parseInt(hex, 16))
        this.position += 6
      } else if (Object.hasOwn(ESCAPES, escape)) {
        result += ESCAPES[escape]
        this.position += 2
      } else {
        fail()
      }
    }
    return fail()
  }

  object(depth: number): JSONObjectNode {
    const start = this.position
    const members: JSONMember[] = []
    this.position++
    for (;;) {
      this.skip()
      if (this.text[this.position] === '}') break
      if (this.text[this.position] !== '"') fail()
      const keyStart = this.position
      const key = this.string()
      this.skip()
      if (this.text[this.position] !== ':') fail()
      this.position++
      members.push({ key, keyStart, value: this.value(depth + 1) })
      this.skip()
      if (this.text[this.position] === ',') {
        this.position++
        continue
      }
      if (this.text[this.position] !== '}') fail()
    }
    this.position++
    return { kind: 'object', start, end: this.position, members }
  }

  array(depth: number): JSONNode {
    const start = this.position
    const items: JSONNode[] = []
    this.position++
    for (;;) {
      this.skip()
      if (this.text[this.position] === ']') break
      items.push(this.value(depth + 1))
      this.skip()
      if (this.text[this.position] === ',') {
        this.position++
        continue
      }
      if (this.text[this.position] !== ']') fail()
    }
    this.position++
    return { kind: 'array', start, end: this.position, items }
  }
}

/** The document's tree, or `null` when the text is not JSON with comments. */
export function parseJSONTree(text: string): JSONNode | null {
  const parser = new Parser(text)
  try {
    const root = parser.value(0)
    parser.skip()
    return parser.position === text.length ? root : null
  } catch (error) {
    if (error instanceof JSONSyntaxError) return null
    throw error
  }
}

/** The plain value a tree describes; a repeated key keeps its last value, as `JSON.parse` does. */
export function treeValue(node: JSONNode): unknown {
  if (node.kind === 'scalar') return node.value
  if (node.kind === 'array') return node.items.map(treeValue)
  const value: Record<string, unknown> = {}
  for (const member of node.members) {
    Object.defineProperty(value, member.key, {
      value: treeValue(member.value),
      enumerable: true,
      writable: true,
      configurable: true
    })
  }
  return value
}

/** The member of `object` named `key`; the last one when it repeats. */
export function findMember(object: JSONObjectNode, key: string): JSONMember | undefined {
  return object.members.findLast((member) => member.key === key)
}
