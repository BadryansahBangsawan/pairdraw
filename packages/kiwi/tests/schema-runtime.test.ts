import { describe, expect, test } from 'bun:test'

import {
  ByteBuffer,
  compileSchema,
  expectEnumValue,
  expectFieldNumber,
  parseSchema,
  validateSchema
} from '../src/schema-runtime'
import type { RuntimeMessage } from '../src/schema-runtime/interpreter'

describe('ByteBuffer reads', () => {
  const end = 'Unexpected end of Kiwi message'
  const bytes = (...values: number[]) => new ByteBuffer(new Uint8Array(values))

  test('refuse to read past the end instead of returning a partial value', () => {
    expect(() => bytes(172).readVarUint()).toThrow(end)
    expect(() => bytes().readVarUint()).toThrow(end)
    expect(() => bytes().readByte()).toThrow(end)
    expect(() => bytes(0x7f, 1).readVarFloat()).toThrow(end)
    expect(() => bytes(5, 1).readByteArray()).toThrow(end)
    expect(() => bytes(5, 1).skipByteArray()).toThrow(end)
    expect(() => bytes(0x80, 0x80).readVarUint64()).toThrow(end)
  })

  test('read values that end exactly at the end', () => {
    expect(bytes(172, 2).readVarUint()).toBe(300)
    expect(bytes(0xff, 0xff, 0xff, 0xff, 0x0f).readVarUint()).toBe(0xffff_ffff)
    expect(bytes(0).readVarFloat()).toBe(0)
    expect(bytes(2, 7, 8).readByteArray()).toEqual(new Uint8Array([7, 8]))
  })

  test('stop at the written length of a buffer being written', () => {
    const buffer = new ByteBuffer()
    buffer.writeByte(1)

    expect(buffer.readByte()).toBe(1)
    expect(() => buffer.readByte()).toThrow(end)
    expect(() => buffer.readVarUint()).toThrow(end)
    expect(() => buffer.readVarFloat()).toThrow(end)
    expect(() => buffer.readString()).toThrow('Unterminated string in Kiwi message')
  })
})

test('writes a lone surrogate as U+FFFD without taking the character after it', () => {
  const roundTrip = (text: string) => {
    const buffer = new ByteBuffer()
    buffer.writeString(text)
    return new ByteBuffer(buffer.toUint8Array()).readString()
  }

  expect(roundTrip('a\uD800b')).toBe('a\uFFFDb')
  expect(roundTrip('a\uDC00b')).toBe('a\uFFFDb')
  expect(roundTrip('end\uD83D')).toBe('end\uFFFD')
  expect(roundTrip('smile \uD83D\uDE00')).toBe('smile \uD83D\uDE00')
  const buffer = new ByteBuffer()
  buffer.writeString('\uD800')
  expect(buffer.toUint8Array()).toEqual(new Uint8Array([0xef, 0xbf, 0xbd, 0]))
})

test('rejects malformed byte fields without corrupting buffer length', () => {
  const buffer = new ByteBuffer()
  expect(() => Reflect.apply(buffer.writeByteArray, buffer, [{ 0: 42 }])).toThrow(
    'Expected byte array'
  )
  expect(buffer.length).toBe(0)
  buffer.writeByteArray(new Uint8Array([42]))
  expect(buffer.toUint8Array()).toEqual(new Uint8Array([1, 42]))
})

const schemaText = `
package Example;

enum Kind {
  CARD = 1;
  BADGE = 2;
}

message Item {
  uint id = 1;
  string name = 2;
  Kind kind = 3;
  string[] tags = 4;
}
`

describe('Kiwi schema runtime', () => {
  test('parses and validates inline schemas', () => {
    const schema = parseSchema(schemaText)
    validateSchema(schema)

    expectFieldNumber(schema, 'Item', 'name', 2)
    expectFieldNumber(schema, 'Item', 'tags', 4)
    expectEnumValue(schema, 'Kind', 'BADGE', 2)
  })

  test('compiles schemas and round-trips messages', () => {
    const schema = parseSchema(schemaText)
    const codec = compileSchema(schema)
    const encodeItem = codec.encodeItem as (value: RuntimeMessage) => Uint8Array
    const decodeItem = codec.decodeItem as (value: Uint8Array) => RuntimeMessage

    const encoded = encodeItem({ id: 42, name: 'Pairdraw', kind: 'CARD', tags: ['kiwi'] })
    expect(encoded.length).toBeGreaterThan(0)
    expect(decodeItem(encoded)).toEqual({
      id: 42,
      name: 'Pairdraw',
      kind: 'CARD',
      tags: ['kiwi']
    })
  })

  test('compiles and round-trips without calling the Function constructor', () => {
    const OriginalFunction = globalThis.Function
    globalThis.Function = new Proxy(OriginalFunction, {
      construct() {
        throw new EvalError(
          "Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script"
        )
      }
    })

    try {
      const codec = compileSchema(parseSchema(schemaText))
      const encodeItem = codec.encodeItem as (value: RuntimeMessage) => Uint8Array
      const decodeItem = codec.decodeItem as (value: Uint8Array) => RuntimeMessage
      const encoded = encodeItem({ id: 7, name: 'CSP-safe', kind: 'BADGE', tags: [] })
      expect(decodeItem(encoded)).toEqual({
        id: 7,
        name: 'CSP-safe',
        kind: 'BADGE',
        tags: []
      })
    } finally {
      globalThis.Function = OriginalFunction
    }
  })

  test('uses the codec ByteBuffer override', () => {
    class CustomByteBuffer extends ByteBuffer {}

    const codec = compileSchema(parseSchema(schemaText))
    codec.ByteBuffer = CustomByteBuffer

    const encoded = (codec.encodeItem as (value: RuntimeMessage) => Uint8Array)({
      id: 1,
      name: 'custom',
      kind: 'CARD',
      tags: []
    })
    const decoded = (codec.decodeItem as (value: Uint8Array) => RuntimeMessage)(encoded)

    expect(decoded.name).toBe('custom')
  })

  test('reports unknown field types at their source location', () => {
    const malformedSchema = {
      package: null,
      definitions: [
        {
          name: 'Item',
          line: 4,
          column: 1,
          kind: 'MESSAGE' as const,
          fields: [
            {
              name: 'value',
              line: 5,
              column: 3,
              type: 'MissingType',
              isArray: false,
              isDeprecated: false,
              value: 1
            }
          ]
        }
      ]
    }

    expect(() => compileSchema(malformedSchema)).toThrow(
      'Invalid type "MissingType" for field "value"'
    )
    try {
      compileSchema(malformedSchema)
    } catch (error) {
      expect(error).toMatchObject({ line: 5, column: 3 })
    }
  })

  test('rejects inherited names as field types', () => {
    const malformedSchema = {
      package: null,
      definitions: [
        {
          name: 'Item',
          line: 4,
          column: 1,
          kind: 'MESSAGE' as const,
          fields: [
            {
              name: 'value',
              line: 5,
              column: 3,
              type: 'constructor',
              isArray: false,
              isDeprecated: false,
              value: 1
            }
          ]
        }
      ]
    }

    expect(() => compileSchema(malformedSchema)).toThrow(
      'Invalid type "constructor" for field "value"'
    )
    try {
      compileSchema(malformedSchema)
    } catch (error) {
      expect(error).toMatchObject({ line: 5, column: 3 })
    }
  })
})
