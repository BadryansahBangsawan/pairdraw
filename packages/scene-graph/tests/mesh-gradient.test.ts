import { describe, expect, test } from 'bun:test'

import type { Fill } from '@pairdraw/scene-graph'
import { copyFill } from '@pairdraw/scene-graph/copy'
import {
  defaultMeshGrid,
  defaultMeshPoints,
  isMeshFill,
  meshPointCount,
  resampleMeshPoints
} from '@pairdraw/scene-graph/gradient'

const RED = { r: 1, g: 0, b: 0, a: 1 }
const WHITE = { r: 1, g: 1, b: 1, a: 1 }

function meshFill(): Fill {
  return {
    type: 'MESH',
    color: RED,
    opacity: 1,
    visible: true,
    meshColumns: 1,
    meshRows: 1,
    meshPoints: defaultMeshPoints(RED)
  }
}

describe('mesh gradient fills', () => {
  test('a 1x1 mesh holds its four corners row-major', () => {
    const points = defaultMeshPoints(RED)
    expect(points.map((point) => point.position)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 }
    ])
    expect(meshPointCount(1, 1)).toBe(4)
    expect(meshPointCount(2, 3)).toBe(12)
  })

  test('a 2x2 grid spaces its points evenly', () => {
    const grid = defaultMeshGrid(RED, 2, 2)
    expect(grid.length).toBe(9)
    expect(grid[4]?.position).toEqual({ x: 0.5, y: 0.5 })
  })

  test('resampling keeps the corners and blends the middle', () => {
    const source = defaultMeshPoints(WHITE)
    if (source[0]) source[0].color = { ...RED }
    const grid = resampleMeshPoints(source, 1, 1, 2, 2)
    expect(grid.length).toBe(9)
    expect(grid[0]?.color).toMatchObject({ r: 1, g: 0, b: 0 })
    expect(grid[8]?.color).toMatchObject({ r: 1, g: 1, b: 1 })
    const middle = grid[4]?.color
    expect(middle?.r).toBe(1)
    expect(middle?.g).toBeGreaterThan(0.5)
    expect(middle?.g).toBeLessThan(1)
  })
  test('isMeshFill needs the type and a complete grid', () => {
    expect(isMeshFill(meshFill())).toBe(true)
    const wrongType = meshFill()
    wrongType.type = 'SOLID'
    expect(isMeshFill(wrongType)).toBe(false)
    const short = meshFill()
    short.meshPoints = short.meshPoints?.slice(0, 3)
    expect(isMeshFill(short)).toBe(false)
    const missing = meshFill()
    delete missing.meshColumns
    expect(isMeshFill(missing)).toBe(false)
    const zero = meshFill()
    zero.meshColumns = 0
    expect(isMeshFill(zero)).toBe(false)
  })

  test('copyFill deep-copies mesh points', () => {
    const source = meshFill()
    const copy = copyFill(source)
    expect(copy.meshPoints).toEqual(source.meshPoints)
    if (copy.meshPoints?.[0]) copy.meshPoints[0].position = { x: 0.5, y: 0 }
    expect(source.meshPoints?.[0]?.position.x).toBe(0)
  })
})

