import { inflateSync, type Unzipped } from 'fflate'

const LOCAL_SIGNATURE = 0x04034b50
const CENTRAL_SIGNATURE = 0x02014b50
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50
const END_OF_CENTRAL_DIRECTORY_SIZE = 22
const MAX_ZIP_COMMENT = 0xffff

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index++) {
    let value = index
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

/** The CRC-32 of the decompressed ZIP entry data, the checksum its central directory records. */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

interface ZipEntry {
  name: string
  crc: number
  compression: number
  localOffset: number
  compressedSize: number
  uncompressedSize: number
}

/** The archive's central directory: every entry's name and recorded checksum. */
function readCentralDirectory(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const start = Math.max(0, bytes.byteLength - END_OF_CENTRAL_DIRECTORY_SIZE - MAX_ZIP_COMMENT)
  let end = -1
  for (let offset = bytes.byteLength - END_OF_CENTRAL_DIRECTORY_SIZE; offset >= start; offset--) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      end = offset
      break
    }
  }
  if (end < 0) throw new Error('Corrupted .fig file: the ZIP directory is missing')
  const count = view.getUint16(end + 10, true)
  const size = view.getUint32(end + 12, true)
  const offset = view.getUint32(end + 16, true)
  if (offset + size > bytes.byteLength) {
    throw new Error('Corrupted .fig file: the ZIP directory points outside the file')
  }

  const entries: ZipEntry[] = []
  for (let record = offset; entries.length < count;) {
    if (record + 46 > bytes.byteLength) {
      throw new Error('Corrupted .fig file: the ZIP directory ends early')
    }
    if (view.getUint32(record, true) !== CENTRAL_SIGNATURE) {
      throw new Error('Corrupted .fig file: a ZIP directory entry has no header')
    }
    const nameLength = view.getUint16(record + 28, true)
    const extraLength = view.getUint16(record + 30, true)
    const commentLength = view.getUint16(record + 32, true)
    const localOffset = view.getUint32(record + 42, true)
    if (
      localOffset + 4 > bytes.byteLength ||
      view.getUint32(localOffset, true) !== LOCAL_SIGNATURE
    ) {
      throw new Error('Corrupted .fig file: a ZIP entry has no local header')
    }
    entries.push({
      name: new TextDecoder().decode(bytes.subarray(record + 46, record + 46 + nameLength)),
      crc: view.getUint32(record + 16, true),
      compression: view.getUint16(record + 10, true),
      localOffset,
      compressedSize: view.getUint32(record + 20, true),
      uncompressedSize: view.getUint32(record + 24, true)
    })
    record += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

/** What an archive may inflate to, so a small crafted file cannot exhaust memory. */
export interface ArchiveLimits {
  maxEntries: number
  maxEntryBytes: number
  maxTotalBytes: number
  /** Entries larger than this are checked for a suspicious compression ratio. */
  compressionRatioFromBytes?: number
  /** The most an entry over `compressionRatioFromBytes` may expand, compressed to uncompressed. */
  maxCompressionRatio?: number
}

/**
 * Room for a large real document: a `.fig` can hold hundreds of megabytes of images (nuxtui.fig
 * has 85 MB over 750 entries). The ratio check is what refuses a crafted archive, whose entries
 * expand far beyond anything an image compresses to.
 */
export const DEFAULT_ARCHIVE_LIMITS: ArchiveLimits = {
  maxEntries: 100_000,
  maxEntryBytes: 1024 * 1024 * 1024,
  maxTotalBytes: 2 * 1024 * 1024 * 1024,
  compressionRatioFromBytes: 64 * 1024 * 1024,
  maxCompressionRatio: 200
}

function megabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}

/** Refuses an entry whose declared expansion is a bomb, before any of it is inflated. */
function assertEntryAllowed(entry: ZipEntry, limits: ArchiveLimits): void {
  if (entry.uncompressedSize > limits.maxEntryBytes) {
    throw new Error(
      `Archive entry "${entry.name}" is larger than ${limits.maxEntryBytes} bytes (${megabytes(
        entry.uncompressedSize
      )}); the limit is ${megabytes(limits.maxEntryBytes)}`
    )
  }
  const from = limits.compressionRatioFromBytes
  const maxRatio = limits.maxCompressionRatio
  if (
    from !== undefined &&
    maxRatio !== undefined &&
    entry.uncompressedSize > from &&
    entry.compressedSize > 0 &&
    entry.uncompressedSize / entry.compressedSize > maxRatio
  ) {
    throw new Error(
      `Archive entry "${entry.name}" expands ${megabytes(
        entry.uncompressedSize
      )} from ${megabytes(entry.compressedSize)} (over ${maxRatio}:1); the limit for entries over ${megabytes(
        from
      )} is ${maxRatio}:1`
    )
  }
}

/**
 * An entry's bytes: stored data as it lies in the file, and deflated data expanded into a buffer
 * of the size the directory records, so a stream larger than its header claims is truncated and
 * fails its checksum instead of growing memory.
 */
function readEntryData(bytes: Uint8Array, entry: ZipEntry): Uint8Array<ArrayBuffer> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const local = entry.localOffset
  if (local + 30 > bytes.byteLength) {
    throw new Error(`Corrupted .fig file: the entry "${entry.name}" has no local header`)
  }
  const nameLength = view.getUint16(local + 26, true)
  const extraLength = view.getUint16(local + 28, true)
  const start = local + 30 + nameLength + extraLength
  const end = start + entry.compressedSize
  if (end > bytes.byteLength) {
    throw new Error(`Corrupted .fig file: the entry "${entry.name}" ends outside the file`)
  }
  const compressed = bytes.subarray(start, end)
  if (entry.compression === 0) {
    if (entry.compressedSize !== entry.uncompressedSize) {
      throw new Error(`Corrupted .fig file: the stored entry "${entry.name}" has two sizes`)
    }
    return compressed.slice()
  }
  if (entry.compression !== 8) {
    throw new Error(
      `Corrupted .fig file: the entry "${entry.name}" uses unsupported compression ${entry.compression}`
    )
  }
  const expanded = inflateSync(compressed, { out: new Uint8Array(entry.uncompressedSize) })
  if (expanded.length !== entry.uncompressedSize) {
    throw new Error(`Corrupted .fig file: the entry "${entry.name}" is shorter than it records`)
  }
  return expanded
}

/**
 * The archive's entries, after checking that the file is a ZIP at all and that every entry's bytes
 * still match the CRC-32 its central directory records. A ZIP reader alone inflates whatever the
 * structure points at, so one flipped byte otherwise decodes as a different document.
 */
export function readVerifiedArchive(
  bytes: Uint8Array,
  limits: ArchiveLimits = DEFAULT_ARCHIVE_LIMITS
): Unzipped {
  const signature =
    bytes.byteLength >= 4
      ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true)
      : -1
  if (signature !== LOCAL_SIGNATURE) {
    throw new Error('Not a .fig file: it does not start with a ZIP signature')
  }
  const entries = readCentralDirectory(bytes)
  if (entries.length > limits.maxEntries) {
    throw new Error(`Archive has more than ${limits.maxEntries} entries`)
  }
  let total = 0
  for (const entry of entries) {
    assertEntryAllowed(entry, limits)
    total += entry.uncompressedSize
    if (total > limits.maxTotalBytes) {
      throw new Error(
        `Archive is larger than ${limits.maxTotalBytes} bytes (${megabytes(
          total
        )}); the limit is ${megabytes(limits.maxTotalBytes)}`
      )
    }
  }
  const unzipped: Unzipped = {}
  for (const entry of entries) {
    const data = readEntryData(bytes, entry)
    if (crc32(data) !== entry.crc) {
      throw new Error(`Corrupted .fig file: the entry "${entry.name}" fails its checksum`)
    }
    unzipped[entry.name] = data
  }
  return unzipped
}
