import { describe, expect, test } from 'bun:test'

import { appendSkillContext, stripModelNotes } from '@/app/ai/chat/context'
import { commandLink } from '@/app/ai/chat/references/command'
import { invokedSkill, withSkillCommand } from '@/app/ai/skills/invoke'
import type { SkillLibrary } from '@/app/ai/skills/library'
import type { Skill } from '@/app/ai/skills/types'

import { skillFixture } from '#tests/helpers/chat/skills'

function library(skills: Skill[]): SkillLibrary & { reads: number } {
  const result = {
    reads: 0,
    refresh: async () => {
      result.reads++
    },
    enabled: () => skills
  }
  return result
}

describe('running a skill by name', () => {
  test('finds the skill a message starts with, read fresh', async () => {
    const skills = library([skillFixture()])
    expect(
      await invokedSkill(`${commandLink('skill:grid')} lay out the hero`, skills)
    ).toMatchObject({
      name: 'grid'
    })
    expect(skills.reads).toBe(1)
  })

  test('ignores text without a leading command, other commands, unknown names, and skills not run by name', async () => {
    const skills = library([skillFixture(), skillFixture({ name: 'brand', userInvocable: false })])
    expect(await invokedSkill(`lay out ${commandLink('skill:grid')}`, skills)).toBeNull()
    // Typed text is not a command; one is chosen from `/` or typed in full there.
    expect(await invokedSkill('/skill:grid lay out the hero', skills)).toBeNull()
    expect(await invokedSkill(commandLink('compact'), skills)).toBeNull()
    expect(await invokedSkill(commandLink('skill:missing'), skills)).toBeNull()
    expect(await invokedSkill(commandLink('skill:brand'), skills)).toBeNull()
    expect(skills.reads).toBe(2)
  })

  test('a picked skill starts the message, replacing a command already chosen there', () => {
    expect(withSkillCommand('', 'dark-mode')).toBe(`${commandLink('skill:dark-mode')} `)
    expect(withSkillCommand('make the hero darker', 'dark-mode')).toBe(
      `${commandLink('skill:dark-mode')} make the hero darker`
    )
    expect(withSkillCommand(`  ${commandLink('skill:layout')}  tidy the cards`, 'restyle')).toBe(
      `${commandLink('skill:restyle')} tidy the cards`
    )
    // A path or typed text is what the user wrote, not a command to replace.
    expect(withSkillCommand('/tmp/hero.png is the photo', 'restyle')).toBe(
      `${commandLink('skill:restyle')} /tmp/hero.png is the photo`
    )
    // The line breaks after a replaced command are the message's layout, not its separator.
    expect(withSkillCommand(`${commandLink('skill:layout')}\n\n1. tidy\n2. align`, 'restyle')).toBe(
      `${commandLink('skill:restyle')}\n\n1. tidy\n2. align`
    )
    expect(withSkillCommand(`${commandLink('skill:layout')} \t\nfix it`, 'restyle')).toBe(
      `${commandLink('skill:restyle')}\nfix it`
    )
  })

  test('gives the model the instructions in a note the transcript leaves out', () => {
    const text = appendSkillContext('/skill:grid lay out the hero', {
      name: 'grid',
      instructions: 'Snap every frame to multiples of 8.'
    })
    expect(text).toContain('<skill name="grid">\nSnap every frame to multiples of 8.\n</skill>')
    expect(stripModelNotes(text)).toBe('/skill:grid lay out the hero')
    expect(appendSkillContext('hello', null)).toBe('hello')
  })
})
