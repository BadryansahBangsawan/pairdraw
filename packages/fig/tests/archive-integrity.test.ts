import { describe, expect, test } from 'bun:test'

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
