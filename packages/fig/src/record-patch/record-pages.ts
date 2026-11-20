import { inflateSync } from 'fflate'

import type { GUID } from '@pairdraw/kiwi/fig'
import type { NodeChange } from '@pairdraw/kiwi/fig/codec'
import { guidToString } from '@pairdraw/kiwi/fig/guid'
import {
  ByteBuffer,
  compileSchema,
  decodeBinarySchema,
  type CompiledDefinition,
  type RuntimeCodec
} from '@pairdraw/kiwi/schema-runtime'

import { readFigArchiveParts } from '../archive'

function key(guid: GUID | undefined): string | undefined {
  return guid ? guidToString(guid) : undefined
}

interface RecordHead {
  guid?: GUID
  parentIndex: NodeChange['parentIndex']
  type: string | undefined
  /** Read only when asked for: what an instance shows, for finding where components are used. */
  symbolData?: unknown
}

/** Reads a record's identity, place and type, and moves past everything else in it. */
function scanRecord(
  codec: RuntimeCodec,
  record: CompiledDefinition,
  bb: ByteBuffer,
  readSymbolData: boolean
): RecordHead {
  const { schema } = codec
  const head: RecordHead = { guid: undefined, parentIndex: undefined, type: undefined }
  for (let id = bb.readVarUint(); id !== 0; id = bb.readVarUint()) {
    const field = record.byId[id]
    if (!field) throw new Error('Attempted to parse invalid record')
    const name = field.name
    if (name === 'guid') {
      head.guid = schema.read(field, bb) as GUID
    } else if (name === 'parentIndex') {
      head.parentIndex = schema.read(field, bb) as NodeChange['parentIndex']
    } else if (name === 'type') {
      head.type = field.definition?.names[bb.readVarUint()]
    } else if (name === 'symbolData' && readSymbolData) head.symbolData = schema.read(field, bb)
    else schema.skip(field, bb)
  }
  return head
}

function archiveCodec(schemaDeflated: Uint8Array): RuntimeCodec {
  return compileSchema(decodeBinarySchema(new ByteBuffer(inflateSync(schemaDeflated))))
}

/** An encoded archive's records with only the fields the page lookups read. */
function scannedRecords(bytes: ArrayBuffer): NodeChange[] {
  const parts = readFigArchiveParts(bytes)
  const codec = archiveCodec(parts.schemaDeflated)
  const { schema } = codec
  const fields = schema.definition('Message').byId
  const bb = new ByteBuffer(parts.dataRaw)
  const records: NodeChange[] = []
  for (;;) {
    const id = bb.readVarUint()
    if (id === 0) break
    const field = fields[id]
    if (!field) throw new Error('Attempted to parse invalid message')
    if (field.name !== 'nodeChanges' || !field.isArray) {
      schema.skip(field, bb)
      continue
    }
    const definition = field.definition
    if (!definition) throw new Error(`Kiwi ${field.name} holds no messages`)
    for (let count = bb.readVarUint(); count > 0; count--) {
      const head = scanRecord(codec, definition, bb, true)
      records.push({
        guid: head.guid,
        parentIndex: head.parentIndex,
        type: head.type,
        symbolData: head.symbolData
      } as NodeChange)
    }
  }
  if (records.length === 0) throw new Error('No nodes found in .fig file')
  return records
}

/** The id of the nearest record of `type` from `id` up through its parents, itself included. */
export function nearestOfType(
  byId: ReadonlyMap<string, NodeChange>,
  id: string,
  type: string
): string | undefined {
  const seen = new Set<string>()
  for (let current = byId.get(id); current;) {
    const currentId = key(current.guid)
    if (!currentId || seen.has(currentId)) return undefined
    seen.add(currentId)
    if (current.type === type) return currentId
    const parent = key(current.parentIndex?.guid)
    current = parent ? byId.get(parent) : undefined
  }
  return undefined
}

export function recordsById(records: readonly NodeChange[]): Map<string, NodeChange> {
  const byId = new Map<string, NodeChange>()
  for (const record of records) {
    const id = key(record.guid)
    if (id) byId.set(id, record)
  }
  return byId
}

/** The page each record is on, by its GUID, through its parents; undefined off every page. */
export function figRecordPages(
  records: readonly NodeChange[],
  ids: readonly string[]
): (string | undefined)[] {
  const byId = recordsById(records)
  return ids.map((id) => nearestOfType(byId, id, 'CANVAS'))
}

/** Each archive's records by GUID, scanned once: an archive's bytes are never written to. */
const archiveRecordIndexes = new WeakMap<ArrayBuffer, Map<string, NodeChange>>()

/** `figRecordPages` over an encoded archive, reading only what it needs of each record. */
export function figArchiveRecordPages(
  bytes: ArrayBuffer,
  ids: readonly string[]
): (string | undefined)[] {
  let byId = archiveRecordIndexes.get(bytes)
  if (!byId) {
    byId = recordsById(scannedRecords(bytes))
    archiveRecordIndexes.set(bytes, byId)
  }
  const index = byId
  return ids.map((id) => nearestOfType(index, id, 'CANVAS'))
}
