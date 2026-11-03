import { describe, expect, test } from 'bun:test'

import { skillCatalog } from '@/app/ai/skills/catalog'
import { harnessSkills } from '@/app/ai/skills/harness'
import { MAX_SKILL_DESCRIPTION_LENGTH } from '@/app/ai/skills/parse'
import { enabledSkillsFrom, type SkillPreferences } from '@/app/ai/skills/preferences'
import { builtinSkillName, readBuiltinSkills } from '@/app/ai/skills/sources/builtin'
import { createSkillTools } from '@/app/ai/skills/tools'

import { skillFixture } from '#tests/helpers/chat/skills'

const none: SkillPreferences = { sources: {}, skills: {}, trustedFolders: {}, pickedSources: {} }
const callOptions = { toolCallId: 'call', messages: [], context: {} }

/** The genre guides and the skills that work on a design, as the roadmap names them. */
const EXPECTED = [
  'landing-page',
  'mobile-app',
  'web-app',
  'dashboard',
  'slides',
  'design-system',
  'tailwind-v4',
  'layout',
  'restyle',
  'dark-mode',
  'design-review'
]

describe('built-in skills', () => {
  const { skills, problems } = readBuiltinSkills()

  test('ship the genre guides and design skills, every one read cleanly', () => {
    expect(problems).toEqual([])
    expect(skills.map((skill) => skill.name)).toEqual(EXPECTED)
    for (const skill of skills) {
      expect(skill.source).toBe('builtin')
      expect(skill.warnings).toEqual([])
      expect(skill.description.length).toBeGreaterThan(40)
      expect(skill.description.length).toBeLessThanOrEqual(MAX_SKILL_DESCRIPTION_LENGTH)
      expect(skill.instructions.length).toBeGreaterThan(500)
      expect(skill.modelInvocable).toBe(true)
      expect(skill.userInvocable).toBe(true)
      expect<string | null>(builtinSkillName(skill)).toBe(skill.name)
    }
  })

  test('are read once, as the same list every time', () => {
    expect(readBuiltinSkills()).toBe(readBuiltinSkills())
  })

  test('are on until the user turns their source off', () => {
    expect(enabledSkillsFrom(skills, none)).toEqual(skills)
    expect(enabledSkillsFrom(skills, { ...none, sources: { builtin: false } })).toEqual([])
    const off = { ...none, skills: { 'builtin/dark-mode': false } }
    expect(enabledSkillsFrom(skills, off).map((skill) => skill.name)).not.toContain('dark-mode')
  })

  test('give way to a user’s skill of the same name, which comes first', () => {
    const own = skillFixture({ name: 'dark-mode', source: 'openpencil', location: 'dark-mode' })
    const offered = enabledSkillsFrom([own, ...skills], none)
    expect(offered.filter((skill) => skill.name === 'dark-mode')).toEqual([own])
    expect(builtinSkillName(own)).toBeNull()
  })

  test('are listed for the model to load', () => {
    const catalog = skillCatalog(skills)
    for (const name of EXPECTED) expect(catalog).toContain(`<name>${name}</name>`)
  })

  test('load with their reference files, and refuse paths they do not list', async () => {
    const tools = createSkillTools(() => skills)
    expect(await tools.load_skill.execute?.({ name: 'design-system' }, callOptions)).toMatchObject({
      name: 'design-system',
      files: ['references/token-scale.md']
    })
    const reference = await tools.read_skill_file.execute?.(
      { name: 'design-system', path: 'references/token-scale.md' },
      callOptions
    )
    expect(reference).toMatchObject({ path: 'references/token-scale.md' })
    expect(JSON.stringify(reference)).toContain('Semantic tokens')
    expect(
      await tools.read_skill_file.execute?.(
        { name: 'design-system', path: '../../catalog.md' },
        callOptions
      )
    ).toHaveProperty('error')
    const designSystem = skills.find((skill) => skill.name === 'design-system')
    await expect(designSystem?.readFile('SKILL.md')).rejects.toThrow()
  })

  test('fit in a Pi session whole, files included', async () => {
    const sent = await harnessSkills({ refresh: async () => undefined, enabled: () => skills })
    expect(sent.map((skill) => skill.name)).toEqual(EXPECTED)
    expect(sent.find((skill) => skill.name === 'design-system')?.files).toHaveLength(1)
  })
})
