import { describe, expect, test } from 'bun:test'

import { renderNodesToSVG } from '@pairdraw/core/io/formats/svg'
import { SceneGraph } from '@pairdraw/scene-graph'
import { computeImageHash } from '@pairdraw/scene-graph/images'
import { toUint8Array } from 'js-base64'

const PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)
const HASH = computeImageHash(PNG)

/** The SVG a rectangle filled with the image is exported as. */
function exported(rotation: number): string {
  const graph = new SceneGraph()
  graph.images.set(HASH, PNG)
  const page = graph.getPages()[0]
  const node = graph.createNode('RECTANGLE', page.id, {
    width: 40,
    height: 40,
    fills: [
      {
        type: 'IMAGE',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
        imageHash: HASH,
        imageScaleMode: 'FILL',
        imageRotation: rotation
      }
    ]
  })
  return renderNodesToSVG(graph, page.id, [node.id]) ?? ''
}

describe('SVG image paints', () => {
  // The canvas turns an image fill by `imageRotation` before it fits it, so the export carries
  // the same turn on the pattern that draws it.
  test('turns an image fill that carries a rotation', () => {
    expect(exported(90)).toContain('patternTransform="rotate(90 0.5 0.5)"')
  })

  test('leaves an image fill with no rotation untransformed', () => {
    expect(exported(0)).not.toContain('patternTransform')
  })
})
