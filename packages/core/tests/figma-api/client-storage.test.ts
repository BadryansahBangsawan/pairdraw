import { describe, expect, test } from 'bun:test'

import { createAPI } from '#core-tests/helpers/figma-api'

describe('figma.clientStorage', () => {
  test('round-trips a value, and an unknown key reads undefined', async () => {
    const figma = createAPI()
    await figma.clientStorage.setAsync('qa-a11y-tokens', { scale: 2 })
    expect(await figma.clientStorage.getAsync('qa-a11y-tokens')).toEqual({ scale: 2 })
    expect(await figma.clientStorage.getAsync('qa-missing')).toBeUndefined()
  })

  test('hands out copies, so editing what was read does not change the store', async () => {
    const figma = createAPI()
    const stored = { list: [1, 2] }
    await figma.clientStorage.setAsync('qa-copy', stored)
    const read = await figma.clientStorage.getAsync('qa-copy')
    read.list.push(3)
    expect(await figma.clientStorage.getAsync('qa-copy')).toEqual({ list: [1, 2] })
    stored.list.push(9)
    expect(await figma.clientStorage.getAsync('qa-copy')).toEqual({ list: [1, 2] })
  })

  test('lists keys and deletes one', async () => {
    const figma = createAPI()
    await figma.clientStorage.setAsync('qa-key-1', 1)
    await figma.clientStorage.setAsync('qa-key-2', 2)
    expect(await figma.clientStorage.keysAsync()).toEqual(
      expect.arrayContaining(['qa-key-1', 'qa-key-2'])
    )
    await figma.clientStorage.deleteAsync('qa-key-1')
    expect(await figma.clientStorage.getAsync('qa-key-1')).toBeUndefined()
    await figma.clientStorage.deleteAsync('qa-key-1')
  })
})
