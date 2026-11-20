import { describe, expect, test } from 'bun:test'

import { scriptResult } from '#core-tests/helpers/script'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { compileScript } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'

/** A document holding a Card frame with a Title, and its id. */
async function document() {
  const figma = new FigmaAPI(new SceneGraph())
  const card = await compileScript(`
    const card = figma.createFrame()
    card.name = 'Card'
    card.resize(200, 100)
    const title = figma.createText()
    title.name = 'Title'
    card.appendChild(title)
    return card.id
  `)(figma)
  if (typeof card !== 'string') throw new Error('No card')
  return { figma, card }
}

describe('pairdraw variations', () => {
  test('a script makes versions, flips through them, and uses one in place of the original', async () => {
    const { figma, card } = await document()
    const result = await compileScript(`
      const { set, versions } = pairdraw.createVariations(${JSON.stringify(card)}, { count: 2, labels: ['Round'] })
      versions[0].cornerRadius = 24
      const before = set.toJSON()
      const kept = set.use(versions[0])
      return {
        names: before.versions.map((version) => version.name),
        original: before.original.name,
        kept: { id: kept.id, name: kept.name, radius: kept.cornerRadius },
        remaining: pairdraw.variations.length
      }
    `)(figma)
    expect(result).toEqual({
      names: ['V1 · Round', 'V2'],
      original: 'Card',
      kept: { id: card, name: 'Card', radius: 24 },
      remaining: 0
    })
  })

  test('a set is found from a version and discarded whole', async () => {
    const { figma, card } = await document()
    const result = await compileScript(`
      const { versions } = pairdraw.createVariations(${JSON.stringify(card)}, { count: 3 })
      const set = pairdraw.getVariations(versions[1])
      const count = set.versions.length
      set.discard()
      return { count, after: pairdraw.getVariations(${JSON.stringify(card)}), sets: pairdraw.variations.length }
    `)(figma)
    expect(result).toEqual({ count: 3, after: null, sets: 0 })
  })

  test('a request out of range names the limit', async () => {
    const { figma, card } = await document()
    expect(
      await scriptResult(`pairdraw.createVariations(${JSON.stringify(card)}, { count: 12 })`, figma)
    ).toContain('1 to 8')
  })

  test('a label longer than a tool takes is refused, as the tool refuses it', async () => {
    const { figma, card } = await document()
    const label = 'x'.repeat(41)
    expect(
      await scriptResult(
        `pairdraw.createVariations(${JSON.stringify(card)}, { count: 1, labels: [${JSON.stringify(label)}] })`,
        figma
      )
    ).toContain('longer than 40 characters')
  })
})
