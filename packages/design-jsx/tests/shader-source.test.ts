import { describe, expect, test } from 'bun:test'

import { createDesignJSXRenderer, sceneNodeToJSX } from '#design-jsx/index'

import { SceneGraph } from '@open-pencil/scene-graph'
import {
  createShaderSourcePaint,
  isShaderSourcePaint,
  readShaderPaints,
  withShaderPaints
} from '@open-pencil/scene-graph/shaders'

const SOURCE = `#version 300 es
precision highp float;
/** @color */
uniform vec4 u_color;

void main() {
  gl_FragColor = u_color;
}`

const renderer = createDesignJSXRenderer<never>({
  icon: () => Promise.resolve(null),
  svg: () => null,
  createArtwork: () => {
    throw new Error('No artwork in these tests')
  },
  layout: () => {
    // These props do not depend on layout.
  },
  vectorBounds: () => {
    throw new Error('No vectors in these tests')
  }
})

/** A page holding one rectangle filled with shader code the user wrote. */
function graphWithSourceShader() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  if (!page) throw new Error('The graph has no page')
  const { paint, shader } = createShaderSourcePaint(SOURCE)
  const node = graph.createNode('RECTANGLE', page.id, {
    name: 'Code',
    width: 100,
    height: 100,
    fills: [paint]
  })
  graph.updateNode(node.id, {
    pluginData: withShaderPaints(node, [paint], [{ ...shader, uniforms: { u_color: '#ff0000' } }])
  })
  return { graph, id: node.id }
}

describe('a shader the user wrote', () => {
  test('is exported as the code it was written in, with its input values', () => {
    const { graph, id } = graphWithSourceShader()

    const jsx = sceneNodeToJSX(id, graph)

    expect(jsx).toContain('shaderSource(')
    expect(jsx).toContain('gl_FragColor = u_color;')
    expect(jsx).toContain('u_color: "#ff0000"')
  })

  test('comes back as the same paint when its export is rendered again', async () => {
    const { graph, id } = graphWithSourceShader()
    const [result] = await renderer.renderJSX(graph, `return ${sceneNodeToJSX(id, graph)}`)
    const node = graph.getNode(result.id)
    if (!node) throw new Error('Rendered layer is missing')
    const [shader] = readShaderPaints(node)

    expect(result.warnings ?? []).toEqual([])
    expect(node.fills).toHaveLength(1)
    if (!shader || !isShaderSourcePaint(shader)) throw new Error('The paint carries no shader code')
    expect(shader.source).toBe(SOURCE)
    expect(shader.uniforms).toEqual({ u_color: '#ff0000' })
  })
})
