import { describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'
import * as v from 'valibot'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'

import { setRadius } from '#core/tools/modify/geometry'
import { setFill } from '#core/tools/modify/paint'
import { getCSS } from '#core/tools/read/css'

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

  test('a token shared with a gradient is refused, never painted solid', () => {
    const { graph, figma, box } = tokenDoc()
    const before = expectDefined(graph.getNode(box.id), 'box').fills

    const result = setFill.execute(
      figma,
      v.parse(setFill.input, {
        id: box.id,
        gradient: 'top-bottom',
        color: 'var(--color/brand)',
        color_end: '#FFFFFF'
      })
    ) as { error?: string }

    expect(result.error).toContain('gradient')
    expect(expectDefined(graph.getNode(box.id), 'box').fills).toEqual(before)
  })

  test('a token as the gradient end is refused, never painted solid', () => {
    const { graph, figma, box } = tokenDoc('color/end')
    const before = expectDefined(graph.getNode(box.id), 'box').fills

    const result = setFill.execute(
      figma,
      v.parse(setFill.input, {
        id: box.id,
        gradient: 'left-right',
        color: '#4F46E5',
        color_end: 'var(--color/end)'
      })
    ) as { error?: string }

    expect(result.error).toContain('gradient')
    expect(expectDefined(graph.getNode(box.id), 'box').fills).toEqual(before)
  })

  test('a token name with a space binds, as get_css writes it', () => {
    const { graph, figma, box, variable } = tokenDoc('Brand Primary')

    const result = setFill.execute(
      figma,
      v.parse(setFill.input, { id: box.id, color: 'var(--Brand Primary, #4F46E5)' })
    )

    expect(result).toMatchObject({ bound: 'Brand Primary' })
    expect(expectDefined(graph.getNode(box.id), 'box').boundVariables['fills/0/color']).toBe(
      variable.id
    )
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

describe('set_fill takes the colours get_css writes in a Display P3 document', () => {
  /** A box in a document whose stored components are Display P3. */
  function p3Doc() {
    const graph = new SceneGraph()
    graph.documentColorSpace = 'display-p3'
    const figma = new FigmaAPI(graph)
    const box = figma.createRectangle()
    box.resize(100, 60)
    return { graph, figma, box }
  }

  function fillOf(graph: SceneGraph, id: string) {
    return expectDefined(graph.getNode(id), 'box').fills[0]
  }

  test('a color(display-p3 …) string stores the components it names', () => {
    const { graph, figma, box } = p3Doc()

    setFill.execute(
      figma,
      v.parse(setFill.input, { id: box.id, color: 'color(display-p3 1 0.2 0.1)' })
    )

    expect(fillOf(graph, box.id)).toMatchObject({
      type: 'SOLID',
      color: { r: 1, g: 0.2, b: 0.1 }
    })
  })

  test('a token whose fallback is a p3 colour still binds', () => {
    const { graph, figma, box } = p3Doc()
    const collection = graph.createCollection('Theme')
    const variable = graph.createVariable('color/brand', 'COLOR', collection.id, {
      r: 1,
      g: 0,
      b: 0,
      a: 1
    })

    const result = setFill.execute(
      figma,
      v.parse(setFill.input, { id: box.id, color: 'var(--color/brand, color(display-p3 1 0 0))' })
    )

    expect(result).toMatchObject({ bound: 'color/brand' })
    expect(expectDefined(graph.getNode(box.id), 'box').boundVariables['fills/0/color']).toBe(
      variable.id
    )
    expect(fillOf(graph, box.id)).toMatchObject({ color: { r: 1, g: 0, b: 0 } })
  })

  test('the wide-gamut colour get_css wrote paints back unchanged', () => {
    const { graph, figma, box } = p3Doc()
    const wide = { r: 1, g: 0.2, b: 0.1, a: 1 }
    box.fills = [{ type: 'SOLID', color: { ...wide }, opacity: 1, visible: true }]
    const css = (getCSS.execute(figma, { id: box.id, depth: 0 }) as { css: string }).css
    const written = expectDefined(/bg:([^;}]+)/.exec(css)?.[1], 'bg')
    expect(written).toBe('color(display-p3 1 0.2 0.1)')

    const other = figma.createRectangle()
    setFill.execute(figma, v.parse(setFill.input, { id: other.id, color: written }))

    expect(fillOf(graph, other.id)).toMatchObject({
      color: { r: wide.r, g: wide.g, b: wide.b }
    })
  })
})
