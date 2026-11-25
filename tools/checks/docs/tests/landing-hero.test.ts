import { describe, expect, test } from 'bun:test'

import {
  HERO_STEPS,
  heroScene,
  LAST_STEP,
  STEP_HOLD
} from '#docs-config/theme/landing/hero/storyboard'

const at = (name: (typeof HERO_STEPS)[number]) => HERO_STEPS.indexOf(name)

describe('the hero storyboard', () => {
  test('holds every frame, the finished scene longest, and reaches the comment quickly', () => {
    const holds = HERO_STEPS.map((step) => STEP_HOLD[step])
    expect(holds.every((hold) => hold > 0)).toBe(true)
    expect(STEP_HOLD.done).toBe(Math.max(...holds))
    expect(STEP_HOLD.draw + STEP_HOLD.size + STEP_HOLD.comment).toBeLessThan(3)
  })

  test('shows the whole copy before the agent acts', () => {
    const first = heroScene(0)
    expect(first.lead && first.actions).toBe(true)
    expect(first.layers).toEqual({ heading: true, comment: false, lead: true })
  })

  test('draws the box first, then sizes it around the copy', () => {
    expect(heroScene(at('draw')).box).toBe('drawing')
    expect(heroScene(at('size')).box).toBe('sized')
    expect(heroScene(at('draw')).agent).toBe('drawing')
    expect(heroScene(at('size')).agent).toBe('end')
  })

  test('lets the person comment before the agent replies, with the buttons always there', () => {
    const comment = heroScene(at('comment'))
    expect(comment.human && comment.comment && !comment.reply).toBe(true)
    expect(comment.actions).toBe(true)
    expect(comment.active).toEqual({ layer: 'comment', actor: 'human' })
    const done = heroScene(LAST_STEP)
    expect(done.reply && done.actions).toBe(true)
    expect(done.active).toEqual({ layer: 'comment', actor: 'agent' })
  })

  test('clamps steps outside the storyboard to its ends', () => {
    expect(heroScene(-1)).toEqual(heroScene(0))
    expect(heroScene(LAST_STEP + 3)).toEqual(heroScene(LAST_STEP))
  })
})
