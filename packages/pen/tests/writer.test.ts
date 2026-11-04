import { describe, expect, test } from 'bun:test'

import type { PenDocument, PenNode } from '@open-pencil/pen'
import { parsePenDocument, parsePenFile, writePenDocument } from '@open-pencil/pen'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { gradientPoint } from '@open-pencil/scene-graph/gradient'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { expectDefined, getNodeOrThrow } from './helpers/assert'
import { parseDocument } from './helpers/document'
import { FIXTURES } from './helpers/paths'

const FIXTURE_NAMES = [
  'pencil_simple.pen',
  'pencil_button.pen',
  'pen-variables.pen',
  'pen-imports.pen',
  'pen-layout-defaults.pen',
  'pen-oracles/probes.pen'
] as const

function readFixture(name: string): Promise<string> {
  return Bun.file(`${FIXTURES}/${name}`).text()
}

function findNode(nodes: readonly PenNode[], id: string): PenNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = node.children ? findNode(node.children, id) : undefined
    if (found) return found
  }
  return undefined
}

function refIds(nodes: readonly PenNode[]): string[] {
  const ids: string[] = []
  for (const node of nodes) {
    if (node.type === 'ref') ids.push(node.id)
    if (node.children) ids.push(...refIds(node.children))
  }
  return ids
}

/** Instances the reader built from a `ref` whose component holds no other instance. */
function topLevelInstances(graph: SceneGraph): SceneNode[] {
  const inside = (node: SceneNode): boolean => {
    for (let parent = node.parentId ? graph.getNode(node.parentId) : undefined; parent;) {
      if (parent.type === 'INSTANCE') return true
      parent = parent.parentId ? graph.getNode(parent.parentId) : undefined
    }
    return false
  }
  return [...graph.getAllNodes()].filter(
    (node) => !node.internalOnly && node.type === 'INSTANCE' && !inside(node)
  )
}

describe('writePenDocument', () => {
  test('writes sorted, indented text with one trailing newline', async () => {
    const document = parsePenDocument(await readFixture('pencil_button.pen'))
    const text = writePenDocument(document)
    expect(text.endsWith('\n')).toBe(true)
    expect(text.endsWith('\n\n')).toBe(false)
    expect(text.startsWith('{\n  "children": [')).toBe(true)
    expect(text).toBe(writePenDocument(document))
    expect(JSON.parse(text)).toEqual(document)
  })

  for (const name of FIXTURE_NAMES) {
    test(`keeps ${name} a fixed point`, async () => {
      const graph = parsePenFile(await readFixture(name))
      const first = writePenDocument(graph)
      const second = writePenDocument(parsePenFile(first))
      expect(second).toBe(first)
    })
  }

  test('keeps every authored layer of pen-oracles/probes.pen', async () => {
    const source = parsePenDocument(await readFixture('pen-oracles/probes.pen'))
    const collect = (nodes: readonly PenNode[]): string[] =>
      nodes.flatMap((node) => [node.id, ...(node.children ? collect(node.children) : [])])
    const sourceIds = new Set(collect(source.children))
    const graph = parsePenFile(await readFixture('pen-oracles/probes.pen'))
    const written = parsePenDocument(writePenDocument(graph))
    for (const id of sourceIds) expect(findNode(written.children, id)).toBeDefined()
    const visible = [...graph.getAllNodes()].filter((node) => !node.internalOnly)
    expect(visible.length).toBeGreaterThan(sourceIds.size)
  })

  test('writes an instance as a ref to its component', async () => {
    const graph = parsePenFile(await readFixture('pen-oracles/probes.pen'))
    const instances = topLevelInstances(graph)
    expect(instances.length).toBeGreaterThan(0)
    const written = parsePenDocument(writePenDocument(graph))
    expect(refIds(written.children).sort()).toEqual(instances.map((node) => node.id).sort())
    for (const instance of instances)
      expect(findNode(written.children, instance.id)?.ref).toBe(instance.componentId ?? undefined)
  })

  test('writes a sticky note with its text and without generated sublayers', async () => {
    const graph = parsePenFile(await readFixture('pen-oracles/probes.pen'))
    const written = parsePenDocument(writePenDocument(graph))
    const note = findNode(written.children, 'Obb9z')
    expect(note?.type).toBe('note')
    expect(note?.content).toBe('A note')
    expect(note?.children).toBeUndefined()
    expect(findNode(written.children, 'QqC95')?.type).toBe('context')
    expect(findNode(written.children, 'A1A7t')?.type).toBe('prompt')
  })

  test('writes plugin data back as its pen.dev field', async () => {
    const graph = parsePenFile(await readFixture('pen-imports.pen'))
    const written = parsePenDocument(writePenDocument(graph))
    const cta = findNode(written.children, 'cta')
    expect(cta?.type).toBe('ref')
    expect(cta?.ref).toBe('ui:button')
    const chart = findNode(written.children, 'chart')
    expect(chart?.type).toBe('script')
    expect(chart?.scriptUri).toBeDefined()
    const site = findNode(written.children, 'site')
    expect(site?.type).toBe('browser')
    expect(site?.url).toBeDefined()
  })

  test('writes a blend mode in the pen.dev name the reader accepts', async () => {
    const graph = parsePenFile(await readFixture('pen-oracles/probes.pen'))
    const written = parsePenDocument(writePenDocument(graph))
    const painted = findNode(written.children, 'NwchB')
    expect(painted?.fill).toEqual([
      { type: 'color', color: '#FFFF00' },
      { type: 'color', color: '#00FFFF', blendMode: 'multiply' }
    ])
  })

  test('writes a bound gap as its variable reference', async () => {
    const graph = parsePenFile(await readFixture('pen-oracles/probes.pen'))
    const written = parsePenDocument(writePenDocument(graph))
    expect(findNode(written.children, 'L1EgVR')?.gap).toBe('$pq-num')
  })

  test('round-trips a diamond gradient', () => {
    const graph = parseDocument([
      {
        id: 'shape',
        type: 'rectangle',
        width: 200,
        height: 100,
        fill: {
          type: 'gradient',
          gradientType: 'diamond',
          rotation: 45,
          center: { x: 0.3, y: 0.6 },
          size: { width: 0.6, height: 0.8 },
          colors: [
            { color: '#000000', position: 0 },
            { color: '#FFFFFF', position: 1 }
          ]
        }
      }
    ])
    const written = writtenNode(graph, 'shape')
    expect(written.fill).toMatchObject({
      type: 'gradient',
      gradientType: 'diamond',
      rotation: 45,
      center: { x: 0.3, y: 0.6 },
      size: { width: 0.6, height: 0.8 }
    })
    const again = parsePenFile(writePenDocument(graph))
    expect(getNodeOrThrow(again, 'shape').fills[0]?.type).toBe('GRADIENT_DIAMOND')
  })

  test('writes a bound per-side stroke width as its variable reference', () => {
    const graph = parseDocument(
      [
        {
          id: 'shape',
          type: 'rectangle',
          width: 100,
          height: 80,
          stroke: '#FF0000',
          strokeWidth: { top: '$edge', right: 2, bottom: 1, left: 4 }
        }
      ],
      { variables: { edge: { type: 'number', value: 6 } } }
    )
    expect(writtenNode(graph, 'shape').strokeWidth).toEqual({
      top: '$edge',
      right: 2,
      bottom: 1,
      left: 4
    })
    const again = parsePenFile(writePenDocument(graph))
    const node = getNodeOrThrow(again, 'shape')
    expect(again.variables.get(node.boundVariables.borderTopWeight ?? '')?.name).toBe('edge')
    expect(node.boundVariables.borderRightWeight).toBeUndefined()
    expect(node.borderTopWeight).toBe(6)
  })

  test('writes a bound font weight as its variable reference', () => {
    const graph = parseDocument(
      [
        { id: 'heavy', type: 'text', content: 'Hi', fontWeight: '$heavy' },
        { id: 'regular', type: 'text', content: 'Hi', fontWeight: '$regular' },
        { id: 'plain', type: 'text', content: 'Hi' }
      ],
      {
        variables: {
          heavy: { type: 'number', value: 700 },
          regular: { type: 'number', value: 400 }
        }
      }
    )
    expect(writtenNode(graph, 'heavy').fontWeight).toBe('$heavy')
    expect(writtenNode(graph, 'regular').fontWeight).toBe('$regular')
    expect(writtenNode(graph, 'plain').fontWeight).toBeUndefined()
    const again = parsePenFile(writePenDocument(graph))
    const boundName = (id: string) =>
      again.variables.get(getNodeOrThrow(again, id).boundVariables.fontWeight ?? '')?.name
    expect(boundName('heavy')).toBe('heavy')
    expect(boundName('regular')).toBe('regular')
    expect(getNodeOrThrow(again, 'heavy').fontWeight).toBe(700)
    expect(getNodeOrThrow(again, 'regular').fontWeight).toBe(400)
    expect(getNodeOrThrow(again, 'plain').boundVariables.fontWeight).toBeUndefined()
  })

  test('writes a 45° linear gradient with the pen.dev placement the reader uses', () => {
    // A linear gradient runs size.height long. The reader builds its across axis at that same
    // length, so the writer reports that length as size.width too.
    expectGradientRoundTrip(
      {
        gradientType: 'linear',
        rotation: 45,
        center: { x: 0.3, y: 0.6 },
        size: { height: 0.5 }
      },
      {
        gradientType: 'linear',
        rotation: 45,
        center: { x: 0.3, y: 0.6 },
        size: { width: 0.5, height: 0.5 }
      }
    )
  })

  test('writes a radial gradient with the pen.dev placement the reader uses', () => {
    const paint = {
      gradientType: 'radial',
      rotation: 30,
      center: { x: 0.3, y: 0.6 },
      size: { width: 0.6, height: 0.8 }
    }
    expectGradientRoundTrip(paint, paint)
  })

  test('writes a rotated layer at its pen.dev corner with the counter-clockwise sign', () => {
    const graph = placed([
      { id: 'turned', type: 'rectangle', x: 60, y: 40, width: 100, height: 60, rotation: 30 }
    ])
    const written = writtenNode(graph, 'turned')
    expect(written).toMatchObject({ x: 60, y: 40, rotation: 30 })
    expect(written.flipX).toBeUndefined()
    const before = getNodeOrThrow(graph, 'turned')
    expect(before.rotation).toBeLessThan(0)
    expectPlacedAgain(graph, 'turned')
  })

  test('writes a flipped layer at its pen.dev corner and keeps a single flip rotation sign', () => {
    const graph = placed([
      { id: 'flipped', type: 'rectangle', x: 340, y: 40, width: 100, height: 60, flipX: true },
      {
        id: 'turned',
        type: 'rectangle',
        x: 220,
        y: 40,
        width: 100,
        height: 60,
        rotation: 30,
        flipX: true
      }
    ])
    const flipped = writtenNode(graph, 'flipped')
    expect(flipped).toMatchObject({ x: 340, y: 40, flipX: true })
    expect(flipped.rotation).toBeUndefined()
    expect(getNodeOrThrow(graph, 'flipped').x).toBeCloseTo(240)
    const turned = writtenNode(graph, 'turned')
    expect(turned).toMatchObject({ x: 220, y: 40, rotation: 30, flipX: true })
    expect(getNodeOrThrow(graph, 'turned').rotation).toBeGreaterThan(0)
    expectPlacedAgain(graph, 'flipped')
    expectPlacedAgain(graph, 'turned')
  })

  test('sorts keys by code point, independent of the runtime locale', () => {
    const text = writePenDocument({
      version: '2.21',
      children: [],
      variables: {
        a: { type: 'string', value: 'lower' },
        B: { type: 'string', value: 'upper' }
      }
    })
    const variables = text.slice(text.indexOf('"variables"'))
    expect(variables.indexOf('"B"')).toBeLessThan(variables.indexOf('"a"'))
  })
})

function placed(children: PenNode[]): SceneGraph {
  return parseDocument([
    { id: 'page', type: 'frame', layout: 'none', width: 600, height: 400, children }
  ])
}

function expectPlacedAgain(graph: SceneGraph, id: string) {
  const again = getNodeOrThrow(parsePenFile(writePenDocument(graph)), id)
  const before = getNodeOrThrow(graph, id)
  expect(again.x).toBeCloseTo(before.x, 5)
  expect(again.y).toBeCloseTo(before.y, 5)
  expect(again.rotation).toBeCloseTo(before.rotation, 5)
  expect(again.flipX).toBe(before.flipX)
  expect(again.flipY).toBe(before.flipY)
}

const GRADIENT_STOPS = [
  { color: '#000000', position: 0 },
  { color: '#FFFFFF', position: 1 }
]

/** Handles the reader places: a linear run, and a radial centre with the ends of its radii. */
const GRADIENT_HANDLES = [
  { x: 0, y: 0.5 },
  { x: 1, y: 0.5 },
  { x: 0.5, y: 0.5 },
  { x: 0.5, y: 1 }
]

function expectGradientRoundTrip(
  paint: {
    gradientType: string
    rotation: number
    center: Vector
    size: { width?: number; height?: number }
  },
  expected: {
    gradientType: string
    rotation: number
    center: Vector
    size: { width: number; height: number }
  }
) {
  const graph = parseDocument([
    {
      id: 'shape',
      type: 'rectangle',
      width: 200,
      height: 100,
      fill: { type: 'gradient', ...paint, colors: GRADIENT_STOPS }
    }
  ])
  const written = writtenNode(graph, 'shape').fill
  expect(written).toMatchObject({ type: 'gradient', ...expected })
  const again = parsePenFile(writePenDocument(graph))
  const before = expectDefined(getNodeOrThrow(graph, 'shape').fills[0]?.gradientTransform)
  const after = expectDefined(getNodeOrThrow(again, 'shape').fills[0]?.gradientTransform)
  for (const handle of GRADIENT_HANDLES) {
    const start = gradientPoint(before, handle)
    const end = gradientPoint(after, handle)
    expect(end.x).toBeCloseTo(start.x, 5)
    expect(end.y).toBeCloseTo(start.y, 5)
  }
}

function writtenNode(graph: SceneGraph, id: string): PenNode {
  const document: PenDocument = parsePenDocument(writePenDocument(graph))
  return expectDefined(findNode(document.children, id), id)
}
