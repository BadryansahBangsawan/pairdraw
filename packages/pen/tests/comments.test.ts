import { describe, expect, test } from 'bun:test'

import { parsePenDocument, parsePenFile } from '@pairdraw/pen'

import { getNodeOrThrow } from './helpers/assert'

// pen.dev accepts JSON comments in `.pen` files.
const COMMENTED = `{
  // Written by hand
  "version": "2.21",
  /* The one frame,
     on two lines */
  "children": [
    {
      "id": "card", // the card
      "type": "frame",
      "name": "Docs at https://pen.dev/docs // not a comment",
      "context": "/* not a comment either */",
      "width": 120,
      "height": 80,
    },
  ],
}`

describe('parsePenFile — JSON with comments', () => {
  test('reads a document with line and block comments and trailing commas', () => {
    const graph = parsePenFile(COMMENTED)
    const card = getNodeOrThrow(graph, 'card')
    expect(card.width).toBe(120)
    expect(card.height).toBe(80)
  })

  test('keeps comment markers and commas inside strings', () => {
    const doc = parsePenDocument(COMMENTED)
    expect(doc.children[0]?.name).toBe('Docs at https://pen.dev/docs // not a comment')
    expect(doc.children[0]?.context).toBe('/* not a comment either */')
    const listed = parsePenDocument(
      '{"children": [{"id": "a", "type": "text", "content": "a, ]"}]}'
    )
    expect(listed.children[0]?.content).toBe('a, ]')
  })

  test('keeps escaped quotes from ending a string early', () => {
    const doc = parsePenDocument(
      '{"children": [{"id": "a", "type": "text", "content": "say \\"// hi\\"" /* c */}]}'
    )
    expect(doc.children[0]?.content).toBe('say "// hi"')
  })

  test('still rejects text that is not a document', () => {
    expect(() => parsePenDocument('{ "children": [ // unterminated')).toThrow(
      /Not a \.pen document/
    )
    expect(() => parsePenDocument('/* only a comment */')).toThrow(/Not a \.pen document/)
  })
})
