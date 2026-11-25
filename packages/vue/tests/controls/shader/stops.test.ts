import { describe, expect, test } from 'bun:test'

import {
  addStop,
  removeStop,
  setStopColor,
  setStopPosition,
  shaderStops
} from '@pairdraw/vue/controls/shader'

describe('shaderStops', () => {
  test('reads a preset gradient as stops sorted along it', () => {
    expect(
      shaderStops([
        { color: '#ffffff', position: 1 },
        { color: '#000000', position: 0 }
      ])
    ).toEqual([
      { color: '#000000', position: 0 },
      { color: '#ffffff', position: 1 }
    ])
  })

  test('keeps positions within the shader and drops entries that are not stops', () => {
    expect(
      shaderStops([
        { color: '#123456', position: -4 },
        { color: '#abcdef', position: 9 },
        { color: '#000000' },
        { position: 0.5 },
        'nope'
      ])
    ).toEqual([
      { color: '#123456', position: 0 },
      { color: '#abcdef', position: 1 }
    ])
  })

  test('is empty for a value that is not a list', () => {
    expect(shaderStops(undefined)).toEqual([])
    expect(shaderStops('#ffffff')).toEqual([])
  })
})

describe('editing stops', () => {
  const stops = [
    { color: '#000000', position: 0 },
    { color: '#ffffff', position: 1 }
  ]

  test('a stop takes a new colour, and a position within the shader', () => {
    expect(setStopColor(stops, 1, '#ff0000')[1]).toEqual({
      color: '#ff0000',
      position: 1
    })
    expect(setStopPosition(stops, 0, 0.4)[0]).toEqual({ color: '#000000', position: 0.4 })
    expect(setStopPosition(stops, 0, 2)[0]?.position).toBe(1)
    expect(setStopPosition(stops, 0, -2)[0]?.position).toBe(0)
  })

  test('an added stop splits the widest gap', () => {
    const added = addStop(stops)
    expect(added).toHaveLength(3)
    expect(added.map((stop) => stop.position)).toEqual([0, 0.5, 1])
    // It starts from the colour on its left, so adding never flashes another colour in.
    expect(added[1]?.color).toBe('#000000')
    expect(addStop(added).map((stop) => stop.position)).toEqual([0, 0.25, 0.5, 1])
  })

  test('a stop can be removed, but the last two stay', () => {
    expect(removeStop(stops, 0)).toEqual(stops)
    const three = addStop(stops)
    expect(removeStop(three, 1)).toEqual(stops)
  })
})
