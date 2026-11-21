import { describe, expect, test } from 'bun:test'

import { checkBrandAssets } from '#brand/check'
import { pairdraw, repositoryRoot, webFiles } from '#brand/config'
import { generateDesktop } from '#brand/desktop'
import { canonicalIcns, icoSizes, validateFiles, validateMaskable } from '#brand/validate'
import { generateWeb } from '#brand/web'
import sharp from 'sharp'

const files = await generateWeb(repositoryRoot)
const docs = await generateWeb(repositoryRoot, 'docs')

function file(name: string, from = files): Buffer {
  const bytes = from.get(name)
  if (!bytes) throw new Error(`Missing ${name}`)
  return bytes
}

describe('brand generation', () => {
  test('produces the web and docs contract, without taking ownership of the PWA manifest', async () => {
    await validateFiles(files, 'web')
    await validateFiles(docs, 'docs')
    for (const name of webFiles) expect(files.has(name) && docs.has(name)).toBe(true)
    for (const output of [files, docs])
      expect([...output.keys()].some((name) => name.endsWith('.webmanifest'))).toBe(false)
    expect(icoSizes(file('favicon.ico')).sort((a, b) => a - b)).toEqual([16, 32, 48])
  })

  test('gives the documentation the same artwork as the app', () => {
    for (const name of webFiles) expect(file(name, docs).equals(file(name))).toBe(true)
  })

  test('keeps the square counter transparent and renders the micro master at 16px', async () => {
    const main = await sharp(file('brand/mark.svg')).ensureAlpha().raw().toBuffer()
    expect(main[(212 * 256 + 47) * 4 + 3]).toBe(0)
    expect(main[(212 * 256 + 17) * 4 + 3]).toBe(255)
    const micro = await sharp(file('brand/mark-micro.svg')).ensureAlpha().raw().toBuffer()
    expect(micro[(13 * 16 + 2) * 4 + 3]).toBe(0)
    expect(micro[(13 * 16 + 1) * 4 + 3]).toBe(255)
    expect(micro.length).toBe(16 * 16 * 4)
  })

  test('keeps the orange agent anchor in both themes and lightens the ink in dark', async () => {
    for (const name of ['mark', 'mark-micro']) {
      for (const suffix of ['', '-dark']) {
        const pixels = await sharp(file(`brand/${name}${suffix}.svg`), { density: 1152 })
          .resize(256, 256)
          .ensureAlpha()
          .raw()
          .toBuffer()
        const ink = suffix ? [255, 255, 255, 255] : [23, 23, 28, 255]
        for (const [x, y, rgba] of [
          // Anchor centre, square ring, curve.
          [204, 49, [255, 91, 46, 255]],
          [17, 212, ink],
          [81, 84, ink]
        ] as const) {
          const offset = (y * 256 + x) * 4
          expect([...pixels.subarray(offset, offset + 4)]).toEqual([...rgba])
        }
        expect(pixels[(212 * 256 + 47) * 4 + 3]).toBe(0)
      }
    }
  })

  test('keeps dark-mode favicon styling and separates light/dark UI artwork', () => {
    expect(file('brand/favicon.svg').toString()).toContain('prefers-color-scheme: dark')
    expect(file('brand/mark-dark.svg').equals(file('brand/mark.svg'))).toBe(false)
    expect(file('brand/mark-micro-dark.svg').equals(file('brand/mark-micro.svg'))).toBe(false)
  })

  test('keeps monochrome artwork flat in one color', async () => {
    for (const suffix of ['', '-dark']) {
      const pixels = await sharp(file(`brand/mark-mono${suffix}.svg`))
        .ensureAlpha()
        .raw()
        .toBuffer()
      const colors = new Set<string>()
      for (let offset = 0; offset < pixels.length; offset += 4) {
        if (pixels[offset + 3] === 255)
          colors.add(pixels.subarray(offset, offset + 3).toString('hex'))
      }
      expect(colors.size).toBeGreaterThan(0)
      const expected = Buffer.from(suffix ? 'ffffff' : '17171c', 'hex')
      for (const color of colors) {
        // Overlapping antialiased edges can round a channel down by one.
        expect(
          Buffer.from(color, 'hex').every((channel, i) => Math.abs(channel - expected[i]) <= 1)
        ).toBe(true)
      }
    }
  })

  test('shares the orange rounded tile across profile, favicon, and any-purpose PWA assets', async () => {
    for (const [name, size] of [
      ['brand/app-icon-1024.png', 1024],
      ['brand/favicon-96x96.png', 96],
      ['brand/pwa-192.png', 192],
      ['brand/pwa-512.png', 512]
    ] as const) {
      const { data, info } = await sharp(file(name))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      expect([info.width, info.height]).toEqual([size, size])
      expect(data[3]).toBe(0)
      // No desktop-style inset: the orange reaches the midpoint of each edge.
      for (const [x, y] of [
        [size / 2, 0],
        [0, size / 2],
        [size - 1, size / 2],
        [size / 2, size - 1]
      ]) {
        const edge = (y * size + x) * 4
        expect([...data.subarray(edge, edge + 4)]).toEqual([255, 91, 46, 255])
      }
      const offset = (Math.round((size * 80) / 1024) * size + size / 2) * 4
      expect([...data.subarray(offset, offset + 4)]).toEqual([255, 91, 46, 255])
    }
    const svg = await sharp(file('brand/app-icon.svg')).ensureAlpha().raw().toBuffer()
    const png = await sharp(file('brand/app-icon-1024.png')).ensureAlpha().raw().toBuffer()
    expect(svg.equals(png)).toBe(true)
  })

  test('draws the whole mark in white on the tile, with the tile showing through its counter', async () => {
    const pixels = await sharp(file('brand/app-icon-1024.png')).ensureAlpha().raw().toBuffer()
    for (const [x, y, rgba] of [
      // Anchor centre, square ring, square counter.
      [701, 317, [255, 255, 255, 255]],
      [237, 719, [255, 255, 255, 255]],
      [310, 719, [255, 91, 46, 255]]
    ] as const) {
      const offset = (y * 1024 + x) * 4
      expect([...pixels.subarray(offset, offset + 4)]).toEqual([...rgba])
    }
  })

  test('rejects a transparent maskable icon', async () => {
    await expect(
      validateMaskable(
        await sharp(file('brand/mark.svg')).resize(512).png().toBuffer(),
        pairdraw.background
      )
    ).rejects.toThrow('opaque')
  })

  test('rejects missing and wrong-size output', async () => {
    const missing = new Map(docs)
    missing.delete('favicon.ico')
    await expect(validateFiles(missing, 'docs')).rejects.toThrow('Missing brand output')
    const wrong = new Map(docs)
    wrong.set('apple-touch-icon.png', file('brand/pwa-512.png'))
    await expect(validateFiles(wrong, 'docs')).rejects.toThrow('apple-touch-icon.png')
  })

  test('composes the native icon on an inset orange tile and validates StoreLogo dimensions', async () => {
    const desktop = await generateDesktop(repositoryRoot)
    await validateFiles(desktop, 'desktop')
    const icon = desktop.get('icon.png')
    if (!icon) throw new Error('Missing icon.png')
    const pixels = await sharp(icon).ensureAlpha().raw().toBuffer()
    // The platform margin stays transparent around the orange tile and its white mark.
    for (const [x, y, rgba] of [
      [10, 256, [0, 0, 0, 0]],
      [48, 256, [255, 91, 46, 255]],
      [338, 171, [255, 255, 255, 255]]
    ] as const) {
      const offset = (y * 512 + x) * 4
      expect([...pixels.subarray(offset, offset + 4)]).toEqual([...rgba])
    }
    for (const name of ['icon.png', 'StoreLogo.png']) {
      const wrong = new Map(desktop)
      wrong.set(name, await sharp(file('brand/app-icon.svg')).resize(64, 64).png().toBuffer())
      await expect(validateFiles(wrong, 'desktop')).rejects.toThrow(name)
    }
  }, 30_000)

  test('web and docs output is byte-reproducible across repeated adapter instances', async () => {
    await checkBrandAssets(repositoryRoot, ['web', 'docs'])
  })

  test('normalizes ICNS frame ordering without changing frame bytes', () => {
    const chunk = (type: string) => {
      const buffer = Buffer.alloc(9)
      buffer.write(type)
      buffer.writeUInt32BE(9, 4)
      buffer[8] = 42
      return buffer
    }
    const a = chunk('ic07'),
      b = chunk('ic08')
    const header = Buffer.alloc(8)
    header.write('icns')
    header.writeUInt32BE(26, 4)
    expect(canonicalIcns(Buffer.concat([header, b, a]))).toEqual(Buffer.concat([header, a, b]))
    expect(() => canonicalIcns(Buffer.from('icns'))).toThrow('header')
    const bad = Buffer.concat([header, a, b])
    bad.writeUInt32BE(0, 12)
    expect(() => canonicalIcns(bad)).toThrow('chunk length')
  })

  test('rejects ICO frames that point outside their container', () => {
    const bad = Buffer.from(file('favicon.ico'))
    bad.writeUInt32LE(bad.length, 18)
    expect(() => icoSizes(bad)).toThrow('bounds')
  })
})
