import { describe, expect, test } from 'bun:test'

import {
  ByteBuffer,
  compileSchema,
  compileSchemaTables,
  parseSchema,
  TYPE,
  type RuntimeMessage
} from '../src/schema-runtime'

const schema = parseSchema(`
package Example;

enum Kind {
  CARD = 1;
  BADGE = 2;
}

struct Point {
  float x;
  float y;
}

message Item {
  uint id = 1;
  Kind kind = 2;
  Point[] outline = 3;
  string note = 4;
  byte[] payload = 5;
  int64 stamp = 6;
  Item[] children = 7;
  bool old = 8 [deprecated];
}

message Document {
  Item[] items = 1;
  Kind[] kinds = 2;
}
`)

const document: RuntimeMessage = {
  items: [
    {
      id: 1,
      kind: 'CARD',
      outline: [
        { x: 1, y: 2 },
        { x: 0, y: -3.5 }
      ],
      note: 'first',
      payload: new Uint8Array([7, 8, 9]),
      stamp: 12345678901234n,
      children: [{ id: 3, note: 'nested', children: [{ id: 4, kind: 'BADGE' }] }]
    },
    { id: 2, note: 'second' }
  ],
  kinds: ['BADGE', 'CARD']
}

function encodedDocument(): Uint8Array {
  const encode = compileSchema(schema).encodeDocument as (message: RuntimeMessage) => Uint8Array
  return encode(document)
}

describe('compiled schema tables', () => {
  test('resolves every field to a type code and its definition', () => {
    const tables = compileSchemaTables(schema)
    const item = tables.definition('Item')

    expect(item.fields.map((field) => field.type)).toEqual([
      TYPE.UINT,
      TYPE.ENUM,
      TYPE.STRUCT,
      TYPE.STRING,
      TYPE.BYTE,
      TYPE.INT64,
      TYPE.MESSAGE,
      TYPE.BOOL
    ])
    expect(item.byId[2]?.definition?.name).toBe('Kind')
    expect(item.byId[7]?.definition).toBe(item)
    expect(item.byId[9]).toBeUndefined()
    expect(tables.definition('Kind').names[2]).toBe('BADGE')
    expect(() => tables.definition('Missing')).toThrow('Invalid type "Missing"')
  })

  test('skipping a field lands where reading it does, for every field kind', () => {
    const tables = compileSchemaTables(schema)
    const bytes = encodedDocument()
    const reading = new ByteBuffer(bytes)
    const skipping = new ByteBuffer(bytes)
    const message = tables.definition('Document')

    for (let id = reading.readVarUint(); id !== 0; id = reading.readVarUint()) {
      expect(skipping.readVarUint()).toBe(id)
      const field = message.byId[id]
      if (!field) throw new Error(`Unknown field ${id}`)
      tables.read(field, reading)
      tables.skip(field, skipping)
      expect(skipping.offset).toBe(reading.offset)
    }
    expect(skipping.readVarUint()).toBe(0)
    expect(reading.offset).toBe(bytes.length)
  })

  test('decodes through the tables what the codec encoded', () => {
    const tables = compileSchemaTables(schema)
    const decoded = tables.decode(tables.definition('Document'), new ByteBuffer(encodedDocument()))

    expect<unknown>(decoded).toEqual(document)
  })

  test('rejects a field ID the definition does not use', () => {
    const tables = compileSchemaTables(schema)
    const bytes = new ByteBuffer()
    bytes.writeVarUint(9)

    expect(() => tables.decode(tables.definition('Item'), bytes)).toThrow(
      'Attempted to parse invalid message'
    )
  })

  test('rejects a message cut short rather than decoding part of it', () => {
    const tables = compileSchemaTables(schema)
    const bytes = encodedDocument()
    const document = tables.definition('Document')

    for (const length of [1, 2, bytes.length >> 1, bytes.length - 1]) {
      expect(() => tables.decode(document, new ByteBuffer(bytes.subarray(0, length)))).toThrow()
    }
  })

  test('rejects an array that declares more items than bytes remain, before reading it', () => {
    const tables = compileSchemaTables(schema)
    const kinds = tables.definition('Document').byId[2]
    if (!kinds) throw new Error('Document has no kinds field')
    const declared = (length: number) => {
      const bytes = new ByteBuffer()
      bytes.writeVarUint(length)
      bytes.writeVarUint(1)
      return new ByteBuffer(bytes.toUint8Array())
    }

    expect(() => tables.read(kinds, declared(0xffff_ffff))).toThrow(
      'Kiwi array declares 4294967295 items, more than the bytes left in the message (1)'
    )
    expect(() => tables.skip(kinds, declared(0xffff_ffff))).toThrow('Kiwi array declares')
    expect(() => tables.read(kinds, declared(2))).toThrow('Kiwi array declares 2 items')
    expect(tables.read(kinds, declared(1))).toEqual(['CARD'])
  })
})
