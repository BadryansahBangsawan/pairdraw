import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'

import { setRadius } from '#core/tools/modify/geometry'
import { setFill } from '#core/tools/modify/paint'

import { expectDefined } from '#core-tests/helpers/assert'

function doc() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const box = figma.createRectangle()
  box.resize(100, 60)
  return { graph, figma, box }
}

describe('set_radius takes CSS shorthand', () => {
  test('four values read clockwise from the top left', () => {
    const { graph, figma, box } = doc()

    setRadius.execute(figma, v.parse(setRadius.input, { id: box.id, radius: '12px 12px 4px 0' }))

    const node = expectDefined(graph.getNode(box.id), 'box')
    expect([
      node.topLeftRadius,
      node.topRightRadius,
      node.bottomRightRadius,
      node.bottomLeftRadius
    ]).toEqual([12, 12, 4, 0])
  })

  test('a number still sets every corner', () => {
    const { graph, figma, box } = doc()

    setRadius.execute(figma, v.parse(setRadius.input, { id: box.id, radius: 8 }))

    expect(expectDefined(graph.getNode(box.id), 'box').cornerRadius).toBe(8)
  })

  test('refuses more values than corners', () => {
    const { figma, box } = doc()

    const result = setRadius.execute(
      figma,
      v.parse(setRadius.input, { id: box.id, radius: '1px 2px 3px 4px 5px' })
    ) as { error?: string }

    expect(result.error).toBe('"radius" takes 1 to 4 lengths, got 5')
  })
})

describe('set_fill takes a token name', () => {
  function tokenDoc(name = 'color/brand', hex = { r: 0.31, g: 0.275, b: 0.898, a: 1 }) {
    const { graph, figma, box } = doc()
    const collection = graph.createCollection('Theme')
    const variable = graph.createVariable(name, 'COLOR', collection.id, hex)
    return { graph, figma, box, variable, collection }
  }

  test('binds the fill to the token instead of painting it', () => {
    const { graph, figma, box, variable } = tokenDoc()

    const result = setFill.execute(
      figma,
      v.parse(setFill.input, { id: box.id, color: 'var(--color/brand)' })
    )

    expect(result).toMatchObject({ bound: 'color/brand' })
    const node = expectDefined(graph.getNode(box.id), 'box')
    expect(node.boundVariables['fills/0/color']).toBe(variable.id)
    expect(node.fills[0]).toMatchObject({ type: 'SOLID', color: { r: 0.31, g: 0.275, b: 0.898 } })
  })

  test('a token that does not exist is refused, naming where tokens live', () => {
    const { graph, figma, box } = doc()
    const before = expectDefined(graph.getNode(box.id), 'box').fills

    const result = setFill.execute(
      figma,
      v.parse(setFill.input, { id: box.id, color: 'var(--color/missing)' })
    ) as { error?: string }

    expect(result.error).toContain('color/missing')
    expect(result.error).toContain('find_variables')
    expect(expectDefined(graph.getNode(box.id), 'box').fills).toEqual(before)
  })

  test('a name two variables share is refused, listing both', () => {
    const { graph, figma, box } = tokenDoc()
    const before = expectDefined(graph.getNode(box.id), 'box').fills
    const second = graph.createCollection('Dark')
    graph.createVariable('color/brand', 'COLOR', second.id, { r: 0, g: 0, b: 0, a: 1 })

    const result = setFill.execute(
      figma,
      v.parse(setFill.input, { id: box.id, color: 'var(--color/brand)' })
    ) as { error?: string }

    expect(result.error).toContain('2 variables named "color/brand"')
    expect(expectDefined(graph.getNode(box.id), 'box').fills).toEqual(before)
  })

  test('a hex colour still paints as before', () => {
    const { graph, figma, box } = doc()

    setFill.execute(figma, v.parse(setFill.input, { id: box.id, color: '#ff0000' }))

    expect(expectDefined(graph.getNode(box.id), 'box').fills[0]).toMatchObject({
      type: 'SOLID',
      color: { r: 1, g: 0, b: 0 }
    })
  })
})
