import { describe, expect, test } from 'bun:test'

import { createWheelStepper, WHEEL_STEP_DISTANCE, WHEEL_TURN_GAP_MS } from '@/app/slides/wheel'

describe('presentation wheel', () => {
  test('a turn past the step distance steps forward or back once', () => {
    const wheel = createWheelStepper()
    expect(wheel.turn({ deltaX: 0, deltaY: 60, time: 0 })).toBeNull()
    expect(wheel.turn({ deltaX: 0, deltaY: 60, time: 16 })).toBe('next')

    const back = createWheelStepper()
    expect(back.turn({ deltaX: 0, deltaY: -WHEEL_STEP_DISTANCE, time: 0 })).toBe('previous')
  })

  test('the rest of a turn, such as a trackpad glide, steps no further', () => {
    const wheel = createWheelStepper()
    expect(wheel.turn({ deltaX: 0, deltaY: 200, time: 0 })).toBe('next')
    let time = 0
    for (let index = 0; index < 60; index++) {
      time += 16
      expect(wheel.turn({ deltaX: 0, deltaY: 200, time })).toBeNull()
    }
    // After a rest, the next turn steps again.
    expect(wheel.turn({ deltaX: 0, deltaY: 200, time: time + WHEEL_TURN_GAP_MS + 1 })).toBe('next')
  })

  test('a sideways turn steps by its larger axis', () => {
    const wheel = createWheelStepper()
    expect(wheel.turn({ deltaX: -150, deltaY: 10, time: 0 })).toBe('previous')
  })

  test('scrolling the slide starts the count again', () => {
    const wheel = createWheelStepper()
    expect(wheel.turn({ deltaX: 0, deltaY: 100, time: 0 })).toBeNull()
    wheel.reset()
    expect(wheel.turn({ deltaX: 0, deltaY: 100, time: 16 })).toBeNull()
    expect(wheel.turn({ deltaX: 0, deltaY: 30, time: 32 })).toBe('next')
  })

  test('turns that change direction cancel out', () => {
    const wheel = createWheelStepper()
    expect(wheel.turn({ deltaX: 0, deltaY: 100, time: 0 })).toBeNull()
    expect(wheel.turn({ deltaX: 0, deltaY: -100, time: 16 })).toBeNull()
    expect(wheel.turn({ deltaX: 0, deltaY: 100, time: 32 })).toBeNull()
  })
})
