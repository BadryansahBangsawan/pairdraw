import { describe, expect, test } from 'bun:test'

import { readVerifiedArchive } from '#fig/zip'
import { zipSync } from 'fflate'

import { parseFigBuffer } from '@pairdraw/fig'

/** A stored (uncompressed) archive, so a flipped byte changes the payload and not the structure. */
function archive(data: Uint8Array): Uint8Array {
  return zipSync({ 'canvas.fig': [data, { level: 0 }] }, { level: 0 })
}

const PAYLOAD = new TextEncoder().encode('fig-kiwi not really a canvas, but a handled one')

function parse(bytes: Uint8Array): string {
  try {
    parseFigBuffer(bytes.slice().buffer)
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

describe('fig archive integrity', () => {
  test('rejects a file that does not start with a ZIP signature', () => {
    const bytes = archive(PAYLOAD)
    bytes.set([0xde, 0xad, 0xbe, 0xef], 0)

    expect(parse(bytes)).toMatch(/does not start with a ZIP signature/i)
  })

  test('rejects an entry whose bytes no longer match its checksum', () => {
    const bytes = archive(PAYLOAD)
    const name = new TextEncoder().encode('canvas.fig')
    const nameAt = bytes.findIndex((_, index) =>
      name.every((byte, offset) => bytes[index + offset] === byte)
    )
    // The stored bytes follow the local header's name: 30 bytes, then the name.
    bytes[nameAt + name.length + 5] ^= 0x01

    expect(parse(bytes)).toMatch(/checksum|corrupt/i)
  })

  test('leaves a whole archive to the canvas decoder', () => {
    expect(parse(archive(PAYLOAD))).not.toMatch(/checksum|ZIP signature/i)
  })
})

describe('fig archive inflation bounds', () => {
  test('refuses an entry that inflates past the archive limit', () => {
    const bomb = zipSync({ 'canvas.fig': new Uint8Array(2_000_000) })

    expect(() =>
      readVerifiedArchive(bomb, {
        maxEntries: 16,
        maxEntryBytes: 1_000_000,
        maxTotalBytes: 4_000_000
      })
    ).toThrow(/larger than 1000000 bytes/)
  })

  test('refuses an archive with more entries than allowed', () => {
    const many = zipSync(
      Object.fromEntries(Array.from({ length: 5 }, (_, index) => [`part${index}`, PAYLOAD]))
    )

    expect(() =>
      readVerifiedArchive(many, { maxEntries: 3, maxEntryBytes: 1_000, maxTotalBytes: 10_000 })
    ).toThrow(/more than 3 entries/)
  })

  test('refuses an entry that expands past the compression ratio', () => {
    // 65 MiB of zeros compresses to tens of KiB: over the 64 MiB / 200:1 threshold.
    const bomb = zipSync({ 'canvas.fig': new Uint8Array(65 * 1024 * 1024) })

    expect(() => readVerifiedArchive(bomb)).toThrow(/expands .*over 200:1/)
  })

  test('reads an archive within the limits', () => {
    const files = readVerifiedArchive(archive(PAYLOAD))

    expect(new TextDecoder().decode(files['canvas.fig'])).toBe(new TextDecoder().decode(PAYLOAD))
  })
})
