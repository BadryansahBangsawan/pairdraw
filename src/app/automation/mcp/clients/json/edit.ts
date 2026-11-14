import { findMember, parseJSONTree } from './tree'
import type { JSONMember, JSONObjectNode } from './tree'

/**
 * Text edits that add, replace, or remove one member of a JSON with comments document, written
 * in the indentation the document already uses and leaving every other character as it was.
 */

const DEFAULT_INDENT = '  '

/** The indentation of the document's first indented member line, or two spaces. */
function indentUnit(text: string): string {
  const match = /^([ \t]+)["}\]]/m.exec(text)
  return match?.[1] ?? DEFAULT_INDENT
}

function lineStart(text: string, position: number): number {
  return text.lastIndexOf('\n', position - 1) + 1
}

/** The whitespace that starts the line holding `position`. */
function lineIndent(text: string, position: number): string {
  const start = lineStart(text, position)
  return /^[ \t]*/.exec(text.slice(start))?.[0] ?? ''
}

/** Whether only spaces and tabs come before `position` on its line. */
function startsItsLine(text: string, position: number): boolean {
  return /^[ \t]*$/.test(text.slice(lineStart(text, position), position))
}

/** Whether `position` is at a line break or the end of the text. */
function endsLine(text: string, position: number): boolean {
  return position >= text.length || text[position] === '\n' || text[position] === '\r'
}

/** Skips whitespace and comments from `position`. */
function skipBlank(text: string, position: number): number {
  let index = position
  for (;;) {
    const blank = /^\s+/.exec(text.slice(index))
    if (blank) index += blank[0].length
    if (text.startsWith('//', index)) {
      const end = text.indexOf('\n', index)
      index = end === -1 ? text.length : end
    } else if (text.startsWith('/*', index)) {
      const end = text.indexOf('*/', index + 2)
      index = end === -1 ? text.length : end + 2
    } else {
      return index
    }
  }
}

/**
 * Where the line that `position` is on ends, when only spaces and comments follow `position` on
 * it; otherwise `position` itself.
 */
function lineEndAfter(text: string, position: number): number {
  let index = position
  for (;;) {
    while (text[index] === ' ' || text[index] === '\t') index++
    if (text.startsWith('//', index)) {
      const end = text.indexOf('\n', index)
      return end === -1 ? text.length : end
    }
    if (text.startsWith('/*', index)) {
      const end = text.indexOf('*/', index + 2)
      if (end === -1 || text.slice(index, end).includes('\n')) return position
      index = end + 2
      continue
    }
    if (endsLine(text, index)) return index
    return position
  }
}

/** The line break the document uses. */
function lineBreak(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n'
}

/** Past the line break at `position`, if there is one there. */
function throughLineBreak(text: string, position: number): number {
  if (text.startsWith('\r\n', position)) return position + 2
  return text[position] === '\n' ? position + 1 : position
}

/** `value` as JSON, its continuation lines indented under a member at `indent`. */
function formatValue(value: unknown, unit: string, indent: string, eol: string): string {
  return JSON.stringify(value, null, unit).replaceAll('\n', `${eol}${indent}`)
}

function memberText(key: string, value: unknown, unit: string, indent: string, eol: string) {
  return `${JSON.stringify(key)}: ${formatValue(value, unit, indent, eol)}`
}

function splice(text: string, start: number, end: number, insert = ''): string {
  return text.slice(0, start) + insert + text.slice(end)
}

/** Adds `key` as the last member of `object`. */
function insertMember(
  text: string,
  object: JSONObjectNode,
  key: string,
  value: unknown,
  unit: string
): string {
  const close = object.end - 1
  const eol = lineBreak(text)
  const last = object.members.at(-1)
  if (!last) {
    const outer = lineIndent(text, object.start)
    const indent = outer + unit
    const inside = text.slice(object.start + 1, close).trimEnd()
    return splice(
      text,
      object.start + 1,
      close,
      `${inside}${eol}${indent}${memberText(key, value, unit, indent, eol)}${eol}${outer}`
    )
  }
  const afterValue = skipBlank(text, last.value.end)
  const trailingComma = text[afterValue] === ','
  const multiline = text.slice(object.start, last.keyStart).includes('\n')
  if (!multiline) {
    const member = `${JSON.stringify(key)}: ${JSON.stringify(value)}`
    return trailingComma
      ? splice(text, afterValue + 1, afterValue + 1, ` ${member},`)
      : splice(text, last.value.end, last.value.end, `, ${member}`)
  }
  const indent = lineIndent(text, last.keyStart)
  const member = memberText(key, value, unit, indent, eol)
  if (trailingComma) {
    const end = lineEndAfter(text, afterValue + 1)
    return splice(text, end, end, `${eol}${indent}${member},`)
  }
  const end = lineEndAfter(text, last.value.end)
  const withMember = splice(text, end, end, `${eol}${indent}${member}`)
  return splice(withMember, last.value.end, last.value.end, ',')
}

/** Replaces the value of `member`, keeping its key and everything around it. */
function replaceMemberValue(
  text: string,
  member: JSONMember,
  value: unknown,
  unit: string
): string {
  const multiline = startsItsLine(text, member.keyStart)
  const formatted = multiline
    ? formatValue(value, unit, lineIndent(text, member.keyStart), lineBreak(text))
    : JSON.stringify(value)
  return splice(text, member.value.start, member.value.end, formatted)
}

/**
 * Removes the only member of `object` with its own lines, keeping the comments around it; an
 * object left with nothing but whitespace closes up to `{}`.
 */
function removeOnlyMember(text: string, object: JSONObjectNode, member: JSONMember): string {
  const afterValue = skipBlank(text, member.value.end)
  const valueEnd = text[afterValue] === ',' ? afterValue + 1 : member.value.end
  const end = lineEndAfter(text, valueEnd)
  const ownLines = startsItsLine(text, member.keyStart) && endsLine(text, end)
  let spacesAfter = valueEnd
  while (text[spacesAfter] === ' ' || text[spacesAfter] === '\t') spacesAfter++
  const without = ownLines
    ? splice(text, lineStart(text, member.keyStart), throughLineBreak(text, end))
    : splice(text, member.keyStart, spacesAfter)
  const close = object.end - 1 - (text.length - without.length)
  return without.slice(object.start + 1, close).trim() === ''
    ? splice(without, object.start + 1, close)
    : without
}

/** Removes `member` from `object` with its separating comma and, on its own lines, its lines. */
function removeMember(text: string, object: JSONObjectNode, member: JSONMember): string {
  const index = object.members.indexOf(member)
  if (index === -1) return text
  if (object.members.length === 1) return removeOnlyMember(text, object, member)
  const afterValue = skipBlank(text, member.value.end)
  const trailingComma = text[afterValue] === ','
  const next = object.members.at(index + 1)
  if (next) {
    // On its own lines the member leaves with them, up to the end of its comma's line, so a
    // comment above the next member stays with that member.
    const lineEnd = lineEndAfter(text, afterValue + 1)
    const ownLines =
      trailingComma && startsItsLine(text, member.keyStart) && endsLine(text, lineEnd)
    return ownLines
      ? splice(text, lineStart(text, member.keyStart), throughLineBreak(text, lineEnd))
      : splice(text, member.keyStart, next.keyStart)
  }
  const previous = object.members[index - 1]
  if (startsItsLine(text, member.keyStart)) {
    // The line break before the member goes with it, so the closing brace keeps its own line.
    const breakStart = lineStart(text, member.keyStart) - 1
    const from = text[breakStart - 1] === '\r' ? breakStart - 1 : breakStart
    const end = lineEndAfter(text, trailingComma ? afterValue + 1 : member.value.end)
    const without = splice(text, from, end)
    if (trailingComma) return without
    const comma = skipBlank(without, previous.value.end)
    return without[comma] === ',' ? splice(without, comma, comma + 1) : without
  }
  const comma = skipBlank(text, previous.value.end)
  const end = trailingComma ? afterValue + 1 : member.value.end
  return text[comma] === ',' && !trailingComma
    ? splice(text, comma, end)
    : splice(text, member.keyStart, end)
}

/** A new document holding only `container.key`. */
function newDocument(container: string, key: string, value: unknown): string {
  return `${JSON.stringify({ [container]: { [key]: value } }, null, DEFAULT_INDENT)}\n`
}

/**
 * The text with `container.key` set to `value`, or `null` when the document is not an object of
 * objects there. An empty document becomes a new one.
 */
export function setNestedMember(
  text: string,
  container: string,
  key: string,
  value: unknown
): string | null {
  if (text.trim() === '') return newDocument(container, key, value)
  const root = parseJSONTree(text)
  if (root?.kind !== 'object') return null
  const unit = indentUnit(text)
  const holder = findMember(root, container)
  if (!holder) return insertMember(text, root, container, { [key]: value }, unit)
  if (holder.value.kind !== 'object') return null
  const existing = findMember(holder.value, key)
  return existing
    ? replaceMemberValue(text, existing, value, unit)
    : insertMember(text, holder.value, key, value, unit)
}

/** The text without any `container.key`, or `null` when the document is not an object. */
export function removeNestedMember(text: string, container: string, key: string): string | null {
  let current = text
  for (;;) {
    const root = parseJSONTree(current)
    if (root?.kind !== 'object') return null
    const holder = findMember(root, container)
    if (holder?.value.kind !== 'object') return current
    const member = findMember(holder.value, key)
    if (!member) return current
    const removed = removeMember(current, holder.value, member)
    if (removed === current) return null
    current = removed
  }
}
