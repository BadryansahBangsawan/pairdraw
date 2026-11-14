import { describe, expect, test } from 'bun:test'

import { toUint8Array } from 'js-base64'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { ALL_TOOLS } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'

import { expectDefined, expectFills } from '#tests/helpers/assert'

const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
/** A whole 1×1 PNG, which an image fetched by URL must be. */
const PIXEL_PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
)

function setup() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  return { graph, figma }
}

describe('set_image_fill tool', () => {
  const tool = expectDefined(
    ALL_TOOLS.find((t) => t.name === 'set_image_fill'),
    'set_image_fill tool'
  )

  test('sets an IMAGE fill with correct imageHash and scaleMode', async () => {
    const { figma } = setup()
    const shape = expectDefined(
      ALL_TOOLS.find((t) => t.name === 'create_shape'),
      'create_shape tool'
    )
    const node = shape.execute(figma, {
      type: 'RECTANGLE',
      x: 0,
      y: 0,
      width: 100,
      height: 100
    }) as { id: string }

    const b64 = PNG_MAGIC.toBase64()
    const result = (await tool.execute(figma, { id: node.id, image_data: b64 })) as {
      id: string
      imageHash: string
      scaleMode: string
    }

    expect(result.imageHash).toBeTruthy()
    expect(result.scaleMode).toBe('FILL')

    const fills = expectFills(expectDefined(figma.getNodeById(node.id), 'image-filled node').fills)
    expect(fills).toHaveLength(1)
    expect(fills[0]).toMatchObject({
      type: 'IMAGE',
      imageHash: result.imageHash,
      scaleMode: 'FILL'
    })
  })

  test('returns error for non-existent node', async () => {
    const { figma } = setup()
    const result = (await tool.execute(figma, {
      id: 'nonexistent',
      image_data: PNG_MAGIC.toBase64()
    })) as {
      error: string
    }
    expect(result.error).toContain('not found')
  })

  test('default scale mode is FILL', async () => {
    const { figma } = setup()
    const shape = expectDefined(
      ALL_TOOLS.find((t) => t.name === 'create_shape'),
      'create_shape tool'
    )
    const node = shape.execute(figma, { type: 'RECTANGLE', x: 0, y: 0, width: 50, height: 50 }) as {
      id: string
    }

    const result = (await tool.execute(figma, {
      id: node.id,
      image_data: PNG_MAGIC.toBase64()
    })) as {
      scaleMode: string
    }
    expect(result.scaleMode).toBe('FILL')
  })

  test('all scale modes work', async () => {
    const modes = ['FILL', 'FIT', 'CROP', 'TILE'] as const
    for (const mode of modes) {
      const { figma } = setup()
      const shape = expectDefined(
        ALL_TOOLS.find((t) => t.name === 'create_shape'),
        'create_shape tool'
      )
      const node = shape.execute(figma, {
        type: 'RECTANGLE',
        x: 0,
        y: 0,
        width: 50,
        height: 50
      }) as { id: string }

      const result = (await tool.execute(figma, {
        id: node.id,
        image_data: PNG_MAGIC.toBase64(),
        scale_mode: mode
      })) as { scaleMode: string }
      expect(result.scaleMode).toBe(mode)

      const fills = expectFills(
        expectDefined(figma.getNodeById(node.id), 'image-filled node').fills
      )
      expect(fills[0]).toMatchObject({ scaleMode: mode })
    }
  })

  test('STRETCH crops to the whole image, as the panel and .pen import store it', async () => {
    const { graph, figma } = setup()
    const rect = figma.createRectangle()

    const result = (await tool.execute(figma, {
      id: rect.id,
      image_data: PNG_MAGIC.toBase64(),
      scale_mode: 'STRETCH'
    })) as { scaleMode: string }

    expect(result.scaleMode).toBe('STRETCH')
    expect(expectDefined(graph.getNode(rect.id), 'stretched node').fills[0]).toMatchObject({
      type: 'IMAGE',
      imageScaleMode: 'CROP',
      imageTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
    })
  })

  test('image data is stored in graph.images', async () => {
    const { graph, figma } = setup()
    const shape = expectDefined(
      ALL_TOOLS.find((t) => t.name === 'create_shape'),
      'create_shape tool'
    )
    const node = shape.execute(figma, { type: 'RECTANGLE', x: 0, y: 0, width: 50, height: 50 }) as {
      id: string
    }

    const result = (await tool.execute(figma, {
      id: node.id,
      image_data: PNG_MAGIC.toBase64()
    })) as {
      imageHash: string
    }
    expect(graph.images.get(result.imageHash)).toEqual(PNG_MAGIC)
  })

  test('fetches an image URL through the host fetch and fills with it', async () => {
    const graph = new SceneGraph()
    const requested: string[] = []
    const figma = new FigmaAPI(graph, {
      fetch: async (input) => {
        requested.push(String(input))
        return new Response(PIXEL_PNG.slice())
      }
    })
    const rect = figma.createRectangle()

    const result = (await tool.execute(figma, {
      id: rect.id,
      url: 'https://images.example/photo.png',
      scale_mode: 'FIT'
    })) as { imageHash: string; scaleMode: string }

    expect(requested).toEqual(['https://images.example/photo.png'])
    expect(graph.images.get(result.imageHash)).toEqual(PIXEL_PNG)
    expect(expectFills(expectDefined(figma.getNodeById(rect.id), 'rect').fills)[0]).toMatchObject({
      type: 'IMAGE',
      imageHash: result.imageHash,
      scaleMode: 'FIT'
    })
  })

  test('reports a failed fetch and needs exactly one image source', async () => {
    const figma = new FigmaAPI(new SceneGraph(), {
      fetch: async () => new Response('missing', { status: 404 })
    })
    const rect = figma.createRectangle()
    const before = rect.fills
    expect(await tool.execute(figma, { id: rect.id, url: 'https://images.example/x.png' })).toEqual(
      { error: 'Unable to fetch image. Response status: 404' }
    )
    expect(await tool.execute(figma, { id: rect.id, url: 'ftp://images.example/x.png' })).toEqual({
      error: 'createImageAsync requires an absolute URL (http:// or https://) or a data URI'
    })
    expect(await tool.execute(figma, { id: rect.id })).toEqual({
      error: 'Provide either image_data or url'
    })
    expect(
      await tool.execute(figma, { id: rect.id, url: 'https://a.example/x.png', image_data: 'AA==' })
    ).toEqual({ error: 'Provide either image_data or url' })
    expect(rect.fills).toEqual(before)
  })
})
