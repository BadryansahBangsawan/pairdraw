import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import * as v from 'valibot'

import { parseFigFile, type ParseFigFileOptions } from '@pairdraw/core/io/formats/fig'
import type { NodeChange } from '@pairdraw/kiwi/fig/codec'
import type { SceneGraph } from '@pairdraw/scene-graph'

import { FIXTURES } from '../paths'

export { FIXTURES }

/** Read a shared JSON fixture and validate it; a module import would escape the package root. */
export function readFixture<TSchema extends v.GenericSchema>(
  name: string,
  schema: TSchema
): v.InferOutput<TSchema> {
  return v.parse(
    v.pipe(v.string(), v.parseJson(), schema),
    readFileSync(resolve(FIXTURES, name), 'utf8')
  )
}

/** The Kiwi codec validates a node change; a fixture only checks that the record is an object. */
const figNodeChangeFixtureSchema = v.custom<NodeChange>(
  (value) => typeof value === 'object' && value !== null
)

/** A `{ nodeChanges, blobs }` capture recorded from a live Figma document. */
export const capturedFigRecordsSchema = v.object({
  nodeChanges: v.array(figNodeChangeFixtureSchema),
  blobs: v.array(v.string())
})

/** `nested-layout-scale.json`: the same document before and after a nested padding edit. */
export const nestedLayoutScaleFixtureSchema = v.object({
  ids: v.object({
    page: v.string(),
    inner: v.string(),
    outer: v.string(),
    nested: v.string(),
    instance: v.string()
  }),
  before: v.array(figNodeChangeFixtureSchema),
  edited: v.array(figNodeChangeFixtureSchema),
  blobs: v.array(v.string())
})

function readFixtureBytes(name: string): Uint8Array {
  return readFileSync(resolve(FIXTURES, name))
}

function uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = bytes.buffer
  if (buffer instanceof ArrayBuffer) {
    return buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  }

  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

export function readFixtureArrayBuffer(name: string): ArrayBuffer {
  return uint8ArrayToArrayBuffer(readFixtureBytes(name))
}

export async function parseFixture(
  name: string,
  options?: ParseFigFileOptions
): Promise<SceneGraph> {
  return parseFigFile(readFixtureArrayBuffer(name), options)
}
