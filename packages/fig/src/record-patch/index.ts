import { inflateSync } from 'fflate'

import type { GUID } from '@pairdraw/kiwi/fig'
import type { NodeChange } from '@pairdraw/kiwi/fig/codec'
import type { FigDataCompressor, FigFileKind } from '@pairdraw/kiwi/fig/container'
import { guidToString } from '@pairdraw/kiwi/fig/guid'
import {
  ByteBuffer,
  compileSchema,
  decodeBinarySchema,
  type RuntimeCodec,
  type RuntimeMessage
} from '@pairdraw/kiwi/schema-runtime'
import { orderKeyBetween } from '@pairdraw/scene-graph/order-keys'

import { readFigArchiveParts, writeFigArchive, type FigImageEntry } from '../archive'
import { createResourceResolver } from '../document/resource-reference'
import { isModeledVariableType, variableCollectionId } from '../document/variables'
import { symbolDataOf, symbolOverridesOf } from '../instance-overrides/types'
import { patchedRecord, type FigRecordFieldPatch } from './fields'
import {
  nearestOfType,
  recordsById,
  scanRecord,
  type RecordHead as SharedRecordHead
} from './record-pages'

export {
  entryPathKey,
  type FigEntryListPatch,
  type FigEntryPatch,
  type FigRecordFieldPatch
} from './fields'
export { figArchiveRecordPages, figRecordPages } from './record-pages'

/**
 * What an edited document changes in the archive it was opened from: the records to write, by
 * GUID, and the records to drop. Records nobody touched stay as the archive saved them.
 */
export interface FigRecordPatch {
  /** Written in place of the archive's record with the same GUID, or added after the rest. */
  records: NodeChange[]
  /** Changed fields of records the archive holds, merged into them. */
  fields?: FigRecordFieldPatch[]
  /** Blobs the records add; their indices continue after the archive's. */
  blobs: Uint8Array[]
  /** Dropped together with every record below them. */
  removed: GUID[]
  /** The records hold every variable and collection, so the archive's are dropped. */
  replaceVariables: boolean
}

/** Archive facts a patch is built against: where new blob indices and new GUIDs start. */
export interface FigArchiveRecordInfo {
  /** Record identities on every page, including pages not materialized in the graph. */
  recordIds: string[]
  blobCount: number
  /** Above every local ID the archive uses with session 0 or 1, the sessions new GUIDs take. */
  nextLocalId: number
  imageHashes: string[]
  /** The document record's GUID, as `session:local`. */
  documentId: string | null
  /**
   * Variable records the reader leaves out of the document, such as one of a type OpenPencil does
   * not model; a save writes them back as they are.
   */
  unreadVariables: FigUnreadVariable[]
}

/** A variable record the reader left out, with the collection it names as the reader finds it. */
export interface FigUnreadVariable {
  record: NodeChange
  /** Absent when the record names no collection the file holds. */
  collectionId?: string
}

export interface FigPatchedArchiveInput {
  thumbnailPNG: Uint8Array
  metaJSON: string
  /** Images the archive does not hold yet. */
  images: FigImageEntry[]
  /** The patched archive's full font list, each named by its `fonts/<index>.<ext>` archive path. */
  fonts?: FigImageEntry[]
  /**
   * `fonts.json` for the patched archive. Fonts replace the archive's wholesale: pass the full
   * list whenever fonts change, or neither to keep the archive's.
   */
  fontsJSON?: string
  /** The zstd level the document data is written at; the archive is read whatever it used. */
  compressionLevel?: number
  /** A design file or a FigJam board; the archive's own kind when omitted. */
  kind?: FigFileKind
}

const VARIABLE_TYPES = new Set(['VARIABLE', 'VARIABLE_SET'])

function key(guid: GUID | undefined): string | undefined {
  return guid ? guidToString(guid) : undefined
}

function isGuidLike(value: object): value is GUID {
  return (
    'sessionID' in value &&
    'localID' in value &&
    typeof value.sessionID === 'number' &&
    typeof value.localID === 'number'
  )
}

/** Every GUID an archive embeds, record identities and references alike. */
function highestLocalId(records: readonly NodeChange[]): number {
  let highest = 0
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object' || ArrayBuffer.isView(value)) return
    if (Array.isArray(value)) {
      for (const item of value) visit(item)
      return
    }
    if (isGuidLike(value) && (value.sessionID === 0 || value.sessionID === 1))
      highest = Math.max(highest, value.localID)
    for (const item of Object.values(value)) visit(item)
  }
  visit(records)
  return highest
}

export function figArchiveRecordInfo(archive: {
  records: readonly NodeChange[]
  /** The variable and collection records, whole; `records` may hold only their headers. */
  resources: readonly NodeChange[]
  blobCount: number
  imageHashes: readonly string[]
}): FigArchiveRecordInfo {
  return {
    recordIds: archive.records.flatMap((record) =>
      record.guid ? [guidToString(record.guid)] : []
    ),
    blobCount: archive.blobCount,
    nextLocalId: highestLocalId(archive.records) + 1,
    imageHashes: [...archive.imageHashes],
    documentId: key(archive.records.find((record) => record.type === 'DOCUMENT')?.guid) ?? null,
    unreadVariables: unreadVariables(archive.resources)
  }
}

function unreadVariables(resources: readonly NodeChange[]): FigUnreadVariable[] {
  const resolve = createResourceResolver(resources)
  return resources
    .filter(
      (record) => record.type === 'VARIABLE' && !isModeledVariableType(record.variableResolvedType)
    )
    .map((record) => {
      const collectionId = variableCollectionId(record, resolve)
      return collectionId ? { record, collectionId } : { record }
    })
}

/**
 * A record as merging sees it: its identity, place and type, with its contents either the bytes
 * the archive holds or a record to encode.
 */
interface RecordEntry<Value> {
  id: string | undefined
  parent: string | undefined
  type: string | undefined
  parentIndex: NodeChange['parentIndex']
  value: Value
}

function entryOf(record: NodeChange): RecordEntry<NodeChange> {
  return {
    id: key(record.guid),
    parent: key(record.parentIndex?.guid),
    type: record.type,
    parentIndex: record.parentIndex,
    value: record
  }
}

const isVariable = (entry: { type: string | undefined }) =>
  !!entry.type && VARIABLE_TYPES.has(entry.type)

/** The removed records and those below them, except records the patch writes elsewhere. */
function removedRecords(
  records: ReadonlyArray<RecordEntry<unknown>>,
  roots: readonly GUID[],
  written: ReadonlySet<string>
): Set<string> {
  const children = new Map<string, string[]>()
  for (const record of records) {
    if (!record.id || !record.parent) continue
    const siblings = children.get(record.parent) ?? []
    siblings.push(record.id)
    children.set(record.parent, siblings)
  }
  const removed = new Set<string>()
  const pending = roots.map(guidToString)
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    if (removed.has(id) || written.has(id)) continue
    removed.add(id)
    for (const child of children.get(id) ?? []) pending.push(child)
  }
  return removed
}

/** Writes records in order, holding back one whose new parent has not been written yet. */
function createRecordWriter<Value>(
  written: ReadonlyMap<string, unknown>,
  archiveIds: ReadonlySet<string>
) {
  const result: Array<RecordEntry<Value>> = []
  const emitted = new Set<string>()
  const waiting = new Map<string, Array<RecordEntry<Value>>>()
  const isPending = (parent: string | undefined): parent is string =>
    !!parent && !emitted.has(parent) && written.has(parent) && !archiveIds.has(parent)
  const emit = (entry: RecordEntry<Value>): void => {
    if (isPending(entry.parent)) {
      waiting.set(entry.parent, [...(waiting.get(entry.parent) ?? []), entry])
      return
    }
    result.push(entry)
    if (!entry.id) return
    emitted.add(entry.id)
    const children = waiting.get(entry.id) ?? []
    waiting.delete(entry.id)
    for (const child of children) emit(child)
  }
  return {
    emit,
    emitted: (id: string) => emitted.has(id),
    finish(): Array<RecordEntry<Value>> {
      for (const children of waiting.values()) for (const child of children) result.push(child)
      return result
    }
  }
}

/** The last position under each parent among records that keep the position they have. */
function lastPositions(
  entries: ReadonlyArray<RecordEntry<unknown>>,
  archivePositions: ReadonlyMap<string, NodeChange['parentIndex']>
): Map<string, string> {
  const last = new Map<string, string>()
  for (const entry of entries) {
    const position = entry.parentIndex?.position
    const moves = isVariable(entry) && !(entry.id && archivePositions.has(entry.id))
    if (!entry.parent || !position || moves) continue
    if (position > (last.get(entry.parent) ?? '')) last.set(entry.parent, position)
  }
  return last
}

/**
 * Variables return to the places they had; new ones go after their canvas's last child, so no
 * position is shared with the styles and variables the archive keeps there.
 */
function placeVariableRecords(
  entries: ReadonlyArray<RecordEntry<unknown>>,
  archivePositions: ReadonlyMap<string, NodeChange['parentIndex']>
): void {
  const last = lastPositions(entries, archivePositions)
  for (const entry of entries) {
    if (!isVariable(entry) || entry.value instanceof Uint8Array) continue
    const record = entry.value as NodeChange
    const kept = entry.id ? archivePositions.get(entry.id) : undefined
    if (kept) record.parentIndex = structuredClone(kept)
    else if (entry.parent && record.parentIndex) {
      const position = orderKeyBetween(last.get(entry.parent) ?? null, null)
      record.parentIndex = { ...record.parentIndex, position }
      last.set(entry.parent, position)
    }
  }
}

/**
 * Add the archive records whose fields the patch changes to `written`, merged, and return the
 * records removed. A record an edit moved has left a removed parent; one it left in place goes
 * with it.
 */
function writeFieldPatches<Value>(
  archive: ReadonlyArray<RecordEntry<Value>>,
  patch: Pick<FigRecordPatch, 'fields' | 'removed'>,
  written: Map<string, RecordEntry<NodeChange>>,
  decode: (value: Value) => NodeChange
): Set<string> {
  const fields = new Map((patch.fields ?? []).map((entry) => [guidToString(entry.guid), entry]))
  const moved = [...fields].flatMap(([id, entry]) => ('parentIndex' in entry.set ? [id] : []))
  const removed = removedRecords(archive, patch.removed, new Set([...written.keys(), ...moved]))
  for (const entry of archive) {
    if (!entry.id || written.has(entry.id) || removed.has(entry.id)) continue
    const changed = fields.get(entry.id)
    if (changed) written.set(entry.id, entryOf(patchedRecord(decode(entry.value), changed)))
  }
  return removed
}

/**
 * Merge a patch into the archive's records. Untouched records keep their place; a written
 * record takes its archive record's, and one whose parent is new follows that parent.
 */
function mergeRecords<Value>(
  archive: ReadonlyArray<RecordEntry<Value>>,
  patch: Pick<FigRecordPatch, 'records' | 'fields' | 'removed' | 'replaceVariables'>,
  decode: (value: Value) => NodeChange
): Array<RecordEntry<Value | NodeChange>> {
  const written = new Map<string, RecordEntry<NodeChange>>()
  for (const record of patch.records) {
    const entry = entryOf(record)
    if (entry.id) written.set(entry.id, entry)
  }
  const removed = writeFieldPatches(archive, patch, written, decode)
  const archiveIds = new Set(archive.flatMap((entry) => entry.id ?? []))
  const archivePositions = new Map<string, NodeChange['parentIndex']>()
  const writer = createRecordWriter<Value | NodeChange>(written, archiveIds)

  for (const entry of archive) {
    if (entry.id && removed.has(entry.id)) continue
    const replacement = entry.id ? written.get(entry.id) : undefined
    if (patch.replaceVariables && isVariable(entry)) {
      // A variable the records still hold takes its old place; one they dropped is gone.
      if (entry.id) archivePositions.set(entry.id, entry.parentIndex)
      if (replacement) writer.emit(replacement)
      continue
    }
    writer.emit(replacement ?? entry)
  }
  for (const entry of written.values())
    if (entry.id && !writer.emitted(entry.id) && !archiveIds.has(entry.id)) writer.emit(entry)
  const result = writer.finish()
  if (patch.replaceVariables) placeVariableRecords(result, archivePositions)
  return result
}

/** Merge a patch into decoded archive records. */
export function patchFigRecords(
  archive: readonly NodeChange[],
  patch: Pick<FigRecordPatch, 'records' | 'fields' | 'removed' | 'replaceVariables'>
): NodeChange[] {
  return mergeRecords(archive.map(entryOf), patch, (record) => record).map((entry) => entry.value)
}

/**
 * The encoded bytes of the archive's records named by `ids`, in the archive's own schema. A
 * record whose type the schema does not model cannot be encoded again, so a save copies these.
 */
export function figRecordBytes(
  schemaDeflated: Uint8Array,
  dataRaw: Uint8Array,
  ids: readonly string[]
): Uint8Array[] {
  if (ids.length === 0) return []
  const wanted = new Set(ids)
  return scanMessage(archiveCodec(schemaDeflated), dataRaw).records.flatMap((record) =>
    record.id !== undefined && wanted.has(record.id) ? [record.value] : []
  )
}

/** `message` with these record bytes appended to its `nodeChanges`, framed as the archive does. */
export function appendFigRecordBytes(
  schemaDeflated: Uint8Array,
  message: Uint8Array,
  chunks: readonly Uint8Array[]
): Uint8Array {
  if (chunks.length === 0) return message
  const { schema } = archiveCodec(schemaDeflated)
  const fields = schema.definition('Message').byId
  const bb = new ByteBuffer(message)
  for (;;) {
    const key = bb.readVarUint()
    const field = fields[key]
    if (!field) throw new Error('Attempted to parse invalid message')
    if (field.name === 'nodeChanges' && field.isArray) {
      const countStart = bb.offset
      const count = bb.readVarUint()
      const countBytes = bb.offset - countStart
      const definition = field.definition
      if (!definition) throw new Error('Kiwi nodeChanges holds no messages')
      const element = { ...field, isArray: false }
      for (let index = 0; index < count; index++) schema.skip(element, bb)
      const recordsEnd = bb.offset
      // One block carries every record: a second one would replace the first on decode.
      return concat([
        message.subarray(0, countStart),
        varUint(count + chunks.length),
        message.subarray(countStart + countBytes, recordsEnd),
        ...chunks,
        message.subarray(recordsEnd)
      ])
    }
    if (key === 0) break
    schema.skip(field, bb)
  }
  throw new Error('The archive message has no records')
}

type RecordHead = Omit<RecordEntry<Uint8Array>, 'value'> & SharedRecordHead
type EncodedPart =
  | { kind: 'bytes'; bytes: Uint8Array }
  | { kind: 'records' | 'blobs'; fieldId: number; type: string }

/** The encoded message's fields in order, with its records and blobs located by byte range. */
interface ScannedMessage {
  parts: EncodedPart[]
  records: Array<RecordHead & { value: Uint8Array }>
  blobs: Uint8Array[]
  hasBlobs: boolean
}

function scanMessage(
  codec: RuntimeCodec,
  data: Uint8Array,
  readSymbolData = false
): ScannedMessage {
  const { schema } = codec
  const fields = schema.definition('Message').byId
  const bb = new ByteBuffer(data)
  const scanned: ScannedMessage = { parts: [], records: [], blobs: [], hasBlobs: false }
  for (;;) {
    const start = bb.offset
    const id = bb.readVarUint()
    if (id === 0) break
    const field = fields[id]
    if (!field) throw new Error('Attempted to parse invalid message')
    const isRecords = field.name === 'nodeChanges' && field.isArray
    const isBlobs = field.name === 'blobs' && field.isArray
    if (!isRecords && !isBlobs) {
      schema.skip(field, bb)
      scanned.parts.push({ kind: 'bytes', bytes: data.subarray(start, bb.offset) })
      continue
    }
    const definition = field.definition
    if (!definition) throw new Error(`Kiwi ${field.name} holds no messages`)
    const type = definition.name
    const element = { ...field, isArray: false }
    for (let count = bb.readVarUint(); count > 0; count--) {
      const begin = bb.offset
      if (isRecords) {
        const head = scanRecord(codec, definition, bb, readSymbolData)
        scanned.records.push({
          id: head.id,
          parent: head.parent,
          type: head.type,
          parentIndex: head.parentIndex,
          guid: head.guid,
          symbolData: head.symbolData,
          value: data.subarray(begin, bb.offset)
        })
      } else {
        schema.skip(element, bb)
        scanned.blobs.push(data.subarray(begin, bb.offset))
      }
    }
    scanned.hasBlobs ||= isBlobs
    scanned.parts.push({ kind: isRecords ? 'records' : 'blobs', fieldId: id, type })
  }
  if (scanned.records.length === 0) throw new Error('No nodes found in .fig file')
  return scanned
}

function archiveCodec(schemaDeflated: Uint8Array): RuntimeCodec {
  return compileSchema(decodeBinarySchema(new ByteBuffer(inflateSync(schemaDeflated))))
}

function varUint(value: number): Uint8Array {
  const bb = new ByteBuffer()
  bb.writeVarUint(value)
  return bb.toUint8Array().slice()
}

function encoded(codec: RuntimeCodec, type: string, value: unknown): Uint8Array {
  const bb = new ByteBuffer()
  codec.schema.encode(codec.schema.definition(type), value as RuntimeMessage, bb)
  return bb.toUint8Array().slice()
}

function concat(chunks: readonly Uint8Array[]): Uint8Array {
  let length = 0
  for (const chunk of chunks) length += chunk.byteLength
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

/**
 * The archive's message with the patch applied. Untouched records and blobs are copied as the
 * bytes they are and only written records are encoded, so the cost follows the edit.
 */
export function patchFigMessage(
  schemaDeflated: Uint8Array,
  dataRaw: Uint8Array,
  patch: FigRecordPatch
): Uint8Array {
  const codec = archiveCodec(schemaDeflated)
  const { schema } = codec
  const scanned = scanMessage(codec, dataRaw)
  const recordsPart = scanned.parts.find((part) => part.kind === 'records')
  // Only the records an edit changed some fields of are decoded; the rest stay bytes.
  const decode = (bytes: Uint8Array): NodeChange => {
    if (recordsPart?.kind !== 'records') throw new Error('The archive has no records')
    return schema.decode(schema.definition(recordsPart.type), new ByteBuffer(bytes))
  }
  const merged = mergeRecords(scanned.records, patch, decode)
  const blobs = (type: string) => [
    ...scanned.blobs,
    ...patch.blobs.map((bytes) => encoded(codec, type, { bytes }))
  ]
  // Appended one by one: a document's records are far more than a call can take as arguments.
  const chunks: Uint8Array[] = []
  const appendField = (fieldId: number, values: readonly Uint8Array[]) => {
    chunks.push(varUint(fieldId), varUint(values.length))
    for (const value of values) chunks.push(value)
  }
  for (const part of scanned.parts) {
    if (part.kind === 'bytes') chunks.push(part.bytes)
    else if (part.kind === 'blobs') appendField(part.fieldId, blobs(part.type))
    else
      appendField(
        part.fieldId,
        merged.map((entry) =>
          entry.value instanceof Uint8Array ? entry.value : encoded(codec, part.type, entry.value)
        )
      )
  }
  if (!scanned.hasBlobs && patch.blobs.length > 0) {
    const field = schema.definition('Message').fields.find((entry) => entry.name === 'blobs')
    if (!field?.definition) throw new Error('The archive schema has no blobs')
    appendField(field.id, blobs(field.definition.name))
  }
  chunks.push(varUint(0))
  return concat(chunks)
}

/** Write the archive with the patch applied, in the archive's own schema. */
export function patchFigArchive(
  bytes: ArrayBuffer,
  patch: FigRecordPatch,
  input: FigPatchedArchiveInput,
  compress?: FigDataCompressor
): Uint8Array {
  const parts = readFigArchiveParts(bytes)
  const kiwiData = patchFigMessage(parts.schemaDeflated, parts.dataRaw, patch)
  const archiveImages = new Set(parts.images.map(([hash]) => hash))
  const archived = input.fonts === undefined && input.fontsJSON === undefined
  return writeFigArchive({
    schemaDeflated: parts.schemaDeflated,
    kiwiData,
    thumbnailPNG: input.thumbnailPNG,
    metaJSON: input.metaJSON,
    images: [
      ...parts.images.map(([name, data]) => ({ name: `images/${name}`, data })),
      ...input.images.filter((image) => !archiveImages.has(image.name.replace(/^images\//, '')))
    ],
    fonts: archived
      ? parts.fonts.map(([name, data]) => ({ name: `fonts/${name}`, data }))
      : input.fonts,
    fontsJSON: archived ? (parts.fontsJSON ?? undefined) : input.fontsJSON,
    figKiwiVersion: parts.figKiwiVersion,
    compress,
    kind: input.kind ?? parts.kind
  })
}

/**
 * The pages whose instances use these components, directly or through a component that nests
 * one of them. Their records carry overrides and sizes derived from the components.
 */
export function figComponentUsePages(
  records: readonly NodeChange[],
  componentIds: readonly string[]
): string[] {
  const byId = recordsById(records)
  const instancesOf = new Map<string, string[]>()
  const use = (componentId: string | undefined, instanceId: string) => {
    if (!componentId) return
    const instances = instancesOf.get(componentId) ?? []
    instances.push(instanceId)
    instancesOf.set(componentId, instances)
  }
  for (const record of records) {
    const id = key(record.guid)
    if (!id || record.type !== 'INSTANCE') continue
    use(key(symbolDataOf(record)?.symbolID), id)
    for (const override of symbolOverridesOf(record)) use(key(override.overriddenSymbolID), id)
  }
  const nearest = (id: string, type: string) => nearestOfType(byId, id, type)
  const pages = new Set<string>()
  const visited = new Set<string>()
  const pending = [...componentIds]
  for (let componentId = pending.pop(); componentId !== undefined; componentId = pending.pop()) {
    if (visited.has(componentId)) continue
    visited.add(componentId)
    for (const instanceId of instancesOf.get(componentId) ?? []) {
      const page = nearest(instanceId, 'CANVAS')
      if (page) pages.add(page)
      const owner = nearest(instanceId, 'SYMBOL')
      if (owner) pending.push(owner)
    }
  }
  return [...pages]
}

/** `figComponentUsePages` over an encoded archive, reading only what it needs of each record. */
export function figArchiveComponentUsePages(
  bytes: ArrayBuffer,
  componentIds: readonly string[]
): string[] {
  const parts = readFigArchiveParts(bytes)
  const codec = archiveCodec(parts.schemaDeflated)
  const scanned = scanMessage(codec, parts.dataRaw, true)
  const records = scanned.records.map(
    (entry) =>
      ({
        guid: entry.guid,
        parentIndex: entry.parentIndex,
        type: entry.type,
        symbolData: entry.symbolData
      }) as NodeChange
  )
  return figComponentUsePages(records, componentIds)
}
