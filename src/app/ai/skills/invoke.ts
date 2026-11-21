import { commandLink, leadingCommand } from '@/app/ai/chat/references/command'
import { findReferences } from '@/app/ai/chat/references/link'

import { appSkillLibrary, type SkillLibrary } from './library'
import type { Skill } from './types'

/** The command that runs a skill by name, as in pi: `/skill:brand-review check the hero`. */
const SKILL_COMMAND = 'skill:'

export function skillCommand(name: string): string {
  return `${SKILL_COMMAND}${name}`
}

/**
 * A command already chosen at the start of a message, which a picked skill replaces, with the
 * spaces after it; the line breaks that follow are the user's layout and stay.
 */
const LEADING_SKILL_COMMAND = /^\s*\/skill:\S*[ \t]*/

/**
 * The message with the picked skill's command at its start, in place of any command already
 * chosen there, so picking a skill keeps what was written, line breaks included, and runs only
 * the one picked.
 */
export function withSkillCommand(text: string, name: string): string {
  const first = findReferences(text).at(0)
  const chosen =
    first?.reference.kind === 'command' && !text.slice(0, first.start).trim() ? first : null
  const rest = chosen
    ? text.slice(chosen.end).replace(/^[ \t]*/, '')
    : text.replace(LEADING_SKILL_COMMAND, '')
  return `${commandLink(skillCommand(name))}${/^[\r\n]/.test(rest) ? '' : ' '}${rest}`
}

/** The skills the user can run by name: those switched on that allow it. */
export function runnableSkills(skills: readonly Skill[]): Skill[] {
  return skills.filter((skill) => skill.userInvocable)
}

/** The skill a message starts by running, read fresh; null when it names none that can run. */
export async function invokedSkill(
  text: string,
  library: SkillLibrary = appSkillLibrary
): Promise<Skill | null> {
  const command = leadingCommand(text)?.name
  if (!command?.startsWith(SKILL_COMMAND)) return null
  const name = command.slice(SKILL_COMMAND.length)
  await library.refresh()
  return runnableSkills(library.enabled()).find((skill) => skill.name === name) ?? null
}
