import { describe, expect, test } from 'bun:test'

import {
  HERO_STEPS,
  heroScene,
  LAST_STEP,
  STEP_HOLD,
  typedHeadline
} from '#docs-config/theme/landing/hero/storyboard'

const at = (name: (typeof HERO_STEPS)[number]) => HERO_STEPS.indexOf(name)

describe('the hero storyboard', () => {
  test('holds every frame, the finished scene longest and the opening over a typed word', () => {
    const holds = HERO_STEPS.map((step) => STEP_HOLD[step])
    expect(holds.every((hold) => hold > 0)).toBe(true)
    expect(STEP_HOLD.done).toBe(Math.max(...holds))
    expect(STEP_HOLD.prompt).toBeGreaterThan(STEP_HOLD.type1)
  })

  test('types the headline a few letters, a word, then word by word', () => {
    const title = 'Design next to your agent.'
    const typed = HERO_STEPS.map((_, index) => typedHeadline(title, heroScene(index).typed))
    expect(typed.slice(at('type1'), at('headline') + 1)).toEqual([
      'Des',
      'Design',
      'Design next to',
      'Design next to your',
      title
    ])
    expect(typed[at('prompt')]).toBe('')
  })

  test('types a one-word headline without repeating or losing it', () => {
    expect(typedHeadline('Hola.', 'most')).toBe('Hola.')
    expect(typedHeadline('Hola.', 'nearly')).toBe('Hola.')
  })

  test('draws the box before typing into it and sizes it before the first letter', () => {
    expect(heroScene(at('pick')).box).toBe('none')
    expect(heroScene(at('draw')).box).toBe('drawing')
    expect(heroScene(at('type1')).box).toBe('sized')
  })

  test('lets the person comment before the agent replies, then shows the buttons', () => {
    const comment = heroScene(at('comment'))
    expect(comment.human && comment.comment && !comment.reply && !comment.actions).toBe(true)
    expect(comment.active).toEqual({ layer: 'comment', actor: 'human' })
    const done = heroScene(LAST_STEP)
    expect(done.reply && done.actions && done.status === null).toBe(true)
    expect(done.active).toEqual({ layer: 'comment', actor: 'agent' })
  })

  test('clamps steps outside the storyboard to its ends', () => {
    expect(heroScene(-1)).toEqual(heroScene(0))
    expect(heroScene(LAST_STEP + 3)).toEqual(heroScene(LAST_STEP))
  })
})
