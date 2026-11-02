import { describe, expect, test } from 'bun:test'

import {
  exportHTMLBundle,
  sceneNodeToDesignDocument,
  type DesignElement,
  type DesignNode,
  type WebFontFaceResolver
} from '#dom-css/export/index'
import { toUint8Array } from 'js-base64'

import { SceneGraph } from '@open-pencil/scene-graph'
import { TRANSPARENT } from '@open-pencil/scene-graph/constants'

function element(node: DesignNode | undefined): DesignElement {
  if (node?.type !== 'element') throw new Error('Expected an element')
  return node
}

/** A card named by its designer, holding a rectangle that keeps its type's name. */
function namedCard() {
  const graph = new SceneGraph()
  const card = graph.createNode('FRAME', graph.getPages()[0].id, {
    name: 'Pricing card',
    width: 120,
    height: 80
  })
  const box = graph.createNode('RECTANGLE', card.id, { name: 'RECTANGLE', width: 20, height: 20 })
  return { graph, card, box }
}

describe('layer attributes', () => {
  test('names and IDs are written only when asked for', () => {
    const { graph, card } = namedCard()

    const plain = element(
      sceneNodeToDesignDocument(graph, card.id, { includeSourceIds: false }).children[0]
    )
    expect(plain.attrs['data-name']).toBeUndefined()
    expect(plain.attrs['data-open-pencil-node-id']).toBeUndefined()

    const both = element(
      sceneNodeToDesignDocument(graph, card.id, {
        includeLayerNames: true,
        includeSourceIds: true
      }).children[0]
    )
    expect(both.attrs['data-name']).toBe('Pricing card')
    expect(both.attrs['data-open-pencil-node-id']).toBe(card.id)
  })

  test('a layer whose name only repeats its type has no name attribute', () => {
    const { graph, card, box } = namedCard()
    const root = element(
      sceneNodeToDesignDocument(graph, card.id, { includeLayerNames: true }).children[0]
    )
    const child = element(root.children[0])
    expect(child.attrs['data-open-pencil-node-id']).toBe(box.id)
    expect(child.attrs['data-name']).toBeUndefined()
  })
})

describe('HTML fragment assets', () => {
  test('external assets move a fragment’s images into files beside it', async () => {
    const graph = new SceneGraph()
    const png = toUint8Array(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    )
    graph.images.set('pixel', png)
    const photo = graph.createNode('RECTANGLE', graph.getPages()[0].id, {
      name: 'Photo',
      width: 40,
      height: 40,
      fills: [
        {
          type: 'IMAGE',
          imageHash: 'pixel',
          imageScaleMode: 'FILL',
          color: TRANSPARENT,
          opacity: 1,
          visible: true
        }
      ]
    })
    const document = sceneNodeToDesignDocument(graph, photo.id)

    const inline = await exportHTMLBundle(document, { assets: 'inline' })
    expect(inline.files).toHaveLength(1)
    expect(String(inline.files[0]?.content)).toContain('data:image/png;base64,')

    const external = await exportHTMLBundle(document, {
      assets: 'external',
      assetBasePath: 'photo.assets'
    })
    const page = String(external.files.find((file) => file.path === 'index.html')?.content)
    const images = external.files.filter((file) => file.path !== 'index.html')
    expect(images.map((file) => file.path)).toEqual(['photo.assets/images/image-1.png'])
    expect(page).toContain('photo.assets/images/image-1.png')
    expect(page).not.toContain('data:image/png')
  })
})

describe('HTML asset URLs', () => {
  test('a stylesheet in the asset folder finds the fonts beside it, by URL', async () => {
    const graph = new SceneGraph()
    const title = graph.createNode('TEXT', graph.getPages()[0].id, {
      name: 'Title',
      text: 'Hello',
      fontFamily: 'Inter',
      width: 100,
      height: 20
    })
    const fonts: WebFontFaceResolver = async (requests, basePath) =>
      requests.map((request) => ({
        family: request.family,
        weight: request.weight,
        style: request.style ?? 'normal',
        format: 'woff2',
        path: `${basePath}/inter-${request.weight}.woff2`,
        content: new Uint8Array([0])
      }))
    const bundle = await exportHTMLBundle(sceneNodeToDesignDocument(graph, title.id), {
      html: 'standalone',
      assets: 'external',
      assetBasePath: 'Title #1.assets',
      fonts
    })
    const page = String(bundle.files.find((file) => file.path === 'index.html')?.content)
    const css = String(
      bundle.files.find((file) => file.path === 'Title #1.assets/openpencil.css')?.content
    )

    expect(page).toContain('href="Title%20%231.assets/openpencil.css"')
    expect(bundle.files.map((file) => file.path)).toContain('Title #1.assets/fonts/inter-400.woff2')
    // Relative to the stylesheet, which sits in the same asset folder.
    expect(css).toContain('url("fonts/inter-400.woff2")')
  })
})
