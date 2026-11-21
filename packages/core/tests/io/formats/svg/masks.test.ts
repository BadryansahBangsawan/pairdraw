import { describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { renderNodesToSVG } from '@pairdraw/core/io/formats/svg'
import { SceneGraph, type MaskType } from '@pairdraw/scene-graph'

const white = { type: 'SOLID' as const, color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }
const red = { type: 'SOLID' as const, color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }
const blue = { type: 'SOLID' as const, color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 1, visible: true }

/** A frame with a layer before the mask, the mask, and one masked layer after it. */
function masked(maskType: MaskType) {
  const graph = new SceneGraph()
  const page = graph.getPages()[0].id
  const frame = graph.createNode('FRAME', page, { width: 200, height: 200 })
  graph.createNode('RECTANGLE', frame.id, {
    name: 'Before',
    x: 0,
    y: 120,
    width: 40,
    height: 40,
    fills: [blue]
  })
  const mask = graph.createNode('RECTANGLE', frame.id, {
    name: 'Mask',
    x: 10,
    y: 10,
    width: 50,
    height: 50,
    isMask: true,
    maskType,
    fills: [white]
  })
  graph.createNode('RECTANGLE', frame.id, {
    name: 'Masked',
    x: 0,
    y: 0,
    width: 150,
    height: 150,
    fills: [red]
  })
  return { graph, page, frame, mask }
}

function exported(maskType: MaskType): string {
  const { graph, page, frame } = masked(maskType)
  return expectDefined(renderNodesToSVG(graph, page, [frame.id], { xmlDeclaration: false }))
}

describe('shape masks exported to SVG', () => {
  test('an alpha mask draws its layer into a mask and applies it to the layers after it', () => {
    const svg = exported('ALPHA')
    const definition = expectDefined(/<mask [^>]*mask-type="alpha"[^>]*>[\s\S]*?<\/mask>/.exec(svg))
    expect(definition[0]).toContain('width="50"')
    const applied = expectDefined(/<g mask="url\(#[^)]+\)">/.exec(svg))
    expect(applied.index).toBeGreaterThan(definition.index)
    // Only the layer after the mask is masked, and it is inside the masked group.
    const before = expectDefined(/<rect width="40" height="40" fill="#0000FF"/.exec(svg))
    expect(before.index).toBeLessThan(applied.index)
    const maskedLayer = expectDefined(/<rect width="150" height="150" fill="#FF0000"/.exec(svg))
    expect(maskedLayer.index).toBeGreaterThan(applied.index)
  })

  test('a luminance mask keeps the drawn luminance of its layer', () => {
    const svg = exported('LUMINANCE')
    expect(svg).toContain('<mask ')
    expect(svg).not.toContain('mask-type="alpha"')
    const definition = expectDefined(/<mask [^>]*>[\s\S]*?<\/mask>/.exec(svg))
    expect(definition[0]).toContain('fill="#FFFFFF"')
  })

  test('a vector mask clips the layers after it to the mask outline', () => {
    const svg = exported('VECTOR')
    const definition = expectDefined(/<clipPath [^>]*>[\s\S]*?<\/clipPath>/.exec(svg))
    expect(definition[0]).toContain('width="50"')
    const applied = expectDefined(/<g clip-path="url\(#[^)]+\)">/.exec(svg))
    expect(applied.index).toBeGreaterThan(definition.index)
    expect(svg).not.toMatch(/<mask/)
  })

  test('consecutive masks all apply to the layers after them', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', page, { width: 200, height: 200 })
    graph.createNode('RECTANGLE', frame.id, {
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      isMask: true,
      maskType: 'ALPHA',
      fills: [white]
    })
    graph.createNode('ELLIPSE', frame.id, {
      x: 60,
      y: 10,
      width: 50,
      height: 50,
      isMask: true,
      maskType: 'ALPHA',
      fills: [white]
    })
    graph.createNode('RECTANGLE', frame.id, { x: 0, y: 0, width: 150, height: 150, fills: [red] })
    const svg = expectDefined(
      renderNodesToSVG(graph, page, [frame.id], { xmlDeclaration: false })
    )
    expect(svg.match(/<mask /g)?.length).toBe(2)
    expect(svg.match(/<g mask="url\(#[^)]+\)">/g)?.length).toBe(2)
  })

  test('a mask with nothing after it draws nothing', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', page, { width: 200, height: 200 })
    graph.createNode('RECTANGLE', frame.id, {
      name: 'Lonely mask',
      width: 50,
      height: 50,
      isMask: true,
      maskType: 'ALPHA',
      fills: [white]
    })
    expect(
      renderNodesToSVG(graph, page, [frame.id], { xmlDeclaration: false })
    ).toBeNull()
  })

  test('a hidden mask neither draws nor masks', () => {
    const { graph, page, frame } = masked('ALPHA')
    const mask = expectDefined(graph.getChildren(frame.id).find((child) => child.isMask))
    mask.visible = false
    const svg = expectDefined(
      renderNodesToSVG(graph, page, [frame.id], { xmlDeclaration: false })
    )
    expect(svg).not.toContain('<mask')
    expect(svg).toContain('fill="#FF0000"')
  })
})

