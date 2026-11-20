import { describe, expect, test } from 'bun:test'

import type { CanvasKit } from 'canvaskit-wasm'

import { vectorNetworkToPath } from '@pairdraw/core/vector'
import type { VectorNetwork } from '@pairdraw/scene-graph'

import { asDouble } from '#tests/helpers/doubles'

interface RecordedPath {
  operations: string[]
  fillType: number | null
}

function createCanvasKit() {
  const paths: RecordedPath[] = []
  class MockPath {
    operations: string[] = []
    fillType: number | null = null

    constructor() {
      paths.push(this)
    }

    moveTo(x: number, y: number): void {
      this.operations.push(`M${x},${y}`)
    }

    lineTo(x: number, y: number): void {
      this.operations.push(`L${x},${y}`)
    }

    cubicTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
      this.operations.push(`C${x1},${y1},${x2},${y2},${x3},${y3}`)
    }

    close(): void {
      this.operations.push('Z')
    }

    setFillType(value: number): void {
      this.fillType = value
    }
  }

  class MockPathBuilder {
    operations: string[] = []
    fillType: number | null = null

    moveTo(x: number, y: number): void {
      this.operations.push(`M${x},${y}`)
    }

    lineTo(x: number, y: number): void {
      this.operations.push(`L${x},${y}`)
    }

    cubicTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
      this.operations.push(`C${x1},${y1},${x2},${y2},${x3},${y3}`)
    }

    close(): void {
      this.operations.push('Z')
    }

    setFillType(value: number): void {
      this.fillType = value
    }

    detachAndDelete(): MockPath {
      const path = new MockPath()
      path.operations = [...this.operations]
      path.fillType = this.fillType
      return path
    }
  }

  return {
    ck: asDouble<CanvasKit>({
      PathBuilder: MockPathBuilder,
      FillType: { Winding: 0, EvenOdd: 1 }
    }),
    paths
  }
}

function mixedNetwork(): VectorNetwork {
  return {
    vertices: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 50, y: 50 },
      { x: 90, y: 50 }
    ],
    segments: [
      { start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
      { start: 1, end: 2, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
      { start: 2, end: 3, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
      { start: 3, end: 0, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
      { start: 4, end: 5, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }
    ],
    regions: [{ windingRule: 'NONZERO', loops: [[0, 1, 2, 3]] }]
  }
}

describe('vectorNetworkToPath', () => {
  test('preserves open segments alongside filled regions', () => {
    const { ck, paths } = createCanvasKit()

    const result = vectorNetworkToPath(ck, mixedNetwork())

    expect(result).toHaveLength(2)
    expect(paths[0]).toEqual({
      operations: ['M0,0', 'L10,0', 'L10,10', 'L0,10', 'L0,0', 'Z'],
      fillType: 0
    })
    expect(paths[1]).toEqual({ operations: ['M50,50', 'L90,50'], fillType: null })
  })

  test('rounds a filled region corner by its vertex radius', () => {
    const { ck, paths } = createCanvasKit()
    const network = mixedNetwork()
    network.regions = [{ windingRule: 'NONZERO', loops: [[0, 1, 2, 3]] }]
    network.vertices[0].cornerRadius = 4

    vectorNetworkToPath(ck, network)

    expect(paths[0].operations.filter((operation) => operation.startsWith('C'))).toHaveLength(1)
    // The corner is cut from the square's edges instead of drawn through (0, 0).
    expect(paths[0].operations).not.toContain('L0,0')
  })

  test('rounds a filled region corner by the layer radius when its vertex has none', () => {
    const { ck, paths } = createCanvasKit()
    const network = mixedNetwork()
    network.regions = [{ windingRule: 'NONZERO', loops: [[0, 1, 2, 3]] }]

    // A rounded layer: the radius sits on the layer, not on each vertex, and the stroke already
    // follows it, so the fill has to round the same corners or it peeks out sharp underneath.
    vectorNetworkToPath(ck, network, 4)

    // The layer's radius reaches every corner, not just one vertex's.
    expect(paths[0].operations.filter((operation) => operation.startsWith('C'))).toHaveLength(4)
    expect(paths[0].operations).not.toContain('L0,0')
  })

  test('keeps a filled region’s corners sharp without a radius', () => {
    const { ck, paths } = createCanvasKit()
    const network = mixedNetwork()
    network.regions = [{ windingRule: 'NONZERO', loops: [[0, 1, 2, 3]] }]

    vectorNetworkToPath(ck, network)

    expect(paths[0].operations.filter((operation) => operation.startsWith('C'))).toHaveLength(0)
  })

  test('does not duplicate segments shared by multiple region loops', () => {
    const { ck, paths } = createCanvasKit()
    const network = mixedNetwork()
    network.regions.push({ windingRule: 'EVENODD', loops: [[0, 1, 2, 3]] })

    const result = vectorNetworkToPath(ck, network)

    expect(result).toHaveLength(3)
    expect(paths.filter((path) => path.operations.includes('M50,50'))).toHaveLength(1)
  })
})
