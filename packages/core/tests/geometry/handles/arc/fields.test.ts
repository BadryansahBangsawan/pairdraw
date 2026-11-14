import { describe, expect, test } from 'bun:test'

import type { ArcData } from '@pairdraw/scene-graph'

import { arcFieldValue, arcWithField } from '#core/geometry'

const DEGREE = Math.PI / 180
const FULL_TURN = 2 * Math.PI

function arc(startDegrees: number, endDegrees: number, innerRadius = 0): ArcData {
  return { startingAngle: startDegrees * DEGREE, endingAngle: endDegrees * DEGREE, innerRadius }
}

describe('arc fields', () => {
  test('show the start in degrees, the sweep in percent of a turn, the ratio in percent', () => {
    const shown = arc(45, 315, 0.4)
    expect(arcFieldValue(shown, 'start')).toBe(45)
    expect(arcFieldValue(shown, 'sweep')).toBe(75)
    expect(arcFieldValue(shown, 'ratio')).toBe(40)
  })

  test('round to one decimal, as the handle labels do', () => {
    const shown = arc(10.04, 10.04 + 123.456, 0.33333)
    expect(arcFieldValue(shown, 'start')).toBe(10)
    expect(arcFieldValue(shown, 'sweep')).toBe(34.3)
    expect(arcFieldValue(shown, 'ratio')).toBe(33.3)
  })

  test('a whole ellipse sweeps 100 percent from 0 degrees', () => {
    const whole = { startingAngle: 0, endingAngle: FULL_TURN, innerRadius: 0 }
    expect(arcFieldValue(whole, 'start')).toBe(0)
    expect(arcFieldValue(whole, 'sweep')).toBe(100)
  })

  test('a typed start turns the whole arc and keeps its sweep', () => {
    const turned = arcWithField(arc(0, 90, 0.5), 'start', 30)
    expect(turned.startingAngle).toBeCloseTo(30 * DEGREE)
    expect(turned.endingAngle).toBeCloseTo(120 * DEGREE)
    expect(turned.innerRadius).toBe(0.5)
  })

  test('a start outside one turn wraps into it', () => {
    expect(arcWithField(arc(0, 90), 'start', -90).startingAngle).toBeCloseTo(270 * DEGREE)
    expect(arcWithField(arc(0, 90), 'start', 450).startingAngle).toBeCloseTo(90 * DEGREE)
  })

  test('a typed sweep runs from the start, at most a full turn either way', () => {
    expect(arcWithField(arc(90, 180), 'sweep', 50).endingAngle).toBeCloseTo(270 * DEGREE)
    expect(arcWithField(arc(90, 180), 'sweep', -25).endingAngle).toBeCloseTo(0)
    expect(arcWithField(arc(0, 90), 'sweep', 250).endingAngle).toBeCloseTo(FULL_TURN)
  })

  test('a typed ratio is clamped to the radius', () => {
    expect(arcWithField(arc(0, 90), 'ratio', 25).innerRadius).toBe(0.25)
    expect(arcWithField(arc(0, 90), 'ratio', 140).innerRadius).toBe(1)
    expect(arcWithField(arc(0, 90), 'ratio', -5).innerRadius).toBe(0)
  })

  test('a value that is not a number leaves the arc as it is', () => {
    const before = arc(15, 200, 0.2)
    expect(arcWithField(before, 'start', Number.NaN)).toBe(before)
    expect(arcWithField(before, 'sweep', Number.POSITIVE_INFINITY)).toBe(before)
  })

  test('a typed value reads back as typed', () => {
    let current = arc(0, 360)
    current = arcWithField(current, 'start', 12.5)
    current = arcWithField(current, 'sweep', 62.5)
    current = arcWithField(current, 'ratio', 37.5)
    expect(arcFieldValue(current, 'start')).toBe(12.5)
    expect(arcFieldValue(current, 'sweep')).toBe(62.5)
    expect(arcFieldValue(current, 'ratio')).toBe(37.5)
  })
})
