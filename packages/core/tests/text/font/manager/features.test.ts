import { expect, test } from 'bun:test'
import { join } from 'node:path'

import { FIXTURES } from '#core-tests/helpers/paths'

import { FontManager } from '@pairdraw/core/text'

function offlineManager() {
  const manager = new FontManager()
  manager.setOnlineFontProviders({})
  return manager
}

test('a loaded family answers the OpenType features its font has', async () => {
  const manager = offlineManager()
  const data = await Bun.file(join(FIXTURES, 'fonts', 'InterVariable-Latin.ttf')).arrayBuffer()
  manager.setHostFontLoader(async (family) => (family === 'Inter Var' ? data : null))
  await manager.loadFont('Inter Var', 'Regular')

  const features = manager.familyFeatures('Inter Var')
  expect(features).not.toBeUndefined()
  expect(features).toContain('CALT')
  expect(features).toContain('SS01')
  expect(features).toContain('TNUM')
})

test('a family with no loaded face answers undefined; a static one its own list', async () => {
  const manager = offlineManager()
  expect(manager.familyFeatures('Never Loaded')).toBeUndefined()

  const data = await Bun.file(join(FIXTURES, 'fonts', 'InterRegular-Faces.ttf')).arrayBuffer()
  manager.setHostFontLoader(async (family) => (family === 'Static Sans' ? data : null))
  await manager.loadFont('Static Sans', 'Regular')
  expect(manager.familyFeatures('Static Sans')).toEqual([])
})
