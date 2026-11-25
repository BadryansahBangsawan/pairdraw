import { describe, expect, test } from 'bun:test'

import { toUint8Array } from 'js-base64'

import {
  parsePenDocument,
  parsePenFile,
  penWriteWarningText,
  writePenDocument,
  type PenNode,
  type PenWriteWarning
} from '@pairdraw/pen'
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

/** The URL of the single image paint a written node holds. */
function paintURL(node: PenNode | undefined): string | undefined {
  const fill = node?.fill
  const paint = Array.isArray(fill) ? fill[0] : fill
  if (typeof paint !== 'object' || paint === null || !('url' in paint)) return undefined
  return typeof paint.url === 'string' ? paint.url : undefined
}

describe('writing a .pen file', () => {
  test('embeds image fills and keeps where the crop draws', () => {
    const { graph, hash } = imageGraph()
    const warnings: string[] = []

    const saved = writePenDocument(graph, { warnings })
    const url = paintURL(parsePenDocument(saved).children[0])
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

  test('labels AVIF bytes as AVIF in the embedded data URL', () => {
    const avif = new Uint8Array([
      0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0x00, 0x00, 0x00, 0x00
    ])
    const graph = parseDocument([{ id: 'photo', type: 'rectangle', width: 10, height: 10 }])
    const hash = computeImageHash(avif)
    graph.images.set(hash, avif)
    graph.updateNode('photo', {
      fills: [
        {
          type: 'IMAGE',
          color: { r: 0, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true,
          imageHash: hash
        }
      ]
    })

    const url = paintURL(parsePenDocument(writePenDocument(graph)).children[0])

    expect(url?.startsWith('data:image/avif;base64,')).toBe(true)
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

describe('a Display P3 document', () => {
  test('warns that its colors are written as sRGB hex', () => {
    const graph = parseDocument([{ id: 'card', type: 'rectangle', width: 10, height: 10 }])
    graph.documentColorSpace = 'display-p3'
    const warnings: string[] = []
    writePenDocument(graph, { warnings })
    expect(warnings.some((line) => line.includes('sRGB'))).toBe(true)
  })

  test('says nothing about color space for an sRGB document', () => {
    const graph = parseDocument([{ id: 'card', type: 'rectangle', width: 10, height: 10 }])
    const warnings: string[] = []
    writePenDocument(graph, { warnings })
    expect(warnings.some((line) => line.includes('sRGB'))).toBe(false)
  })
})

describe('write warning details', () => {
  test('reports the same facts as kinds and as text', () => {
    const graph = parseDocument([{ id: 'first', type: 'rectangle', width: 10, height: 10 }])
    const second = graph.addPage('Second')
    graph.createNode('RECTANGLE', second.id, { name: 'Second card', width: 10, height: 10 })
    const warnings: string[] = []
    const warningDetails: PenWriteWarning[] = []

    writePenDocument(graph, { warnings, warningDetails })

    expect(warningDetails).toEqual([{ kind: 'merged-pages', pages: 2, name: 'Page 1' }])
    expect(warnings).toEqual(warningDetails.map(penWriteWarningText))
  })

  test('the text of every kind is the sentence the writer used to push', () => {
    expect(penWriteWarningText({ kind: 'merged-pages', pages: 2, name: 'Page 1' })).toBe(
      'Pencil.dev files hold one page; 2 pages were merged into “Page 1”.'
    )
    expect(penWriteWarningText({ kind: 'missing-image-fills', count: 1 })).toBe(
      'Image fills with missing image data were left out (1); Pencil.dev files cannot hold a paint without its image.'
    )
    expect(penWriteWarningText({ kind: 'library-definitions', count: 2 })).toBe(
      'Library components came from 2 enabled libraries, whose definitions Pencil.dev files do not hold; re-enable those libraries after reopening to restore them.'
    )
  })

  test('a document with nothing to report collects neither text nor kinds', () => {
    const graph = parseDocument([{ id: 'card', type: 'rectangle', width: 10, height: 10 }])
    const warnings: string[] = []
    const warningDetails: PenWriteWarning[] = []

    writePenDocument(graph, { warnings, warningDetails })

    expect(warnings).toEqual([])
    expect(warningDetails).toEqual([])
  })
})
