import { describe, expect, test } from 'bun:test'

import { runTool, setupToolTest } from '#core-tests/helpers/tools'

interface SerializedNode {
  rotation?: number
}

describe('get_node rotation', () => {
  test('reads back an angle set_rotation applied', async () => {
    const { figma } = setupToolTest()
    const node = figma.createRectangle()

    await runTool(figma, 'set_rotation', { id: node.id, angle: 30 })
    const json = (await runTool(figma, 'get_node', { id: node.id })) as SerializedNode

    expect(json.rotation).toBe(30)
  })

  test('omits rotation while the node faces forward', async () => {
    const { figma } = setupToolTest()
    const node = figma.createRectangle()

    const json = (await runTool(figma, 'get_node', { id: node.id })) as SerializedNode

    expect('rotation' in json).toBe(false)
  })
})
