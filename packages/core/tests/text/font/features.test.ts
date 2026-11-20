import { expect, test } from 'bun:test'

import { fontFeatureTags } from '#core/text/font/features'

import { FIXTURES } from '../../helpers/paths'

async function fontBytes(name: string): Promise<ArrayBuffer> {
  return Bun.file(`${FIXTURES}/fonts/${name}`).arrayBuffer()
}

test('a variable font lists the GSUB features it actually has', async () => {
  const tags = fontFeatureTags(await fontBytes('InterVariable-Latin.ttf'))
  expect(tags).not.toBeNull()
  // Inter's GSUB carries these; the list is the font's own, not a fixed guess. LIGA is absent
  // because Inter shapes common ligatures through CALT, as its own feature list says.
  expect(tags).toContain('CALT')
  expect(tags).toContain('TNUM')
  expect(tags).toContain('SS01')
  expect(tags).toContain('CV11')
  expect(tags).toContain('DLIG')
  expect(tags).toContain('ZERO')
  // Every tag is four characters, upper case, as the model's FontFeature writes them.
  for (const tag of tags ?? []) expect(tag).toMatch(/^[A-Z0-9]{4}$/)
})

test('a feature listed under several scripts appears once', async () => {
  // Noto Naskh Arabic lists LOCL and RLIG per script; the panel offers each feature once.
  const tags = fontFeatureTags(await fontBytes('NotoNaskhArabic-Regular.ttf'))
  expect(tags).not.toBeNull()
  expect(tags?.filter((tag) => tag === 'LOCL')).toHaveLength(1)
  expect(tags?.filter((tag) => tag === 'RLIG')).toHaveLength(1)
  expect(tags).toContain('LIGA')
})

test('a font whose GSUB lists no features answers an empty list', async () => {
  const tags = fontFeatureTags(await fontBytes('InterRegular-Faces.ttf'))
  expect(tags).toEqual([])
})

test('bytes that are not a font answer null', () => {
  expect(fontFeatureTags(new ArrayBuffer(0))).toBeNull()
  expect(fontFeatureTags(new Uint8Array([1, 2, 3, 4]).buffer)).toBeNull()
})