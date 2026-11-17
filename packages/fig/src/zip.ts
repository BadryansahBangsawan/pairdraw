import { unzipSync, type Unzipped } from 'fflate'

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
      crc: view.getUint32(record + 16, true)
    })
    record += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

/**
 * The archive's entries, after checking that the file is a ZIP at all and that every entry's bytes
 * still match the CRC-32 its central directory records. A ZIP reader alone inflates whatever the
 * structure points at, so one flipped byte otherwise decodes as a different document.
 */
export function readVerifiedArchive(bytes: Uint8Array): Unzipped {
  const signature =
    bytes.byteLength >= 4
      ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true)
      : -1
  if (signature !== LOCAL_SIGNATURE) {
    throw new Error('Not a .fig file: it does not start with a ZIP signature')
  }
  const entries = readCentralDirectory(bytes)
  const unzipped = unzipSync(bytes)
  for (const entry of entries) {
    if (!Object.hasOwn(unzipped, entry.name)) {
      throw new Error(`Corrupted .fig file: the entry "${entry.name}" is missing`)
    }
    if (crc32(unzipped[entry.name]) !== entry.crc) {
      throw new Error(`Corrupted .fig file: the entry "${entry.name}" fails its checksum`)
    }
  }
  return unzipped
}
