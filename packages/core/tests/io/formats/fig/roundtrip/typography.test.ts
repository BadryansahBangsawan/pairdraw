import { beforeAll, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph, type FontFeature, type SceneNode } from '@pairdraw/scene-graph'

/**
 * The text's variable axes and OpenType features survive export → re-import, on the text itself
 * and on a styled range, so the panel's edits keep their meaning in the file Figma reads.
 *
 * The file encodes features as Figma does: common and contextual ligatures default on, and a
 * disabled numeric/caps feature clears its typed axis to NORMAL (the font's default) rather than
 * keeping an explicit off-toggle — the schema's OpenTypeFeature enum has no member for those tags.
 * The assertions compare features as a set, with those defaults accounted for.
 */
let reimported: SceneGraph
let text: SceneNode

const sorted = (features: FontFeature[]) => [...features].sort((a, b) => a.tag.localeCompare(b.tag))

beforeAll(async () => {
  await initCodec()
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  graph.createNode('TEXT', page.id, {
    text: 'Hamburgefonts 0123',
    fontFamily: 'Inter',
    fontSize: 24,
    fontVariations: [
      { axis: 'wght', value: 620 },
      { axis: 'wdth', value: 85 }
    ],
    opticalSizeFromFontSize: false,
    fontFeatures: [
      { tag: 'TNUM', enabled: true },
      { tag: 'LIGA', enabled: false },
      { tag: 'SS02', enabled: true },
      { tag: 'ZERO', enabled: true }
    ],
    styleRuns: [
      {
        start: 0,
        length: 5,
        style: {
          fontVariations: [{ axis: 'wght', value: 300 }],
          fontFeatures: [
            { tag: 'SMCP', enabled: true },
            { tag: 'TNUM', enabled: false }
          ]
        }
      }
    ]
  })
  reimported = await parseFigFile((await exportFigFile(graph)).buffer as ArrayBuffer)
  text = expectDefined(
    [...reimported.nodes.values()].find((n) => n.type === 'TEXT'),
    'text node'
  )
})

test('the text keeps its variable axes and optical-size mode', () => {
  expect(text.fontVariations).toEqual([
    { axis: 'wght', value: 620 },
    { axis: 'wdth', value: 85 }
  ])
  expect(text.opticalSizeFromFontSize).toBe(false)
})

test('the text keeps its OpenType features, on and off', () => {
  // CALT comes back on: the file writes contextual ligatures on by default, as Figma does.
  expect(sorted(text.fontFeatures)).toEqual(
    sorted([
      { tag: 'TNUM', enabled: true },
      { tag: 'LIGA', enabled: false },
      { tag: 'SS02', enabled: true },
      { tag: 'ZERO', enabled: true },
      { tag: 'CALT', enabled: true }
    ])
  )
})

test('a styled range keeps its own axes and features', () => {
  const run = expectDefined(text.styleRuns[0], 'style run')
  expect(run.start).toBe(0)
  expect(run.length).toBe(5)
  expect(run.style.fontVariations).toEqual([{ axis: 'wght', value: 300 }])
  // SMCP survives; the disabled TNUM cleared its axis to NORMAL, the font's default spacing,
  // which reads back as no explicit feature — the rendered result is the same.
  expect(run.style.fontFeatures).toEqual([{ tag: 'SMCP', enabled: true }])
})
