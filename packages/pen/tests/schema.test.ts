import { describe, expect, test } from 'bun:test'

import { parsePenDocument, parsePenFile, writePenDocument } from '@pairdraw/pen'

import { getNodeOrThrow } from './helpers/assert'

/**
 * `.pen` text with one rectangle holding `fields`, written out by hand: JSON reads a number too
 * large for a double, such as `1e999`, as Infinity, which `JSON.stringify` cannot write.
 */
function rectangleText(fields: string): string {
  return `{"version":"2.21","children":[{"id":"n","type":"rectangle",${fields}}]}`
}

describe('parsePenDocument', () => {
  test.each([
    ['"width":1e999', 'children.0.width'],
    ['"x":-1e999', 'children.0.x'],
    ['"cornerRadius":[0,1e999,0,0]', 'children.0.cornerRadius.1'],
    ['"viewBox":[0,0,1e999,10]', 'children.0.viewBox.2'],
    ['"zoom":1e999', 'children.0.zoom']
  ])('rejects %s, a number the file could not be saved with', (fields, path) => {
    expect(() => parsePenDocument(rectangleText(fields))).toThrow(path)
  })

  test('reads finite numbers, however large, into a document that saves and opens again', () => {
    const graph = parsePenFile(
      rectangleText('"width":1e300,"height":10,"x":-5,"cornerRadius":[0,4,0,0]')
    )
    const saved = parsePenFile(writePenDocument(graph))

    expect(getNodeOrThrow(saved, 'n')).toMatchObject({ width: 1e300, x: -5, topRightRadius: 4 })
  })
})
