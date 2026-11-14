import { describe, expect, test } from 'bun:test'

import { parsePenDocument, penAssets, type PenNode } from '@pairdraw/pen'
import { readShaderPaints } from '@pairdraw/scene-graph/shaders'

import { getNodeOrThrow } from './helpers/assert'
import { parseDocument } from './helpers/document'

const SOURCE = `
@param color fill #FF0000
half4 main(float2 uv) { return half4(1.0, 0.0, 0.0, 1.0); }
`

/** A pen.dev shader paint naming `url`, whose source the read options give by that URL. */
function shaderPaint(url: string): PenNode['fill'] {
  return { type: 'shader', url } as PenNode['fill']
}

/** A pen.dev shader effect naming `url`, whose source the read options give by that URL. */
function shaderEffect(url: string): PenNode['effect'] {
  return { type: 'shader', url } as PenNode['effect']
}

function shape(fill?: PenNode['fill'], effect?: PenNode['effect']): PenNode {
  const node: PenNode = { id: 'shape', type: 'rectangle', width: 100, height: 80 }
  if (fill !== undefined) node.fill = fill
  if (effect !== undefined) node.effect = effect
  return node
}

function read(children: PenNode[], shaders: Map<string, string>) {
  return parseDocument(children, {}, { shaders })
}

describe('parsePenFile — shaders', () => {
  test('reads a shader paint from the file it names', () => {
    const node = getNodeOrThrow(
      read([shape(shaderPaint('./fx.sksl'))], new Map([['./fx.sksl', SOURCE]])),
      'shape'
    )
    const [fill] = node.fills
    expect(fill).toMatchObject({
      type: 'IMAGE',
      visible: true,
      imageScaleMode: 'FILL'
    })
    const [shader] = readShaderPaints(node)
    expect(shader).toMatchObject({ source: SOURCE, image: fill.imageHash })
  })

  test('keeps the paint opacity and a hidden shader', () => {
    const node = getNodeOrThrow(
      read(
        [
          shape({
            type: 'shader',
            url: './fx.sksl',
            opacity: 0.5,
            enabled: false
          })
        ],
        new Map([['./fx.sksl', SOURCE]])
      ),
      'shape'
    )
    expect(node.fills[0]).toMatchObject({ opacity: 0.5, visible: false })
  })

  test('skips a shader whose file was not read', () => {
    const node = getNodeOrThrow(read([shape(shaderPaint('./missing.sksl'))], new Map()), 'shape')
    expect(node.fills).toEqual([])
    expect(readShaderPaints(node)).toEqual([])
  })

  test('reads shader paints on strokes', () => {
    const node = getNodeOrThrow(
      parseDocument(
        [
          {
            id: 'shape',
            type: 'rectangle',
            width: 100,
            height: 80,
            stroke: { type: 'shader', url: './fx.sksl' },
            strokeWidth: 4
          } satisfies PenNode
        ],
        {},
        { shaders: new Map([['./fx.sksl', SOURCE]]) }
      ),
      'shape'
    )
    expect(node.strokes[0]).toMatchObject({ type: 'IMAGE', weight: 4 })
    expect(readShaderPaints(node)).toHaveLength(1)
  })

  test('reads a shader effect from the file it names, and drops one without source', () => {
    const shaders = new Map([['./fx.sksl', SOURCE]])
    const shaded = getNodeOrThrow(
      parseDocument([shape(undefined, shaderEffect('./fx.sksl'))], {}, { shaders }),
      'shape'
    )
    expect(shaded.effects).toMatchObject([{ type: 'SHADER', source: SOURCE, visible: true }])
    const missing = getNodeOrThrow(
      parseDocument([shape(undefined, shaderEffect('./missing.sksl'))], {}, { shaders }),
      'shape'
    )
    expect(missing.effects).toEqual([])
  })

  test('lists the shader files a document names, for a host to read', () => {
    const assets = penAssets(
      parsePenDocument(
        JSON.stringify({
          version: '2.21',
          children: [shape(shaderPaint('./fx.sksl'), shaderEffect('./glow.sksl'))]
        })
      )
    )
    expect(assets.shaders).toEqual(['./fx.sksl', './glow.sksl'])
  })

  test('does not list a shader file that is not beside the document', () => {
    const assets = penAssets(
      parsePenDocument(
        JSON.stringify({
          version: '2.21',
          children: [shape(shaderPaint('https://example.com/fx.sksl'))]
        })
      )
    )
    expect(assets.shaders).toEqual([])
  })
})
