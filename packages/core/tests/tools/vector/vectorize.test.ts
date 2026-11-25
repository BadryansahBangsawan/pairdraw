import { describe, expect, test } from 'bun:test'

import { expectDefined, getNodeOrThrow } from '#core-tests/helpers/assert'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import {
  ALL_TOOLS,
  getImageVectorizer,
  registerImageVectorizer,
  type ImageVectorizeRequest
} from '@pairdraw/core/tools'
import { VECTORIZE_RESULT_GAP } from '@pairdraw/core/vector'
import { SceneGraph } from '@pairdraw/scene-graph'

const tool = expectDefined(
  ALL_TOOLS.find((candidate) => candidate.name === 'vectorize_image'),
  'vectorize_image tool'
)
const SQUARE_SVG = `<svg viewBox="0 0 100 100"><path d="M0 0 H100 V100 H0 Z" fill="#336699"/></svg>`
const IMAGE_BYTES = new Uint8Array([1, 2, 3])

function setup() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const page = expectDefined(graph.getPages()[0], 'page')
  graph.images.set('photo', IMAGE_BYTES)
  const node = graph.createNode('ELLIPSE', page.id, {
    name: 'Photo',
    x: 10,
    y: 20,
    width: 120,
    height: 80,
    fills: [
      {
        type: 'IMAGE',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
        imageHash: 'photo',
        imageScaleMode: 'FILL'
      }
    ]
  })
  return { graph, figma, page, node }
}

describe('vectorize_image', () => {
  test('is an async document edit that reaches the network', () => {
    expect(tool.execution).toEqual({ kind: 'async', mutation: 'document' })
    expect(tool.capabilities).toContain('network:access')
  })

  test('adds the vectors beside the image through the host service', async () => {
    const { graph, figma, page, node } = setup()
    const requests: ImageVectorizeRequest[] = []
    registerImageVectorizer(graph, {
      vectorize: async (request) => {
        requests.push(request)
        return SQUARE_SVG
      }
    })

    const result = await tool.execute(figma, { id: node.id })
    const frameId = expectDefined(
      (result as { id?: string }).id,
      `frame id in ${JSON.stringify(result)}`
    )
    expect(result).toMatchObject({ type: 'FRAME', source_id: node.id, paths: 1 })
    expect(requests).toEqual([{ imageHash: 'photo', bytes: IMAGE_BYTES }])
    expect(getNodeOrThrow(graph, node.id).type).toBe('ELLIPSE')
    expect(page.childIds).toEqual([node.id, frameId])
    expect(getNodeOrThrow(graph, frameId)).toMatchObject({
      x: 10 + 120 + VECTORIZE_RESULT_GAP,
      y: 20,
      width: 120,
      height: 80
    })
  })

  test('tells the agent where it cannot run', async () => {
    const { figma, node } = setup()
    expect(await tool.execute(figma, { id: node.id })).toEqual({
      error: expect.stringContaining('runs in the app')
    })
  })

  test('passes on what the service says when it fails', async () => {
    const { graph, figma, node } = setup()
    const unregister = registerImageVectorizer(graph, {
      vectorize: async () => {
        throw new Error('No Recraft API key is saved.')
      }
    })
    expect(await tool.execute(figma, { id: node.id })).toEqual({
      error: 'No Recraft API key is saved.'
    })
    unregister()
    expect(getImageVectorizer(graph)).toBeUndefined()
  })

  test('refuses layers without an image and leaves the document as it was', async () => {
    const { graph, figma, page } = setup()
    const solid = graph.createNode('RECTANGLE', page.id, { name: 'Solid' })
    registerImageVectorizer(graph, { vectorize: async () => SQUARE_SVG })
    const before = [...page.childIds]

    expect(await tool.execute(figma, { id: solid.id })).toEqual({
      error: '"Solid" has no visible image fill to vectorize'
    })
    expect(await tool.execute(figma, { id: 'missing' })).toEqual({
      error: 'Node "missing" not found'
    })
    expect(page.childIds).toEqual(before)
  })

  test('reads a color that names its space into the document profile', async () => {
    const { graph, figma, node } = setup()
    graph.documentColorSpace = 'display-p3'
    const oklch =
      '<svg viewBox="0 0 100 100"><path d="M0 0 H100 V100 H0 Z" fill="oklch(70% 0.25 145)"/></svg>'
    registerImageVectorizer(graph, { vectorize: async () => oklch })

    const result = await tool.execute(figma, { id: node.id })
    if (!result || typeof result !== 'object' || !('id' in result) || typeof result.id !== 'string')
      throw new Error(`no frame in ${JSON.stringify(result)}`)
    const frame = getNodeOrThrow(graph, result.id)
    const vector = frame.childIds.map((id) => getNodeOrThrow(graph, id))[0]
    const fill = vector?.fills.find((paint) => paint.type === 'SOLID')
    if (!fill) throw new Error('no fill')
    // Display P3 holds part of this chroma that sRGB cannot: its red stays above zero.
    expect(fill.color.r).toBeCloseTo(0.2749, 3)
    expect(fill.color.g).toBeCloseTo(0.7513, 3)
    expect(fill.color.b).toBeCloseTo(0.2254, 3)
  })

  test('adds nothing when the image changed while the service worked', async () => {
    const { graph, figma, page, node } = setup()
    registerImageVectorizer(graph, {
      vectorize: async () => {
        graph.updateNode(node.id, { fills: [] })
        return SQUARE_SVG
      }
    })

    expect(await tool.execute(figma, { id: node.id })).toEqual({
      error: 'The image of "Photo" changed before vectorizing finished'
    })
    expect(page.childIds).toEqual([node.id])
  })
})
