import { describe, expect, test } from 'bun:test'

import { runTool, setupToolTest } from '#core-tests/helpers/tools'

interface SerializedNode {
  rotation?: number
  cornerRadius?: number
  topLeftRadius?: number
  topRightRadius?: number
  bottomRightRadius?: number
  bottomLeftRadius?: number
  isMask?: boolean
  maskType?: string
  booleanOperation?: string
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

describe('get_node shape details', () => {
  test('reports every corner when the radii differ', async () => {
    const { figma } = setupToolTest()
    const node = figma.createRectangle()
    figma.graph.updateNode(node.id, {
      cornerRadius: 4,
      independentCorners: true,
      topLeftRadius: 4,
      topRightRadius: 8,
      bottomRightRadius: 12,
      bottomLeftRadius: 16
    })

    const json = (await runTool(figma, 'get_node', { id: node.id })) as SerializedNode

    expect(json).toMatchObject({
      topLeftRadius: 4,
      topRightRadius: 8,
      bottomRightRadius: 12,
      bottomLeftRadius: 16
    })
  })

  test('reports a mask and its type, and leaves a plain layer quiet', async () => {
    const { figma } = setupToolTest()
    const mask = figma.createRectangle()
    const plain = figma.createRectangle()
    figma.graph.updateNode(mask.id, { isMask: true, maskType: 'VECTOR' })

    const masked = (await runTool(figma, 'get_node', { id: mask.id })) as SerializedNode
    const quiet = (await runTool(figma, 'get_node', { id: plain.id })) as SerializedNode

    expect(masked.isMask).toBe(true)
    expect(masked.maskType).toBe('VECTOR')
    expect('isMask' in quiet).toBe(false)
    expect('maskType' in quiet).toBe(false)
  })

  test('reports a boolean operation on a boolean layer only', async () => {
    const { figma } = setupToolTest()
    const boolean = figma.graph.createNode('BOOLEAN_OPERATION', figma.currentPage.id, {
      name: 'Cut',
      width: 40,
      height: 40,
      booleanOperation: 'SUBTRACT'
    })
    const rectangle = figma.createRectangle()

    const cut = (await runTool(figma, 'get_node', { id: boolean.id })) as SerializedNode
    const quiet = (await runTool(figma, 'get_node', { id: rectangle.id })) as SerializedNode

    expect(cut.booleanOperation).toBe('SUBTRACT')
    expect('booleanOperation' in quiet).toBe(false)
  })

  test('leaves per-corner radii out when the shape renders a uniform radius', async () => {
    const { figma } = setupToolTest()
    const node = figma.createRectangle()
    // independentCorners=false: the stored per-corner values are stale (a .fig import or a
    // uniform radius-handle write leaves them), and the rendered shape is the uniform radius.
    figma.graph.updateNode(node.id, {
      cornerRadius: 10,
      independentCorners: false,
      topLeftRadius: 4,
      topRightRadius: 8,
      bottomRightRadius: 12,
      bottomLeftRadius: 16
    })

    const json = (await runTool(figma, 'get_node', { id: node.id })) as SerializedNode

    expect(json.cornerRadius).toBe(10)
    for (const field of [
      'topLeftRadius',
      'topRightRadius',
      'bottomRightRadius',
      'bottomLeftRadius'
    ])
      expect(field in json).toBe(false)
  })

  test('reports the agreed corner radius, not the stale uniform field', async () => {
    const { figma } = setupToolTest()
    const node = figma.createRectangle()
    figma.graph.updateNode(node.id, {
      cornerRadius: 10,
      independentCorners: true,
      topLeftRadius: 8,
      topRightRadius: 8,
      bottomRightRadius: 8,
      bottomLeftRadius: 8
    })

    const json = (await runTool(figma, 'get_node', { id: node.id })) as SerializedNode

    expect(json.cornerRadius).toBe(8)
    for (const field of [
      'topLeftRadius',
      'topRightRadius',
      'bottomRightRadius',
      'bottomLeftRadius'
    ])
      expect(field in json).toBe(false)
  })

  test('reports agreeing corners even when the uniform field is still zero', async () => {
    const { figma } = setupToolTest()
    const node = figma.createRectangle()
    figma.graph.updateNode(node.id, {
      cornerRadius: 0,
      independentCorners: true,
      topLeftRadius: 12,
      topRightRadius: 12,
      bottomRightRadius: 12,
      bottomLeftRadius: 12
    })

    const json = (await runTool(figma, 'get_node', { id: node.id })) as SerializedNode

    expect(json.cornerRadius).toBe(12)
    for (const field of [
      'topLeftRadius',
      'topRightRadius',
      'bottomRightRadius',
      'bottomLeftRadius'
    ])
      expect(field in json).toBe(false)
  })

  test('omits the uniform cornerRadius once the corners differ, as the proxy reads mixed', async () => {
    const { figma } = setupToolTest()
    const node = figma.createRectangle()
    figma.graph.updateNode(node.id, {
      cornerRadius: 10,
      independentCorners: true,
      topLeftRadius: 4,
      topRightRadius: 8,
      bottomRightRadius: 12,
      bottomLeftRadius: 16
    })

    const json = (await runTool(figma, 'get_node', { id: node.id })) as SerializedNode

    expect('cornerRadius' in json).toBe(false)
    expect(json).toMatchObject({
      topLeftRadius: 4,
      topRightRadius: 8,
      bottomRightRadius: 12,
      bottomLeftRadius: 16
    })
  })
})
