import { describe, expect, test } from 'bun:test'

import { expectDefined, getNodeOrThrow } from '#core-tests/helpers/assert'
import { runTool, setupToolTest } from '#core-tests/helpers/tools'
import * as v from 'valibot'

import {
  ALL_TOOLS,
  getImageAIService,
  registerImageAIService,
  type ImageAIService
} from '@pairdraw/core/tools'
import type { Fill, SceneGraph } from '@pairdraw/scene-graph'

const SQUARE_SVG = `<svg viewBox="0 0 100 100"><path d="M0 0 H100 V100 H0 Z" fill="#336699"/></svg>`
const IMAGE_AI_TOOLS = ['generate_image', 'remove_background', 'replace_background', 'generate_svg']

/** The header of a PNG declaring a `width` × `height` image, which is all sizing reads. */
function png(width: number, height: number, marker = 0): Uint8Array {
  const bytes = new Uint8Array(27)
  const view = new DataView(bytes.buffer)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  view.setUint32(16, width)
  view.setUint32(20, height)
  bytes.set([8, 6, marker], 24)
  return bytes
}

function imageFill(imageHash: string, imageScaleMode: Fill['imageScaleMode'] = 'FILL'): Fill {
  return {
    type: 'IMAGE',
    imageHash,
    imageScaleMode,
    color: { r: 0, g: 0, b: 0, a: 0 },
    opacity: 1,
    visible: true
  }
}

/** A service that answers with fixed results and records what it was asked. */
function fakeService(overrides: Partial<ImageAIService> = {}) {
  const calls: { method: string; request: unknown }[] = []
  const service: ImageAIService = {
    generateImage: async (request) => {
      calls.push({ method: 'generateImage', request })
      return png(1536, 1024)
    },
    removeBackground: async (request) => {
      calls.push({ method: 'removeBackground', request })
      return png(40, 20, 1)
    },
    replaceBackground: async (request) => {
      calls.push({ method: 'replaceBackground', request })
      return png(40, 20, 2)
    },
    generateSVG: async (request) => {
      calls.push({ method: 'generateSVG', request })
      return SQUARE_SVG
    },
    ...overrides
  }
  return { service, calls }
}

function setup() {
  const { graph, figma } = setupToolTest()
  const page = expectDefined(graph.getPages()[0], 'page')
  graph.images.set('photo', png(40, 20))
  const photo = graph.createNode('RECTANGLE', page.id, {
    name: 'Photo',
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    fills: [
      { type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true },
      imageFill('photo', 'FIT')
    ]
  })
  return { graph, figma, page, photo }
}

function imageHashes(graph: SceneGraph, id: string): (string | undefined)[] {
  return getNodeOrThrow(graph, id)
    .fills.filter((fill) => fill.type === 'IMAGE')
    .map((fill) => fill.imageHash)
}

const resultSchema = v.object({ id: v.string() })

describe('image AI tools', () => {
  test('are async document edits that reach the network', () => {
    for (const name of IMAGE_AI_TOOLS) {
      const tool = expectDefined(
        ALL_TOOLS.find((candidate) => candidate.name === name),
        name
      )
      expect(tool.execution).toEqual({ kind: 'async', mutation: 'document' })
      expect(tool.capabilities).toContain('network:access')
    }
  })

  test.each(IMAGE_AI_TOOLS)('%s tells the agent where it cannot run', async (name) => {
    const { figma, photo } = setup()
    const args: Record<string, Record<string, unknown>> = {
      generate_image: { id: photo.id, prompt: 'a red bicycle' },
      remove_background: { id: photo.id },
      replace_background: { id: photo.id, prompt: 'a beach' },
      generate_svg: { prompt: 'a red bicycle' }
    }
    const result = await runTool(figma, name, args[name] ?? {})
    expect(result).toEqual({ error: expect.stringContaining('Settings → Image services') })
  })

  test('the service registration ends with its unregister call', () => {
    const { graph } = setup()
    const { service } = fakeService()
    const unregister = registerImageAIService(graph, service)
    expect(getImageAIService(graph)).toBe(service)
    unregister()
    expect(getImageAIService(graph)).toBeUndefined()
  })
})

describe('generate_image', () => {
  test('places a new layer at the image’s shape beside the page’s content', async () => {
    const { graph, figma, page, photo } = setup()
    const { service, calls } = fakeService()
    registerImageAIService(graph, service)

    const result = v.parse(
      resultSchema,
      await runTool(figma, 'generate_image', {
        prompt: 'A lighthouse at dusk',
        orientation: 'landscape',
        width: 300
      })
    )
    expect(calls).toEqual([
      {
        method: 'generateImage',
        request: {
          prompt: 'A lighthouse at dusk',
          orientation: 'landscape',
          transparent: undefined
        }
      }
    ])
    const layer = getNodeOrThrow(graph, result.id)
    expect(layer).toMatchObject({ type: 'RECTANGLE', name: 'A lighthouse at dusk', width: 300 })
    expect(layer.height).toBe(200)
    expect(layer.parentId).toBe(page.id)
    expect(layer.x).toBeGreaterThan(photo.x + photo.width)
    expect(imageHashes(graph, layer.id)).toHaveLength(1)
  })

  test('fills a layer in place of its image, keeping how the fill frames it', async () => {
    const { graph, figma, photo } = setup()
    const { service, calls } = fakeService()
    registerImageAIService(graph, service)

    await runTool(figma, 'generate_image', { id: photo.id, prompt: 'Mountains' })
    expect(calls[0]?.request).toMatchObject({ orientation: 'landscape' })
    const fills = getNodeOrThrow(graph, photo.id).fills
    expect(fills).toHaveLength(2)
    expect(fills[1]).toMatchObject({ type: 'IMAGE', imageScaleMode: 'FIT' })
    expect(fills[1]?.imageHash).not.toBe('photo')
  })

  test('adds the image on top of a layer that shows none', async () => {
    const { graph, figma, page } = setup()
    registerImageAIService(graph, fakeService().service)
    const card = graph.createNode('FRAME', page.id, { name: 'Card', width: 100, height: 100 })

    await runTool(figma, 'generate_image', { id: card.id, prompt: 'Texture' })
    expect(imageHashes(graph, card.id)).toHaveLength(1)
  })

  test('leaves a layer whose image changed while the service worked', async () => {
    const { graph, figma, photo } = setup()
    registerImageAIService(
      graph,
      fakeService({
        generateImage: async () => {
          graph.updateNode(photo.id, { fills: [imageFill('other')] })
          return png(10, 10)
        }
      }).service
    )
    const result = await runTool(figma, 'generate_image', { id: photo.id, prompt: 'Sky' })
    expect(result).toEqual({ error: expect.stringContaining('changed') })
    expect(imageHashes(graph, photo.id)).toEqual(['other'])
  })

  test('refuses text and a blank prompt', async () => {
    const { graph, figma, page } = setup()
    registerImageAIService(graph, fakeService().service)
    const label = graph.createNode('TEXT', page.id, { name: 'Label', text: 'Hi' })
    expect(await runTool(figma, 'generate_image', { id: label.id, prompt: 'x' })).toEqual({
      error: expect.stringContaining('cannot show an image fill')
    })
    await expect(runTool(figma, 'generate_image', { prompt: '   ' })).rejects.toThrow(
      'Describe what to generate'
    )
  })

  test('passes on the service’s failure for the user', async () => {
    const { graph, figma } = setup()
    registerImageAIService(
      graph,
      fakeService({
        generateImage: async () => {
          throw new Error('No OpenAI API key is saved.')
        }
      }).service
    )
    expect(await runTool(figma, 'generate_image', { prompt: 'Cat' })).toEqual({
      error: 'No OpenAI API key is saved.'
    })
  })
})

describe('remove_background and replace_background', () => {
  test('swap the layer’s image for the service’s, keeping its fill settings', async () => {
    const { graph, figma, photo } = setup()
    const { service, calls } = fakeService()
    registerImageAIService(graph, service)

    expect(await runTool(figma, 'remove_background', { id: photo.id })).toMatchObject({
      id: photo.id
    })
    const removed = imageHashes(graph, photo.id)[0]
    expect(removed).not.toBe('photo')
    expect(getNodeOrThrow(graph, photo.id).fills[1]).toMatchObject({ imageScaleMode: 'FIT' })

    await runTool(figma, 'replace_background', { id: photo.id, prompt: 'A beach' })
    expect(calls.map((call) => call.method)).toEqual(['removeBackground', 'replaceBackground'])
    expect(calls[1]?.request).toMatchObject({ imageHash: removed, prompt: 'A beach' })
    expect(imageHashes(graph, photo.id)[0]).not.toBe(removed)
  })

  test('refuse a layer without an image', async () => {
    const { graph, figma, page } = setup()
    registerImageAIService(graph, fakeService().service)
    const card = graph.createNode('FRAME', page.id, { name: 'Card' })
    expect(await runTool(figma, 'remove_background', { id: card.id })).toEqual({
      error: '"Card" shows no image'
    })
  })
})

describe('generate_svg', () => {
  test('imports the artwork as editable layers beside the page’s content', async () => {
    const { graph, figma, photo } = setup()
    const { service, calls } = fakeService()
    registerImageAIService(graph, service)

    const result = v.parse(
      resultSchema,
      await runTool(figma, 'generate_svg', { prompt: 'A geometric fox logo' })
    )
    expect(calls).toEqual([{ method: 'generateSVG', request: { prompt: 'A geometric fox logo' } }])
    const frame = getNodeOrThrow(graph, result.id)
    expect(frame).toMatchObject({ type: 'FRAME', name: 'A geometric fox logo' })
    expect(frame.childIds.length).toBeGreaterThan(0)
    expect(frame.x).toBeGreaterThan(photo.x + photo.width)
  })

  test('keeps the position it was given', async () => {
    const { graph, figma } = setup()
    registerImageAIService(graph, fakeService().service)
    const result = v.parse(
      resultSchema,
      await runTool(figma, 'generate_svg', { prompt: 'Leaf', x: 10, y: 20 })
    )
    expect(getNodeOrThrow(graph, result.id)).toMatchObject({ x: 10, y: 20 })
  })
})
