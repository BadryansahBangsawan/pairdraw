import { describe, expect, test } from 'bun:test'

import { toUint8Array } from 'js-base64'

import { parsePenDocument, parsePenFile, writePenDocument } from '@pairdraw/pen'
import { computeImageHash } from '@pairdraw/scene-graph/images'

import { parseDocument } from './helpers/document'

const PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)

function imageGraph() {
  const graph = parseDocument([{ id: 'pic', type: 'rectangle', width: 10, height: 10 }])
  const hash = computeImageHash(PNG)
  graph.images.set(hash, PNG)
  graph.updateNode('pic', {
    fills: [
      {
        type: 'IMAGE',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
        imageHash: hash,
        imageScaleMode: 'CROP',
        imageTransform: { m00: 1, m01: 0, m02: 2, m10: 0, m11: 1, m12: 3 }
      }
    ]
  })
  return { graph, hash }
}

describe('writing a .pen file', () => {
  test('embeds image fills and keeps where the crop draws', () => {
    const { graph, hash } = imageGraph()
    const warnings: string[] = []

    const saved = writePenDocument(graph, { warnings })
    const document = parsePenDocument(saved)
    const fillValue = document.children[0]?.fill
    const paint = Array.isArray(fillValue) ? fillValue[0] : fillValue
    expect(typeof paint).toBe('object')
    expect(typeof paint === 'object' && paint !== null ? paint.type : undefined).toBe('image')
    const url =
      typeof paint === 'object' && paint !== null && 'url' in paint && typeof paint.url === 'string'
        ? paint.url
        : undefined
    expect(url?.startsWith('data:image/png;base64,')).toBe(true)

    const reopened = parsePenFile(saved, {
      images: new Map(url ? [[url, PNG]] : [])
    })
    const fill = reopened.getNode('pic')?.fills[0]
    expect(fill?.type).toBe('IMAGE')
    expect(fill?.imageHash).toBe(hash)
    expect(fill?.imageScaleMode).toBe('CROP')
    expect(fill?.imageTransform?.m00).toBe(1)
    expect(fill?.imageTransform?.m02).toBe(2)
    expect(fill?.imageTransform?.m11).toBe(1)
    expect(fill?.imageTransform?.m12).toBe(3)
    expect(warnings).toEqual([])
  })

  test('leaves out an image fill whose bytes are missing, and says so', () => {
    const { graph } = imageGraph()
    graph.images.clear()
    const warnings: string[] = []

    let saved = ''
    expect(() => {
      saved = writePenDocument(graph, { warnings })
    }).not.toThrow()

    expect(parsePenDocument(saved).children[0]?.fill).toBeUndefined()
    expect(warnings).toEqual([
      'Image fills with missing image data were left out (1); Pencil.dev files cannot hold a paint without its image.'
    ])
  })

  test('leaves out noise and texture effects instead of throwing', () => {
    const graph = parseDocument([{ id: 'grain', type: 'rectangle', width: 10, height: 10 }])
    graph.updateNode('grain', {
      effects: [
        {
          type: 'NOISE',
          color: { r: 0, g: 0, b: 0, a: 1 },
          visible: true,
          noise: { noiseType: 'MULTITONE', density: 0.5, noiseSize: { x: 1, y: 1 } }
        },
        {
          type: 'TEXTURE',
          color: { r: 0, g: 0, b: 0, a: 1 },
          radius: 3,
          visible: true,
          texture: { noiseSize: { x: 4, y: 4 }, clipToShape: true }
        }
      ]
    })
    const warnings: string[] = []

    const saved = writePenDocument(graph, { warnings })

    expect(parsePenDocument(saved).children[0]?.effect).toBeUndefined()
    expect(warnings).toEqual([
      'Noise and texture effects were left out (2); Pencil.dev files have no form for them.'
    ])
  })

  test('says which properties a Pencil.dev file cannot hold', () => {
    const graph = parseDocument([{ id: 'panel', type: 'frame', width: 100, height: 100 }])
    const { graph: image, hash } = imageGraph()
    graph.updateNode('panel', {
      overflowDirection: 'VERTICAL',
      fontFeatures: [{ tag: 'liga', enabled: true }],
      fills: [
        {
          type: 'IMAGE',
          color: { r: 0, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true,
          imageHash: hash,
          filters: { exposure: 0.2 }
        }
      ]
    })
    graph.images.set(hash, image.images.get(hash) ?? PNG)
    const warnings: string[] = []

    writePenDocument(graph, { warnings })

    expect(warnings).toContain(
      'Image adjustment filters were left out (1); Pencil.dev files have no form for them.'
    )
    expect(warnings).toContain(
      'Scroll overflow was left out (1); Pencil.dev files have no form for it.'
    )
    expect(warnings).toContain(
      'OpenType font features were left out (1); Pencil.dev files have no form for them.'
    )
  })

  test('says when pages are merged into the one page Pencil.dev holds', () => {
    const graph = parseDocument([{ id: 'first', type: 'rectangle', width: 10, height: 10 }])
    const second = graph.addPage('Second')
    graph.createNode('RECTANGLE', second.id, { name: 'Second card', width: 10, height: 10 })
    const warnings: string[] = []

    writePenDocument(graph, { warnings })

    expect(warnings).toEqual(['Pencil.dev files hold one page; 2 pages were merged into “Page 1”.'])
  })
})
