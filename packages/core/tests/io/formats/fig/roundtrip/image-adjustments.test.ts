import { describe, expect, setDefaultTimeout, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import { parseFigBuffer } from '@pairdraw/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph, type Fill } from '@pairdraw/scene-graph'
import { computeImageHash } from '@pairdraw/scene-graph/images'

setDefaultTimeout(60_000)

const PHOTO = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 7, 7, 7])
const PHOTO_NAME = computeImageHash(PHOTO)

/** The archive's contrast, -0.25 at 0.3 scale, as the 32-bit float it keeps. */
const ARCHIVE_CONTRAST = Math.fround(-0.075)

/** Every adjustment Figma's image panel offers, by the plugin API's names and scale. */
const FILTERS = {
  exposure: 0.5,
  contrast: ARCHIVE_CONTRAST / 0.3,
  saturation: 0.75,
  temperature: -0.5,
  tint: 0.125,
  highlights: -0.75,
  shadows: 0.25
}

/** The same adjustments as the archive names and scales them; contrast rides at 0.3. */
const ARCHIVE_FILTERS = {
  exposure: 0.5,
  contrast: ARCHIVE_CONTRAST,
  vibrance: 0.75,
  temperature: -0.5,
  tint: 0.125,
  highlights: -0.75,
  shadows: 0.25
}

/** A layer filled and stroked with an adjusted image, as the reader builds one. */
function adjustedPhoto(): SceneGraph {
  const graph = new SceneGraph()
  graph.images.set(PHOTO_NAME, PHOTO)
  const image: Fill = {
    type: 'IMAGE',
    color: { r: 0, g: 0, b: 0, a: 1 },
    opacity: 1,
    visible: true,
    imageHash: PHOTO_NAME,
    imageScaleMode: 'FILL',
    filters: FILTERS
  }
  graph.createNode('RECTANGLE', graph.getPages()[0].id, {
    name: 'Photo',
    width: 40,
    height: 40,
    fills: [image],
    strokes: [{ ...image, weight: 4, align: 'INSIDE' }]
  })
  return graph
}

function photoIn(graph: SceneGraph) {
  return expectDefined(
    [...graph.nodes.values()].find((node) => node.name === 'Photo'),
    'photo layer'
  )
}

describe('roundtrip: image adjustments', () => {
  test('an edited image fill and stroke keep their adjustments when the file is saved', async () => {
    await initCodec()
    const graph = adjustedPhoto()
    const photo = photoIn(graph)
    graph.updateNode(photo.id, {
      fills: [{ ...photo.fills[0], opacity: 0.5 }],
      strokes: [{ ...photo.strokes[0], imageScaleMode: 'FIT' }]
    })

    const saved = await exportFigFile(graph)
    const record = expectDefined(
      parseFigBuffer(saved.slice().buffer as ArrayBuffer).nodeChanges.find(
        (candidate) => candidate.name === 'Photo'
      ),
      'saved photo record'
    )
    expect(record.fillPaints?.[0]?.opacity).toBe(0.5)
    expect(record.strokePaints?.[0]?.imageScaleMode).toBe('FIT')
    expect(record.fillPaints?.[0]?.paintFilter).toEqual(ARCHIVE_FILTERS)
    expect(record.strokePaints?.[0]?.paintFilter).toEqual(ARCHIVE_FILTERS)

    const reopened = photoIn(await parseFigFile(saved.slice().buffer as ArrayBuffer))
    expect(reopened.fills[0].filters).toEqual(FILTERS)
    expect(reopened.strokes[0].filters).toEqual(FILTERS)
  })
})
